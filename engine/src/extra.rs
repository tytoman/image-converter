//! Extra in-memory decoders for formats which are not covered by `image`.
//!
//! These functions accept byte slices so callers can use them in the browser
//! without filesystem access. The RAW preview intentionally uses a small
//! bilinear demosaic; it is suitable for format conversion, not color-critical
//! camera development.

use image::{DynamicImage, ImageBuffer, Rgba, RgbaImage};
use std::io::Cursor;

const MAX_PIXELS: u64 = 40_000_000;
const MAX_DIMENSION: u32 = 16_384;

/// Decode a Photoshop PSD composite image from bytes.
pub fn decode_psd(bytes: &[u8]) -> Result<DynamicImage, String> {
    // PSD header fields are fixed-width big-endian values. Reject oversized
    // canvases before asking the parser to decompress the composite image.
    if bytes.len() < 26 || &bytes[..4] != b"8BPS" {
        return Err("Not a valid PSD file".into());
    }
    let header_height = u32::from_be_bytes(bytes[14..18].try_into().unwrap());
    let header_width = u32::from_be_bytes(bytes[18..22].try_into().unwrap());
    ensure_size(header_width, header_height)?;
    let psd = psd::Psd::from_bytes(bytes).map_err(|e| format!("PSD decode failed: {e}"))?;
    let (width, height) = (psd.width(), psd.height());
    ensure_size(width, height)?;
    let rgba = psd.rgba();
    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|n| n.checked_mul(4))
        .ok_or_else(|| "PSD dimensions overflow".to_string())?;
    if rgba.len() != expected {
        return Err("PSD composite has an unexpected pixel buffer size".into());
    }
    ImageBuffer::from_raw(width, height, rgba)
        .map(DynamicImage::ImageRgba8)
        .ok_or_else(|| "Could not allocate PSD image".into())
}

/// Decode a camera RAW file (including common CR2, NEF and ARW variants).
///
/// rawloader parses the camera-specific mosaic and metadata. We use its CFA
/// pattern to perform a bounded bilinear interpolation into an 8-bit preview.
pub fn decode_raw(bytes: &[u8]) -> Result<DynamicImage, String> {
    let mut reader = Cursor::new(bytes);
    let raw = rawloader::decode(&mut reader).map_err(|e| format!("RAW decode failed: {e}"))?;
    let (width, height) = (raw.width, raw.height);
    // We decode the full sensor plane without applying the crop rectangle, so
    // use the original mosaic pattern rather than the crop-shifted variant.
    let cfa = raw.cfa.clone();
    let whitelevels = raw.whitelevels;
    let blacklevels = raw.blacklevels;
    let wb_coeffs = raw.wb_coeffs;
    ensure_size(
        u32::try_from(width).map_err(|_| "RAW width is too large")?,
        u32::try_from(height).map_err(|_| "RAW height is too large")?,
    )?;
    let samples: Vec<f32> = match raw.data {
        rawloader::RawImageData::Integer(v) => v.into_iter().map(|x| x as f32).collect(),
        rawloader::RawImageData::Float(v) => v,
    };
    let count = width
        .checked_mul(height)
        .ok_or_else(|| "RAW dimensions overflow".to_string())?;
    if width == 0 || height == 0 || samples.len() != count {
        return Err("RAW file does not contain a supported single-channel sensor mosaic".into());
    }

    let mut image = RgbaImage::new(width as u32, height as u32);
    let max_value = whitelevels.iter().copied().max().unwrap_or(u16::MAX) as f32;
    let black = blacklevels.iter().copied().min().unwrap_or(0) as f32;
    let span = (max_value - black).max(1.0);

    for y in 0..height {
        for x in 0..width {
            let mut rgb = [0.0f32; 3];
            for channel in 0..3 {
                let mut sum = 0.0;
                let mut n = 0.0;
                // A 2-pixel radius includes the nearest samples of each color
                // in Bayer and common 6x6 CFA patterns.
                for dy in -2isize..=2 {
                    for dx in -2isize..=2 {
                        let sx = x as isize + dx;
                        let sy = y as isize + dy;
                        if sx < 0 || sy < 0 || sx >= width as isize || sy >= height as isize {
                            continue;
                        }
                        if cfa.color_at(sy as usize, sx as usize) == channel {
                            sum += samples[sy as usize * width + sx as usize];
                            n += 1.0;
                        }
                    }
                }
                let value = if n > 0.0 {
                    sum / n
                } else {
                    samples[y * width + x]
                };
                let wb = wb_coeffs[channel].max(0.0);
                rgb[channel] = (((value - black).max(0.0) / span) * wb).clamp(0.0, 1.0);
            }
            image.put_pixel(
                x as u32,
                y as u32,
                Rgba([
                    (rgb[0] * 255.0 + 0.5) as u8,
                    (rgb[1] * 255.0 + 0.5) as u8,
                    (rgb[2] * 255.0 + 0.5) as u8,
                    255,
                ]),
            );
        }
    }
    Ok(DynamicImage::ImageRgba8(image))
}

/// Decode a selected DICOM frame from in-memory bytes.
///
/// `dicom-pixeldata` handles native pixel data and its enabled pure-Rust
/// transfer syntaxes. Compressed transfer syntaxes without a registered Rust
/// decoder are returned as a normal decode error.
pub fn decode_dicom(bytes: &[u8], frame: u32) -> Result<DynamicImage, String> {
    use dicom_pixeldata::PixelDecoder;
    let object = dicom_object::from_reader(Cursor::new(bytes))
        .map_err(|e| format!("DICOM parse failed: {e}"))?;
    let decoded = object
        .decode_pixel_data()
        .map_err(|e| format!("DICOM pixel decode failed: {e}"))?;
    if frame >= decoded.number_of_frames() {
        return Err(format!(
            "DICOM frame {} is outside the {} available frames",
            frame + 1,
            decoded.number_of_frames()
        ));
    }
    let width = decoded.columns();
    let height = decoded.rows();
    ensure_size(width, height)?;
    decoded
        .to_dynamic_image(frame)
        .map_err(|e| format!("DICOM frame conversion failed: {e}"))
}

/// Read the number of frames in a DICOM object without decoding its pixels.
pub fn dicom_frame_count(bytes: &[u8]) -> Result<u32, String> {
    let object = dicom_object::from_reader(Cursor::new(bytes))
        .map_err(|e| format!("DICOM parse failed: {e}"))?;
    // Number of Frames (0028,0008) is optional and defaults to one. Read the
    // attribute directly so inspection does not decompress or allocate pixels.
    let Some(element) = object
        .element_by_name_opt("NumberOfFrames")
        .map_err(|e| format!("DICOM frame metadata failed: {e}"))?
    else {
        return Ok(1);
    };
    let raw = element
        .to_str()
        .map_err(|e| format!("DICOM NumberOfFrames is invalid: {e}"))?;
    let count = raw
        .trim()
        .parse::<u32>()
        .map_err(|_| "DICOM NumberOfFrames is not a valid positive integer".to_string())?;
    if count == 0 || count > 1000 {
        return Err("DICOM NumberOfFrames is outside the supported range (1–1000)".into());
    }
    Ok(count)
}

/// Read the number of TIFF image file directories without decoding pixels.
/// The cap also prevents pathological directory chains from stalling inspect.
pub fn tiff_page_count(bytes: &[u8]) -> Result<usize, String> {
    let mut decoder = tiff::decoder::Decoder::new(Cursor::new(bytes))
        .map_err(|e| format!("TIFF parse failed: {e}"))?;
    let mut count = 1usize;
    while decoder.more_images() {
        if count >= 1000 {
            return Err("TIFF contains more than 1000 pages".into());
        }
        decoder
            .next_image()
            .map_err(|e| format!("TIFF page metadata failed: {e}"))?;
        count += 1;
    }
    Ok(count)
}

/// Decode one TIFF directory to RGBA8. Common grayscale, RGB, RGBA, gray-alpha
/// and indexed palette pages are supported; unusual sample types fail clearly.
pub fn decode_tiff_page(bytes: &[u8], page_index: usize) -> Result<DynamicImage, String> {
    use tiff::decoder::{Decoder, DecodingResult};
    use tiff::tags::Tag;

    let mut decoder =
        Decoder::new(Cursor::new(bytes)).map_err(|e| format!("TIFF parse failed: {e}"))?;
    for _ in 0..page_index {
        if !decoder.more_images() {
            return Err(format!("TIFF page {} does not exist", page_index + 1));
        }
        decoder
            .next_image()
            .map_err(|e| format!("TIFF page selection failed: {e}"))?;
    }
    let (width, height) = decoder
        .dimensions()
        .map_err(|e| format!("TIFF dimensions failed: {e}"))?;
    ensure_size(width, height)?;
    let color = decoder
        .colortype()
        .map_err(|e| format!("TIFF color metadata failed: {e}"))?;
    let palette = if matches!(color, tiff::ColorType::Palette(_)) {
        Some(
            decoder
                .get_tag_u16_vec(Tag::ColorMap)
                .map_err(|e| format!("TIFF palette is invalid: {e}"))?,
        )
    } else {
        None
    };
    let data = decoder
        .read_image()
        .map_err(|e| format!("TIFF page decode failed: {e}"))?;
    let rgba = match data {
        DecodingResult::U8(samples) => {
            tiff_samples_to_rgba(&samples, width, height, color, palette.as_deref())?
        }
        DecodingResult::U16(_) if matches!(color, tiff::ColorType::Palette(_)) => {
            return Err("16-bit indexed TIFF pages are not supported".into());
        }
        DecodingResult::U16(samples) => {
            let values: Vec<u8> = samples.into_iter().map(|v| (v >> 8) as u8).collect();
            tiff_samples_to_rgba(&values, width, height, color, palette.as_deref())?
        }
        _ => {
            return Err(
                "TIFF sample type is not supported; use 8-bit or 16-bit integer pixels".into(),
            )
        }
    };
    ImageBuffer::from_raw(width, height, rgba)
        .map(DynamicImage::ImageRgba8)
        .ok_or_else(|| "Could not allocate TIFF image".into())
}

fn tiff_samples_to_rgba(
    samples: &[u8],
    width: u32,
    height: u32,
    color: tiff::ColorType,
    palette: Option<&[u16]>,
) -> Result<Vec<u8>, String> {
    use tiff::ColorType;
    let pixels = (width as usize)
        .checked_mul(height as usize)
        .ok_or_else(|| "TIFF dimensions overflow".to_string())?;
    let channels = match color {
        ColorType::Gray(_) | ColorType::Palette(_) => 1,
        ColorType::GrayA(_) => 2,
        ColorType::RGB(_) => 3,
        ColorType::RGBA(_) => 4,
        _ => return Err(format!("TIFF color type {color:?} is not supported")),
    };
    if samples.len() != pixels.saturating_mul(channels) {
        return Err("TIFF decoded buffer has an unexpected size".into());
    }
    let mut rgba = Vec::with_capacity(pixels * 4);
    for pixel in samples.chunks_exact(channels) {
        let (r, g, b, a) = match color {
            ColorType::Gray(_) => (pixel[0], pixel[0], pixel[0], 255),
            ColorType::GrayA(_) => (pixel[0], pixel[0], pixel[0], pixel[1]),
            ColorType::RGB(_) => (pixel[0], pixel[1], pixel[2], 255),
            ColorType::RGBA(_) => (pixel[0], pixel[1], pixel[2], pixel[3]),
            ColorType::Palette(_) => {
                let map = palette.ok_or_else(|| "TIFF palette is missing".to_string())?;
                let entries = map.len() / 3;
                let index = pixel[0] as usize;
                if map.len() != entries * 3 || index >= entries {
                    return Err("TIFF palette index is out of range".into());
                }
                (
                    (map[index] >> 8) as u8,
                    (map[entries + index] >> 8) as u8,
                    (map[2 * entries + index] >> 8) as u8,
                    255,
                )
            }
            _ => unreachable!(),
        };
        rgba.extend_from_slice(&[r, g, b, a]);
    }
    Ok(rgba)
}

/// Parse a PDF and report its page count.
pub fn pdf_page_count(bytes: &[u8]) -> Result<usize, String> {
    let pdf = hayro::hayro_syntax::Pdf::new(bytes.to_vec())
        .map_err(|e| format!("PDF parse failed: {e:?}"))?;
    Ok(pdf.pages().len())
}

/// Render one PDF page to RGBA pixels, in browser memory.
pub fn decode_pdf_page(bytes: &[u8], page_index: usize) -> Result<DynamicImage, String> {
    use hayro::hayro_interpret::font::FontQuery;
    use hayro::hayro_interpret::InterpreterSettings;
    use std::sync::Arc;

    let pdf = hayro::hayro_syntax::Pdf::new(bytes.to_vec())
        .map_err(|e| format!("PDF parse failed: {e:?}"))?;
    let page = pdf
        .pages()
        .get(page_index)
        .ok_or_else(|| format!("PDF page {} does not exist", page_index + 1))?;
    let (w, h) = page.render_dimensions();
    if !w.is_finite() || !h.is_finite() || w <= 0.0 || h <= 0.0 {
        return Err("PDF page has invalid dimensions".into());
    }
    // Hayro uses u16 pixmap dimensions. Keep the default 1x scale while
    // rejecting excessive pages before its renderer allocates memory.
    let (width, height) = (w.ceil() as u32, h.ceil() as u32);
    ensure_size(width, height)?;
    if width > u16::MAX as u32 || height > u16::MAX as u32 {
        return Err("PDF page dimensions exceed the renderer limit".into());
    }
    let interpreter = InterpreterSettings {
        font_resolver: Arc::new(|query| match query {
            FontQuery::Standard(font) => Some(font.get_font_data()),
            FontQuery::Fallback(font) => Some(font.pick_standard_font().get_font_data()),
        }),
        ..Default::default()
    };
    let cache = hayro::RenderCache::new();
    let pixmap = hayro::render(
        page,
        &cache,
        &interpreter,
        &hayro::RenderSettings::default(),
    );
    let png = pixmap
        .into_png()
        .map_err(|e| format!("PDF page rasterization failed: {e:?}"))?;
    image::load_from_memory(&png).map_err(|e| format!("PDF page image conversion failed: {e}"))
}

/// Same as [`decode_pdf_page`], with the concise name used by the engine.
pub fn decode_pdf(bytes: &[u8], page: usize) -> Result<DynamicImage, String> {
    decode_pdf_page(bytes, page)
}

/// Best-effort handler for PDF-compatible Illustrator documents.
/// This deliberately does not claim support for native AI files that do not
/// contain an embedded PDF-compatible representation.
pub fn is_pdf_compatible_ai(bytes: &[u8]) -> bool {
    bytes.starts_with(b"%PDF-")
}

/// Render a PDF-compatible Illustrator file. Native PostScript-only AI files
/// are rejected because Hayro does not interpret PostScript documents.
pub fn decode_ai(bytes: &[u8], page: usize) -> Result<DynamicImage, String> {
    if !is_pdf_compatible_ai(bytes) {
        return Err("This AI file does not contain a PDF-compatible representation".into());
    }
    decode_pdf_page(bytes, page)
}

fn ensure_size(width: u32, height: u32) -> Result<(), String> {
    let pixels = u64::from(width)
        .checked_mul(u64::from(height))
        .ok_or_else(|| "Image dimensions overflow".to_string())?;
    if width == 0
        || height == 0
        || width > MAX_DIMENSION
        || height > MAX_DIMENSION
        || pixels > MAX_PIXELS
    {
        return Err("Image dimensions exceed the decoder safety limit".into());
    }
    Ok(())
}
