import { themes, paletteFor, applyTheme } from './themes.js';

const colors = document.querySelector('#colors');
for (const [name, theme] of Object.entries(themes).reverse()) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = `${theme.name} / 4 colors`;
  option.dataset.palette = JSON.stringify(paletteFor(name));
  colors.prepend(option);
}
const params = new URLSearchParams(location.search);
colors.value = Object.hasOwn(themes, params.get('theme')) ? params.get('theme') : 'amber';
applyTheme(colors.value);
const algorithm = params.get('algorithm');
if (['atkinson', 'floyd-steinberg', 'ordered'].includes(algorithm)) {
  document.querySelector('#texture').value = algorithm;
}
colors.addEventListener('change', () => {
  if (Object.hasOwn(themes, colors.value)) applyTheme(colors.value);
});
await import('./examples/responsive-demo.js');
