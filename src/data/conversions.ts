export type ConversionPage = {
  slug: string;
  from: string;
  to: string;
  title: string;
  summary: string;
  note: string;
};

// Focus on common, distinct conversion intents instead of generating thin pages
// for every possible pair of formats.
export const conversions: ConversionPage[] = [
  { slug: 'heic-to-jpg', from: 'HEIC', to: 'JPG', title: 'HEICをJPGに変換', summary: 'iPhoneなどで撮影したHEIC画像を、幅広い環境で開きやすいJPGに変換します。', note: 'JPGは透過に対応しないため、透明部分は白で出力されます。' },
  { slug: 'heic-to-png', from: 'HEIC', to: 'PNG', title: 'HEICをPNGに変換', summary: 'HEIC画像を、可逆圧縮に対応したPNG画像に変換します。', note: 'PNGは画質を保ちやすい形式です。写真ではJPGよりファイルサイズが大きくなる場合があります。' },
  { slug: 'heif-to-jpg', from: 'HEIF', to: 'JPG', title: 'HEIFをJPGに変換', summary: 'HEIF形式の画像を、一般的な写真形式のJPGに変換します。', note: 'JPGは透過に対応しないため、透明部分は白で出力されます。' },
  { slug: 'webp-to-jpg', from: 'WebP', to: 'JPG', title: 'WebPをJPGに変換', summary: 'WebP画像を、幅広いアプリや端末で扱いやすいJPGに変換します。', note: 'JPGは透過に対応しないため、透明部分は白で出力されます。' },
  { slug: 'webp-to-png', from: 'WebP', to: 'PNG', title: 'WebPをPNGに変換', summary: 'WebP画像をPNGに変換します。透過が必要な画像にも使えます。', note: 'アニメーションWebPはフレームごとの静止画像として出力されます。' },
  { slug: 'png-to-jpg', from: 'PNG', to: 'JPG', title: 'PNGをJPGに変換', summary: 'PNG画像をJPGに変換して、写真などのファイルサイズを抑えやすくします。', note: 'JPGは非可逆圧縮で、透過部分は白になります。' },
  { slug: 'png-to-webp', from: 'PNG', to: 'WebP', title: 'PNGをWebPに変換', summary: 'PNG画像をWebPに変換します。WebP出力はこのツールでは可逆です。', note: 'WebP出力は可逆形式です。画像によってはPNGより小さくならない場合があります。' },
  { slug: 'jpg-to-png', from: 'JPG', to: 'PNG', title: 'JPGをPNGに変換', summary: 'JPG画像をPNG形式に変換し、PNG対応の編集作業に利用できます。', note: '変換後も、JPG圧縮で失われた画質や透過情報は元に戻りません。' },
  { slug: 'jpg-to-webp', from: 'JPG', to: 'WebP', title: 'JPGをWebPに変換', summary: 'JPG画像をWebP形式に変換します。出力サイズを確認しながら保存できます。', note: 'WebP出力はこのツールでは可逆です。元画像のJPG圧縮による劣化は残ります。' },
  { slug: 'avif-to-jpg', from: 'AVIF', to: 'JPG', title: 'AVIFをJPGに変換', summary: 'AVIF画像をJPG形式に変換して、対応アプリで利用しやすくします。', note: 'JPGは透過に対応しないため、透明部分は白で出力されます。' },
  { slug: 'tiff-to-jpg', from: 'TIFF', to: 'JPG', title: 'TIFFをJPGに変換', summary: 'TIFF画像のページを選び、JPG形式の画像として書き出します。', note: '複数ページのTIFFはページごとに選択できます。色形式などにより読み込めないファイルがあります。' },
  { slug: 'bmp-to-jpg', from: 'BMP', to: 'JPG', title: 'BMPをJPGに変換', summary: 'BMP画像をJPG形式に変換して、共有や保管に利用できます。', note: 'JPGは非可逆圧縮で、透過部分は白になります。' },
  { slug: 'svg-to-png', from: 'SVG', to: 'PNG', title: 'SVGをPNGに変換', summary: 'SVG画像をPNG形式のラスター画像に変換します。', note: '外部リソースを参照するSVGには対応しません。文字は同梱フォントで描画されます。' },
  { slug: 'pdf-to-jpg', from: 'PDF', to: 'JPG', title: 'PDFをJPGに変換', summary: 'PDFのページをJPG画像に変換します。複数ページはページごとに処理できます。', note: 'PDFは既定の倍率で画像化され、出力解像度は指定できません。' },
  { slug: 'gif-to-png', from: 'GIF', to: 'PNG', title: 'GIFをPNGに変換', summary: 'GIFのフレームを選び、静止PNG画像として書き出します。', note: 'アニメーションは保持されず、選択した各フレームが個別の静止画像になります。' },
  { slug: 'psd-to-png', from: 'PSD', to: 'PNG', title: 'PSDをPNGに変換', summary: 'PSDの統合画像をPNG形式に変換します。', note: 'レイヤーやマスクなどの編集情報は保持されず、統合画像を出力します。' },
  { slug: 'cr2-to-jpg', from: 'CR2', to: 'JPG', title: 'CR2をJPGに変換', summary: 'CanonのRAW画像CR2を、共有しやすいJPG画像に変換します。', note: '簡易プレビュー変換です。カメラ用カラープロファイルや本格的なRAW現像には対応せず、色や階調が異なる場合があります。' },
  { slug: 'nef-to-jpg', from: 'NEF', to: 'JPG', title: 'NEFをJPGに変換', summary: 'NikonのRAW画像NEFを、JPG形式のプレビュー画像に変換します。', note: '簡易プレビュー変換です。カメラ用カラープロファイルや本格的なRAW現像には対応しません。' },
  { slug: 'arw-to-jpg', from: 'ARW', to: 'JPG', title: 'ARWをJPGに変換', summary: 'SonyのRAW画像ARWをJPG形式のプレビュー画像に変換します。', note: '簡易プレビュー変換です。カメラ用カラープロファイルや本格的なRAW現像には対応しません。' },
  { slug: 'ai-to-png', from: 'AI', to: 'PNG', title: 'AIをPNGに変換', summary: 'PDF互換形式で保存されたIllustrator AIファイルをPNG画像に変換します。', note: 'PDFヘッダーで始まるPDF互換AIファイルのみ対応します。PostScriptのみのAIファイルは読み込めません。' },
  { slug: 'dcm-to-png', from: 'DCM', to: 'PNG', title: 'DCM・DICOMをPNGに変換', summary: 'DICOM（DCM）画像のフレームを選び、PNG画像として書き出します。', note: '読み込める転送構文には制限があります。JPEG-LSとJPEG 2000のデコードには対応していません。' },
  { slug: 'exr-to-png', from: 'EXR', to: 'PNG', title: 'EXRをPNGに変換', summary: 'HDR画像形式のEXRを、一般的なPNG画像に変換します。', note: '出力は8ビットsRGBです。範囲外のハイライトはクリップされ、HDR精度やレイヤーは保持されません。' },
  { slug: 'hdr-to-jpg', from: 'HDR', to: 'JPG', title: 'HDRをJPGに変換', summary: 'HDR画像をJPG形式に変換して、一般的な画像ビューアーで扱えるようにします。', note: '出力は8ビットsRGBです。HDRの明るさ情報は保持されず、値の範囲によってハイライトがクリップされます。' },
  { slug: 'jxl-to-png', from: 'JXL', to: 'PNG', title: 'JXLをPNGに変換', summary: 'JPEG XL（JXL）画像をPNG形式に変換します。', note: '読み込める機能は同梱デコーダーの対応範囲に依存します。CMYKと任意のICCプロファイル変換には対応しません。' },
  { slug: 'tga-to-png', from: 'TGA', to: 'PNG', title: 'TGAをPNGに変換', summary: 'TGA画像をPNG形式に変換します。', note: '読み込めるTGAのエンコード形式は同梱デコーダーの対応範囲に依存します。' },
];
