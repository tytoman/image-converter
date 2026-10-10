use image::{DynamicImage, ImageFormat, ImageReader, RgbaImage};
use std::io::Cursor;
use std::sync::{Arc, Mutex};

const MAX_SVG_BYTES: usize = 16 * 1024 * 1024;
const MAX_SVG_RASTER_BYTES: usize = 8 * 1024 * 1024;
const MAX_JXL_INTERNAL_ALLOCATION: usize = 512 * 1024 * 1024;
const JXL_SAMPLE_CHUNK: usize = 16 * 1024;

fn valid_dimensions(width: u32, height: u32, max_dimension: u32, max_pixels: u64) -> bool {
    width > 0
        && height > 0
        && width <= max_dimension
        && height <= max_dimension
        && (width as u64) * (height as u64) <= max_pixels
}

fn svg_raster_dimensions(
    data: &[u8],
    max_dimension: u32,
    max_pixels: u64,
) -> Option<(ImageFormat, u32, u32)> {
    let format = image::guess_format(data).ok()?;
    if !matches!(format, ImageFormat::Png | ImageFormat::Jpeg | ImageFormat::Gif | ImageFormat::WebP) {
        return None;
    }
    let (width, height) = ImageReader::with_format(Cursor::new(data), format)
        .into_dimensions()
        .ok()?;
    valid_dimensions(width, height, max_dimension, max_pixels).then_some((format, width, height))
}

pub fn svg(bytes: &[u8], max_dimension: u32, max_pixels: u64) -> Result<DynamicImage, String> {
    if bytes.len() > MAX_SVG_BYTES {
        return Err("SVG exceeds the 16 MiB document limit".into());
    }
    let embedded_pixels = Arc::new(Mutex::new(0u64));
    let mut options = resvg::usvg::Options::default();
    options.resources_dir = None;
    let data_resolver = resvg::usvg::ImageHrefResolver::default_data_resolver();
    let pixels_for_resolver = Arc::clone(&embedded_pixels);
    options.image_href_resolver = resvg::usvg::ImageHrefResolver {
        resolve_data: Box::new(move |mime, data, options| {
            // Embedded SVGs could recurse; accept bounded raster data only.
            if data.len() > MAX_SVG_RASTER_BYTES
                || !matches!(mime, "image/png" | "image/jpeg" | "image/jpg" | "image/gif" | "image/webp" | "text/plain")
            {
                return None;
            }
            let (format, width, height) = svg_raster_dimensions(&data, max_dimension, max_pixels)?;
            {
                let mut total = pixels_for_resolver.lock().ok()?;
                *total = total.checked_add((width as u64) * (height as u64))?;
                if *total > max_pixels {
                    return None;
                }
            }
            // Match the MIME with the bytes so the resolver cannot reinterpret arbitrary text as SVG.
            let mime_matches = match mime {
                "image/png" => format == ImageFormat::Png,
                "image/jpeg" | "image/jpg" => format == ImageFormat::Jpeg,
                "image/gif" => format == ImageFormat::Gif,
                "image/webp" => format == ImageFormat::WebP,
                "text/plain" => true,
                _ => false,
            };
            if !mime_matches {
                return None;
            }
            data_resolver(mime, data, options)
        }),
        resolve_string: Box::new(|_, _| None),
    };
    options.fontdb_mut().load_font_data(include_bytes!("../assets/NotoSans-Regular.ttf").to_vec());
    options.font_family = "Noto Sans".into();
    let tree = resvg::usvg::Tree::from_data(bytes, &options).map_err(|e| format!("Invalid SVG: {e}"))?;
    let size = tree.size().to_int_size();
    let (w, h) = (size.width(), size.height());
    if !valid_dimensions(w, h, max_dimension, max_pixels) {
        return Err("SVG dimensions exceed conversion limits".into());
    }
    let mut pixmap = resvg::tiny_skia::Pixmap::new(w, h).ok_or("Could not allocate SVG raster")?;
    resvg::render(&tree, resvg::tiny_skia::Transform::identity(), &mut pixmap.as_mut());
    let mut rgba = pixmap.take();
    // tiny-skia stores premultiplied channels; image crate expects straight alpha.
    for px in rgba.chunks_exact_mut(4) {
        let a = px[3] as u16;
        if a == 0 {
            px[..3].fill(0);
        } else if a < 255 {
            for c in &mut px[..3] {
                *c = ((*c as u16 * 255 + a / 2) / a).min(255) as u8;
            }
        }
    }
    let image = RgbaImage::from_raw(w, h, rgba).ok_or("Invalid SVG raster buffer")?;
    Ok(DynamicImage::ImageRgba8(image))
}

fn jxl(bytes: &[u8]) -> Result<jxl_oxide::JxlImage, String> {
    if bytes.len() > 64 * 1024 * 1024 {
        return Err("JPEG XL exceeds the 64 MiB input limit".into());
    }
    let tracker = jxl_oxide::AllocTracker::with_limit(MAX_JXL_INTERNAL_ALLOCATION);
    jxl_oxide::JxlImage::builder()
        .alloc_tracker(tracker)
        .read(Cursor::new(bytes))
        .map_err(|e| format!("Could not decode JPEG XL: {e}"))
}

pub fn jxl_dimensions(bytes: &[u8], max_dimension: u32, max_pixels: u64) -> Result<(u32, u32), String> {
    let image = jxl(bytes)?;
    let (w, h) = (image.width(), image.height());
    if !valid_dimensions(w, h, max_dimension, max_pixels) {
        return Err("JPEG XL dimensions exceed conversion limits".into());
    }
    Ok((w, h))
}

pub fn jxl_frames(bytes: &[u8]) -> Result<usize, String> {
    let image = jxl(bytes)?;
    if !valid_dimensions(image.width(), image.height(), 16_384, 40_000_000) {
        return Err("JPEG XL dimensions exceed conversion limits".into());
    }
    let n = image.num_loaded_keyframes();
    if !image.is_loading_done() {
        return Err("JPEG XL frame stream is incomplete".into());
    }
    if n > 1000 {
        return Err("JPEG XL animation exceeds 1000 frames".into());
    }
    Ok(n.max(1))
}

pub fn decode_jxl(
    bytes: &[u8],
    frame: usize,
    max_dimension: u32,
    max_pixels: u64,
) -> Result<DynamicImage, String> {
    let mut image = jxl(bytes)?;
    let (w, h) = (image.width(), image.height());
    if !valid_dimensions(w, h, max_dimension, max_pixels) {
        return Err("JPEG XL dimensions exceed conversion limits".into());
    }
    if image.num_loaded_keyframes() > 1000 {
        return Err("JPEG XL animation exceeds 1000 frames".into());
    }
    if frame >= image.num_loaded_keyframes() {
        return Err("JPEG XL frame does not exist".into());
    }
    // JXL frame streams are premultiplied and may use an embedded transfer function.
    // Ask the decoder for display RGB before converting samples to 8-bit RGBA.
    let source_pixel_format = image.pixel_format();
    if matches!(
        source_pixel_format,
        jxl_oxide::PixelFormat::Cmyk | jxl_oxide::PixelFormat::Cmyka
    ) {
        return Err("Unsupported JPEG XL color model; CMYK is not supported".into());
    }
    let alpha_associated = image
        .image_header()
        .metadata
        .ec_info
        .iter()
        .find_map(|channel| channel.alpha_associated())
        .unwrap_or(false);
    image.request_color_encoding(jxl_oxide::EnumColourEncoding::srgb(
        jxl_oxide::RenderingIntent::Relative,
    ));
    let render = image
        .render_frame(frame)
        .map_err(|e| format!("Could not render JPEG XL: {e}"))?;
    let mut stream = render.stream();
    let channels = stream.channels() as usize;
    let pixel_format = image.pixel_format();
    if channels != pixel_format.channels() || !(1..=4).contains(&channels) {
        return Err("Unsupported JPEG XL channel layout".into());
    }
    let pixel_count = (w as usize)
        .checked_mul(h as usize)
        .ok_or("JPEG XL dimensions overflow")?;
    let sample_count = pixel_count
        .checked_mul(channels)
        .ok_or("JPEG XL sample count overflow")?;
    let mut samples = vec![0f32; JXL_SAMPLE_CHUNK - (JXL_SAMPLE_CHUNK % channels)];
    let mut output = Vec::with_capacity(pixel_count.checked_mul(4).ok_or("JPEG XL output size overflow")?);
    let mut written = 0usize;
    let byte = |v: f32| if v.is_finite() { (v.clamp(0.0, 1.0) * 255.0 + 0.5) as u8 } else { 0 };
    while written < sample_count {
        let requested = samples.len().min(sample_count - written);
        let count = stream.write_to_buffer(&mut samples[..requested]);
        if count == 0 || count > requested || count % channels != 0 {
            return Err("Incomplete JPEG XL pixel data".into());
        }
        for pixel in samples[..count].chunks_exact(channels) {
            match pixel_format {
                jxl_oxide::PixelFormat::Gray => {
                    let g = byte(pixel[0]);
                    output.extend_from_slice(&[g, g, g, 255]);
                }
                jxl_oxide::PixelFormat::Graya => {
                    let a = byte(pixel[1]);
                    let mut g = byte(pixel[0]);
                    if alpha_associated {
                        g = if a == 0 { 0 } else { ((g as u16 * 255 + a as u16 / 2) / a as u16).min(255) as u8 };
                    }
                    output.extend_from_slice(&[g, g, g, a]);
                }
                jxl_oxide::PixelFormat::Rgb => {
                    output.extend_from_slice(&[byte(pixel[0]), byte(pixel[1]), byte(pixel[2]), 255]);
                }
                jxl_oxide::PixelFormat::Rgba => {
                    let a = byte(pixel[3]);
                    let mut r = byte(pixel[0]);
                    let mut g = byte(pixel[1]);
                    let mut b = byte(pixel[2]);
                    if alpha_associated {
                        let unassociate = |channel: u8| if a == 0 { 0 } else { ((channel as u16 * 255 + a as u16 / 2) / a as u16).min(255) as u8 };
                        r = unassociate(r);
                        g = unassociate(g);
                        b = unassociate(b);
                    }
                    output.extend_from_slice(&[r, g, b, a]);
                }
                _ => return Err("Unsupported JPEG XL color model".into()),
            }
        }
        written += count;
    }
    Ok(DynamicImage::ImageRgba8(
        RgbaImage::from_raw(w, h, output).ok_or("Invalid JPEG XL raster buffer")?,
    ))
}

pub fn encode_jxl(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    use zune_core::{bit_depth::BitDepth, colorspace::ColorSpace, options::EncoderOptions};
    if width <= 1 || height <= 1 {
        return Err("JPEG XL output requires both dimensions to be at least 2 pixels".into());
    }
    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|pixels| pixels.checked_mul(4))
        .ok_or("JPEG XL input dimensions overflow")?;
    if rgba.len() != expected {
        return Err("Invalid RGBA buffer for JPEG XL encoding".into());
    }
    let options = EncoderOptions::new(width as usize, height as usize, ColorSpace::RGBA, BitDepth::Eight);
    let encoder = zune_jpegxl::JxlSimpleEncoder::new(rgba, options);
    let mut output = Vec::new();
    encoder
        .encode(&mut output)
        .map_err(|e| format!("Could not encode JPEG XL: {e}"))?;
    Ok(output)
}
