import { observeDitherDOM, PALETTES } from '../dist/dom.js';
const $ = selector => document.querySelector(selector);
const palettes = { dusk: [[37,33,59],[139,80,102],[221,167,123],[244,236,207]], ink: PALETTES.BW, gameboy: PALETTES.GAMEBOY, red: PALETTES.MONO_RED, green: PALETTES.MONO_GREEN, blue: PALETTES.MONO_BLUE, yellow: PALETTES.MONO_YELLOW };
// A page can supply additional palettes without changing the library or renderer.
for (const option of $('#colors').options) {
  if (option.dataset.palette) palettes[option.value] = JSON.parse(option.dataset.palette);
}
const cards = [...document.querySelectorAll('.gallery article')];
let controller;
let worker;
let serial = 0;
let renders = 0;
let generation = 0;
const pending = new Map();
function stopWorker() {
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) job.reject(new DOMException('Renderer disposed', 'AbortError'));
  pending.clear();
}
function startWorker() {
  worker = new Worker(new URL('./responsive-worker.js', import.meta.url), { type:'module' });
  worker.onmessage = ({data}) => {
    const job = pending.get(data.id);
    if (!job) return;
    pending.delete(data.id);
    if (data.error) job.reject(new Error(data.error)); else job.resolve(data.result);
  };
  worker.onerror = event => {
    $('#status').textContent = `Worker failed: ${event.message}`;
    stopWorker();
  };
}
function render(source, options) {
  return new Promise((resolve, reject) => {
    if (!worker) { reject(new Error('Worker unavailable')); return; }
    const id = ++serial;
    pending.set(id, {resolve, reject});
    try { worker.postMessage({id, source, options}, [source.data.buffer]); }
    catch (error) { pending.delete(id); reject(error); }
  });
}
function report(error) {
  if (error.name !== 'AbortError') $('#status').textContent = error.message;
}
async function bind() {
  const current = ++generation;
  renders = 0;
  startWorker();
  $('#status').textContent = 'Preparing images…';
  controller = observeDitherDOM('img.dither', {
    algorithm: $('#texture').value, palette: palettes[$('#colors').value], resample:'area',
  }, {
    render,
    onError: report,
    onRender(canvas, image) {
      renders++;
      const card = cards.find(card => card.contains(canvas));
      card.querySelector('.dimensions').textContent = `${canvas.width} × ${canvas.height}`;
      $('#status').textContent = `Shared palette & texture · individual exposure · ${renders} renders`;
    },
  });
  $('#toggle').textContent = 'Show originals';
  const results = await controller.ready;
  if (current === generation && results.some(result => result.status === 'rejected')) $('#status').textContent = 'Some images could not be processed. Their originals are preserved.';
}
function dispose() {
  generation++;
  controller?.destroy();
  controller = null;
  stopWorker();
}
for (const selector of ['#texture', '#colors']) $(selector).addEventListener('change', () => {
  for (const handle of controller?.images ?? []) void handle.update({algorithm:$('#texture').value, palette:palettes[$('#colors').value]}).catch(report);
});
cards.forEach((card, index) => card.querySelector('.exposure').addEventListener('input', event => {
  const exposure = Number(event.target.value);
  card.querySelector('.exposure-label output').textContent = `${exposure > 0 ? '+' : ''}${exposure} EV`;
  const handle = controller?.images[index];
  const original = handle?.image ?? card.querySelector('img');
  original.dataset.exposure = String(exposure);
  if (handle) void handle.update({exposure}).catch(report);
}));
$('#galleryWidth').addEventListener('input', event => {
  $('#gallery').style.width = `${event.target.value}%`;
  $('#widthLabel').textContent = `${event.target.value}%`;
});
$('#toggle').addEventListener('click', () => {
  if (controller) {
    dispose();
    $('#toggle').textContent = 'Apply shared look';
    $('#status').textContent = 'Original photographs. Your settings are kept.';
    for (const card of cards) card.querySelector('.dimensions').textContent = 'Original';
  } else void bind().catch(report);
});
window.addEventListener('pagehide', dispose);
window.addEventListener('pageshow', event => { if (event.persisted) void bind().catch(report); });
void bind().catch(report);
function updateGalleryRecipe() {
  const values = cards.map(card => ({
    exposure:Number(card.querySelector('.exposure').value),
    contrast:Number((controller?.images[cards.indexOf(card)]?.image ?? card.querySelector('img'))?.dataset.contrast ?? 1),
  }));
  $('#galleryRecipe').textContent = `import { observeDitherDOM } from 'ditherto/dom';\n\nconst adjustments = ${JSON.stringify(values,null,2)};\nconst gallery = observeDitherDOM('img.dither', {\n  algorithm: '${$('#texture').value}',\n  palette: ${JSON.stringify(palettes[$('#colors').value])},\n  resample: 'area'\n});\n\nawait Promise.all(gallery.images.map((image, index) =>\n  image.update(adjustments[index] ?? {})\n));\n// On unmount: gallery.destroy();`;
}
for(const input of document.querySelectorAll('#texture, #colors, .exposure')) input.addEventListener('input', updateGalleryRecipe);
$('#copyGallery').addEventListener('click',async () => {
  updateGalleryRecipe();
  try { await navigator.clipboard.writeText($('#galleryRecipe').textContent); $('#copyGallery').textContent='Copied'; }
  catch { $('#copyGallery').textContent='Select the recipe above to copy'; }
});
updateGalleryRecipe();
