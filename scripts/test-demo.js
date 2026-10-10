#!/usr/bin/env node
// Framework regression fixtures, deliberately not a business-page starter.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const skill = path.resolve(__dirname, '..');
const template = require('./shell-library').compose();
const rawTemplate = fs.readFileSync(path.join(skill, 'assets/demo-template/index.html'), 'utf8');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'product-demo-regression-'));
const output = path.join(root, 'demo/index.html');
fs.mkdirSync(path.dirname(output));
const slot = (html, name, value) => html.replace(new RegExp(`(<!-- EDITABLE:${name}:START -->)[\\s\\S]*?(<!-- EDITABLE:${name}:END -->)`), (_, a, b) => `${a}\n${value}\n${b}`);
const base = {};
vm.runInNewContext(template.match(/window.DEMO_CONFIG = ([\s\S]*?);\s*<\/script>/)[0].replace(/<\/script>$/, ''), { window: base });
const admin = structuredClone(base.DEMO_CONFIG.pages[0]);
admin.id = 'admin'; admin.label = '后台 · 商品配置'; admin.overview = '配置组合商品并保存，验证选择、取消与回写。'; admin.p0 = ['P0-01'];
admin.visual = { status: 'none' };
admin.states = [
  { id: 'default', label: '配置页' },
  { id: 'picker', label: '选择商品', notes: { result: '确认回写，取消保留原配置。' } },
  { id: 'saved', label: '已保存', notes: { result: '所选配置已保存到本次演示内存。' } }
];
admin.notes = { description: '验证已有商城壳内的配置操作。', groups: [{ title: '配置规则', items: ['确认才回写，取消不提交。'] }], result: '尚未保存。', boundary: '框架回归用例，不是业务交付。' };
const mobile = { id: 'mobile', label: '移动端 · 商品选择', overview: '滚动列表并选择商品，底部提交始终可达。', surface: 'mobile', viewport: { width: 390, height: 844 }, p0: ['P0-02'], visual: { status: 'none' }, states: [{ id: 'default', label: '未选择' }, { id: 'selected', label: '已选择', notes: { result: '已选商品已显示在底栏。' } }], notes: { description: '验证独立移动页面的滚动、底栏和状态。', result: '请选择商品。', boundary: '内存演示，不创建订单。', groups: [] } };
const custom = { id: 'custom', label: '其他后台 · 审核', overview: '其他系统保持自己的导航与密度。', surface: 'custom-admin', viewport: { width: 1200, height: 800 }, p0: ['P0-03'], visual: { status: 'none' }, states: [{ id: 'default', label: '待审核' }, { id: 'approved', label: '已审核', notes: { result: '审核结果已更新。' } }], notes: { description: '验证其他后台不带入商城导航。', result: '待审核。', boundary: '仅演示本地状态。', groups: [] } };
const config = { title: '三栏需求讲解 · 框架回归', overview: '验证商城配置、移动选择与其他后台在同一讲解框架内独立运行。', businessFlow: { title: '商品配置与确认', summary: '运营配置商品，会员在移动端完成选择，审核系统记录结果。', outcome: '配置保存后可供用户选择，审核状态可追踪。', boundary: '框架回归样例，不代表生产数据结构。', stages: [ { id: 'configure', label: '配置商品', summary: '运营建立可选商品', actions: [{ role: '运营人员', kind: 'execute', mode: 'online', system: '商城后台', text: '编辑并保存商品配置' }], records: [{ name: '商品配置记录（业务示意）', sampleData: '商品：普通商品 · 状态：已保存' }] }, { id: 'select', label: '选择并处理', summary: '用户选择商品并完成审核', actions: [{ role: '会员', kind: 'trigger', mode: 'online', system: 'APP', text: '选择商品并提交' }, { role: '审核系统', kind: 'execute', mode: 'online', system: '审核后台', text: '更新审核结果' }], records: [] } ] }, pages: [admin, mobile, custom] };
mobile.terminal = 'app';
const html = `<section data-page-panel="admin" data-p0="P0-01"><section data-admin-content><div class="config-page"><h2>关联商品配置</h2><p>当前配置：<strong data-value>普通商品</strong></p><button data-open>关联商品</button><button data-save>保存</button><p data-saved>尚未保存</p><div class="dialog-mask" data-modal hidden><section class="picker" role="dialog" aria-label="关联商品"><h3>关联商品</h3><label><input type="checkbox" data-bundle>组合商品</label><footer><button data-cancel>取消</button><button data-confirm>确认</button></footer></section></div></div></section></section>
<section data-page-panel="mobile" data-p0="P0-02"><div class="phone"><header><h2>选择商品</h2></header><div class="goods-scroll">${Array.from({ length: 18 }, (_, i) => `<button class="good" data-good="商品 ${i + 1}"><span data-demo-icon="gift"></span><span>商品 ${i + 1}</span></button>`).join('')}</div><footer class="phone-footer"><span data-selection>未选择</span><button data-submit>确认选择</button><span data-submitted></span></footer></div></section>
<section data-page-panel="custom" data-p0="P0-03"><div class="other-system"><aside>审核系统<br>申请管理</aside><main><h2>申请审核</h2><p data-status>待审核</p><button data-approve>通过</button></main></div></section>`;
const style = `<style id="productStyles">@scope ([data-page-panel]) {
 .config-page { padding: 24px; background: white; font-size: 14px; }
 .config-page button { margin: 8px; padding: 8px 16px; }
 .dialog-mask { position: absolute; inset: 0; display: grid; place-items: center; background: #0006; z-index: 5000; }
 .picker { width: 480px; padding: 24px; background: white; }
 .phone { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; background: white; font-size: 16px; }
 .phone header { padding: 8px 20px; border-bottom: 1px solid #ddd; }
 .goods-scroll { overflow: auto; min-height: 0; }
 .good { display: flex; align-items: center; gap: 18px; padding: 20px; width: 100%; height: 110px; border: 0; border-bottom: 1px solid #ddd; background: white; }
 .good .demo-icon { width: 32px; height: 32px; }
 .phone-footer { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 16px; background: #e9f5ec; }
 .phone-footer button { padding: 10px; background: #21733c; color: white; border: 0; }
 .other-system { display: grid; grid-template-columns: 200px 1fr; height: 100%; background: #f6f5f1; }
 .other-system aside { padding: 24px; background: #31423c; color: white; }
 .other-system main { padding: 32px; }
}</style>`;
const script = `<script>
const admin = productDemo.getPage('admin');
const a = selector => admin.querySelector(selector);
let saved = false;
a('[data-open]').onclick = () => { a('[data-bundle]').checked = a('[data-value]').textContent.includes('组合'); a('[data-modal]').hidden = false; productDemo.setPageState('admin', 'picker'); };
a('[data-cancel]').onclick = () => { a('[data-modal]').hidden = true; productDemo.setPageState('admin', saved ? 'saved' : 'default'); };
a('[data-confirm]').onclick = () => { a('[data-value]').textContent = a('[data-bundle]').checked ? '普通商品、组合商品' : '普通商品'; a('[data-modal]').hidden = true; saved = false; a('[data-saved]').textContent = '尚未保存'; productDemo.setPageState('admin', 'default'); };
a('[data-save]').onclick = () => { saved = true; a('[data-saved]').textContent = '已保存：' + a('[data-value]').textContent; productDemo.setPageState('admin', 'saved'); };
const mobile = productDemo.getPage('mobile');
let selected = '';
mobile.querySelectorAll('[data-good]').forEach(button => button.onclick = () => { selected = button.dataset.good; mobile.querySelector('[data-selection]').textContent = selected; productDemo.setPageState('mobile', 'selected'); });
mobile.querySelector('[data-submit]').onclick = () => { mobile.querySelector('[data-submitted]').textContent = selected ? '已确认：' + selected : '请先选择商品'; };
const other = productDemo.getPage('custom');
other.querySelector('[data-approve]').onclick = () => { other.querySelector('[data-status]').textContent = '已审核'; productDemo.setPageState('custom', 'approved'); };
</script>`;
let fixture = slot(template, 'PRODUCT_HTML', html);
fixture = slot(fixture, 'PRODUCT_STYLE', style);
fixture = slot(fixture, 'PRODUCT_SCRIPT', script);
const configure = (value, candidate = fixture) => slot(candidate, 'CONFIG', `<script>window.DEMO_CONFIG = ${JSON.stringify(value)};</script>`);
fixture = configure(config);
let count = 0;
const check = (name, candidate, expected) => {
  fs.writeFileSync(output, candidate);
  const run = spawnSync(process.execPath, [path.join(__dirname, 'scaffold-demo.js'), root, '--check-shell'], { encoding: 'utf8' });
  assert.equal(run.status === 0, expected, `${name}:\n${run.stdout}${run.stderr}`);
  count++; console.log(`PASS ${name}`);
};
const changeConfig = (edit) => { const copy = structuredClone(config); edit(copy); return configure(copy); };
check('mixed pages accepted', fixture, true);
check('simple demo without business flow accepted', changeConfig(c => delete c.businessFlow), true);
check('multiple business flows accepted', changeConfig(c => { const stages = c.businessFlow.stages; delete c.businessFlow.stages; c.businessFlow.flows = [{ id: 'primary', title: '主流程', stages }, { id: 'secondary', title: '另一业务流程', stages: stages.slice().reverse() }]; }), true);
check('ambiguous flow formats rejected', changeConfig(c => { c.businessFlow.flows = [{ id: 'primary', title: '主流程', stages: c.businessFlow.stages }]; }), false);
check('empty multiple flows rejected', changeConfig(c => { delete c.businessFlow.stages; c.businessFlow.flows = []; }), false);
check('invalid second flow rejected', changeConfig(c => { const stages = c.businessFlow.stages; delete c.businessFlow.stages; c.businessFlow.flows = [{ id: 'primary', title: '主流程', stages }, { id: 'secondary', title: '另一业务流程', stages: [] }]; }), false);
check('partial business flow rejected', changeConfig(c => c.businessFlow.stages[0].actions[0].role = ''), false);
check('missing action role rejected', changeConfig(c => delete c.businessFlow.stages[0].actions[0].role), false);
check('online endpoint required', changeConfig(c => delete c.businessFlow.stages[0].actions[0].system), false);
check('offline location required', changeConfig(c => { c.businessFlow.stages[0].actions[0].mode = 'offline'; }), false);
check('system trace sample required', changeConfig(c => delete c.businessFlow.stages[0].records[0].sampleData), false);
check('unfinished template rejected', template, false);
check('outer frame edit rejected', fixture.replace('概述：显示', '导航'), false);
check('locked navigation CSS edit rejected', fixture.replace('font-size: 12px; text-align: left', 'font-size: 8px; text-align: left'), false);
check('mall CSS override rejected', fixture.replace('.config-page {', '.admin-primary-item {'), false);
check('small mall canvas rejected', changeConfig(c => c.pages[0].viewport.width = 1280), false);
check('missing unreferenced viewport rejected', changeConfig(c => delete c.pages[1].viewport), false);
check('duplicate page ID rejected', changeConfig(c => c.pages[1].id = 'admin'), false);
check('missing overview rejected', changeConfig(c => c.overview = ''), false);
check('missing page explanation rejected', changeConfig(c => c.pages[1].overview = ''), false);
check('invalid P0 rejected', changeConfig(c => c.pages[0].p0 = ['invalid']), false);
check('P0 mismatch rejected', changeConfig(c => c.pages[0].p0 = ['P0-99']), false);
check('all P0 omitted rejected', changeConfig(c => c.pages.forEach(page => page.p0 = [])), false);
check('invalid note groups rejected', changeConfig(c => c.pages[0].notes.groups = 'invalid'), false);
check('invalid state notes rejected', changeConfig(c => c.pages[1].states[0].notes = 'invalid'), false);
check('missing default state rejected', changeConfig(c => c.pages[1].states.shift()), false);
check('unlabeled state rejected', changeConfig(c => delete c.pages[1].states[0].label), false);
check('missing reference evidence rejected', changeConfig(c => c.pages[0].visual = { status: 'reference' }), false);
check('primary menu override rejected', changeConfig(c => c.pages[0].adminShell.modules = []), false);
check('invalid active module rejected', changeConfig(c => c.pages[0].adminShell.activeModule = '不存在'), false);
check('per-page mall content checked', changeConfig(c => { c.pages[2].surface = 'mall-admin'; c.pages[2].viewport = c.pages[0].viewport; c.pages[2].adminShell = c.pages[0].adminShell; }), false);
check('wrong mobile shell rejected', fixture.replace('<div class="phone">', '<div class="phone" data-admin-content>'), false);
check('mobile viewport surface required', changeConfig(c => c.pages[1].surface = 'custom-admin'), false);
check('mobile terminal required', changeConfig(c => delete c.pages[1].terminal), false);
check('mini-program chrome rejected in APP', fixture.replace('<div class="phone">', '<div class="phone"><div class="mini-capsule"></div>'), false);
check('mini-program chrome required', changeConfig(c => c.pages[1].terminal = 'mini-program'), false);
check('mobile simulated device rejected', fixture.replace('<div class="phone">', '<div class="mobile-device">'), false);
check('mobile min canvas rejected', fixture.replace('.phone {', '.phone { width:min(390px, 100%);'), false);
check('undeclared literal state rejected', fixture.replace("productDemo.setPageState('mobile', 'selected')", "productDemo.setPageState('mobile', 'missing')"), false);
check('outside page footer rejected', fixture.replace('<!-- EDITABLE:PRODUCT_HTML:END -->', '<button>错误底栏</button><!-- EDITABLE:PRODUCT_HTML:END -->'), false);
check('bad nesting rejected', fixture.replace('<!-- EDITABLE:PRODUCT_HTML:END -->', '</section><!-- EDITABLE:PRODUCT_HTML:END -->'), false);
check('script syntax rejected', fixture.replace('let saved = false;', 'let saved = ;'), false);
check('browser top-layer rejected', fixture.replace('let saved = false;', 'let saved = false; modal.showModal();'), false);
check('global DOM edit rejected', fixture.replace('let saved = false;', 'let saved = false; document.body.remove();'), false);
check('parent traversal rejected', fixture.replace('let saved = false;', 'let saved = false; admin.parentElement.remove();'), false);
check('external image rejected', fixture.replace('<div class="config-page">', '<div class="config-page"><img src="https://example.com/a.png">'), false);
check('text and icon button accepted', fixture.replace('data-open>关联商品', 'data-open><span data-demo-icon="plus"></span>关联商品'), true);
check('unlabeled icon button rejected', fixture.replace('data-open>关联商品', 'data-open><span data-demo-icon="plus"></span>'), false);
check('scope escape rejected', slot(fixture, 'PRODUCT_STYLE', '<style id="productStyles">body { display:none }</style>'), false);
check('scaled prototype rejected', fixture.replace('.phone {', '.phone { transform: scale(.5);'), false);
check('reserved frame ID rejected', fixture.replace('<div class="phone">', '<div class="phone" id="notesPanel">'), false);
check('page root CSS rejected', fixture.replace('.phone {', ':scope {'), false);
check('inline page override rejected', fixture.replace('<div class="phone">', '<div class="phone" style="position:fixed">'), false);
check('ancestor escape rejected', fixture.replace('let saved = false;', "let saved = false; admin.closest('body').remove();"), false);
check('unknown dynamic icon rejected', fixture.replace('let saved = false;', "let saved = false; productDemo.createIcon('missing-icon');"), false);
check('unknown static icon rejected', fixture.replace('data-demo-icon="gift"', 'data-demo-icon="missing-icon"'), false);
check('embedded Spec reference accepted', changeConfig(c => { c.specSections = { rules: { title: '6.1 列表规则', items: ['创建时间降序。'] } }; c.pages[0].notes.specRefs = ['rules']; }), true);
check('missing Spec reference rejected', changeConfig(c => { c.pages[0].notes.specRefs = ['missing']; }), false);
check('empty Spec content rejected', changeConfig(c => { c.specSections = { rules: { title: '6.1', items: [] } }; }), false);
check('invalid state Spec reference rejected', changeConfig(c => { c.pages[0].states[0].notes = { specRefs: ['missing'] }; }), false);
check('missing page label rejected', changeConfig(c => { delete c.pages[0].label; }), false);
check('invalid state result rejected', changeConfig(c => { c.pages[0].states[0].notes = { result: {} }; }), false);
check('unlabeled inline SVG button rejected', fixture.replace('data-open>关联商品', 'data-open><svg><path d="M0 0"></path></svg>'), false);
check('labeled inline SVG button accepted', fixture.replace('data-open>关联商品', 'data-open aria-label="打开选择"><svg><path d="M0 0"></path></svg>'), true);
check('whitespace icon label rejected', fixture.replace('data-open>关联商品', 'data-open aria-label="   "><span data-demo-icon="plus"></span>'), false);
check('final valid fixture', fixture, true);
for (const match of fixture.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
console.log(`PASS ${count} contract cases; all inline scripts parse.`);
console.log(`BROWSER_FIXTURE=${output}`);
const multiConfig = structuredClone(config);
const multiStages = multiConfig.businessFlow.stages;
delete multiConfig.businessFlow.stages;
multiConfig.businessFlow.flows = [
  { id: 'primary', title: '商品配置与确认', stages: multiStages },
  { id: 'secondary', title: '配置复核流程', stages: [...multiStages, { ...structuredClone(multiStages[0]), id: 'review', label: '复核配置' }] }
];
const multiOutput = path.join(root, 'demo/multiple-flows.html');
fs.writeFileSync(multiOutput, configure(multiConfig));
console.log(`MULTI_FLOW_FIXTURE=${multiOutput}`);

// Exercise icon hydration independently of business code, including replaced markup.
class IconNode {
  constructor(tag) { this.tag = tag; this.dataset = {}; this.children = []; this.classList = { add() {} }; }
  setAttribute() {}
  append(node) { this.children.push(node); }
  replaceChildren(node) { this.children = [node]; }
  matches() { return this.dataset.demoIcon !== undefined; }
  querySelectorAll() { return this.children.filter(node => node.matches()); }
  querySelector() { return this.children.find(node => node.tag === 'svg' && node.children.length); }
}
const iconCode = template.slice(template.indexOf('      const DEMO_ICONS'), template.indexOf('      const MALL_ADMIN_MODULES')) +
  template.slice(template.indexOf('      const createIcon'), template.indexOf('      const addIconText'));
const iconContext = { document: { createElementNS: (_, tag) => new IconNode(tag) } };
vm.runInNewContext(iconCode + ';this.hydrate = hydrateIcons;', iconContext);
const rootNode = new IconNode('div');
const missing = new IconNode('span'); missing.dataset.demoIcon = 'absent';
const valid = new IconNode('span'); valid.dataset.demoIcon = 'search';
rootNode.children = [missing, valid];
iconContext.hydrate(rootNode);
assert.equal(missing.dataset.iconError, 'absent');
assert.ok(valid.querySelector());
valid.children = [];
iconContext.hydrate(valid);
assert.ok(valid.querySelector());
valid.dataset.demoIcon = 'plus';
iconContext.hydrate(valid);
assert.equal(valid.dataset.iconReady, 'plus');
missing.dataset.demoIcon = 'close'; iconContext.hydrate(missing);
assert.equal(missing.dataset.iconError, undefined);
console.log('PASS icon hydration: unknown isolation, insertion root, replaced content, name change, recovery');

// Both entry types invoke the same navigation functions and retain page instances.
const pageNodes = ['list', 'form'].map(id => ({ dataset: { pagePanel: id, state: 'default' }, hidden: false }));
const navNodes = ['list', 'form'].map(id => ({ dataset: { pageTarget: id }, setAttribute(key, value) { this[key] = value; } }));
const navContext = {
  pageById: new Map(['list', 'form'].map(id => [id, { states: [{ id: 'default' }, { id: 'edit' }] }])),
  navigation: { page: 'list', states: new Map([['list', 'default'], ['form', 'default']]) },
  CSS: { escape: value => value },
  $$: selector => selector === '[data-page-panel]' ? pageNodes : navNodes,
  businessFlowButton: { setAttribute(key, value) { this[key] = value; } },
  $: selector => selector === '#prototypeContent' ? { scrollTo() {} } : selector === '#businessFlowPanel' ? { hidden: true } : pageNodes.find(node => selector.includes('"' + node.dataset.pagePanel + '"')),
  renderNotes: id => { navContext.notesPage = id; }
};
const navigationCode = template.slice(template.indexOf('      const showPage ='), template.indexOf('      const setSide =')) +
  template.slice(template.indexOf('      const setPageState ='), template.indexOf('      // Runtime checks'));
vm.runInNewContext(navigationCode + ';this.show = showPage; this.setState = setPageState;', navContext);
pageNodes[1].draft = { title: '正在编辑的任务' };
navContext.setState('form', 'edit'); navContext.show('form');
assert.equal(navContext.navigation.page, 'form');
assert.equal(navContext.notesPage, 'form');
assert.equal(navNodes[1]['aria-current'], 'page');
assert.equal(pageNodes[0].hidden, true);
navContext.show('list'); navContext.show('form');
assert.equal(pageNodes[1].draft.title, '正在编辑的任务');
assert.equal(navContext.navigation.states.get('form'), 'edit');
assert.equal(navContext.notesPage, 'form');
assert.throws(() => navContext.show('missing'));
assert.equal(navContext.navigation.page, 'form');
console.log('PASS navigation: common entry, three-column sync, retained draft/state, invalid target');

const routingCode = rawTemplate.slice(rawTemplate.indexOf('      const pageById ='), rawTemplate.indexOf('      const createIcon ='));
for (const [flowConfig, expectedPage, expectedFlow] of [[{}, 'list', false], [{ businessFlow: { stages: [{ id: 'a' }] } }, '__business_flow__', true]]) {
  const routingContext = { config: { ...flowConfig, pages: [{ id: 'list' }, { id: 'form' }] } };
  vm.runInNewContext(routingCode + ';this.initialPage = navigation.page; this.flowEnabled = hasBusinessFlow;', routingContext);
  assert.equal(routingContext.initialPage, expectedPage);
  assert.equal(routingContext.flowEnabled, expectedFlow);
}
assert.match(rawTemplate, /if \(hasBusinessFlow\) showBusinessFlow\(\);\s*else showPage\(config\.pages\[0\]\.id\);/);
console.log('PASS optional flow routing: applicable demos start at overview; simple demos start at first product page');

// Render actual notes code: retain base rules, append state detail and embed Spec text.
class NoteNode {
  constructor() { this.children = []; this.dataset = {}; this.textContent = ''; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.append(node); }
  replaceChildren() { this.children = []; }
}
const noteNodes = new Map();
const notePage = { label: '任务列表', notes: { groups: [{ title: '字段', items: ['编号唯一'] }], specRefs: ['rules'] }, states: [{ id: 'filtered', notes: { groups: [{ title: '筛选结果', items: ['仅显示匹配项'] }], specRefs: ['rules'] } }] };
const noteContext = {
  pageById: new Map([['list', notePage], ['other', { label: '其他页面', notes: {}, states: [] }]]),
  navigation: { states: new Map([['list', 'filtered']]) },
  config: { specSections: { rules: { title: '6.1 排序', items: ['创建时间降序'] } } },
  CSS: { escape: value => value },
  document: { createElement: () => new NoteNode() },
  $: selector => { if (!noteNodes.has(selector)) noteNodes.set(selector, new NoteNode()); return noteNodes.get(selector); }
};
vm.runInNewContext(template.slice(template.indexOf('      const renderNotes ='), template.indexOf('      const showPage =')) + ';this.render = renderNotes;', noteContext);
noteContext.render('list');
const renderedGroups = noteNodes.get('#notesRules').children;
assert.equal(renderedGroups.length, 3);
assert.equal(renderedGroups[0].children[0].textContent, '字段');
assert.equal(renderedGroups[2].children[0].textContent, 'Spec · 6.1 排序');
assert.equal(renderedGroups[2].children[1].children[0].textContent, '创建时间降序');
noteContext.render('other');
assert.equal(noteNodes.get('#notesRules').children.length, 0);
console.log('PASS detailed notes: base/state rules, embedded Spec text, deduplication, page switch cleanup');

// End-to-end assembly: independent output, then business-slot edit and ordinary validation.
for (const systemId of ['mall-admin', 'middle-platform', 'mobile', 'mini-program']) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'system-shell-integration-'));
  const cli = path.join(__dirname, 'scaffold-demo.js');
  const created = spawnSync(process.execPath, [cli, dir, '--system', systemId], {encoding:'utf8'});
  assert.equal(created.status, 0, created.stderr);
  const file = path.join(dir, 'demo/index.html');
  let assembled = fs.readFileSync(file, 'utf8');
  assert.ok(!assembled.includes('INCLUDE:'));
  assert.ok(assembled.includes(systemId === 'mall-admin' ? 'data-page-panel="main"' : systemId === 'middle-platform' ? 'data-page-panel="suppliers"' : systemId === 'mobile' ? 'data-page-panel="mobile-page"' : 'data-page-panel="mini-home"'));
  if (systemId === 'mobile') {
    for (const chrome of ['mobile-status-bar', 'mobile-cellular', 'mobile-wifi', 'mobile-battery']) assert.ok(assembled.includes(chrome), `mobile missing reusable chrome: ${chrome}`);
    assert.ok(!assembled.includes('mini-capsule'), 'APP/H5 mobile shell must not include mini-program capsule');
  }
  if (systemId === 'mini-program') {
    for (const chrome of ['mini-program-system-ui', 'mini-status-bar', 'mini-cellular', 'mini-wifi', 'mini-battery', 'mini-capsule', 'mini-close-program']) assert.ok(assembled.includes(chrome), `mini-program missing reusable chrome: ${chrome}`);
    assert.ok(!assembled.includes('mini-nav-bar'), 'mini-program must not preserve business navigation as reusable chrome');
    assert.ok(!assembled.includes('mini-search'), 'mini-program must not preserve business search as reusable chrome');
    for (const dimension of ['height:36px', 'top:43px;right:17px', 'width:70px;height:28px']) assert.ok(assembled.includes(dimension), `mini-program does not preserve reference-scale chrome: ${dimension}`);
  }
  const unfinished = spawnSync(process.execPath, [cli, dir, '--check-shell']);
  assert.notEqual(unfinished.status, 0, 'shell alone must not pass as a business deliverable');
  for (const name of ['PRODUCT_STYLE','PRODUCT_HTML','CONFIG','PRODUCT_SCRIPT']) {
    const value = fixture.match(new RegExp(`<!-- EDITABLE:${name}:START -->([\\s\\S]*?)<!-- EDITABLE:${name}:END -->`))[1];
    assembled = slot(assembled, name, value);
  }
  fs.writeFileSync(file, assembled);
  const validated = spawnSync(process.execPath, [cli, dir, '--check-shell'], {encoding:'utf8'});
  assert.equal(validated.status, 0, validated.stderr);
  const duplicate = spawnSync(process.execPath, [cli, dir, '--system', systemId]);
  assert.notEqual(duplicate.status, 0);
  assert.equal(fs.readFileSync(file,'utf8'),assembled);
  console.log(`PASS ${systemId}: scaffold, reject unimplemented shell, edit slots, validate, preserve existing output`);
}
