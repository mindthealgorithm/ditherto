/** Optional responsive DOM integration. Importing this module has no DOM side effects. */
import { parseDataAttributes } from './browser.js';
import { ditherToImageData, validateOptions } from './imageProcessor.js';
import { loadImageData } from './imageIO.js';
import { createImageDataCrossPlatform } from './imageData.js';
import { validatePixels } from './validation.js';
import type { DitherOptions } from './types.js';
export * from './browser.js';

export type DitherRenderer = (source: ImageData, options: DitherOptions) => Promise<ImageData>;
export type DitherUpdateOptions = { [Key in keyof DitherOptions]?: DitherOptions[Key] | undefined };
type Rendered = HTMLCanvasElement | null;
export interface DitherDOMOptions {
  root?: ParentNode;
  /** Last configuration layer before handle.update overrides. */
  resolveOptions?: (image: HTMLImageElement) => DitherOptions;
  /** Resize/update coalescing delay; default 60 milliseconds. */
  debounceMs?: number;
  /** Inject a shared worker renderer for expensive work. Default runs on the calling thread. */
  render?: DitherRenderer;
  onError?: (error: Error, image: HTMLImageElement) => void;
  onRender?: (canvas: HTMLCanvasElement, image: HTMLImageElement) => void;
}
export interface DitherImageHandle {
  readonly image: HTMLImageElement;
  readonly canvas: HTMLCanvasElement | null;
  readonly error: Error | null;
  /** First attempt; null means initially hidden/disconnected. */
  readonly ready: Promise<Rendered>;
  /** Merge overrides; undefined removes an override. Superseded calls await the latest result. */
  update(options: DitherUpdateOptions): Promise<Rendered>;
  /** Re-read the original image and its data attributes, retaining update overrides. */
  refresh(): Promise<Rendered>;
  /** Stop this binding, release pixels, and restore the original node if the canvas is attached. */
  destroy(): void;
}
export interface DitherDOMController {
  readonly images: readonly DitherImageHandle[];
  /** Errors are isolated per image; a failed image does not stop other images. */
  readonly ready: Promise<PromiseSettledResult<Rendered>[]>;
  refresh(): Promise<PromiseSettledResult<Rendered>[]>;
  destroy(): void;
}

const owners = new WeakSet<HTMLImageElement>();
const aborted = () => new DOMException('Dither binding was destroyed', 'AbortError');
function cancellable<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(aborted());
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    task.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
function waitForImage(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', failed);
      signal.removeEventListener('abort', abort);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Image could not be decoded')); };
    const abort = () => { cleanup(); reject(aborted()); };
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
function contentWidth(parent: HTMLElement): number {
  const style = getComputedStyle(parent);
  return Math.max(0, Math.round(parent.clientWidth - Number.parseFloat(style.paddingLeft || '0') - Number.parseFloat(style.paddingRight || '0')));
}
function makeCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = image.ownerDocument.createElement('canvas');
  for (const name of ['id', 'class', 'title', 'style', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'tabindex']) {
    const value = image.getAttribute(name);
    if (value !== null) canvas.setAttribute(name, value);
  }
  if (!canvas.hasAttribute('role')) canvas.setAttribute('role', 'img');
  if (!canvas.hasAttribute('aria-label') && !canvas.hasAttribute('aria-labelledby')) {
    if (image.hasAttribute('alt') && !image.alt) canvas.setAttribute('aria-hidden', 'true');
    else canvas.setAttribute('aria-label', image.alt || 'Dithered image');
  }
  Object.assign(canvas.style, { width: '100%', height: 'auto', display: 'block', imageRendering: 'pixelated' });
  return canvas;
}
function callback(fn: (() => void) | undefined): void {
  try { fn?.(); } catch (error) { console.error('Dither DOM callback failed', error); }
}

type Waiter = { resolve: (value: Rendered) => void; reject: (error: Error) => void };
class ImageBinding implements DitherImageHandle {
  canvas: HTMLCanvasElement | null = null;
  error: Error | null = null;
  readonly ready: Promise<Rendered>;
  private source: ImageData | null = null;
  private sourceVersion = 0;
  private overrides: DitherOptions = {};
  private waiters: Waiter[] = [];
  private revision = 0;
  private width = -1;
  private waitingForLoad = false;
  private abort = new AbortController();
  constructor(readonly image: HTMLImageElement, readonly parent: HTMLElement, private group: BindingGroup) {
    owners.add(image);
    this.ready = this.request();
  }
  private promise(): Promise<Rendered> {
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }
  private request(): Promise<Rendered> {
    if (this.abort.signal.aborted) return Promise.reject(aborted());
    const promise = this.promise();
    this.schedule();
    return promise;
  }
  private schedule(): void {
    if (this.abort.signal.aborted) return;
    this.revision++;
    this.width = contentWidth(this.parent);
    this.group.enqueue(this);
  }
  resized(): void {
    if (contentWidth(this.parent) !== this.width) this.schedule();
  }
  update(options: DitherUpdateOptions): Promise<Rendered> {
    const merged = { ...this.overrides, ...options };
    for (const key of Object.keys(merged) as (keyof DitherOptions)[]) {
      if (merged[key] === undefined) delete merged[key];
    }
    this.overrides = merged as DitherOptions;
    return this.request();
  }
  refresh(): Promise<Rendered> {
    this.source = null;
    this.sourceVersion++;
    return this.request();
  }
  private settle(value: Rendered, error?: Error): void {
    for (const waiter of this.waiters.splice(0)) {
      if (error) waiter.reject(error); else waiter.resolve(value);
    }
  }
  private fail(reason: unknown): void {
    this.error = reason instanceof Error ? reason : new Error(String(reason));
    this.settle(null, this.error);
    callback(() => this.group.config.onError?.(this.error!, this.image));
  }
  private awaitLoad(): void {
    if (this.waitingForLoad) return;
    this.waitingForLoad = true;
    void waitForImage(this.image, this.abort.signal).then(() => {
      this.waitingForLoad = false;
      this.schedule();
    }, error => {
      this.waitingForLoad = false;
      if (!this.abort.signal.aborted) this.fail(error);
    });
  }
  async run(): Promise<void> {
    if (this.abort.signal.aborted) return;
    const revision = this.revision;
    try {
      if (!this.parent.isConnected || this.width === 0) { this.settle(null); return; }
      const options = { ...this.group.defaults, ...parseDataAttributes(this.image), ...this.group.config.resolveOptions?.(this.image), ...this.overrides };
      validateOptions(options);
      if (!this.source && !this.image.complete) { this.awaitLoad(); return; }
      const sourceVersion = this.sourceVersion;
      const source = this.source ?? await loadImageData(this.image);
      if (sourceVersion === this.sourceVersion && !this.abort.signal.aborted) this.source = source;
      if (!this.isCurrent(revision)) return;
      const input = createImageDataCrossPlatform(new Uint8ClampedArray(source.data), source.width, source.height);
      const result = await cancellable(this.group.render(input, { ...options, width: Math.min(this.width, options.width ?? this.width) }), this.abort.signal);
      if (!this.isCurrent(revision)) return;
      this.paint(result);
    } catch (error) {
      if (this.isCurrent(revision)) this.fail(error);
    }
  }
  private isCurrent(revision: number): boolean {
    return !this.abort.signal.aborted && revision === this.revision;
  }
  private paint(result: ImageData): void {
    validatePixels(result);
    const canvas = this.canvas ?? makeCanvas(this.image);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2d context from canvas');
    // Do not reinsert externally removed nodes or overwrite an application's replacement.
    if (!this.canvas && this.image.parentElement !== this.parent) { this.settle(null); return; }
    canvas.width = result.width;
    canvas.height = result.height;
    context.putImageData(createImageDataCrossPlatform(result.data, result.width, result.height), 0, 0);
    if (!this.canvas) this.image.replaceWith(canvas);
    this.canvas = canvas;
    this.error = null;
    this.settle(canvas);
    callback(() => this.group.config.onRender?.(canvas, this.image));
  }
  destroy(): void {
    if (this.abort.signal.aborted) return;
    this.abort.abort();
    this.source = null;
    this.overrides = {};
    this.canvas?.parentNode?.replaceChild(this.image, this.canvas);
    this.canvas = null;
    this.settle(null, aborted());
    this.group.remove(this);
    owners.delete(this.image);
  }
}

class BindingGroup implements DitherDOMController {
  readonly images: readonly ImageBinding[];
  readonly ready: Promise<PromiseSettledResult<Rendered>[]>;
  readonly render: DitherRenderer;
  private observer: ResizeObserver;
  private parents = new Map<HTMLElement, Set<ImageBinding>>();
  private queued = new Set<ImageBinding>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private disposed = false;
  constructor(images: HTMLImageElement[], readonly defaults: DitherOptions, readonly config: DitherDOMOptions) {
    this.render = config.render ?? ditherToImageData;
    this.observer = new ResizeObserver(entries => {
      for (const entry of entries) for (const image of this.parents.get(entry.target as HTMLElement) ?? []) image.resized();
    });
    this.images = Object.freeze(images.map(image => new ImageBinding(image, image.parentElement!, this)));
    for (const image of this.images) {
      let siblings = this.parents.get(image.parent);
      if (!siblings) { siblings = new Set(); this.parents.set(image.parent, siblings); this.observer.observe(image.parent); }
      siblings.add(image);
    }
    this.ready = Promise.allSettled(this.images.map(image => image.ready));
  }
  enqueue(image: ImageBinding): void {
    if (this.disposed) return;
    this.queued.add(image);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.drain(); }, this.config.debounceMs ?? 60);
  }
  private async drain(): Promise<void> {
    if (this.running || this.disposed) return;
    this.running = true;
    try {
      while (this.queued.size && !this.disposed) {
        const image = this.queued.values().next().value!;
        this.queued.delete(image);
        await image.run();
        // Let input/paint run between images; an individual default render is still synchronous.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally { this.running = false; }
  }
  remove(image: ImageBinding): void {
    this.queued.delete(image);
    const siblings = this.parents.get(image.parent);
    siblings?.delete(image);
    if (!siblings?.size) { this.parents.delete(image.parent); this.observer.unobserve(image.parent); }
  }
  refresh(): Promise<PromiseSettledResult<Rendered>[]> {
    return Promise.allSettled(this.images.map(image => image.refresh()));
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.timer);
    this.observer.disconnect();
    for (const image of this.images) image.destroy();
    this.queued.clear();
    this.parents.clear();
  }
}

/**
 * Snapshot matching images and observe their parent content widths. Canvas fills
 * its parent; width/height options cap bitmap resolution, preserving aspect ratio.
 * Precedence: shared defaults < data attributes < resolveOptions < update overrides.
 * Original nodes/pixels are retained until destroy. New DOM nodes need a new binding.
 */
export function observeDitherDOM(selector: string, defaults: DitherOptions = {}, config: DitherDOMOptions = {}): DitherDOMController {
  if (typeof document === 'undefined' || typeof ResizeObserver === 'undefined') throw new Error('observeDitherDOM requires a browser with ResizeObserver');
  if (!Number.isFinite(config.debounceMs ?? 60) || (config.debounceMs ?? 60) < 0) throw new Error('debounceMs must be finite and nonnegative');
  validateOptions(defaults);
  const elements = Array.from((config.root ?? document).querySelectorAll(selector));
  const images = elements.filter((element): element is HTMLImageElement => element.tagName === 'IMG' && element.parentElement !== null);
  if (images.some(image => owners.has(image))) throw new Error('An image already has a dither binding; destroy it before rebinding');
  return new BindingGroup(images, { ...defaults }, { ...config });
}
