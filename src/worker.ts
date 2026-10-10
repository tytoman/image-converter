/// <reference lib="webworker" />

type Request =
  | { id: number; type: 'capabilities' }
  | { id: number; type: 'inspect'; bytes: ArrayBuffer; filename: string }
  | { id: number; type: 'convert'; bytes: ArrayBuffer; filename: string; options: Record<string, unknown> };

const worker = self as DedicatedWorkerGlobalScope;
let engine: Promise<Record<string, (...args: any[]) => any>> | undefined;

async function loadEngine() {
  engine ??= (async () => {
    const wasmModuleUrl = '/wasm/image_converter.js';
    const module = await import(/* @vite-ignore */ wasmModuleUrl);
    if (typeof module.default === 'function') await module.default();
    return module;
  })();
  return engine;
}

worker.onmessage = async ({ data }: MessageEvent<Request>) => {
  try {
    const wasm = await loadEngine();
    if (data.type === 'capabilities') {
      worker.postMessage({ id: data.id, ok: true, result: wasm.capabilities() });
      return;
    }
    const bytes = new Uint8Array(data.bytes);
    if (data.type === 'inspect') {
      const result = await wasm.inspect(bytes, data.filename);
      worker.postMessage({ id: data.id, ok: true, result });
      return;
    }
    const output = await wasm.convert(bytes, data.filename, JSON.stringify(data.options));
    const result = output instanceof Uint8Array ? output : new Uint8Array(output);
    worker.postMessage({ id: data.id, ok: true, result: result.buffer }, [result.buffer]);
  } catch (error) {
    worker.postMessage({ id: data.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
