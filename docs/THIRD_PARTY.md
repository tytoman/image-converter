# 第三者ソフトウェアのライセンス

この文書は、アプリに含まれる第三者ソフトウェア、ライセンス文書、著作権表示の所在を案内します。各ソフトウェアには個別のライセンスが適用されます。この一覧は個別のライセンス条件を変更するものではありません。

## アプリ本体

このリポジトリのオリジナルコードは **GNU Affero General Public License v3.0 only（AGPL-3.0-only）** で提供します。全文はリポジトリ直下の [`LICENSE`](../LICENSE) にあります。

## コピーレフト対象ライブラリ

Rust/WebAssembly エンジンが利用する主な GPL、LGPL、AGPL、MPL 対象ライブラリについて、バージョン、用途、ライセンス、同梱ソースの場所を示します。ソーススナップショットとライセンス文書は [`third-party-sources/`](../third-party-sources/) にあります。

| クレート | 用途 | ライセンス | 同梱ソースとライセンス |
|---|---|---|---|
| `still265 0.6.0` | HEIC 静止画像のエンコード | GPL-2.0-or-later | [`still265-0.6.0`](../third-party-sources/still265-0.6.0/) にソースと原著作権者の `LICENSE` を収録。WebAssembly で壁時計を参照しないよう、ローカル変更を含みます。 |
| `rawloader 0.37.2` | カメラ RAW の読み込み | LGPL-2.1 | [`rawloader-0.37.2`](../third-party-sources/rawloader-0.37.2/) にソースを収録。配布パッケージに単独のライセンスファイルがないため、GNU LGPL-2.1 の本文を [`LGPL-2.1.txt`](../third-party-sources/LGPL-2.1.txt) として収録。 |
| `zenavif 0.1.6`, `rav1d-safe 0.5.7` | AVIF のデコード | `AGPL-3.0-only OR LicenseRef-Imazen-Commercial` | [`zenavif-0.1.6`](../third-party-sources/zenavif-0.1.6/) と [`rav1d-safe-0.5.7`](../third-party-sources/rav1d-safe-0.5.7/) にソースと各ライセンス文書を収録。この配布物では AGPL-3.0-only の選択肢を適用。 |
| `zenavif-parse 0.6.2` | AVIF コンテナの解析 | MPL-2.0 | [`zenavif-parse-0.6.2`](../third-party-sources/zenavif-parse-0.6.2/) にソースとライセンス文書を収録。 |

## Rust の依存パッケージ一覧

直接依存と推移依存を含む全 Rust クレートのバージョン・宣言ライセンスは[Rust 依存パッケージ一覧](RUST_DEPENDENCIES.md)を参照してください。Cargo.lock にあるターゲット固有の依存も含みます。
