import { ditherToImageData } from '../dist/browser.js';
self.onmessage = async ({ data: { id, source, options } }) => {
  try {
    const result = await ditherToImageData(source, options);
    self.postMessage({ id, result }, [result.data.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
