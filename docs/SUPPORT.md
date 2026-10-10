# Format support and limits

The browser engine handles files locally. This page describes the current implementation, rather than promising support for every variant of a listed format. Decoder errors are surfaced per file; a file extension by itself does not guarantee that its contents can be decoded.

## Input formats

| Input | Current behavior and limits |
|---|---|
| PNG, JPEG/JPG, BMP | Decoded as one raster image. APNG frames are exposed as separate still images. JPEG output composites transparency onto white. |
| WebP | Still and animated WebP frames can be selected and converted separately as still images. |
| GIF | Frames are enumerated and can be selected or converted separately as static images. Frame count is capped at 1,000; each decoded frame is subject to the image dimension limits. |
| TIFF/TIF | Pages can be enumerated and selected separately. The extra TIFF decoder handles common integer grayscale, grayscale-alpha, RGB, RGBA, and palette pages at 8 or 16 bits per sample; 16-bit indexed palettes and uncommon sample/color layouts (including floating-point, CMYK, YCbCr, Lab, and multiband) are rejected. |
| HEIF/HEIC | The decoder reads visible HEVC still-image items in still-image containers, with the primary item first; the UI can select additional items individually. Grid tiles, auxiliary images, thumbnails, and hidden items are omitted. Sequence-branded HEIF files are rejected. This is a practical subset, not full HEIF conformance. |
| AVIF/AVIFS | Still images and AV1 sequence frames are exposed for separate still-image conversion. Frame enumeration and decoding use the bundled pure-Rust decoder and prefer 8-bit output. Actual coverage depends on the AV1 features supported by that decoder. |
| CR2, NEF, ARW | `rawloader` must recognize the camera encoding. The app makes a simple 8-bit preview using a small-neighborhood CFA interpolation and white-balance coefficients. It does not apply a camera color profile or provide professional RAW development controls, so colors and tone can differ from a camera manufacturer's software. |
| PSD | The merged composite is converted to raster RGBA; layers, masks, and editable Photoshop structure are not preserved. |
| PDF | Pages are rendered independently by the bundled Rust renderer at its default page scale. Page size, fonts, transparency, and advanced PDF features can affect rendering; there is no resolution control for the PDF rasterization step. |
| AI | Only a PDF-compatible AI file whose content begins with a `%PDF-` header is accepted. It follows the PDF page-rendering path. PostScript-only Illustrator files are not supported. |
| DICOM/DCM | `NumberOfFrames` is used for frame selection (missing means one frame), with a 1,000-frame limit. The enabled pure-Rust decoder covers native pixel data, JPEG, RLE, and deflated transfer syntaxes. JPEG-LS and JPEG 2000 support is not enabled; unsupported transfer syntaxes fail with an explanation. |
| SVG | Parsed and rasterized offline by the bundled renderer, with a 16 MiB SVG document limit. External `href` resources and embedded SVG images are omitted. Embedded PNG/JPEG/GIF/WebP data images are limited to 8 MiB each, with at most 40 million decoded pixels in total. Text rendering uses the bundled Noto Sans font; glyphs outside its coverage may be missing. Convert text to paths in the source SVG for consistent rendering. |
| EXR, HDR | Linear RGB is converted to 8-bit sRGB; values are clamped to [0, 1], so out-of-range highlights are clipped. Non-finite values become zero. EXR uses the first supported non-deep RGB/RGBA layer; layers and HDR precision are not retained. |
| JXL | Decoded by the bundled JPEG XL decoder; coverage depends on supported codestream features. Animated JXL files expose keyframes for individual still-image conversion, up to 1,000 frames. Decoding requests sRGB output; CMYK is rejected and arbitrary ICC profile transforms are not supported. Decoder-tracked internal allocation is capped at 512 MiB; this does not account for every application allocation. |
| TGA | Decoded as raster RGBA where the input encoding is supported. |

## Output formats and settings

PNG, JPEG, BMP, GIF, TIFF, WebP, AVIF, HEIF, HEIC, JXL, and TGA are exposed as outputs. JXL output is lossless and does not use the quality control; its encoder requires both output dimensions to be at least 2 px; TGA output writes RGBA pixels and does not use the compression or quality controls. Every output is a single still image. Selecting multiple input pages or frames creates separate files; GIF output is static and does not preserve animation. HEIF/HEIC output uses the bundled HEVC still-image encoder. WebP output is lossless. JPEG, AVIF, and HEIF/HEIC accept a quality value. PNG accepts a compression level. BMP, GIF, TIFF, and WebP do not use the UI compression control in the current engine.

Alpha handling depends on the output format. JPEG composites onto white; formats encoded through the engine's RGBA raster path preserve alpha where the encoder supports it. HEIF/HEIC encoding currently passes RGB pixels to its encoder and discards alpha.

The engine rejects files above 128 MiB, images above 80 million pixels, or either dimension above 16,384 pixels. A conversion run stores up to 256 MiB of generated files, and ZIP download is limited to 256 MiB of uncompressed output. These are software limits, not a guarantee that every file within them fits a browser's available memory. An 80-million-pixel RGBA image alone occupies about 305 MiB, before decoder and conversion buffers; some format parsers allocate intermediate buffers before the final raster size is known.

## Validation scope

The repository includes targeted tests and local fixtures for representative formats. It has not been validated against every camera model, PDF feature, DICOM transfer syntax, color profile, bit depth, or browser memory configuration. Treat support for other variants as best effort and rely on the per-file decode result.
