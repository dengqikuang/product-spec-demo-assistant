#!/usr/bin/env node
// Generated catalog: edit shell fragments, never the output HTML.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {compose,shellIds,replaceSlot,root} = require('./shell-library');
const parts = { PRODUCT_STYLE: [], PRODUCT_HTML: [], PRODUCT_SCRIPT: [] };
const pages = [];
for (const id of shellIds()) {
  const html = compose(id);
  const get = name => html.match(new RegExp(`<!-- EDITABLE:${name}:START -->([\\s\\S]*?)<!-- EDITABLE:${name}:END -->`))[1];
  const context = {window:{}};
  vm.runInNewContext(get('CONFIG').match(/<script>([\s\S]*)<\/script>/)[1],context,{timeout:100});
  for (const page of context.window.DEMO_CONFIG.pages) {
    page.label = `${id === 'mall-admin' ? '商城后台' : id === 'middle-platform' ? '中台系统' : id === 'mini-program' ? '微信小程序' : id === 'mobile' ? 'APP / H5' : id} · ${page.label}`;
    pages.push(page);
  }
  parts.PRODUCT_STYLE.push(get('PRODUCT_STYLE').match(/@scope \(\[data-page-panel\]\)\s*\{([\s\S]*)\}\s*<\/style>/)[1].replace(/:scope\s*\{[^}]*\}/g,''));
  parts.PRODUCT_HTML.push(get('PRODUCT_HTML'));
  parts.PRODUCT_SCRIPT.push('(()=>{'+get('PRODUCT_SCRIPT').match(/<script>([\s\S]*)<\/script>/)[1]+'})();');
}
if (new Set(pages.map(p=>p.id)).size !== pages.length) throw new Error('Shell page IDs must be unique across catalog');
let result = compose();
result = replaceSlot(result,'CONFIG',`<script>window.DEMO_CONFIG = ${JSON.stringify({title:'系统外壳预览',overview:'选择系统查看可复用的中栏外壳。此目录用于选择模板；正式需求的左栏仍按业务页面组织。',pages})};</script>`);
result = replaceSlot(result,'PRODUCT_STYLE',`<style id="productStyles">@scope ([data-page-panel]) {${parts.PRODUCT_STYLE.join('\n')}}</style>`);
result = replaceSlot(result,'PRODUCT_HTML',parts.PRODUCT_HTML.join('\n'));
result = replaceSlot(result,'PRODUCT_SCRIPT',`<script>${parts.PRODUCT_SCRIPT.join('\n')}</script>`);
result = result.replaceAll('data-template-placeholder','data-shell-example');
const output = path.join(root,'assets/shell-preview/index.html');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result);
console.log(output);
