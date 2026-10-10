# Third-party notices

The original application code in this repository is licensed under **GNU Affero General Public License version 3 only (AGPL-3.0-only)**. The full text is in the repository-root `LICENSE` file. The WebAssembly engine links `zenavif` and `rav1d-safe`; their package metadata offers AGPL-3.0-only or separate commercial terms. This distribution uses the AGPL option. The engine also links `still265` (`GPL-2.0-or-later`), for which GPL version 3 is an available version. This notice does not change the license of separately identified third-party components.

The source packages and license texts for the copyleft crates used by the Rust engine are included under [`third-party-sources/`](../third-party-sources/):

- `still265 0.6.0` — GPL-2.0-or-later; source snapshot and original `LICENSE` are in [`still265-0.6.0`](../third-party-sources/still265-0.6.0/). The snapshot includes the two small local changes from `engine/vendor/still265` that avoid wall-clock timing calls on WebAssembly. It contains the Rust BPG/HEVC still-image encoder implementation; there is no separate BPG crate in the locked dependency graph.
- `rawloader 0.37.2` — LGPL-2.1; complete crate source snapshot is in [`rawloader-0.37.2`](../third-party-sources/rawloader-0.37.2/). Its registry package did not include a standalone license file, so the official GNU LGPL-2.1 text is provided as [`LGPL-2.1.txt`](../third-party-sources/LGPL-2.1.txt).
- `zenavif 0.1.6` and `rav1d-safe 0.5.7` — `AGPL-3.0-only OR LicenseRef-Imazen-Commercial`; source snapshots and both license files are included in [`zenavif-0.1.6`](../third-party-sources/zenavif-0.1.6/) and [`rav1d-safe-0.5.7`](../third-party-sources/rav1d-safe-0.5.7/). This distribution uses the AGPL-3.0-only option.
- `zenavif-parse 0.6.2` — MPL-2.0; source and license are included in [`zenavif-parse-0.6.2`](../third-party-sources/zenavif-parse-0.6.2/).

The following are the direct Rust runtime dependencies declared in `engine/Cargo.toml`. The full locked graph, including transitive and target-specific packages, follows.

| Crate | License declared in package metadata |
|---|---|
| `wasm-bindgen` | MIT OR Apache-2.0 |
| `js-sys` | MIT OR Apache-2.0 |
| `serde` | MIT OR Apache-2.0 |
| `serde_json` | MIT OR Apache-2.0 |
| `image` | MIT OR Apache-2.0 |
| `tiff` | MIT OR Apache-2.0 |
| `psd` | MIT |
| `rawloader` | LGPL-2.1 |
| `heic-rs` | MIT OR Apache-2.0 |
| `still265` | GPL-2.0-or-later |
| `dicom-object` | MIT OR Apache-2.0 |
| `dicom-pixeldata` | MIT OR Apache-2.0 |
| `hayro` | MIT OR Apache-2.0 |
| `zenavif` | AGPL-3.0-only OR LicenseRef-Imazen-Commercial |
| `rgb` | MIT OR Apache-2.0 |
| `resvg` | MIT OR Apache-2.0 |
| `jxl-oxide` | MIT OR Apache-2.0 |
| `zune-jpegxl` | MIT OR Apache-2.0 OR Zlib |
| `zune-core` | MIT OR Apache-2.0 OR Zlib |

## License and copyright texts

The distribution includes the upstream `LICENSE*`, `COPYING*`, `NOTICE*`, and `COPYRIGHT*` files found at the root of 290 locked Rust crate packages in [`third-party-licenses/rust/`](../third-party-licenses/rust/). [`NO-STANDALONE-NOTICE.md`](../third-party-licenses/rust/NO-STANDALONE-NOTICE.md) lists 33 registry crates whose package archive has no root notice file, with the license identifier from its normalized manifest; reusable full texts for those declared license families are in [`third-party-licenses/common/`](../third-party-licenses/common/). The modified `still265` build uses the vendored, WASM-adjusted source and its license under `engine/vendor/still265` and `third-party-sources/still265-0.6.0/`.

The browser ZIP library `fflate` is distributed under MIT; its notice is in [`third-party-licenses/npm/fflate-0.8.3/`](../third-party-licenses/npm/fflate-0.8.3/). Astro and TypeScript are build-time dependencies rather than browser runtime libraries; their notices are included in [`third-party-licenses/npm/astro-5.18.2/`](../third-party-licenses/npm/astro-5.18.2/) and [`third-party-licenses/npm/typescript-5.9.3/`](../third-party-licenses/npm/typescript-5.9.3/).

The PDF renderer bundles Foxit standard-font data extracted from PDFium. These assets are not OFL fonts: their PDFium BSD-style notice and the bundled color-profile CC0 notice are copied in [`third-party-licenses/embedded-assets/hayro-interpret-0.7.0/`](../third-party-licenses/embedded-assets/hayro-interpret-0.7.0/), with the asset package README retained for provenance. The hayro crate's MIT and Apache-2.0 license texts are also included with the Rust notices.

The SVG renderer embeds Noto Sans Regular from [the Noto font project](https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans). Its copyright and SIL Open Font License 1.1 are included in [`third-party-licenses/fonts/NotoSans/OFL.txt`](../third-party-licenses/fonts/NotoSans/OFL.txt). The font is bundled in `engine/assets/NotoSans-Regular.ttf`; it provides Latin, Greek, and Cyrillic glyphs.

## Locked Rust package inventory

This inventory is generated from `engine/Cargo.lock` and the local Cargo registry package metadata. It includes target-specific packages present in the lockfile, even if they are not compiled for `wasm32-unknown-unknown`. The package metadata declares the license identifier; use each package's own notices and license files when redistributing it.

| Package | Version | Declared license |
|---|---:|---|
| `adler2` | 2.0.1 | 0BSD OR MIT OR Apache-2.0 |
| `aho-corasick` | 1.1.5 | Unlicense OR MIT |
| `aligned` | 0.4.3 | MIT OR Apache-2.0 |
| `aligned-vec` | 0.6.4 | MIT |
| `alloc-no-stdlib` | 2.0.4 | BSD-3-Clause |
| `alloc-stdlib` | 0.2.4 | BSD-3-Clause |
| `almost-enough` | 0.4.4 | MIT OR Apache-2.0 |
| `android_system_properties` | 0.1.6 | MIT OR Apache-2.0 |
| `anyhow` | 1.0.104 | MIT OR Apache-2.0 |
| `arbitrary` | 1.4.2 | MIT OR Apache-2.0 |
| `archmage` | 0.8.9 | MIT OR Apache-2.0 |
| `archmage` | 0.9.29 | MIT OR Apache-2.0 |
| `archmage-macros` | 0.8.9 | MIT OR Apache-2.0 |
| `archmage-macros` | 0.9.29 | MIT OR Apache-2.0 |
| `arg_enum_proc_macro` | 0.3.4 | MIT |
| `arrayref` | 0.3.9 | BSD-2-Clause |
| `arrayvec` | 0.7.8 | MIT OR Apache-2.0 |
| `as-slice` | 0.2.1 | MIT OR Apache-2.0 |
| `assert_matches` | 1.5.0 | MIT/Apache-2.0 |
| `atomig` | 0.4.3 | MIT/Apache-2.0 |
| `atomig-macro` | 0.4.0 | MIT/Apache-2.0 |
| `autocfg` | 1.5.1 | Apache-2.0 OR MIT |
| `av-scenechange` | 0.14.1 | MIT |
| `av1-grain` | 0.2.5 | BSD-2-Clause |
| `avif-serialize` | 0.8.9 | BSD-3-Clause |
| `base64` | 0.22.1 | MIT OR Apache-2.0 |
| `bit_field` | 0.10.3 | Apache-2.0/MIT |
| `bitflags` | 1.3.2 | MIT/Apache-2.0 |
| `bitflags` | 2.13.2 | MIT OR Apache-2.0 |
| `bitreader` | 0.3.11 | MIT OR Apache-2.0 |
| `bitstream-io` | 4.10.0 | MIT/Apache-2.0 |
| `brotli` | 8.0.4 | BSD-3-Clause AND MIT |
| `brotli-decompressor` | 5.0.3 | BSD-3-Clause/MIT |
| `built` | 0.8.1 | MIT |
| `bumpalo` | 3.20.3 | MIT OR Apache-2.0 |
| `bytemuck` | 1.25.2 | Zlib OR Apache-2.0 OR MIT |
| `bytemuck_derive` | 1.12.1 | Zlib OR Apache-2.0 OR MIT |
| `byteorder` | 1.5.0 | Unlicense OR MIT |
| `byteorder-lite` | 0.1.0 | Unlicense OR MIT |
| `byteordered` | 0.6.0 | MIT OR Apache-2.0 |
| `cc` | 1.4.7 | MIT OR Apache-2.0 |
| `cfg-if` | 1.0.5 | MIT OR Apache-2.0 |
| `chrono` | 0.4.45 | MIT OR Apache-2.0 |
| `color` | 0.3.3 | Apache-2.0 OR MIT |
| `color_quant` | 1.1.0 | MIT |
| `core_maths` | 0.1.1 | MIT |
| `core-foundation-sys` | 0.8.7 | MIT OR Apache-2.0 |
| `crc32fast` | 1.5.2 | MIT OR Apache-2.0 |
| `crossbeam-deque` | 0.8.8 | MIT OR Apache-2.0 |
| `crossbeam-epoch` | 0.9.21 | MIT OR Apache-2.0 |
| `crossbeam-utils` | 0.8.23 | MIT OR Apache-2.0 |
| `crunchy` | 0.2.4 | MIT |
| `data-url` | 0.3.2 | MIT OR Apache-2.0 |
| `dicom-core` | 0.10.0 | MIT OR Apache-2.0 |
| `dicom-dictionary-std` | 0.10.0 | MIT OR Apache-2.0 |
| `dicom-encoding` | 0.10.0 | MIT OR Apache-2.0 |
| `dicom-object` | 0.10.0 | MIT OR Apache-2.0 |
| `dicom-parser` | 0.10.0 | MIT OR Apache-2.0 |
| `dicom-pixeldata` | 0.10.0 | MIT OR Apache-2.0 |
| `dicom-transfer-syntax-registry` | 0.10.0 | MIT OR Apache-2.0 |
| `either` | 1.18.0 | MIT OR Apache-2.0 |
| `encoding` | 0.2.33 | MIT |
| `encoding_index_tests` | 0.1.4 | CC0-1.0 |
| `encoding-index-japanese` | 1.20141219.5 | CC0-1.0 |
| `encoding-index-korean` | 1.20141219.5 | CC0-1.0 |
| `encoding-index-simpchinese` | 1.20141219.5 | CC0-1.0 |
| `encoding-index-singlebyte` | 1.20141219.5 | CC0-1.0 |
| `encoding-index-tradchinese` | 1.20141219.5 | CC0-1.0 |
| `enough` | 0.4.4 | MIT OR Apache-2.0 |
| `enumn` | 0.1.14 | MIT OR Apache-2.0 |
| `equator` | 0.4.2 | MIT |
| `equator-macro` | 0.4.2 | MIT |
| `euclid` | 0.22.14 | MIT OR Apache-2.0 |
| `exr` | 1.74.2 | BSD-3-Clause |
| `fallible_collections` | 0.5.2 | MIT OR Apache-2.0 |
| `fastrand` | 2.5.0 | Apache-2.0 OR MIT |
| `fax` | 0.2.7 | MIT |
| `fdeflate` | 0.3.7 | MIT OR Apache-2.0 |
| `fearless_simd` | 0.4.1 | Apache-2.0 OR MIT |
| `fearless_simd` | 1.0.0 | Apache-2.0 OR MIT |
| `find-msvc-tools` | 0.1.13 | MIT OR Apache-2.0 |
| `flate2` | 1.1.10 | MIT OR Apache-2.0 |
| `float-cmp` | 0.9.0 | MIT |
| `foldhash` | 0.2.0 | Zlib |
| `font-types` | 0.11.3 | MIT OR Apache-2.0 |
| `fontdb` | 0.23.0 | MIT |
| `futures-core` | 0.3.34 | MIT OR Apache-2.0 |
| `futures-task` | 0.3.34 | MIT OR Apache-2.0 |
| `futures-util` | 0.3.34 | MIT OR Apache-2.0 |
| `garb` | 0.2.8 | MIT OR Apache-2.0 |
| `generator` | 0.8.10 | MIT/Apache-2.0 |
| `getrandom` | 0.3.4 | MIT OR Apache-2.0 |
| `getrandom` | 0.4.3 | MIT OR Apache-2.0 |
| `gif` | 0.13.3 | MIT OR Apache-2.0 |
| `gif` | 0.14.2 | MIT OR Apache-2.0 |
| `glifo` | 0.1.1 | Apache-2.0 OR MIT |
| `glob` | 0.3.4 | MIT OR Apache-2.0 |
| `guillotiere` | 0.7.0 | MIT/Apache-2.0 |
| `half` | 2.7.1 | MIT OR Apache-2.0 |
| `hashbrown` | 0.17.1 | MIT OR Apache-2.0 |
| `hayro` | 0.7.1 | Apache-2.0 OR MIT |
| `hayro-ccitt` | 0.3.0 | Apache-2.0 OR MIT |
| `hayro-ccitt` | 0.4.0 | Apache-2.0 OR MIT |
| `hayro-cmap` | 0.1.0 | Apache-2.0 OR MIT |
| `hayro-interpret` | 0.7.0 | Apache-2.0 OR MIT |
| `hayro-jbig2` | 0.3.1 | Apache-2.0 OR MIT |
| `hayro-jpeg2000` | 0.3.5 | Apache-2.0 OR MIT |
| `hayro-postscript` | 0.1.0 | Apache-2.0 OR MIT |
| `hayro-syntax` | 0.7.2 | Apache-2.0 OR MIT |
| `heck` | 0.5.0 | MIT OR Apache-2.0 |
| `heic-rs` | 0.1.1 | MIT OR Apache-2.0 |
| `iana-time-zone` | 0.1.65 | MIT OR Apache-2.0 |
| `iana-time-zone-haiku` | 0.1.2 | MIT OR Apache-2.0 |
| `image` | 0.25.10 | MIT OR Apache-2.0 |
| `image-webp` | 0.2.4 | MIT OR Apache-2.0 |
| `imagesize` | 0.13.0 | MIT |
| `imgref` | 1.12.2 | CC0-1.0 OR Apache-2.0 |
| `interpolate_name` | 0.2.4 | MIT |
| `itertools` | 0.14.0 | MIT OR Apache-2.0 |
| `itoa` | 1.0.18 | MIT OR Apache-2.0 |
| `jobserver` | 0.1.35 | MIT OR Apache-2.0 |
| `jpeg-decoder` | 0.3.2 | MIT OR Apache-2.0 |
| `jpeg-encoder` | 0.7.1 | (MIT OR Apache-2.0) AND IJG |
| `js-sys` | 0.3.103 | MIT OR Apache-2.0 |
| `jxl-bitstream` | 1.1.0 | MIT OR Apache-2.0 |
| `jxl-coding` | 1.0.1 | MIT OR Apache-2.0 |
| `jxl-color` | 0.11.0 | MIT OR Apache-2.0 |
| `jxl-frame` | 0.13.3 | MIT OR Apache-2.0 |
| `jxl-grid` | 0.6.2 | MIT OR Apache-2.0 |
| `jxl-image` | 0.13.0 | MIT OR Apache-2.0 |
| `jxl-jbr` | 0.2.1 | MIT OR Apache-2.0 |
| `jxl-modular` | 0.11.3 | MIT OR Apache-2.0 |
| `jxl-oxide` | 0.12.6 | MIT OR Apache-2.0 |
| `jxl-oxide-common` | 1.0.0 | MIT OR Apache-2.0 |
| `jxl-render` | 0.12.4 | MIT OR Apache-2.0 |
| `jxl-threadpool` | 1.0.0 | MIT OR Apache-2.0 |
| `jxl-vardct` | 0.11.1 | MIT OR Apache-2.0 |
| `kurbo` | 0.11.3 | Apache-2.0 OR MIT |
| `kurbo` | 0.13.1 | Apache-2.0 OR MIT |
| `lazy_static` | 1.5.1 | MIT OR Apache-2.0 |
| `leb128` | 0.2.7 | MIT OR Apache-2.0 |
| `lebe` | 0.5.3 | BSD-3-Clause |
| `libc` | 0.2.189 | MIT OR Apache-2.0 |
| `libfuzzer-sys` | 0.4.13 | (MIT OR Apache-2.0) AND NCSA |
| `libm` | 0.2.16 | MIT |
| `linear-srgb` | 0.6.12 | MIT OR Apache-2.0 |
| `linebender_resource_handle` | 0.1.1 | Apache-2.0 OR MIT |
| `lock_api` | 0.4.14 | MIT OR Apache-2.0 |
| `log` | 0.4.34 | MIT OR Apache-2.0 |
| `loom` | 0.7.2 | MIT |
| `loop9` | 0.1.5 | MIT |
| `magetypes` | 0.9.29 | MIT OR Apache-2.0 |
| `matchers` | 0.2.0 | MIT |
| `maybe-rayon` | 0.1.1 | MIT |
| `memchr` | 2.8.3 | Unlicense OR MIT |
| `miniz_oxide` | 0.8.9 | MIT OR Zlib OR Apache-2.0 |
| `miniz_oxide` | 0.9.1 | MIT OR Zlib OR Apache-2.0 |
| `moxcms` | 0.8.1 | BSD-3-Clause OR Apache-2.0 |
| `nasm-rs` | 0.3.2 | MIT OR Apache-2.0 |
| `new_debug_unreachable` | 1.0.6 | MIT |
| `no_std_io2` | 0.9.4 | Apache-2.0 OR MIT |
| `nom` | 8.0.0 | MIT |
| `noop_proc_macro` | 0.3.0 | MIT |
| `nu-ansi-term` | 0.50.3 | MIT |
| `num-bigint` | 0.4.8 | MIT OR Apache-2.0 |
| `num-complex` | 0.4.6 | MIT OR Apache-2.0 |
| `num-derive` | 0.4.2 | MIT OR Apache-2.0 |
| `num-integer` | 0.1.47 | MIT OR Apache-2.0 |
| `num-rational` | 0.4.2 | MIT OR Apache-2.0 |
| `num-traits` | 0.2.19 | MIT OR Apache-2.0 |
| `once_cell` | 1.21.4 | MIT OR Apache-2.0 |
| `parking_lot` | 0.12.5 | MIT OR Apache-2.0 |
| `parking_lot_core` | 0.9.12 | MIT OR Apache-2.0 |
| `paste` | 1.0.15 | MIT OR Apache-2.0 |
| `pastey` | 0.1.1 | MIT OR Apache-2.0 |
| `peniko` | 0.6.1 | Apache-2.0 OR MIT |
| `phf` | 0.13.1 | MIT |
| `phf_generator` | 0.13.1 | MIT |
| `phf_macros` | 0.13.1 | MIT |
| `phf_shared` | 0.13.1 | MIT |
| `pic-scale` | 0.7.12 | BSD-3-Clause OR Apache-2.0 |
| `pico-args` | 0.5.0 | MIT |
| `pin-project-lite` | 0.2.17 | Apache-2.0 OR MIT |
| `png` | 0.17.16 | MIT OR Apache-2.0 |
| `png` | 0.18.1 | MIT OR Apache-2.0 |
| `polycool` | 0.4.0 | MIT OR Apache-2.0 |
| `ppv-lite86` | 0.2.21 | MIT OR Apache-2.0 |
| `proc-macro2` | 1.0.107 | MIT OR Apache-2.0 |
| `profiling` | 1.0.18 | MIT OR Apache-2.0 |
| `profiling-procmacros` | 1.0.18 | MIT OR Apache-2.0 |
| `psd` | 0.3.5 | MIT/Apache-2.0 |
| `pulp` | 0.22.3 | MIT |
| `pulp-wasm-simd-flag` | 0.1.1 | MIT |
| `pxfm` | 0.1.30 | BSD-3-Clause OR Apache-2.0 |
| `quick-error` | 2.0.1 | MIT/Apache-2.0 |
| `quote` | 1.0.47 | MIT OR Apache-2.0 |
| `r-efi` | 5.3.0 | MIT OR Apache-2.0 OR LGPL-2.1-or-later |
| `r-efi` | 6.0.0 | MIT OR Apache-2.0 OR LGPL-2.1-or-later |
| `rand` | 0.9.5 | MIT OR Apache-2.0 |
| `rand_chacha` | 0.9.0 | MIT OR Apache-2.0 |
| `rand_core` | 0.9.5 | MIT OR Apache-2.0 |
| `rav1d-disjoint-mut` | 0.3.2 | BSD-2-Clause OR MIT OR Apache-2.0 |
| `rav1d-safe` | 0.5.7 | AGPL-3.0-only OR LicenseRef-Imazen-Commercial |
| `rav1e` | 0.8.1 | BSD-2-Clause |
| `ravif` | 0.13.0 | BSD-3-Clause |
| `raw-cpuid` | 11.6.0 | MIT |
| `rawloader` | 0.37.2 | LGPL-2.1 |
| `rayon` | 1.12.0 | MIT OR Apache-2.0 |
| `rayon-core` | 1.13.0 | MIT OR Apache-2.0 |
| `read-fonts` | 0.39.2 | MIT OR Apache-2.0 |
| `reborrow` | 0.5.5 | MIT |
| `redox_syscall` | 0.5.18 | MIT |
| `regex-automata` | 0.4.18 | MIT OR Apache-2.0 |
| `regex-syntax` | 0.8.11 | MIT OR Apache-2.0 |
| `resvg` | 0.45.1 | Apache-2.0 OR MIT |
| `rgb` | 0.8.53 | MIT |
| `roxmltree` | 0.20.0 | MIT OR Apache-2.0 |
| `rustc_version` | 0.4.1 | MIT OR Apache-2.0 |
| `rustc-hash` | 2.1.3 | Apache-2.0 OR MIT |
| `rustversion` | 1.0.23 | MIT OR Apache-2.0 |
| `rustybuzz` | 0.20.1 | MIT |
| `safe_arch` | 1.2.0 | Zlib OR Apache-2.0 OR MIT |
| `safe_unaligned_simd` | 0.2.5 | MIT OR Apache-2.0 |
| `safe-transmute` | 0.11.3 | MIT |
| `scoped-tls` | 1.0.1 | MIT/Apache-2.0 |
| `scopeguard` | 1.2.0 | MIT OR Apache-2.0 |
| `semver` | 1.0.28 | MIT OR Apache-2.0 |
| `serde` | 1.0.229 | MIT OR Apache-2.0 |
| `serde_core` | 1.0.229 | MIT OR Apache-2.0 |
| `serde_derive` | 1.0.229 | MIT OR Apache-2.0 |
| `serde_json` | 1.0.151 | MIT OR Apache-2.0 |
| `sharded-slab` | 0.1.7 | MIT |
| `shlex` | 2.0.1 | MIT OR Apache-2.0 |
| `simd_helpers` | 0.1.0 | MIT |
| `simd-adler32` | 0.3.10 | MIT |
| `simplecss` | 0.2.2 | Apache-2.0 OR MIT |
| `siphasher` | 1.0.4 | MIT OR Apache-2.0 |
| `skrifa` | 0.42.1 | MIT OR Apache-2.0 |
| `slab` | 0.4.12 | MIT |
| `slotmap` | 1.1.1 | Zlib |
| `smallvec` | 1.16.2 | MIT OR Apache-2.0 |
| `snafu` | 0.9.2 | MIT OR Apache-2.0 |
| `snafu-derive` | 0.9.2 | MIT OR Apache-2.0 |
| `spin` | 0.12.3 | MIT |
| `stable_deref_trait` | 1.2.1 | MIT OR Apache-2.0 |
| `still265` | 0.6.0 | GPL-2.0-or-later |
| `strict-num` | 0.1.1 | MIT |
| `strum` | 0.28.0 | MIT |
| `strum_macros` | 0.28.0 | MIT |
| `svgtypes` | 0.15.3 | Apache-2.0 OR MIT |
| `syn` | 2.0.119 | MIT OR Apache-2.0 |
| `syn` | 3.0.6 | MIT OR Apache-2.0 |
| `synstructure` | 0.14.0 | MIT |
| `thiserror` | 1.0.69 | MIT OR Apache-2.0 |
| `thiserror` | 2.0.21 | MIT OR Apache-2.0 |
| `thiserror-impl` | 1.0.69 | MIT OR Apache-2.0 |
| `thiserror-impl` | 2.0.21 | MIT OR Apache-2.0 |
| `thread_local` | 1.1.10 | MIT OR Apache-2.0 |
| `tiff` | 0.11.3 | MIT |
| `tiny-skia` | 0.11.4 | BSD-3-Clause |
| `tiny-skia-path` | 0.11.4 | BSD-3-Clause |
| `tinyvec` | 1.13.3 | Zlib OR Apache-2.0 OR MIT |
| `to_method` | 1.1.0 | CC0-1.0 |
| `toml` | 0.5.11 | MIT/Apache-2.0 |
| `tracing` | 0.1.44 | MIT |
| `tracing-attributes` | 0.1.31 | MIT |
| `tracing-core` | 0.1.36 | MIT |
| `tracing-log` | 0.2.0 | MIT |
| `tracing-subscriber` | 0.3.23 | MIT |
| `ttf-parser` | 0.25.1 | MIT OR Apache-2.0 |
| `unicode-bidi` | 0.3.18 | MIT OR Apache-2.0 |
| `unicode-bidi-mirroring` | 0.4.0 | MIT/Apache-2.0 |
| `unicode-ccc` | 0.4.0 | MIT/Apache-2.0 |
| `unicode-ident` | 1.0.26 | (MIT OR Apache-2.0) AND Unicode-3.0 |
| `unicode-properties` | 0.1.4 | MIT/Apache-2.0 |
| `unicode-script` | 0.5.8 | MIT OR Apache-2.0 |
| `unicode-vo` | 0.1.0 | MIT/Apache-2.0 |
| `usvg` | 0.45.1 | Apache-2.0 OR MIT |
| `v_frame` | 0.3.9 | BSD-2-Clause |
| `valuable` | 0.1.1 | MIT |
| `vello_common` | 0.0.8 | Apache-2.0 OR MIT |
| `vello_common` | 0.0.9 | Apache-2.0 OR MIT |
| `vello_cpu` | 0.0.8 | Apache-2.0 OR MIT |
| `version_check` | 0.9.5 | MIT/Apache-2.0 |
| `wasip2` | 1.0.4+wasi-0.2.12 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| `wasm-bindgen` | 0.2.126 | MIT OR Apache-2.0 |
| `wasm-bindgen-macro` | 0.2.126 | MIT OR Apache-2.0 |
| `wasm-bindgen-macro-support` | 0.2.126 | MIT OR Apache-2.0 |
| `wasm-bindgen-shared` | 0.2.126 | MIT OR Apache-2.0 |
| `weezl` | 0.1.12 | MIT OR Apache-2.0 |
| `whereat` | 0.1.5 | MIT OR Apache-2.0 |
| `wide` | 1.7.1 | Zlib OR Apache-2.0 OR MIT |
| `winarm-cpufeatures` | 0.1.2 | MIT OR Apache-2.0 |
| `windows-core` | 0.62.2 | MIT OR Apache-2.0 |
| `windows-implement` | 0.60.2 | MIT OR Apache-2.0 |
| `windows-interface` | 0.59.3 | MIT OR Apache-2.0 |
| `windows-link` | 0.2.1 | MIT OR Apache-2.0 |
| `windows-result` | 0.4.1 | MIT OR Apache-2.0 |
| `windows-strings` | 0.5.1 | MIT OR Apache-2.0 |
| `windows-sys` | 0.61.2 | MIT OR Apache-2.0 |
| `wit-bindgen` | 0.57.1 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| `xmlwriter` | 0.1.0 | MIT |
| `y4m` | 0.8.0 | MIT |
| `yoke` | 0.8.3 | Unicode-3.0 |
| `yoke-derive` | 0.8.4 | Unicode-3.0 |
| `yuv` | 0.8.19 | BSD-3-Clause OR Apache-2.0 |
| `zenavif` | 0.1.6 | AGPL-3.0-only OR LicenseRef-Imazen-Commercial |
| `zenavif-parse` | 0.6.2 | MPL-2.0 |
| `zencodec` | 0.1.26 | Apache-2.0 OR MIT |
| `zenpixels` | 0.2.16 | Apache-2.0 OR MIT |
| `zenpixels-convert` | 0.2.16 | Apache-2.0 OR MIT |
| `zerocopy` | 0.8.59 | BSD-2-Clause OR Apache-2.0 OR MIT |
| `zerocopy-derive` | 0.8.59 | BSD-2-Clause OR Apache-2.0 OR MIT |
| `zerofrom` | 0.1.8 | Unicode-3.0 |
| `zerofrom-derive` | 0.1.8 | Unicode-3.0 |
| `zlib-rs` | 0.6.8 | Zlib |
| `zmij` | 1.0.23 | MIT |
| `zune-core` | 0.4.12 | MIT OR Apache-2.0 OR Zlib |
| `zune-core` | 0.5.1 | MIT OR Apache-2.0 OR Zlib |
| `zune-inflate` | 0.2.54 | MIT OR Apache-2.0 OR Zlib |
| `zune-jpeg` | 0.4.21 | MIT OR Apache-2.0 OR Zlib |
| `zune-jpeg` | 0.5.15 | MIT OR Apache-2.0 OR Zlib |
| `zune-jpegxl` | 0.5.2 | MIT OR Apache-2.0 OR Zlib |
