export const themes = {
  amber: {name:'Amber', colors:['#181619','#705552','#bb946c','#efdbb2'], accent:'#efbd76', muted:'#b0a294'},
  orchid: {name:'Orchid', colors:['#181622','#514562','#ac809c','#eee0d5'], accent:'#d9a9cc', muted:'#afa3b7'},
  moss: {name:'Moss', colors:['#151c1a','#40594c','#98a177','#e5dfb5'], accent:'#bdcc8e', muted:'#9dab9e'},
};
export const cards = [
  {id:'00-the-fool', name:'The Fool', number:'0', file:'00-the-fool.png'},
  {id:'01-the-magician', name:'The Magician', number:'I', file:'01-the-magician.png'},
  {id:'02-the-high-pristess', name:'The High Priestess', number:'II', file:'02-the-high-pristess.png'},
  {id:'03-the-empress', name:'The Empress', number:'III', file:'03-the-empress.png'},
  {id:'04-the-emperor', name:'The Emperor', number:'IV', file:'04-the-emperor.png'},
];
export function paletteFor(name) {
  return themes[name].colors.map(hex=>[1,3,5].map(start=>parseInt(hex.slice(start,start+2),16)));
}
export function applyTheme(name) {
  const theme=themes[name];
  document.documentElement.dataset.theme=name;
  for(const [key,value] of Object.entries({paper:theme.colors[0],ink:theme.colors[3],accent:theme.accent,muted:theme.muted})) {
    document.documentElement.style.setProperty(`--${key}`,value);
  }
}
