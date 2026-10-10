import { zip, strToU8 } from 'fflate';
import { icon } from './icons';

type Format = 'PNG' | 'JPEG' | 'WEBP' | 'HEIF' | 'HEIC' | 'BMP' | 'TIFF' | 'GIF' | 'AVIF' | 'JXL' | 'TGA';
type Metadata = { format: string; width: number; height: number; frames: number; animated: boolean };
type Capability = { inputs: string[]; outputs: string[] };
type Item = {
  id: string;
  scaleX: number;
  scaleY: number;
  scaleLocked: boolean;
  scaleUnit: '%' | 'px';
  scaleAnchor: 'x' | 'y';
  pendingScale?: { x: number; y: number; unit: '%' | 'px' };
  file: File;
  meta?: Metadata;
  error?: string;
  range: 'all' | 'custom';
  frames: string;
  status: string;
  thumbUrl?: string;
  isNew?: boolean;
};
type GlobalScale = { x: number; y: number; unit: '%' | 'px'; locked: boolean; anchor: 'x' | 'y' };
type Result = {
  sourceId: string;
  name: string;
  blob: Blob;
  width?: number;
  height?: number;
  format: string;
  origSize?: number;
  error?: string;
  url?: string;
  thumbUrl?: string;
  isNew?: boolean;
};
type Reply = { id: number; ok: boolean; result?: any; error?: string };
type TaskPayload =
  | { type: 'capabilities' }
  | { type: 'inspect'; bytes: ArrayBuffer; filename: string }
  | { type: 'convert'; bytes: ArrayBuffer; filename: string; options: Record<string, unknown> };
type Task = TaskPayload & { id: number };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = $('file-input') as HTMLInputElement;
const list = $('file-list');
const listWrap = $('file-list-wrap');
const dropZone = $('drop-zone');
const formatGrid = $('output-format');
const scaleXInput = $('scale-x') as HTMLInputElement;
const scaleYInput = $('scale-y') as HTMLInputElement;
const scaleLock = $('scale-lock') as HTMLInputElement;
const scaleUnit = $('scale-unit') as HTMLSelectElement;
const quality = $('quality') as HTMLInputElement;
const qualityGroup = $('quality-group');
const qualityValue = $('quality-value');
const qualityNote = $('quality-note');
const compressionGroup = $('compression-group');
const items: Item[] = [];
const results: Result[] = [];
const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void }>();
let worker: Worker;
let serial = 0;
let capabilities: Capability | undefined;
let running = false;
let cancelling = false;
let taskItem: Item | undefined;
let resultsOpen = false;
let unique = 0;
const maxFileBytes = 64 * 1024 * 1024;
const maxPixels = 40_000_000;
const maxDimension = 16_384;
const maxFramesPerFile = 100_000;
const maxStoredOutputBytes = 256 * 1024 * 1024;
let storedOutputBytes = 0;
let globalScaleAnchor: 'x' | 'y' = 'x';
const appliedGlobalScale: GlobalScale = { x: 100, y: 100, unit: '%', locked: true, anchor: 'x' };
const draftGlobalScale: GlobalScale = { ...appliedGlobalScale };

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function makeWorker() {
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'image-converter-wasm' });
  worker.onmessage = ({ data }: MessageEvent<Reply>) => {
    const promise = pending.get(data.id);
    if (!promise) return;
    pending.delete(data.id);
    if (data.ok) promise.resolve(data.result);
    else promise.reject(new Error(data.error || '処理に失敗しました'));
  };
  worker.onerror = () => {
    for (const promise of pending.values()) promise.reject(new Error('変換エンジンが停止しました'));
    pending.clear();
    worker.terminate();
    if (running) makeWorker();
    if (!running) setEngineState('error', '変換エンジンを読み込めません');
  };
}
makeWorker();

function request<T>(request: TaskPayload, transfer: Transferable[] = []): Promise<T> {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ ...request, id } as Task, transfer);
  });
}

function parseJson<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

function setEngineState(state: '' | 'ready' | 'error', message: string) {
  const el = $('engine-state');
  el.className = `engine-state ${state}`;
  el.setAttribute('data-tooltip', message);
  el.innerHTML = `<i aria-hidden="true"></i><span class="engine-label">${escapeHtml(message)}</span>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function normalizedFormat(format: string): Format | undefined {
  const raw = format.toUpperCase().replace(/^IMAGE\//, '').replace(/\./g, '');
  const f = raw === 'JPG' ? 'JPEG' : raw === 'TIF' ? 'TIFF' : raw === 'HEIF/HEIC' ? 'HEIF' : raw;
  const known: Format[] = ['PNG', 'JPEG', 'WEBP', 'HEIF', 'HEIC', 'BMP', 'TIFF', 'GIF', 'AVIF', 'JXL', 'TGA'];
  return known.find((x) => x === f);
}

function formatLabel(format: Format) {
  return format;
}

function extension(format: string) {
  return format.toLowerCase().replace('jpeg', 'jpg');
}

function mime(format: string) {
  const f = format.toUpperCase();
  return (
    ({
      JPEG: 'image/jpeg',
      JPG: 'image/jpeg',
      PNG: 'image/png',
      WEBP: 'image/webp',
      GIF: 'image/gif',
      BMP: 'image/bmp',
      TIFF: 'image/tiff',
      HEIF: 'image/heif',
      HEIC: 'image/heic',
      AVIF: 'image/avif',
      JXL: 'image/jxl',
      TGA: 'image/x-tga',
    } as Record<string, string>)[f] || 'application/octet-stream'
  );
}

function fileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function imageMetadata(format: string, width: number | undefined, height: number | undefined, size: number, delta = '') {
  const dimensions = width && height ? `${width.toLocaleString()} × ${height.toLocaleString()} px` : '—';
  return `<dl class="image-metadata"><dt>形式</dt><dd><span class="fmt">${escapeHtml(format)}</span></dd><dt>寸法</dt><dd>${dimensions}</dd><dt>容量</dt><dd class="metadata-size"><span>${fileSize(size)}</span>${delta}</dd></dl>`;
}

function validScale(value: number, unit: '%' | 'px' = '%') {
  return Number.isFinite(value) && value >= 1 && value <= (unit === 'px' ? maxDimension : 1000) && (unit !== 'px' || Number.isInteger(value));
}
function scaleToPixels(meta: Metadata, x: number, y: number, unit: '%' | 'px') {
  if (!validScale(x, unit) || !validScale(y, unit) || !meta.width || !meta.height) return { width: undefined, height: undefined };
  return unit === 'px' ? { width: x, height: y } : { width: Math.max(1, Math.round(meta.width * x / 100)), height: Math.max(1, Math.round(meta.height * y / 100)) };
}
function convertScaleUnit(meta: Metadata, x: number, y: number, from: '%' | 'px', to: '%' | 'px') {
  if (from === to || !meta.width || !meta.height) return { x, y };
  const dims = scaleToPixels(meta, x, y, from);
  return to === 'px' ? { x: dims.width ?? x, y: dims.height ?? y } : { x: dims.width ? dims.width / meta.width * 100 : x, y: dims.height ? dims.height / meta.height * 100 : y };
}

function frameTotal(meta?: Metadata) {
  const count = Number(meta?.frames);
  return Number.isSafeInteger(count) && count > 0 ? count : 1;
}

function frameWord(n: number) {
  return n === 1 ? '1 枚' : `${n} 枚`;
}

function invalidFrameSelection(item: Item) {
  if (item.range !== 'custom') return false;
  const parts = item.frames.split(',').map((part) => part.trim());
  if (!parts.length || parts.some((part) => !/^\d+(?:\s*-\s*\d+)?$/.test(part))) return true;
  const count = frameTotal(item.meta);
  return parts.some((part) => part.split('-').some((n) => Number(n.trim()) < 1 || Number(n.trim()) > count));
}

async function boot() {
  setupTooltips();
  setupShortcuts();
  setupDragAndDrop();

  try {
    capabilities = parseJson<Capability>(await request({ type: 'capabilities' }));
    renderFormats();
    setEngineState('ready', `Wasm 準備完了 · 入力 ${capabilities.inputs.length} 形式`);
    updateControls();
  } catch (error) {
    capabilities = { inputs: [], outputs: [] };
    renderFormats();
    setEngineState('error', 'Wasm を読み込めません');
    $('format-note').textContent = 'public/wasm のエンジンを確認してください。';
    announce(`変換エンジンを読み込めませんでした: ${error instanceof Error ? error.message : error}`);
  }
}

function currentFormat(): Format {
  const checked = document.querySelector<HTMLInputElement>('input[name="output-format"]:checked');
  return (checked?.value as Format) || 'PNG';
}

function currentCompression(): number {
  const checked = document.querySelector<HTMLInputElement>('input[name="compression"]:checked');
  return Number(checked?.value || 6);
}

function renderFormats() {
  const supported = (capabilities?.outputs || []).map(normalizedFormat).filter((x): x is Format => Boolean(x));
  const all: Format[] = ['PNG', 'JPEG', 'WEBP', 'AVIF', 'HEIF', 'HEIC', 'TIFF', 'GIF', 'BMP', 'JXL', 'TGA'];

  formatGrid.replaceChildren(
    ...all.map((format) => {
      const isSup = supported.includes(format);
      const label = document.createElement('label');
      label.className = 'format-option';
      if (!isSup) label.setAttribute('data-tooltip', 'このエンジンでは非対応');

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'output-format';
      input.value = format;
      input.disabled = !isSup;
      if (format === 'PNG' && isSup) input.checked = true;

      input.addEventListener('change', () => {
        updateControls();
        updateQuality();
      });

      const span = document.createElement('span');
      span.innerHTML = `${icon('check', 12)}${formatLabel(format)}`;

      label.append(input, span);
      return label;
    })
  );

  const checked = document.querySelector<HTMLInputElement>('input[name="output-format"]:checked');
  if (!checked) {
    const first = all.find((x) => supported.includes(x));
    if (first) {
      const el = document.querySelector<HTMLInputElement>(`input[name="output-format"][value="${first}"]`);
      if (el) el.checked = true;
    }
  }

  $('format-note').textContent = supported.length
    ? `このエンジンで出力可能 · ${supported.length}/${all.length} 形式`
    : '出力形式をサポートしていません';
}

function announce(message: string) {
  $('announcer').textContent = message;
}

function canThumbnail(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  // Never hand SVG to the browser image loader: it can resolve external SVG references.
  const type = file.type.toLowerCase();
  if (type === 'image/svg+xml' || ['svg', 'exr', 'hdr', 'jxl', 'tga', 'tif', 'tiff', 'heic', 'heif'].includes(ext)) return false;
  if (type.startsWith('image/')) return true;
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext);
}

async function addFiles(files: FileList | File[]) {
  const added: Item[] = [];
  for (const file of Array.from(files)) {
    if (items.some((item) => item.file.name === file.name && item.file.size === file.size)) continue;
    const thumbUrl = canThumbnail(file) ? URL.createObjectURL(file) : undefined;
    const item: Item = {
      id: `${Date.now()}-${++unique}`,
      file,
      scaleX: appliedGlobalScale.x,
      scaleY: appliedGlobalScale.y,
      scaleLocked: appliedGlobalScale.locked,
      scaleUnit: appliedGlobalScale.unit,
      scaleAnchor: appliedGlobalScale.anchor,
      range: 'all',
      frames: '',
      status: '解析待ち',
      thumbUrl,
      isNew: true,
    };
    items.push(item);
    added.push(item);
    renderItems();
  }
  updateControls();

  for (const item of added) {
    if (item.file.size > maxFileBytes) {
      item.error = `64 MB を超えています (${fileSize(item.file.size)})`;
      item.status = 'サイズ超過';
      renderItems();
      continue;
    }
    if (!isAccepted(item.file)) {
      item.error = '対応していない拡張子です';
      item.status = '未対応';
      renderItems();
      continue;
    }
    item.status = '解析中';
    renderItems();
    try {
      const bytes = await item.file.arrayBuffer();
      const info = parseJson<Metadata>(await request({ type: 'inspect', bytes, filename: item.file.name }, [bytes]));
      const count = Number(info.frames);
      const frameCountValid = Number.isSafeInteger(count) && count > 0 && count <= maxFramesPerFile;
      item.meta = {
        format: String(info.format || 'unknown'),
        width: Number(info.width) || 0,
        height: Number(info.height) || 0,
        frames: frameCountValid ? count : 1,
        animated: Boolean(info.animated),
      };
      const pendingUnit = item.pendingScale?.unit;
      if (item.pendingScale) {
        const converted = convertScaleUnit(item.meta, item.pendingScale.x, item.pendingScale.y, item.pendingScale.unit, item.scaleUnit);
        item.scaleX = converted.x; item.scaleY = converted.y; item.pendingScale = undefined;
      }
      if (item.scaleLocked && item.scaleUnit === 'px' && (!pendingUnit || pendingUnit === 'px')) {
        if (item.scaleAnchor === 'x') item.scaleY = Math.max(1, Math.round(item.scaleX * item.meta.height / item.meta.width));
        else item.scaleX = Math.max(1, Math.round(item.scaleY * item.meta.width / item.meta.height));
      }
      if (!frameCountValid) {
        item.error = `ページ / フレーム数は 1–${maxFramesPerFile.toLocaleString()} の範囲で指定してください`;
        item.status = '上限超過';
      } else if (item.meta.width * item.meta.height > maxPixels) {
        item.error = `40 MP を超えています (${item.meta.width.toLocaleString()} × ${item.meta.height.toLocaleString()})`;
        item.status = '解像度超過';
      } else {
        item.status = '準備完了';
      }
    } catch (error) {
      item.error = error instanceof Error ? error.message : 'デコードできませんでした';
      item.status = '解析エラー';
    }
    renderItems();
  }
  updateControls();
  announce(`${added.length} 件のファイルを追加しました`);
}

function isAccepted(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const known = [
    'png',
    'jpg',
    'jpeg',
    'webp',
    'heif',
    'heic',
    'bmp',
    'tif',
    'tiff',
    'gif',
    'avif',
    'cr2',
    'nef',
    'arw',
    'psd',
    'ai',
    'pdf',
    'dcm',
    'dicom',
    'svg',
    'exr',
    'hdr',
    'jxl',
    'tga',
  ];
  return known.includes(ext);
}

function renderItems() {
  const has = items.length > 0;
  dropZone.hidden = has;
  listWrap.hidden = !has;
  $('clear-files').toggleAttribute('disabled', !has || running);
  $('file-count').textContent = `${items.length} 件`;
  document.body.classList.toggle('has-files', has);

  list.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement('div');
      row.className = `file-row${item.isNew ? ' is-new' : ''}${item.error ? ' is-error' : ''}`;
      row.setAttribute('role', 'listitem');
      row.dataset.itemId = item.id;
      item.isNew = false;

      const count = frameTotal(item.meta);
      const multiple = count > 1;
      const badRange = invalidFrameSelection(item);
      const inputStatus = item.status === '完了' ? '準備完了' : item.status;
      const displayedStatus = badRange ? '範囲を確認' : inputStatus;
      const badge =
        normalizedFormat(item.meta?.format || '') ||
        (item.file.name.split('.').pop() || 'IMG').toUpperCase().slice(0, 5);

      const statusIcon =
        inputStatus === '解析中' || inputStatus === '変換中'
          ? icon('spinner', 14)
          : item.error || badRange
            ? icon('alert', 14)
            : inputStatus === '準備完了'
              ? icon('dotCircle', 14)
              : icon('minusCircle', 14);

      const statusClass =
        item.error || badRange
          ? 'error'
          : inputStatus === '解析中' || inputStatus === '変換中'
            ? 'busy'
            : inputStatus === '準備完了'
              ? 'ready'
              : 'muted';

      const thumbHtml = item.thumbUrl
        ? `<div class="thumb"><img src="${item.thumbUrl}" alt="" loading="lazy" /></div>`
        : `<div class="thumb empty">${icon('image', 14)}</div>`;
      const awaitingScaleConversion = Boolean(item.pendingScale && item.pendingScale.unit !== item.scaleUnit && !item.meta);

      row.innerHTML = `
        <div class="input-image">
          <div class="image-name-row">
            <span class="file-name-text" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span>
            <span class="status input-status ${statusClass}" title="${escapeHtml(item.error || '')}">${statusIcon}<span>${escapeHtml(displayedStatus)}</span></span>
          </div>
          ${thumbHtml}
          <div class="input-info image-info">
            ${imageMetadata(badge, item.meta?.width, item.meta?.height, item.file.size)}
            ${multiple ? `<span class="result-meta">${frameWord(count)}</span>` : ''}
            <div class="frame-control ${multiple ? '' : 'single'}"></div>
          </div>
        </div>
        <div class="item-settings">
          <div class="resolution-row">
            <div class="dimension"><span>横</span><input class="item-scale-x" aria-label="${escapeHtml(item.file.name)} の横${item.scaleUnit === 'px' ? '寸法' : '倍率'}" type="number" min="1" max="${item.scaleUnit === 'px' ? maxDimension : 1000}" step="${item.scaleUnit === 'px' ? 1 : 'any'}" value="${awaitingScaleConversion ? '' : item.scaleX}" ${running || awaitingScaleConversion ? 'disabled' : ''} /><select class="item-scale-unit" aria-label="${escapeHtml(item.file.name)} の横単位" ${running ? 'disabled' : ''}><option value="%" ${item.scaleUnit === '%' ? 'selected' : ''}>%</option><option value="px" ${item.scaleUnit === 'px' ? 'selected' : ''}>px</option></select></div>
            <label class="aspect-lock" data-tooltip="アスペクト比を維持"><input class="item-scale-lock" type="checkbox" ${item.scaleLocked ? 'checked' : ''} ${running ? 'disabled' : ''} aria-label="${escapeHtml(item.file.name)} のアスペクト比を維持" />${icon('link', 14, 'icon-link')}${icon('unlink', 14, 'icon-unlink')}</label>
            <div class="dimension"><span>縦</span><input class="item-scale-y" aria-label="${escapeHtml(item.file.name)} の縦${item.scaleUnit === 'px' ? '寸法' : '倍率'}" type="number" min="1" max="${item.scaleUnit === 'px' ? maxDimension : 1000}" step="${item.scaleUnit === 'px' ? 1 : 'any'}" value="${awaitingScaleConversion ? '' : item.scaleY}" ${running || awaitingScaleConversion ? 'disabled' : ''} /><select class="item-scale-unit-peer" aria-label="${escapeHtml(item.file.name)} の縦単位" ${running ? 'disabled' : ''}><option value="%" ${item.scaleUnit === '%' ? 'selected' : ''}>%</option><option value="px" ${item.scaleUnit === 'px' ? 'selected' : ''}>px</option></select></div>
          </div>
          <span class="item-dimensions result-meta"></span>
        </div>
        <div class="output-images"></div>
        <button type="button" class="icon-button remove-file" aria-label="${escapeHtml(item.file.name)} を削除" data-tooltip="削除" ${running ? 'disabled' : ''}>
          ${icon('x', 14)}
        </button>
      `;

      const itemScaleX = row.querySelector<HTMLInputElement>('.item-scale-x')!;
      const itemScaleY = row.querySelector<HTMLInputElement>('.item-scale-y')!;
      const itemScaleLock = row.querySelector<HTMLInputElement>('.item-scale-lock')!;
      const updateItemScale = () => {
        const dims = item.meta ? scaleToPixels(item.meta, item.scaleX, item.scaleY, item.scaleUnit) : undefined;
        row.querySelector('.item-dimensions')!.textContent = awaitingScaleConversion ? '解析後に寸法を換算します' : dims?.width && dims.height ? `${dims.width} × ${dims.height} px` : '—';
        itemScaleX.setAttribute('aria-invalid', String(!validScale(item.scaleX, item.scaleUnit)));
        itemScaleY.setAttribute('aria-invalid', String(!validScale(item.scaleY, item.scaleUnit)));
      };
      updateItemScale();
      const changeItemScale = (axis: 'x' | 'y') => {
        if (axis === 'x') item.scaleX = itemScaleX.valueAsNumber;
        else item.scaleY = itemScaleY.valueAsNumber;
        item.scaleAnchor = axis;
        if (item.scaleLocked && item.scaleUnit === '%') {
          if (axis === 'x') { item.scaleY = item.scaleX; itemScaleY.value = itemScaleX.value; }
          else { item.scaleX = item.scaleY; itemScaleX.value = itemScaleY.value; }
        } else if (item.scaleLocked && item.meta && item.scaleUnit === 'px') {
          if (axis === 'x') { item.scaleY = Math.max(1, Math.round(item.scaleX * item.meta.height / item.meta.width)); itemScaleY.value = String(item.scaleY); }
          else { item.scaleX = Math.max(1, Math.round(item.scaleY * item.meta.width / item.meta.height)); itemScaleX.value = String(item.scaleX); }
        }
        if (!item.meta) item.pendingScale = { x: item.scaleX, y: item.scaleY, unit: item.scaleUnit };
        updateItemScale();
        updateControls();
      };
      itemScaleX.addEventListener('input', () => changeItemScale('x'));
      itemScaleY.addEventListener('input', () => changeItemScale('y'));
      const itemUnitX = row.querySelector<HTMLSelectElement>('.item-scale-unit')!;
      const itemUnitY = row.querySelector<HTMLSelectElement>('.item-scale-unit-peer')!;
      const switchItemUnit = () => {
        const next = itemUnitX.value as Item['scaleUnit'];
        if (item.meta) {
          const v = convertScaleUnit(item.meta, item.scaleX, item.scaleY, item.scaleUnit, next);
          item.scaleX = v.x; item.scaleY = v.y;
        } else item.pendingScale ??= { x: item.scaleX, y: item.scaleY, unit: item.scaleUnit };
        item.scaleUnit = next;
        renderItems(); updateControls();
      };
      itemUnitX.addEventListener('change', switchItemUnit);
      itemUnitY.addEventListener('change', () => { itemUnitX.value = itemUnitY.value; switchItemUnit(); });
      itemScaleLock.addEventListener('change', () => {
        item.scaleLocked = itemScaleLock.checked;
        changeItemScale(item.scaleAnchor);
      });
      renderItemOutput(row, item);

      const errorDetail = document.createElement('div');
      errorDetail.className = 'file-error';
      errorDetail.hidden = !item.error && !badRange;
      errorDetail.innerHTML = `${icon('alert', 12)}<span>${escapeHtml(item.error || (badRange ? `1〜${count} の番号を入力してください（例: 1,3-5）` : ''))}</span>`;
      row.append(errorDetail);

      const control = row.querySelector('.frame-control')!;
      if (multiple) {
        const select = document.createElement('select');
        select.className = 'range-select';
        select.setAttribute('aria-label', `${item.file.name} の変換範囲`);
        select.disabled = running;
        select.innerHTML = `<option value="all">全 ${count} 枚</option><option value="custom">指定する</option>`;
        select.value = item.range;
        select.addEventListener('change', () => {
          item.range = select.value as Item['range'];
          if (item.range === 'custom' && !item.frames) item.frames = '1';
          renderItems();
          updateControls();
        });
        control.append(select);

        if (item.range === 'custom') {
          const rangeInput = document.createElement('input');
          rangeInput.className = 'range-select';
          rangeInput.value = item.frames;
          rangeInput.placeholder = '例 1,3-5';
          rangeInput.setAttribute('aria-label', `${item.file.name} のフレーム番号`);
          rangeInput.title = 'カンマ区切り、範囲指定可（1 始まり）';
          rangeInput.disabled = running;
          rangeInput.addEventListener('input', () => {
            item.frames = rangeInput.value;
            const invalid = invalidFrameSelection(item);
            rangeInput.setAttribute('aria-invalid', String(invalid));
            rangeInput.title = invalid
              ? `1〜${count} の番号を指定してください（例: 1,3-5）`
              : 'カンマ区切り、範囲指定可（1 始まり）';
            errorDetail.hidden = !item.error && !invalid;
            errorDetail.innerHTML = `${icon('alert', 12)}<span>${escapeHtml(item.error || (invalid ? rangeInput.title : ''))}</span>`;
            const status = row.querySelector<HTMLElement>('.input-status');
            if (status) {
              const busy = inputStatus === '解析中' || inputStatus === '変換中';
              const ready = inputStatus === '準備完了';
              const error = invalid || Boolean(item.error);
              status.className = `status input-status ${error ? 'error' : busy ? 'busy' : ready ? 'ready' : 'muted'}`;
              status.innerHTML = `${icon(error ? 'alert' : busy ? 'spinner' : ready ? 'dotCircle' : 'minusCircle', 14)}<span>${escapeHtml(invalid ? '範囲を確認' : inputStatus)}</span>`;
              status.title = invalid ? rangeInput.title : item.error || '';
            }
            updateControls();
          });
          control.append(rangeInput);
        }
      } else {
        control.textContent = '1 枚';
      }

      row.querySelector('.remove-file')?.addEventListener('click', () => removeItem(item));
      return row;
    })
  );

  if (!has) {
    $('file-hint').textContent = '64 MB / ファイル · 最大 40 MP · 最大寸法 16,384 px';
  } else {
    const pageCount = items.reduce((n, item) => n + getFrameIndexes(item).length, 0);
    $('file-hint').textContent = `合計 ${pageCount} 枚を選択中 · 64 MB / ファイル · 40 MP まで`;
  }
}

function getFrameIndexes(item: Item) {
  const count = frameTotal(item.meta);
  if (item.range === 'all') return Array.from({ length: count }, (_, i) => i);
  const found = new Set<number>();
  for (const part of item.frames.split(',')) {
    const range = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!range) continue;
    let start = Math.max(1, Number(range[1]));
    let end = Math.min(count, Number(range[2] || range[1]));
    if (end < start) [start, end] = [end, start];
    for (let i = start; i <= end; i++) found.add(i - 1);
  }
  return [...found].sort((a, b) => a - b);
}

function removeItem(item: Item) {
  const index = items.indexOf(item);
  if (index >= 0) {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    items.splice(index, 1);
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].sourceId !== item.id) continue;
      const [result] = results.splice(i, 1);
      if (result.url) URL.revokeObjectURL(result.url);
      if (result.thumbUrl && result.thumbUrl !== result.url) URL.revokeObjectURL(result.thumbUrl);
      storedOutputBytes -= result.blob.size;
    }
    resultsOpen = results.length > 0;
    renderResults();
  }
  renderItems();
  updateControls();
}

function isLossy(format: Format) {
  return ['JPEG', 'WEBP', 'HEIF', 'HEIC', 'AVIF'].includes(format);
}

function selectedCount() {
  return items.reduce((count, item) => count + getFrameIndexes(item).length, 0);
}

function updateResolutionUI() {
  const preview = $('resolution-preview');
  const unit = draftGlobalScale.unit;
  scaleUnit.value = unit;
  scaleLock.checked = draftGlobalScale.locked;
  globalScaleAnchor = draftGlobalScale.anchor;
  $('scale-heading').setAttribute('data-tooltip', unit === 'px' ? '\u5bf8\u6cd5\uff08\u5168\u753b\u50cf\uff09' : '\u500d\u7387\uff08\u5168\u753b\u50cf\uff09');
  scaleXInput.max = scaleYInput.max = String(unit === 'px' ? maxDimension : 1000);
  scaleXInput.step = scaleYInput.step = unit === 'px' ? '1' : 'any';
  const peer = document.querySelector<HTMLSelectElement>('.scale-unit-peer'); if (peer) peer.value = unit;
  $('scale-unit-note').textContent = !items.length && unit === 'px' ? '\u753b\u50cf\u8ffd\u52a0\u524d\u306f\u6a2a\u30fb\u7e261024 px\u304b\u3089\u8a2d\u5b9a\u3067\u304d\u307e\u3059\u3002' : unit === 'px' ? '1\u301c' + maxDimension.toLocaleString() + ' px \u00b7 \u30ed\u30c3\u30af\u4e2d\u306f\u5143\u306e\u7e26\u6a2a\u6bd4\u3092\u7dad\u6301' : '1\u301c1000% \u00b7 \u30ed\u30c3\u30af\u4e2d\u306f\u5143\u306e\u7e26\u6a2a\u6bd4\u3092\u7dad\u6301';
  scaleXInput.setAttribute('aria-label', '\u5168\u753b\u50cf\u306e\u6a2a\u306e' + (unit === 'px' ? '\u5bf8\u6cd5' : '\u500d\u7387'));
  scaleYInput.setAttribute('aria-label', '\u5168\u753b\u50cf\u306e\u7e26\u306e' + (unit === 'px' ? '\u5bf8\u6cd5' : '\u500d\u7387'));
  const x = scaleXInput.valueAsNumber; const y = scaleYInput.valueAsNumber;
  scaleXInput.setAttribute('aria-invalid', String(!validScale(x, unit))); scaleYInput.setAttribute('aria-invalid', String(!validScale(y, unit)));
  if (!validScale(x, unit) || !validScale(y, unit)) { preview.textContent = unit === 'px' ? '\u5bf8\u6cd5\u306f1\u301c' + maxDimension.toLocaleString() + ' px\u306e\u6574\u6570\u3067\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002' : '\u500d\u7387\u306f1\u301c1000%\u3067\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002'; return; }
  const referenceItem = items.find((item) => item.meta && !item.error); const meta = referenceItem?.meta;
  if (!meta) { preview.textContent = '\u753b\u50cf\u3092\u8ffd\u52a0\u3059\u308b\u3068\u51fa\u529b\u5bf8\u6cd5\u3092\u8868\u793a\u3057\u307e\u3059\u3002'; return; }
  let previewX = x; let previewY = y;
  if (draftGlobalScale.locked && unit === 'px') { if (draftGlobalScale.anchor === 'x') previewY = Math.max(1, Math.round(previewX * meta.height / meta.width)); else previewX = Math.max(1, Math.round(previewY * meta.width / meta.height)); }
  const dims = scaleToPixels(meta, previewX, previewY, unit);
  const withinLimits = Boolean(dims.width && dims.height && dims.width <= maxDimension && dims.height <= maxDimension && dims.width * dims.height <= maxPixels);
  preview.textContent = withinLimits ? '\u5148\u982d\u306e\u753b\u50cf: ' + dims.width!.toLocaleString() + ' \u00d7 ' + dims.height!.toLocaleString() + ' px' + (items.length > 1 ? ' \u30fb \u5404\u753b\u50cf\u306e\u5143\u30b5\u30a4\u30ba\u3092\u57fa\u6e96\u306b\u8a08\u7b97' : '') : '\u51fa\u529b\u5bf8\u6cd5\u304c\u4e0a\u9650\u3092\u8d85\u3048\u3066\u3044\u307e\u3059\u3002\u500d\u7387\u3092\u4e0b\u3052\u3066\u304f\u3060\u3055\u3044\u3002';
}

function getGlobalScaleCandidates(): { candidates?: Map<Item, GlobalScale>; error?: string } {
  const x = scaleXInput.valueAsNumber; const y = scaleYInput.valueAsNumber; const unit = draftGlobalScale.unit;
  if (!validScale(x, unit) || !validScale(y, unit)) return { error: unit === 'px' ? '\u5bf8\u6cd5\u306f1\u301c' + maxDimension.toLocaleString() + ' px\u306e\u6574\u6570\u3067\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002' : '\u500d\u7387\u306f1\u301c1000%\u3067\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002' };
  const candidates = new Map<Item, GlobalScale>();
  for (const item of items) {
    let nextX = x; let nextY = y;
    if (draftGlobalScale.locked && unit === 'px' && item.meta) { if (draftGlobalScale.anchor === 'x') nextY = Math.max(1, Math.round(nextX * item.meta.height / item.meta.width)); else nextX = Math.max(1, Math.round(nextY * item.meta.width / item.meta.height)); }
    if (item.meta && !item.error) {
      if (!validScale(nextX, unit) || !validScale(nextY, unit)) return { error: item.file.name + ': \u51fa\u529b\u5bf8\u6cd5\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002' };
      const dims = scaleToPixels(item.meta, nextX, nextY, unit);
    if (dims.width && dims.height && (dims.width > maxDimension || dims.height > maxDimension)) return { error: '\u51fa\u529b\u5bf8\u6cd5\u306f\u6700\u5927 ' + maxDimension.toLocaleString() + ' px \u3067\u3059: ' + item.file.name };
      if (dims.width && dims.height && dims.width * dims.height > maxPixels) return { error: '\u51fa\u529b\u30b5\u30a4\u30ba\u304c 40 MP \u3092\u8d85\u3048\u3066\u3044\u307e\u3059: ' + item.file.name };
    }
    candidates.set(item, { x: nextX, y: nextY, unit, locked: draftGlobalScale.locked, anchor: draftGlobalScale.anchor });
  }
  return { candidates };
}

function applyGlobalScale() {
  if (running || !items.length) return;
  const { candidates, error } = getGlobalScaleCandidates();
  if (error || !candidates) { const message = error || '\u51fa\u529b\u5bf8\u6cd5\u304c\u4e0a\u9650\u3092\u8d85\u3048\u3066\u3044\u307e\u3059\u3002'; updateControls(); $('resolution-preview').textContent = message; return; }
  for (const [item, candidate] of candidates) {
    item.scaleX = candidate.x; item.scaleY = candidate.y; item.scaleUnit = candidate.unit; item.scaleLocked = candidate.locked; item.scaleAnchor = candidate.anchor;
    item.pendingScale = item.meta ? undefined : { x: candidate.x, y: candidate.y, unit: candidate.unit };
  }
  Object.assign(appliedGlobalScale, draftGlobalScale);
  renderItems(); updateControls();
}
function updateControls() {
  updateResolutionUI();
  const globalSizeApply = document.getElementById('global-size-apply') as HTMLButtonElement | null;
  if (globalSizeApply) globalSizeApply.disabled = running || items.length === 0;
  const parsing = items.some((item) => item.status === '解析中' || item.status === '解析待ち');
  const ready = items.some(
    (item) => item.meta && !item.error && !invalidFrameSelection(item) && getFrameIndexes(item).length > 0
  );
  const output = currentFormat();
  const formatSupported = Boolean(capabilities?.outputs.map(normalizedFormat).includes(output));
  const validation = validateSettings();
  const reason = validation;

  $('convert').toggleAttribute('disabled', running || parsing || !ready || !formatSupported || Boolean(reason));

  const lossy = isLossy(output);
  quality.disabled = !lossy || running;
  qualityGroup.hidden = !lossy;

  const png = output === 'PNG';
  const compInputs = compressionGroup.querySelectorAll<HTMLInputElement>('input[name="compression"]');
  compInputs.forEach((inp) => (inp.disabled = !png || running));
  compressionGroup.hidden = !png;

  const formatInputs = formatGrid.querySelectorAll<HTMLInputElement>('input[name="output-format"]');
  formatInputs.forEach((inp) => {
    const isSup = Boolean(capabilities?.outputs.map(normalizedFormat).includes(inp.value as Format));
    inp.disabled = !isSup || running;
  });

  const outputNote =
    output === 'HEIF' || output === 'HEIC'
      ? '非可逆圧縮 · 透過情報は保持されません'
      : output === 'PNG'
        ? '可逆圧縮 · 圧縮レベルを指定できます'
        : output === 'GIF'
          ? '静止画 · 256 色まで'
          : output === 'BMP' || output === 'TIFF'
            ? 'この形式では圧縮設定を指定できません'
            : output === 'WEBP'
              ? '非可逆圧縮 · 品質を指定できます'
              : lossy
                ? '非可逆圧縮 · 品質を指定できます'
                : output === 'JXL'
                  ? '可逆圧縮 · 品質設定なし'
                  : output === 'TGA'
                    ? '透過情報を保持 · 圧縮設定なし'
                    : '可逆圧縮';

  $('format-note').textContent = formatSupported
    ? outputNote
    : `${output} はこのエンジンでは出力できません`;

  // Summary card in Inspector
  const selTotal = selectedCount();
  const fileTotalCount = items.length;
  $('summary-count').innerHTML = fileTotalCount
    ? `<b>${fileTotalCount}</b> 件${fileTotalCount === selTotal ? '' : ` (${selTotal} 枚)`}`
    : '—';

  let formatDetail = output;
  if (lossy) formatDetail += ` · 品質 ${quality.value}`;
  else if (png) {
    const compVal = currentCompression();
    formatDetail += ` · 圧縮 ${compVal === 1 ? '速い' : compVal === 9 ? '高圧縮' : '標準'}`;
  }
  $('summary-output').textContent = fileTotalCount ? formatDetail : '—';

  const noteEl = $('selection-note');
  if (reason) {
    noteEl.className = 'selection-note error';
    noteEl.innerHTML = `${icon('alert', 12)}<span>${escapeHtml(reason)}</span>`;
  } else if (fileTotalCount) {
    const errCount = items.filter((x) => x.error).length;
    noteEl.className = 'selection-note';
    noteEl.textContent = `対象 ${selTotal} 枚 · ${errCount ? `${errCount} 件は変換対象外` : '変換準備完了'}`;
  } else {
    noteEl.className = 'selection-note';
    noteEl.textContent = 'ファイルを追加すると、選択範囲をここで確認できます。';
  }
}

function renderItemOutput(row: HTMLElement, item: Item) {
  const outputs = results.filter((result) => result.sourceId === item.id);
  const images = row.querySelector<HTMLElement>('.output-images')!;
  images.replaceChildren();
  if (!outputs.length) {
    images.innerHTML = `<span class="output-placeholder">${icon('image', 16)}<span>${item.status === '変換中' ? '変換中…' : item.status === 'キャンセル' ? 'キャンセルしました' : '変換後に表示'}</span></span>`;
    return;
  }
  for (const result of outputs) {
    const entry = document.createElement('div');
    entry.className = 'output-entry';
    const image = document.createElement('div');
    image.className = 'output-image';
    image.innerHTML = `<div class="image-name-row"><span class="result-file" title="${escapeHtml(result.name)}">${escapeHtml(result.name)}</span>${result.error ? '' : `<span class="status success">${icon('checkCircle', 14)}<span>変換完了</span></span>`}</div>${result.thumbUrl ? `<div class="thumb"><img src="${result.thumbUrl}" alt="" loading="lazy" /></div>` : `<div class="thumb empty">${icon('image', 14)}</div>`}`;
    const detail = document.createElement('div');
    detail.className = 'output-detail';
    if (result.error) {
      detail.innerHTML = `<span class="output-error">${icon('alert', 12)}${escapeHtml(result.error)}</span>`;
    } else {
      const diff = result.origSize ? (result.blob.size - result.origSize) / result.origSize : 0;
      const pct = Math.round(Math.abs(diff) * 100);
      const delta = result.origSize ? `<span class="delta ${diff < -0.01 ? 'down' : diff > 0.01 ? 'up' : 'same'}">${diff < -0.01 ? '-' : diff > 0.01 ? '+' : '±'}${pct}%</span>` : '';
      detail.innerHTML = imageMetadata(result.format, result.width, result.height, result.blob.size, delta);
      const save = document.createElement('a');
      save.className = 'button subtle download';
      save.href = result.url || '';
      save.download = result.name;
      save.dataset.tooltip = '個別保存';
      save.setAttribute('aria-label', `${result.name} を保存`);
      save.innerHTML = `${icon('download', 14)}保存`;
      entry.append(save);
    }
    image.append(detail);
    entry.prepend(image);
    images.append(entry);
  }
}

function renderResults() {
  $('results-panel').hidden = !resultsOpen;
  const succ = results.filter((r) => !r.error).length;
  const fail = results.filter((r) => r.error).length;
  $('result-count').textContent = `${succ} 件成功${fail ? ` · ${fail} 件失敗` : ''}`;
  $('download-all').toggleAttribute('disabled', running || succ === 0);
  for (const row of list.querySelectorAll<HTMLElement>('[data-item-id]')) {
    const item = items.find((item) => item.id === row.dataset.itemId);
    if (item) renderItemOutput(row, item);
  }
}

function cleanupResults() {
  for (const result of results) {
    if (result.url) URL.revokeObjectURL(result.url);
    if (result.thumbUrl) URL.revokeObjectURL(result.thumbUrl);
  }
  results.length = 0;
  storedOutputBytes = 0;
}

function readOptions(frame: number, item: Item) {
  const { width: outWidth, height: outHeight } = scaleToPixels(item.meta!, item.scaleX, item.scaleY, item.scaleUnit);
  return {
    format: currentFormat(),
    frame,
    width: outWidth,
    height: outHeight,
    quality: Number(quality.value),
    compression: currentCompression(),
  };
}

function validateSettings(): string | undefined {
  if (items.some((item) => item.meta && !item.error && invalidFrameSelection(item))) {
    return 'ページ番号は 1 始まりで指定してください（例: 1,3-5）。';
  }
  for (const item of items) {
    if (!item.meta || item.error) continue;
    if (!validScale(item.scaleX, item.scaleUnit) || !validScale(item.scaleY, item.scaleUnit)) return `${item.file.name}: 出力寸法を確認してください。`;
    const dims = scaleToPixels(item.meta, item.scaleX, item.scaleY, item.scaleUnit);
    if (currentFormat() === 'JXL' && dims.width !== undefined && dims.height !== undefined && (dims.width < 2 || dims.height < 2)) return item.file.name + ': JXL 出力は幅・高さともに 2 px 以上が必要です。';
    if (dims.width && dims.height && (dims.width > maxDimension || dims.height > maxDimension)) return `出力寸法は最大 ${maxDimension.toLocaleString()} px です。`;
    if (dims.width && dims.height && dims.width * dims.height > maxPixels) return '出力サイズが 40 MP を超えています。';
  }
  return undefined;
}

async function convertAll() {
  if (running || items.some((item) => item.status === '解析中' || item.status === '解析待ち')) return;
  const validation = validateSettings();
  if (validation) {
    announce(validation);
    updateControls();
    return;
  }
  cleanupResults();
  resultsOpen = true;
  running = true;
  cancelling = false;

  $('cancel-convert').hidden = false;
  const progressWrap = $('progress-wrap');
  progressWrap.hidden = false;
  progressWrap.className = 'progress-wrap running';
  $('convert').setAttribute('disabled', '');
  renderResults();
  renderItems();
  updateControls();

  for (const id of ['scale-x', 'scale-y', 'scale-lock', 'scale-unit']) ($(id) as HTMLInputElement).disabled = true;
  document.querySelector<HTMLSelectElement>('.scale-unit-peer')!.disabled = true;

  const queue = items.filter(
    (item) => item.meta && !item.error && !invalidFrameSelection(item) && getFrameIndexes(item).length
  );
  const total = queue.reduce((count, item) => count + getFrameIndexes(item).length, 0);
  let complete = 0;

  for (const item of queue) {
    taskItem = item;
    item.status = '変換中';
    renderItems();
    const itemFrames = getFrameIndexes(item);
    try {
      for (const frame of itemFrames) {
        if (cancelling) break;
        const bytes = await item.file.arrayBuffer();
        if (cancelling) break;
        const options = readOptions(frame, item);
        const result = await request<ArrayBuffer>(
          { type: 'convert', bytes, filename: item.file.name, options },
          [bytes]
        );
        if (cancelling) break;
        const ext = extension(currentFormat());
        const stem = item.file.name.replace(/\.[^.]+$/, '') || 'image';
        const name = `${stem}${itemFrames.length > 1 || frameTotal(item.meta) > 1 ? `_${String(frame + 1).padStart(2, '0')}` : ''}.${ext}`;
        const blob = new Blob([result], { type: mime(currentFormat()) });
        if (!blob.size) throw new Error('変換結果が空でした');
        if (storedOutputBytes + blob.size > maxStoredOutputBytes) {
          throw new Error(
            '生成ファイルの合計上限 256 MB に達しました。個別に保存してから次の変換を開始してください。'
          );
        }
        const url = URL.createObjectURL(blob);
        const thumbUrl = canThumbnail(new File([blob], name, { type: blob.type })) ? url : undefined;
        results.push({
          sourceId: item.id,
          name: uniqueOutputName(name),
          blob,
          format: currentFormat(),
          origSize: item.file.size,
          width: options.width || item.meta!.width,
          height: options.height || item.meta!.height,
          url,
          thumbUrl,
          isNew: true,
        });
        storedOutputBytes += blob.size;
        complete++;
        const pct = Math.round((complete / total) * 100);
        $('progress-label').textContent = `${complete} / ${total} 枚 · ${item.file.name}`;
        $('progress-percent').textContent = `${pct}%`;
        const bar = $('progress-bar');
        bar.style.width = `${pct}%`;
        bar.parentElement?.setAttribute('aria-valuenow', String(pct));
        renderResults();
      }
      item.status = cancelling ? 'キャンセル' : '完了';
    } catch (error) {
      const reason = error instanceof Error ? error.message : '変換できませんでした';
      item.status = cancelling ? 'キャンセル' : 'エラー';
      item.error = reason;
      if (!cancelling) {
        results.push({
          sourceId: item.id,
          name: item.file.name,
          blob: new Blob(),
          format: currentFormat(),
          origSize: item.file.size,
          error: reason,
          isNew: true,
        });
      }
    }
    renderItems();
    renderResults();
    if (cancelling) break;
  }

  if (cancelling) {
    for (const item of queue) {
      if (item.status === '変換中' || item.status === '準備完了') item.status = 'キャンセル';
    }
  }

  const wasCancelled = cancelling;
  taskItem = undefined;
  running = false;
  cancelling = false;

  for (const id of ['scale-x', 'scale-y', 'scale-lock', 'scale-unit']) ($(id) as HTMLInputElement).disabled = false;
  document.querySelector<HTMLSelectElement>('.scale-unit-peer')!.disabled = false;
  $('cancel-convert').hidden = true;
  progressWrap.className = `progress-wrap ${wasCancelled ? '' : 'done'}`;
  $('progress-label').textContent = wasCancelled
    ? '変換をキャンセルしました'
    : results.some((r) => r.error)
      ? '一部のファイルを変換できませんでした'
      : '変換が完了しました';

  renderItems();
  renderResults();
  updateControls();
  announce(
    wasCancelled
      ? `${complete} 枚を変換後、残りの処理をキャンセルしました`
      : `${complete} 枚の変換が完了しました`
  );
}

function uniqueOutputName(name: string) {
  const duplicate = results.some((result) => result.name === name);
  return duplicate ? `${name.replace(/\.(\w+)$/, '')}_${results.length + 1}.${name.split('.').pop()}` : name;
}

function cancel() {
  if (!running) return;
  cancelling = true;
  if (taskItem) taskItem.status = 'キャンセル中';
  $('progress-label').textContent = '処理を停止しています…';
  worker.terminate();
  makeWorker();
  for (const promise of pending.values()) promise.reject(new Error('キャンセルしました'));
  pending.clear();
}

function clearFiles() {
  if (running) return;
  for (const item of items) {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
  }
  items.length = 0;
  cleanupResults();
  resultsOpen = false;
  renderResults();
  renderItems();
  updateControls();
}

async function downloadZip() {
  const combinedBytes = results.reduce((sum, result) => sum + (!result.error ? result.blob.size : 0), 0);
  if (combinedBytes > 256 * 1024 * 1024) {
    announce('ZIP は 256 MB までです。出力を個別に保存してください。');
    $('selection-note').textContent = 'ZIP の上限は 256 MB です。ファイルごとに保存してください。';
    return;
  }
  const entries: Record<string, Uint8Array> = {};
  for (const result of results) {
    if (!result.error) entries[result.name] = new Uint8Array(await result.blob.arrayBuffer());
  }
  if (!Object.keys(entries).length) return;
  entries['README.txt'] = strToU8('画像変換 — ブラウザー内で安全に生成しました。\nhttps://github.com/offline-image-converter\n');
  const archive = await new Promise<Uint8Array>((resolve, reject) => {
    zip(entries, { level: 5 }, (error, data) => (error ? reject(error) : resolve(data)));
  });
  const zipBuffer = archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength
  ) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([zipBuffer], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'converted-images.zip';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateQuality() {
  qualityValue.textContent = quality.value;
  const value = Number(quality.value);
  qualityNote.hidden = !isLossy(currentFormat());
  qualityNote.classList.toggle('quality-warning', value <= 25);
  qualityNote.textContent = value <= 25
    ? '画質が大きく低下します。ファイルサイズを優先する設定です'
    : value <= 49
      ? 'ファイルサイズを優先します。細部が失われる場合があります'
      : value <= 74
        ? '画質とファイルサイズのバランスを取ります'
        : value <= 89
          ? '細部を保ちやすい設定です。ファイルサイズは大きくなります'
          : '高画質設定です。元画像に近い画質で、ファイルサイズは大きくなります';
  const min = Number(quality.min) || 1;
  const max = Number(quality.max) || 100;
  const val = Number(quality.value);
  const fillPct = Math.round(((val - min) / (max - min)) * 100);
  quality.style.setProperty('--fill', `${fillPct}%`);
  updateControls();
}

function openFilePicker() {
  input.click();
}

/* ── Tooltips ────────────────────────────────────────────── */
function setupTooltips() {
  const tooltipEl = $('tooltip');
  let activeTarget: HTMLElement | null = null;

  function show(el: HTMLElement) {
    const tip = el.getAttribute('data-tooltip');
    if (!tip) return;
    activeTarget = el;
    const kbd = el.getAttribute('data-kbd');
    let kbdHtml = '';
    if (kbd) {
      const parts = kbd.split(' ').map((k) => (k === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : k));
      kbdHtml = `<span class="shortcut">${parts.map((k) => `<kbd>${escapeHtml(k)}</kbd>`).join('')}</span>`;
    }
    tooltipEl.innerHTML = `<span>${escapeHtml(tip)}</span>${kbdHtml}`;
    tooltipEl.hidden = false;

    const rect = el.getBoundingClientRect();
    const tipRect = tooltipEl.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    if (top + tipRect.height > window.innerHeight) top = rect.top - tipRect.height - 6;
    if (left < 8) left = 8;
    if (left + tipRect.width > window.innerWidth - 8) left = window.innerWidth - tipRect.width - 8;

    tooltipEl.style.top = `${Math.round(top)}px`;
    tooltipEl.style.left = `${Math.round(left)}px`;
  }

  function hide() {
    activeTarget = null;
    tooltipEl.hidden = true;
  }

  document.addEventListener('mouseover', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    if (target) show(target);
    else if (activeTarget) hide();
  });

  document.addEventListener('focusin', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    if (target) show(target);
  });

  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, { passive: true });
}

/* ── Shortcuts & platform modifier ───────────────────────── */
function setupShortcuts() {
  document.querySelectorAll<HTMLElement>('[data-mod]').forEach((el) => {
    el.textContent = isMac ? '⌘' : 'Ctrl';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const panel = $('global-size-panel');
      if (!panel.hidden && (panel.contains(document.activeElement) || document.activeElement === $('global-size-toggle'))) {
        event.preventDefault();
        panel.hidden = true;
        $('global-size-toggle').setAttribute('aria-expanded', 'false');
        $('global-size-toggle').focus();
      }
    }
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      openFilePicker();
    }
    if (command && event.key === 'Enter') {
      event.preventDefault();
      if (!running) void convertAll();
    }
    if (command && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!running && results.some((r) => !r.error)) void downloadZip();
    }
    if (event.key === 'Escape') cancel();
  });
}

/* ── Drag & Drop ─────────────────────────────────────────── */
function setupDragAndDrop() {
  let dragCount = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCount++;
    document.body.classList.add('is-dragging');
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCount--;
    if (dragCount <= 0) {
      dragCount = 0;
      document.body.classList.remove('is-dragging');
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCount = 0;
    document.body.classList.remove('is-dragging');
    const files = e.dataTransfer?.files;
    if (files && files.length) void addFiles(files);
  });
}

/* ── Events ──────────────────────────────────────────────── */
$('add-files').addEventListener('click', openFilePicker);
$('browse-inline').addEventListener('click', (event) => {
  event.stopPropagation();
  openFilePicker();
});
dropZone.addEventListener('click', openFilePicker);
input.addEventListener('change', () => {
  if (input.files) void addFiles(input.files);
  input.value = '';
});

$('clear-files').addEventListener('click', clearFiles);
$('convert').addEventListener('click', () => void convertAll());
$('cancel-convert').addEventListener('click', cancel);
$('download-all').addEventListener('click', () => void downloadZip());
$('global-size-toggle').addEventListener('click', () => {
  const button = $('global-size-toggle');
  const panel = $('global-size-panel');
  const opening = panel.hidden;
  panel.hidden = !opening;
  button.setAttribute('aria-expanded', String(opening));
  if (!opening && panel.contains(document.activeElement)) button.focus();
});

quality.addEventListener('input', updateQuality);

document.querySelectorAll<HTMLInputElement>('input[name="compression"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    updateControls();
  });
});

function changeGlobalScale(axis: 'x' | 'y') {
  draftGlobalScale.anchor = axis; globalScaleAnchor = axis;
  if (draftGlobalScale.locked && draftGlobalScale.unit === '%' && axis === 'x') scaleYInput.value = scaleXInput.value;
  if (draftGlobalScale.locked && draftGlobalScale.unit === '%' && axis === 'y') scaleXInput.value = scaleYInput.value;
  if (draftGlobalScale.locked && draftGlobalScale.unit === 'px') {
    const reference = items.find((item) => item.meta && !item.error)?.meta;
    if (reference && axis === 'x') scaleYInput.value = String(Math.max(1, Math.round(scaleXInput.valueAsNumber * reference.height / reference.width)));
    if (reference && axis === 'y') scaleXInput.value = String(Math.max(1, Math.round(scaleYInput.valueAsNumber * reference.width / reference.height)));
  }
  draftGlobalScale.x = scaleXInput.valueAsNumber; draftGlobalScale.y = scaleYInput.valueAsNumber;
  updateControls();
}
scaleXInput.addEventListener('input', () => changeGlobalScale('x'));
scaleYInput.addEventListener('input', () => changeGlobalScale('y'));
scaleLock.addEventListener('change', () => { draftGlobalScale.locked = scaleLock.checked; changeGlobalScale(draftGlobalScale.anchor); });
document.querySelector<HTMLSelectElement>('.scale-unit-peer')?.addEventListener('change', (event) => { scaleUnit.value = (event.currentTarget as HTMLSelectElement).value; scaleUnit.dispatchEvent(new Event('change')); });
scaleUnit.addEventListener('change', () => {
  const next = scaleUnit.value as Item['scaleUnit']; const previous = draftGlobalScale.unit;
  const reference = items.find((item) => item.meta && !item.error)?.meta;
  if (reference && previous !== next) { const converted = convertScaleUnit(reference, scaleXInput.valueAsNumber, scaleYInput.valueAsNumber, previous, next); scaleXInput.value = String(converted.x); scaleYInput.value = String(converted.y); }
  else if (!reference) scaleXInput.value = scaleYInput.value = next === 'px' ? '1024' : '100';
  draftGlobalScale.unit = next;
  changeGlobalScale(draftGlobalScale.anchor);
});
document.getElementById('global-size-apply')?.addEventListener('click', applyGlobalScale);
$('theme-toggle').addEventListener('click', () => {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('image-converter-theme', next);
  } catch {
    /* Storage can be unavailable in private contexts. */
  }
  $('theme-toggle').setAttribute('aria-label', next === 'dark' ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え');
});

window.addEventListener('beforeunload', cleanupResults);
try {
  const theme = localStorage.getItem('image-converter-theme');
  if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme);
} catch {
  /* Storage can be unavailable in private contexts. */
}

updateQuality();
void boot();
