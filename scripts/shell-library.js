const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'assets/system-shells');
const slots = { PRODUCT_STYLE: 'style.html', PRODUCT_HTML: 'content.html', CONFIG: 'config.html', PRODUCT_SCRIPT: 'script.html' };
function shellIds() { return fs.readdirSync(base).filter(id => fs.existsSync(path.join(base,id,'config.html'))).sort(); }
function replaceSlot(html, name, value) {
  return html.replace(new RegExp(`(<!-- EDITABLE:${name}:START -->)[\\s\\S]*?(<!-- EDITABLE:${name}:END -->)`), (_,a,b)=>`${a}\n${value.trim()}\n${b}`);
}
function compose(id = 'mall-admin') {
  if (!shellIds().includes(id)) throw new Error(`Unknown system shell: ${id}`);
  let html = fs.readFileSync(path.join(root,'assets/demo-template/index.html'),'utf8');
  const ui = path.join(root,'assets/business-ui');
  const uiManifest = JSON.parse(fs.readFileSync(path.join(ui,'manifest.json'),'utf8'));
  html = html.replace('/* INCLUDE:BUSINESS_UI_CSS */', fs.readFileSync(path.join(ui,'styles.css'),'utf8').trimEnd());
  const uiRuntime = fs.readFileSync(path.join(ui,'runtime.js'),'utf8').replace('/* INCLUDE:BUSINESS_UI_MANIFEST */', JSON.stringify(uiManifest)).trimEnd();
  html = html.replace('/* INCLUDE:BUSINESS_UI_RUNTIME */', () => uiRuntime);
  for (const [marker,file] of [['<!-- INCLUDE:MALL_STYLE -->','locked-style.html'],['/* INCLUDE:MALL_MODULES */','modules.js'],['/* INCLUDE:MALL_RUNTIME */','runtime.js']]) {
    html = html.replace(marker, () => fs.readFileSync(path.join(base,'mall-admin',file),'utf8').trimEnd());
  }
  for (const [name,file] of Object.entries(slots)) html = replaceSlot(html,name,fs.readFileSync(path.join(base,id,file),'utf8'));
  return html;
}
module.exports = { compose, shellIds, replaceSlot, root };
