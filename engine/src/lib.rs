mod extra;
mod heif_items;
mod modern;

use image::{
    codecs, AnimationDecoder, DynamicImage, ExtendedColorType, ImageEncoder, ImageFormat,
    ImageReader, RgbaImage,
};
use serde::Deserialize;
use serde_json::json;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

const MAX_BYTES: usize = 64 * 1024 * 1024;
const MAX_PIXELS: u64 = 40_000_000;
const MAX_DIMENSION: u32 = 16_384;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum InputKind {
    Png,
    Jpeg,
    Bmp,
    Gif,
    Tiff,
    Webp,
    Avif,
    Psd,
    Raw,
    Heif,
    Dicom,
    Pdf,
    Ai,
    Svg,
    Jxl,
    Exr,
    Hdr,
    Tga,
}
#[derive(Deserialize, Default)]
struct ConvertOptions {
    format: String,
    #[serde(default)]
    frame: usize,
    width: Option<u32>,
    height: Option<u32>,
    #[serde(default = "default_quality")]
    quality: u8,
    #[serde(default)]
    compression: u8,
}
fn default_quality() -> u8 {
    85
}
fn js_error(message: impl Into<String>) -> JsValue {
    JsValue::from_str(&message.into())
}
fn lower_ext(filename: &str) -> String {
    filename
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase()
}
fn output_format(ext: &str) -> Option<ImageFormat> {
    match ext {
        "png" => Some(ImageFormat::Png),
        "jpg" | "jpeg" => Some(ImageFormat::Jpeg),
        "webp" => Some(ImageFormat::WebP),
        "bmp" => Some(ImageFormat::Bmp),
        "tif" | "tiff" => Some(ImageFormat::Tiff),
        "gif" => Some(ImageFormat::Gif),
        "avif" => Some(ImageFormat::Avif),
        "tga" => Some(ImageFormat::Tga),
        _ => None,
    }
}
fn input_kind(bytes: &[u8], filename: &str) -> Result<InputKind, String> {
    if bytes.len() > MAX_BYTES {
        return Err("ファイルサイズが64 MiBを超えています。".into());
    }
    let ext = lower_ext(filename);
    // Use the explicit RAW extension before generic TIFF sniffing (CR2 is TIFF-based).
    match ext.as_str() {
        "svg" => return Ok(InputKind::Svg),
        "jxl" => return Ok(InputKind::Jxl),
        "exr" => return Ok(InputKind::Exr),
        "hdr" | "pic" => return Ok(InputKind::Hdr),
        "tga" => return Ok(InputKind::Tga),
        "cr2" | "nef" | "arw" => return Ok(InputKind::Raw),
        "psd" => return Ok(InputKind::Psd),
        "heic" | "heif" => return Ok(InputKind::Heif),
        "avif" | "avifs" => return Ok(InputKind::Avif),
        "dcm" | "dicom" => return Ok(InputKind::Dicom),
        "pdf" => return Ok(InputKind::Pdf),
        "ai" => return Ok(InputKind::Ai),
        _ => {}
    }
    if bytes.starts_with(b"\xff\x0a") || (bytes.len() >= 12 && &bytes[4..12] == b"JXL \r\n\x87\n") { return Ok(InputKind::Jxl); }
    let fmt = match image::guess_format(bytes) {
        Ok(fmt) => fmt,
        Err(_) => output_format(&ext).ok_or_else(|| format!("未対応の形式です（.{}）。", ext))?,
    };
    match fmt {
        ImageFormat::Png => Ok(InputKind::Png),
        ImageFormat::Jpeg => Ok(InputKind::Jpeg),
        ImageFormat::Bmp => Ok(InputKind::Bmp),
        ImageFormat::Gif => Ok(InputKind::Gif),
        ImageFormat::Tiff => Ok(InputKind::Tiff),
        ImageFormat::WebP => Ok(InputKind::Webp),
        ImageFormat::Avif => Ok(InputKind::Avif),
        ImageFormat::OpenExr => Ok(InputKind::Exr),
        ImageFormat::Hdr => Ok(InputKind::Hdr),
        ImageFormat::Tga => Ok(InputKind::Tga),
        _ => Err(format!(
            "{}形式は現在サポートしていません。",
            ext.to_ascii_uppercase()
        )),
    }
}
fn base_format(kind: InputKind) -> Option<ImageFormat> {
    match kind {
        InputKind::Png => Some(ImageFormat::Png),
        InputKind::Jpeg => Some(ImageFormat::Jpeg),
        InputKind::Bmp => Some(ImageFormat::Bmp),
        InputKind::Gif => Some(ImageFormat::Gif),
        InputKind::Tiff => Some(ImageFormat::Tiff),
        InputKind::Webp => Some(ImageFormat::WebP),
        InputKind::Tga => Some(ImageFormat::Tga),
        _ => None,
    }
}
fn display_format(kind: InputKind) -> &'static str {
    match kind {
        InputKind::Png => "PNG",
        InputKind::Jpeg => "JPEG",
        InputKind::Bmp => "BMP",
        InputKind::Gif => "GIF",
        InputKind::Tiff => "TIFF",
        InputKind::Webp => "WebP",
        InputKind::Avif => "AVIF",
        InputKind::Psd => "PSD",
        InputKind::Raw => "RAW",
        InputKind::Heif => "HEIF/HEIC",
        InputKind::Dicom => "DICOM",
        InputKind::Pdf => "PDF",
        InputKind::Ai => "AI (PDF互換)",
        InputKind::Svg => "SVG",
        InputKind::Jxl => "JPEG XL",
        InputKind::Exr => "OpenEXR",
        InputKind::Hdr => "Radiance HDR",
        InputKind::Tga => "TGA",
    }
}
fn image_error(error: image::ImageError) -> String {
    format!("画像を読み込めません。ファイルの破損または未対応形式の可能性があります: {error}")
}
fn guard_dimensions(width: u32, height: u32) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("画像サイズを読み取れませんでした。".into());
    }
    if width > MAX_DIMENSION
        || height > MAX_DIMENSION
        || (width as u64) * (height as u64) > MAX_PIXELS
    {
        return Err("画像が処理上限を超えています（最大 16,384 px / 4,000 万画素）。".into());
    }
    Ok(())
}
fn decoder(bytes: &[u8], format: ImageFormat) -> Result<DynamicImage, String> {
    ImageReader::with_format(Cursor::new(bytes), format)
        .decode()
        .map_err(image_error)
}
fn check_header_dimensions(bytes: &[u8], format: ImageFormat) -> Result<(), String> {
    let dims = ImageReader::with_format(Cursor::new(bytes), format)
        .into_dimensions()
        .map_err(image_error)?;
    guard_dimensions(dims.0, dims.1)
}
fn gif_decoder(bytes: &[u8]) -> Result<codecs::gif::GifDecoder<Cursor<&[u8]>>, String> {
    codecs::gif::GifDecoder::new(Cursor::new(bytes)).map_err(image_error)
}
fn gif_frame_count(bytes: &[u8]) -> Result<usize, String> {
    let decoder = gif_decoder(bytes)?;
    let mut count = 0usize;
    for frame in decoder.into_frames() {
        let frame = frame.map_err(image_error)?;
        let (width, height) = frame.buffer().dimensions();
        guard_dimensions(width, height)?;
        count += 1;
        if count > 1000 {
            return Err("GIFのフレーム数が上限（1,000）を超えています。".into());
        }
    }
    Ok(count)
}
fn gif_frame(bytes: &[u8], index: usize) -> Result<RgbaImage, String> {
    let decoder = gif_decoder(bytes)?;
    for (current, frame) in decoder.into_frames().enumerate() {
        let frame = frame.map_err(image_error)?;
        if current == index {
            return Ok(frame.into_buffer());
        }
    }
    Err(format!("フレーム {} は存在しません。", index + 1))
}
fn apng_decoder(bytes: &[u8]) -> Result<codecs::png::PngDecoder<Cursor<&[u8]>>, String> {
    codecs::png::PngDecoder::new(Cursor::new(bytes)).map_err(image_error)
}
fn webp_decoder(bytes: &[u8]) -> Result<codecs::webp::WebPDecoder<Cursor<&[u8]>>, String> {
    codecs::webp::WebPDecoder::new(Cursor::new(bytes)).map_err(image_error)
}
fn animation_count(bytes: &[u8], kind: InputKind) -> Result<usize, String> {
    let frames = match kind {
        InputKind::Png if apng_decoder(bytes)?.is_apng().map_err(image_error)? => {
            apng_decoder(bytes)?
                .apng()
                .map_err(image_error)?
                .into_frames()
        }
        InputKind::Webp if webp_decoder(bytes)?.has_animation() => {
            webp_decoder(bytes)?.into_frames()
        }
        _ => return Ok(1),
    };
    let mut count = 0usize;
    for frame in frames {
        let frame = frame.map_err(image_error)?;
        guard_dimensions(frame.buffer().width(), frame.buffer().height())?;
        count += 1;
        if count > 1000 {
            return Err("アニメーションのフレーム数が上限（1,000）を超えています。".into());
        }
    }
    Ok(count.max(1))
}
fn animation_frame(bytes: &[u8], kind: InputKind, index: usize) -> Result<DynamicImage, String> {
    let frames = match kind {
        InputKind::Png => apng_decoder(bytes)?
            .apng()
            .map_err(image_error)?
            .into_frames(),
        InputKind::Webp => webp_decoder(bytes)?.into_frames(),
        _ => return Err("この形式のアニメーションフレームには対応していません。".into()),
    };
    for (current, frame) in frames.enumerate() {
        let frame = frame.map_err(image_error)?;
        if current == index {
            return Ok(DynamicImage::ImageRgba8(frame.into_buffer()));
        }
    }
    Err(format!("フレーム {} は存在しません。", index + 1))
}
fn heif_decode(bytes: &[u8]) -> Result<DynamicImage, String> {
    let options = heic_rs::DecodeOptions::default()
        .with_layout(heic_rs::PixelLayout::Rgba8)
        .with_max_pixels(Some(MAX_PIXELS))
        .with_transforms(true)
        .with_threads(Some(1));
    let img =
        heic_rs::decode(bytes, &options).map_err(|e| format!("HEIF/HEICを読み込めません: {e}"))?;
    RgbaImage::from_raw(img.width, img.height, img.data)
        .map(DynamicImage::ImageRgba8)
        .ok_or_else(|| "HEIF/HEICの画素データが不正です。".into())
}
fn heic_encode(rgba: &RgbaImage, quality: u8) -> Result<Vec<u8>, String> {
    let (width, height) = rgba.dimensions();
    let mut rgb = Vec::with_capacity(
        (width as usize)
            .saturating_mul(height as usize)
            .saturating_mul(3),
    );
    for pixel in rgba.pixels() {
        rgb.extend_from_slice(&pixel.0[..3]);
    }
    let image =
        still265::Image::from_rgb8(&rgb, width, height, still265::ColorSpace::YCbCr, true, 8);
    let encoder = still265::RustStillHevcEncoder::new(still265::Effort::Fast);
    let qp = 51u8.saturating_sub((quality as u16 * 51 / 100) as u8);
    still265::encode_heic(image, &encoder, qp, still265::HeicEncodeOptions::default())
        .map_err(|e| format!("HEICを書き出せませんでした: {e}"))
}
fn avif_decode(bytes: &[u8]) -> Result<DynamicImage, String> {
    let config = zenavif::DecoderConfig::new()
        .threads(1)
        .frame_size_limit(MAX_PIXELS as u32)
        .prefer_8bit(true);
    let decoded = zenavif::decode_with(bytes, &config, &zenavif::Unstoppable)
        .map_err(|e| format!("AVIFを読み込めません: {e}"))?;
    avif_buffer_to_image(decoded)
}
fn avif_buffer_to_image(decoded: zenavif::PixelBuffer) -> Result<DynamicImage, String> {
    let (width, height) = (decoded.width(), decoded.height());
    guard_dimensions(width, height)?;
    if decoded.has_alpha() {
        let pixels = decoded
            .try_typed::<rgb::Rgba<u8>>()
            .ok_or_else(|| "AVIFのRGBA画素形式に対応していません。".to_string())?;
        let data = pixels.copy_to_contiguous_bytes();
        RgbaImage::from_raw(width, height, data)
            .map(DynamicImage::ImageRgba8)
            .ok_or_else(|| "AVIFの画素データが不正です。".into())
    } else {
        let pixels = decoded
            .try_typed::<rgb::Rgb<u8>>()
            .ok_or_else(|| "AVIFのRGB画素形式に対応していません。".to_string())?;
        let rgb = pixels.copy_to_contiguous_bytes();
        let data: Vec<u8> = rgb
            .chunks_exact(3)
            .flat_map(|p| [p[0], p[1], p[2], 255])
            .collect();
        RgbaImage::from_raw(width, height, data)
            .map(DynamicImage::ImageRgba8)
            .ok_or_else(|| "AVIFの画素データが不正です。".into())
    }
}
fn avif_frame_count(bytes: &[u8]) -> Result<usize, String> {
    let config = zenavif::DecoderConfig::new()
        .threads(1)
        .frame_size_limit(MAX_PIXELS as u32)
        .prefer_8bit(true);
    match zenavif::AnimationDecoder::new(bytes, &config) {
        Ok(decoder) => {
            let count = decoder.info().frame_count;
            if count == 0 || count > 1000 {
                return Err("AVIFフレーム数が対応上限（1,000）外です。".into());
            }
            Ok(count)
        }
        // A still AVIF has no animation track; the ordinary decoder reads its primary item.
        Err(_) => Ok(1),
    }
}
fn avif_frame(bytes: &[u8], index: usize) -> Result<DynamicImage, String> {
    let config = zenavif::DecoderConfig::new()
        .threads(1)
        .frame_size_limit(MAX_PIXELS as u32)
        .prefer_8bit(true);
    let mut decoder = zenavif::AnimationDecoder::new(bytes, &config)
        .map_err(|e| format!("AVIFアニメーションを読み込めません: {e}"))?;
    for current in 0..=index {
        let frame = decoder
            .next_frame(&zenavif::Unstoppable)
            .map_err(|e| format!("AVIFフレームを読み込めません: {e}"))?
            .ok_or_else(|| format!("フレーム {} は存在しません。", index + 1))?;
        if current == index {
            return avif_buffer_to_image(frame.pixels);
        }
    }
    Err(format!("フレーム {} は存在しません。", index + 1))
}
fn decode_kind(bytes: &[u8], kind: InputKind, frame: usize) -> Result<DynamicImage, String> {
    match kind {
        InputKind::Gif => gif_frame(bytes, frame).map(DynamicImage::ImageRgba8),
        InputKind::Tiff => extra::decode_tiff_page(bytes, frame),
        InputKind::Psd => extra::decode_psd(bytes),
        InputKind::Raw => extra::decode_raw(bytes),
        InputKind::Heif => {
            let ids = heif_items::item_ids(bytes)?;
            let id = *ids
                .get(frame)
                .ok_or_else(|| format!("HEIF画像 {} は存在しません。", frame + 1))?;
            if frame == 0 {
                heif_decode(bytes)
            } else {
                heif_decode(&heif_items::rewrite_primary(bytes, id)?)
            }
        }
        InputKind::Avif => {
            if avif_frame_count(bytes)? > 1 {
                avif_frame(bytes, frame)
            } else if frame == 0 {
                avif_decode(bytes)
            } else {
                Err("AVIFには指定されたフレームがありません。".into())
            }
        }
        InputKind::Png | InputKind::Webp if animation_count(bytes, kind)? > 1 => {
            animation_frame(bytes, kind, frame)
        }
        InputKind::Dicom => extra::decode_dicom(bytes, frame as u32),
        InputKind::Pdf => extra::decode_pdf(bytes, frame),
        InputKind::Ai => extra::decode_ai(bytes, frame),
        InputKind::Svg => {
            if frame != 0 { return Err("SVG has one frame".into()); }
            modern::svg(bytes, MAX_DIMENSION, MAX_PIXELS)
        }
        InputKind::Jxl => modern::decode_jxl(bytes, frame, MAX_DIMENSION, MAX_PIXELS),
        InputKind::Exr | InputKind::Hdr => {
            if frame != 0 { return Err("HDR image has one frame".into()); }
            let fmt = if kind == InputKind::Exr { ImageFormat::OpenExr } else { ImageFormat::Hdr };
            check_header_dimensions(bytes, fmt)?;
            let mut rgba = decoder(bytes, fmt)?.to_rgba32f();
            for p in rgba.pixels_mut() {
                for c in &mut p.0[..3] {
                    let v = if c.is_finite() { c.clamp(0.0, 1.0) } else { 0.0 };
                    *c = if v <= 0.0031308 { 12.92 * v } else { 1.055 * v.powf(1.0 / 2.4) - 0.055 };
                }
            }
            let (w,h) = rgba.dimensions();
            Ok(DynamicImage::ImageRgba8(RgbaImage::from_fn(w,h,|x,y| {
                let p=rgba.get_pixel(x,y);
                let alpha=if p[3].is_finite(){p[3].clamp(0.0,1.0)}else{0.0};
                image::Rgba([(p[0]*255.0+0.5) as u8,(p[1]*255.0+0.5) as u8,(p[2]*255.0+0.5) as u8,(alpha*255.0+0.5) as u8])
            })))
        }
        _ => {
            if frame != 0 {
                return Err("この画像には指定されたフレームがありません。".into());
            }
            let format = base_format(kind).ok_or("未対応の形式です")?;
            check_header_dimensions(bytes, format)?;
            decoder(bytes, format)
        }
    }
}
fn frame_count(bytes: &[u8], kind: InputKind) -> Result<usize, String> {
    match kind {
        InputKind::Gif => gif_frame_count(bytes),
        InputKind::Jxl => modern::jxl_frames(bytes),
        InputKind::Tiff => extra::tiff_page_count(bytes),
        InputKind::Pdf => extra::pdf_page_count(bytes),
        InputKind::Ai => {
            if !extra::is_pdf_compatible_ai(bytes) {
                Err("このAIファイルはPDF互換データを含まず、現在のブラウザ変換エンジンでは扱えません。".into())
            } else {
                extra::pdf_page_count(bytes)
            }
        }
        InputKind::Dicom => extra::dicom_frame_count(bytes).map(|n| n as usize),
        InputKind::Avif => avif_frame_count(bytes),
        InputKind::Heif => heif_items::item_ids(bytes).map(|ids| ids.len()),
        InputKind::Png | InputKind::Webp => animation_count(bytes, kind),
        _ => Ok(1),
    }
}

#[wasm_bindgen]
pub fn capabilities() -> String {
    json!({"inputs":["PNG","JPEG","JPG","BMP","GIF","TIFF","TIF","WebP","AVIF","HEIF","HEIC","CR2","NEF","ARW","PSD","AI (PDF互換)","PDF","DICOM","SVG","JXL","EXR","HDR","TGA"],"outputs":["PNG","JPEG","BMP","GIF","TIFF","WebP","AVIF","HEIF","HEIC","JXL","TGA"],"limits":{"maxBytes":MAX_BYTES,"maxPixels":MAX_PIXELS,"maxDimension":MAX_DIMENSION},"notes":{"webp":"可逆圧縮のみ","animated":"静止フレーム単位で変換","ai":"PDF互換AIファイルに限定","avif":"静止画と各フレーム","jxl":"lossless; maximum 1000 keyframes","hdr":"linear RGB to sRGB 8-bit, clamped; non-finite values become zero","svg":"offline; external resources disabled; embedded Noto Sans supports Latin, Greek and Cyrillic"}}).to_string()
}

#[wasm_bindgen]
pub fn inspect(bytes: &[u8], filename: &str) -> Result<String, JsValue> {
    if bytes.is_empty() {
        return Err(js_error("空のファイルです。"));
    }
    let kind = input_kind(bytes, filename).map_err(js_error)?;
    if kind == InputKind::Jxl {
        let (width,height)=modern::jxl_dimensions(bytes,MAX_DIMENSION,MAX_PIXELS).map_err(js_error)?;
        let frames=frame_count(bytes,kind).map_err(js_error)?;
        decode_kind(bytes,kind,0).map_err(js_error)?;
        return Ok(json!({"format":display_format(kind),"extension":lower_ext(filename),"width":width,"height":height,"frames":frames,"pages":frames,"animated":frames>1,"bytes":bytes.len()}).to_string());
    }
    let frames = frame_count(bytes, kind).map_err(js_error)?;
    if frames == 0 {
        return Err(js_error("ページまたはフレームが見つかりません。"));
    }
    let image = decode_kind(bytes, kind, 0).map_err(js_error)?;
    let (width, height) = (image.width(), image.height());
    guard_dimensions(width, height).map_err(js_error)?;
    Ok(json!({"format":display_format(kind),"extension":lower_ext(filename),"width":width,"height":height,"frames":frames,"pages":frames,"animated":matches!(kind, InputKind::Gif | InputKind::Png | InputKind::Webp | InputKind::Avif | InputKind::Jxl) && frames > 1,"bytes":bytes.len()}).to_string())
}

#[wasm_bindgen]
pub fn convert(bytes: &[u8], filename: &str, options_json: &str) -> Result<Vec<u8>, JsValue> {
    if bytes.is_empty() {
        return Err(js_error("空のファイルです。"));
    }
    let kind = input_kind(bytes, filename).map_err(js_error)?;
    let opts: ConvertOptions = serde_json::from_str(options_json)
        .map_err(|e| js_error(format!("変換設定を読み取れません: {e}")))?;
    let out = opts.format.to_ascii_lowercase();
    let is_jxl = out == "jxl";
    let is_heic = matches!(out.as_str(), "heif" | "heic");
    let out_fmt = if is_heic || is_jxl {
        None
    } else {
        Some(output_format(&out).ok_or_else(|| {
            js_error(format!("出力形式「{}」には対応していません。", opts.format))
        })?)
    };
    let count = frame_count(bytes, kind).map_err(js_error)?;
    if opts.frame >= count {
        return Err(js_error(format!(
            "ページ / フレーム {} は存在しません。",
            opts.frame + 1
        )));
    }
    let mut rgba = decode_kind(bytes, kind, opts.frame)
        .map_err(js_error)?
        .to_rgba8();
    let (source_width, source_height) = rgba.dimensions();
    guard_dimensions(source_width, source_height).map_err(js_error)?;
    let (width, height) = match (
        opts.width.filter(|v| *v > 0),
        opts.height.filter(|v| *v > 0),
    ) {
        (Some(w), Some(h)) => (w, h),
        (Some(w), None) => (
            w,
            ((source_height as u64 * w as u64) / source_width as u64).max(1) as u32,
        ),
        (None, Some(h)) => (
            ((source_width as u64 * h as u64) / source_height as u64).max(1) as u32,
            h,
        ),
        _ => (source_width, source_height),
    };
    guard_dimensions(width, height).map_err(js_error)?;
    if (width, height) != (source_width, source_height) {
        rgba = image::imageops::resize(&rgba, width, height, image::imageops::FilterType::Lanczos3);
    }
    let mut output = Cursor::new(Vec::new());
    if is_heic {
        return heic_encode(&rgba, opts.quality.clamp(1, 100)).map_err(js_error);
    }
    if is_jxl { return modern::encode_jxl(&rgba,width,height).map_err(js_error); }
    let fmt = out_fmt.unwrap();
    let quality = opts.quality.clamp(1, 100);
    let encoded = match fmt {
        ImageFormat::Png => codecs::png::PngEncoder::new_with_quality(
            &mut output,
            match opts.compression {
                0..=2 => codecs::png::CompressionType::Fast,
                3..=6 => codecs::png::CompressionType::Default,
                _ => codecs::png::CompressionType::Best,
            },
            codecs::png::FilterType::Adaptive,
        )
        .write_image(&rgba, width, height, ExtendedColorType::Rgba8),
        ImageFormat::Jpeg => {
            let mut white = RgbaImage::from_pixel(width, height, image::Rgba([255, 255, 255, 255]));
            image::imageops::overlay(&mut white, &rgba, 0, 0);
            codecs::jpeg::JpegEncoder::new_with_quality(&mut output, quality)
                .encode_image(&DynamicImage::ImageRgba8(white))
        }
        ImageFormat::Bmp => codecs::bmp::BmpEncoder::new(&mut output).encode(
            &rgba,
            width,
            height,
            ExtendedColorType::Rgba8,
        ),
        ImageFormat::Tga => codecs::tga::TgaEncoder::new(&mut output).encode(&rgba,width,height,ExtendedColorType::Rgba8),
        ImageFormat::Gif => codecs::gif::GifEncoder::new(&mut output).encode(
            &rgba,
            width,
            height,
            ExtendedColorType::Rgba8,
        ),
        ImageFormat::Tiff => codecs::tiff::TiffEncoder::new(&mut output).write_image(
            &rgba,
            width,
            height,
            ExtendedColorType::Rgba8,
        ),
        ImageFormat::WebP => codecs::webp::WebPEncoder::new_lossless(&mut output).encode(
            &rgba,
            width,
            height,
            ExtendedColorType::Rgba8,
        ),
        ImageFormat::Avif => codecs::avif::AvifEncoder::new_with_speed_quality(
            &mut output,
            6,
            quality,
        )
        .write_image(&rgba, width, height, ExtendedColorType::Rgba8),
        _ => return Err(js_error("指定した出力形式はサポートされていません。")),
    };
    encoded.map_err(|e| js_error(format!("画像を書き出せませんでした: {e}")))?;
    Ok(output.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png(width: u32, height: u32, pixel: [u8; 4]) -> Vec<u8> {
        let pixels = RgbaImage::from_pixel(width, height, image::Rgba(pixel));
        let mut bytes = Cursor::new(Vec::new());
        codecs::png::PngEncoder::new(&mut bytes)
            .write_image(&pixels, width, height, ExtendedColorType::Rgba8)
            .unwrap();
        bytes.into_inner()
    }

    fn one_page_pdf() -> Vec<u8> {
        let content = b"1 0 0 rg 0 0 16 16 re f";
        let objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>".to_vec(),
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_vec(),
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 16 16] /Resources << >> /Contents 4 0 R >>".to_vec(),
            [format!("<< /Length {} >>\nstream\n", content.len()).as_bytes(), content, b"\nendstream"].concat(),
        ];
        let mut pdf = b"%PDF-1.4\n".to_vec();
        let mut offsets = vec![0usize];
        for (index, object) in objects.iter().enumerate() {
            offsets.push(pdf.len());
            pdf.extend_from_slice(format!("{} 0 obj\n", index + 1).as_bytes());
            pdf.extend_from_slice(object);
            pdf.extend_from_slice(b"\nendobj\n");
        }
        let xref = pdf.len();
        pdf.extend_from_slice(format!("xref\n0 {}\n", offsets.len()).as_bytes());
        pdf.extend_from_slice(b"0000000000 65535 f \n");
        for offset in offsets.iter().skip(1) {
            pdf.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
        }
        pdf.extend_from_slice(
            format!(
                "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n",
                offsets.len()
            )
            .as_bytes(),
        );
        pdf
    }

    #[test]
    fn png_inspection_and_resize_conversion_are_rust_only() {
        let source = png(4, 2, [20, 80, 150, 255]);
        let details: serde_json::Value =
            serde_json::from_str(&inspect(&source, "photo.png").unwrap()).unwrap();
        assert_eq!(details["width"], 4);
        assert_eq!(details["height"], 2);
        assert_eq!(details["frames"], 1);
        let converted = convert(&source, "photo.png", r#"{"format":"png","width":2}"#).unwrap();
        let decoded = decoder(&converted, ImageFormat::Png).unwrap();
        assert_eq!((decoded.width(), decoded.height()), (2, 1));
        assert_eq!(decoded.to_rgba8().get_pixel(0, 0).0, [20, 80, 150, 255]);
    }

    #[test]
    fn transparent_pixels_are_composited_white_in_jpeg_and_gif_can_be_saved_static() {
        let source = png(1, 1, [255, 0, 0, 0]);
        let jpeg = convert(&source, "alpha.png", r#"{"format":"jpeg","quality":100}"#).unwrap();
        let pixel = image::load_from_memory_with_format(&jpeg, ImageFormat::Jpeg)
            .unwrap()
            .to_rgb8()
            .get_pixel(0, 0)
            .0;
        assert!(
            pixel.iter().all(|channel| *channel >= 245),
            "transparent JPEG pixel should become white: {pixel:?}"
        );

        let mut gif = Cursor::new(Vec::new());
        let frames = vec![
            image::Frame::new(image::RgbaImage::from_pixel(
                2,
                2,
                image::Rgba([255, 0, 0, 255]),
            )),
            image::Frame::new(image::RgbaImage::from_pixel(
                2,
                2,
                image::Rgba([0, 0, 255, 255]),
            )),
        ];
        codecs::gif::GifEncoder::new(&mut gif)
            .encode_frames(frames.into_iter())
            .unwrap();
        let source = gif.into_inner();
        assert_eq!(gif_frame_count(&source).unwrap(), 2);
        let static_gif = convert(&source, "moving.gif", r#"{"format":"gif","frame":1}"#).unwrap();
        assert_eq!(gif_frame_count(&static_gif).unwrap(), 1);
        assert_eq!(gif_frame(&source, 1).unwrap().dimensions(), (2, 2));
    }

    #[test]
    fn heic_encoder_output_can_be_decoded_in_wasm_codec_stack() {
        let source = png(8, 8, [30, 90, 160, 255]);
        let heic = convert(&source, "tiny.png", r#"{"format":"heic","quality":75}"#).unwrap();
        let decoded = heif_decode(&heic).expect("HEIC output should decode");
        assert_eq!((decoded.width(), decoded.height()), (8, 8));
    }

    #[test]
    fn multipage_tiff_inspection_and_page_selection_work() {
        let mut bytes = Cursor::new(Vec::new());
        {
            let mut encoder = tiff::encoder::TiffEncoder::new(&mut bytes).unwrap();
            encoder
                .write_image::<tiff::encoder::colortype::RGB8>(2, 1, &[255, 0, 0, 255, 0, 0])
                .unwrap();
            encoder
                .write_image::<tiff::encoder::colortype::RGB8>(1, 2, &[0, 0, 255, 0, 0, 255])
                .unwrap();
            drop(encoder);
        }
        let bytes = bytes.into_inner();
        assert_eq!(extra::tiff_page_count(&bytes).unwrap(), 2);
        let second = extra::decode_tiff_page(&bytes, 1).unwrap();
        assert_eq!((second.width(), second.height()), (1, 2));
    }

    #[test]
    fn pdf_page_count_and_rasterization_work_without_network_fonts() {
        let pdf = one_page_pdf();
        assert_eq!(extra::pdf_page_count(&pdf).unwrap(), 1);
        let image = extra::decode_pdf(&pdf, 0).unwrap();
        assert_eq!((image.width(), image.height()), (16, 16));
    }

    #[test]
    fn all_advertised_raster_outputs_have_real_encoders() {
        let source = png(3, 2, [60, 120, 180, 255]);
        for format in ["png", "jpeg", "bmp", "gif", "tiff", "webp", "avif", "heif"] {
            let bytes =
                convert(&source, "tiny.png", &format!(r#"{{"format":"{format}"}}"#)).unwrap();
            assert!(!bytes.is_empty(), "{format} encoder returned no bytes");
            if format == "avif" {
                let decoded = avif_decode(&bytes)
                    .expect("AVIF output should decode with the bundled pure-Rust decoder");
                assert_eq!((decoded.width(), decoded.height()), (3, 2));
            } else {
                let expected = output_format(format).unwrap_or(ImageFormat::Png);
                if format == "heif" {
                    assert!(bytes.starts_with(b"\0\0\0"));
                } else {
                    assert_eq!(image::guess_format(&bytes).unwrap(), expected, "{format}");
                }
            }
        }
    }

    #[test]
    fn jpeg_xl_is_lossless_with_alpha_and_tga_round_trips_rgba() {
        let pixels = RgbaImage::from_raw(2, 2, vec![25, 80, 190, 255, 210, 30, 90, 64, 4, 120, 240, 128, 40, 50, 60, 0]).unwrap();
        let mut input = Cursor::new(Vec::new());
        codecs::png::PngEncoder::new(&mut input)
            .write_image(&pixels, 2, 2, ExtendedColorType::Rgba8).unwrap();
        let input = input.into_inner();
        let jxl = convert(&input, "tiny.png", r#"{"format":"jxl"}"#).unwrap();
        assert!(jxl.starts_with(b"\xff\x0a") || (jxl.len()>12 && &jxl[4..12]==b"JXL \r\n\x87\n"));
        let decoded=modern::decode_jxl(&jxl,0,MAX_DIMENSION,MAX_PIXELS).unwrap().to_rgba8();
        assert_eq!(decoded.as_raw(),pixels.as_raw());
        let tga=convert(&input,"tiny.png",r#"{"format":"tga"}"#).unwrap();
        let decoded=ImageReader::with_format(Cursor::new(tga),ImageFormat::Tga).decode().unwrap().to_rgba8();
        assert_eq!(decoded.as_raw(),pixels.as_raw());
    }

    #[test]
    fn svg_rasterizes_offline_and_ignores_external_images() {
        let svg=br##"<svg xmlns="http://www.w3.org/2000/svg" width="2" height="1"><rect width="1" height="1" fill="#ff0000"/><image href="https://example.invalid/pixel.png" x="1" width="1" height="1"/></svg>"##;
        let image=modern::svg(svg,MAX_DIMENSION,MAX_PIXELS).unwrap().to_rgba8();
        assert_eq!(image.get_pixel(0,0).0,[255,0,0,255]);
        assert_eq!(image.get_pixel(1,0).0,[0,0,0,0]);
    }
}
