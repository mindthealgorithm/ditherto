import {themes,cards,applyTheme} from './themes.js';
const params=new URLSearchParams(location.search);
const theme=Object.hasOwn(themes,params.get('theme'))?params.get('theme'):'amber';
const card=cards.find(card=>card.id===params.get('card'))??cards[1];
document.body.dataset.initialSample=card.id;
const algorithm=params.get('algorithm');
if(['atkinson','floyd-steinberg','ordered'].includes(algorithm))document.getElementById('algorithm').value=algorithm;
const exposure=Number(params.get('exposure')??0.3);
if(Number.isFinite(exposure)&&exposure>=-4&&exposure<=4)document.getElementById('exposure').value=exposure;
function chooseTheme(name){
  applyTheme(name);
  document.getElementById('palette').value='CUSTOM';
  document.getElementById('customPalette').value=themes[name].colors.join(', ');
  for(const button of document.querySelectorAll('.workbench-themes button'))button.setAttribute('aria-pressed',String(button.dataset.theme===name));
}
chooseTheme(theme);
await import('./examples/demo.js');
for(const button of document.querySelectorAll('.workbench-themes button'))button.addEventListener('click',()=>{
  chooseTheme(button.dataset.theme);
  document.getElementById('palette').dispatchEvent(new Event('input'));
});
