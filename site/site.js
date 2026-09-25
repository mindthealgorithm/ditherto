import { observeDitherDOM, PALETTES } from './dist/dom.js';

const palettes = {
  dusk: [[37, 33, 59], [139, 80, 102], [221, 167, 123], [244, 236, 207]],
  blue: PALETTES.MONO_BLUE,
  gameboy: PALETTES.GAMEBOY,
};
const status = document.querySelector('#render-status');
const pending = new Map();
let worker;
let controller;
let serial = 0;

function stopWorker() {
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) job.reject(new DOMException('Renderer disposed', 'AbortError'));
  pending.clear();
}

function report(error) {
  if (error.name !== 'AbortError') {
    status.textContent = 'Some previews could not render. Original photographs or the last completed previews are shown.';
  }
}

function render(source, options) {
  return new Promise((resolve, reject) => {
    if (!worker) { reject(new Error('Worker unavailable')); return; }
    const id = ++serial;
    pending.set(id, { resolve, reject });
    try { worker.postMessage({ id, source, options }, [source.data.buffer]); }
    catch (error) { pending.delete(id); reject(error); }
  });
}

async function bind() {
  try {
    worker = new Worker(new URL('./examples/responsive-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      pending.delete(data.id);
      if (data.error) job.reject(new Error(data.error)); else job.resolve(data.result);
    };
    worker.onerror = event => { report(new Error(event.message)); stopWorker(); };
    const current = controller = observeDitherDOM('img.live-dither', { resample: 'area' }, {
      render,
      resolveOptions: image => ({ palette: palettes[image.dataset.paletteName] ?? PALETTES.BW }),
      onError: report,
    });
    const results = await current.ready;
    if (controller === current && results.every(result => result.status === 'fulfilled')) {
      status.textContent = 'Live dithering from original photos. Resize the page: each preview renders again at its new size.';
    }
  } catch (error) { report(error); }
}

function dispose() {
  controller?.destroy();
  controller = null;
  stopWorker();
}

window.addEventListener('pagehide', dispose);
window.addEventListener('pageshow', event => { if (event.persisted) void bind(); });
void bind();
