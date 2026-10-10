#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { compose } = require("./shell-library");
const systemIndex = process.argv.indexOf("--system");
const systemId = systemIndex < 0 ? "mall-admin" : process.argv[systemIndex + 1];

const specDirectory = process.argv[2];
const checkShell = process.argv.includes("--check-shell");
const shellAsset = process.argv.includes("--shell-asset");
const specIndex = process.argv.indexOf("--spec");
const specFile = specIndex < 0 ? null : process.argv[specIndex + 1];
if (!specDirectory) {
  console.error("Usage: node scaffold-demo.js <SPEC directory> [--system <system-id>] [--check-shell] [--shell-asset] [--spec <SPEC.md>]");
  process.exit(2);
}

const skillDirectory = path.resolve(__dirname, "..");
const template = path.join(skillDirectory, "assets", "demo-template", "index.html");
const outputDirectory = path.join(path.resolve(specDirectory), "demo");
const output = path.join(shellAsset ? path.resolve(specDirectory) : outputDirectory, "index.html");
if (shellAsset && !checkShell) { console.error("--shell-asset is read-only and requires --check-shell"); process.exit(2); }
if (specFile && !checkShell) { console.error("--spec requires --check-shell"); process.exit(2); }
const lockedPattern = /<!-- LOCKED:([A-Z_]+):START -->([\s\S]*?)<!-- LOCKED:\1:END -->/g;
const editableNames = ["PRODUCT_STYLE", "PRODUCT_HTML", "CONFIG", "PRODUCT_SCRIPT"];
const requiredIds = ["cover", "enterDemo", "app", "toggleOverview", "toggleNotes", "overviewPanel", "overviewNav", "prototypePanel", "prototypeContent", "businessFlowPanel", "notesPanel"];
// Read the single canonical module list from the template; do not maintain a second copy.
const templateText = compose();
const iconExpression = templateText.match(/const DEMO_ICONS = Object\.freeze\((\{[\s\S]*?\})\);/)?.[1];
const knownIcons = new Set(Object.keys(vm.runInNewContext(`(${iconExpression})`, {}, { timeout: 100 })));
const moduleExpression = templateText.match(/const MALL_ADMIN_MODULES = Object\.freeze\((\[[^\n]+\])\);/)?.[1];
const mallAdminModules = vm.runInNewContext(moduleExpression, {}, { timeout: 100 }).map((item) => item.label);
const mallAdminViewport = Object.freeze({ width: 1791, height: 1120 });

const fail = (messages) => {
  for (const message of messages) console.error(`FAIL: ${message}`);
  process.exit(1);
};
const extractLocked = (html) => {
  const blocks = new Map();
  for (const match of html.matchAll(lockedPattern)) {
    if (blocks.has(match[1])) fail([`duplicate locked block: ${match[1]}`]);
    blocks.set(match[1], match[2]);
  }
  return blocks;
};
const markerCount = (html, marker) => html.split(marker).length - 1;
const maskEditable = (html) => {
  let masked = html;
  for (const name of editableNames) {
    const block = new RegExp(`(<!-- EDITABLE:${name}:START -->)[\\s\\S]*?(<!-- EDITABLE:${name}:END -->)`, "g");
    masked = masked.replace(block, `$1\n__EDITABLE_${name}__\n$2`);
  }
  return masked;
};
const extractEditable = (html, name) => {
  const pattern = new RegExp(`<!-- EDITABLE:${name}:START -->([\\s\\S]*?)<!-- EDITABLE:${name}:END -->`);
  return html.match(pattern)?.[1] || "";
};
const sortedP0 = (value) => [...new Set((Array.isArray(value) ? value : []).filter((id) => /^P0-[A-Za-z0-9_-]+$/.test(id)))].sort();
const parseConfig = (block) => {
  const script = block.match(/^\s*<script>([\s\S]*)<\/script>\s*$/)?.[1];
  if (!script || /<\/?script\b/i.test(script)) throw new Error("CONFIG must contain exactly one script");
  const context = { window: {} };
  vm.runInNewContext(script, context, { timeout: 100 });
  return context.window.DEMO_CONFIG;
};
const parsePanels = (block) => {
  const panels = new Map();
  for (const match of block.matchAll(/<[a-z][\w-]*\b([^>]*\bdata-page-panel=["'][^"']+["'][^>]*)>/gi)) {
    const attributes = match[1];
    const id = attributes.match(/\bdata-page-panel=["']([^"']+)["']/i)?.[1];
    const p0Text = attributes.match(/\bdata-p0=["']([^"']*)["']/i)?.[1] || "";
    if (!id || panels.has(id)) throw new Error(`PRODUCT_HTML has duplicate or invalid page panel: ${id || "unknown"}`);
    panels.set(id, [...new Set(p0Text.split(/[\s,]+/).filter(Boolean))].sort());
  }
  return panels;
};
// Check the actual nesting contract, not only the presence of marker strings.
const validateProductStructure = (block) => {
  const errors = [];
  const stack = [];
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const clean = block.replace(/<!--[\s\S]*?-->/g, "");
  for (const token of clean.matchAll(/<\/?([a-z][\w-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*\s*>/gi)) {
    const tag = token[1].toLowerCase();
    const closing = /^<\//.test(token[0]);
    if (["script", "style", "link", "base", "html", "head", "body"].includes(tag)) errors.push(`PRODUCT_HTML cannot contain ${tag}`);
    if (closing) {
      if (stack.pop() !== tag) errors.push(`PRODUCT_HTML unbalanced closing tag: ${tag}`);
    } else {
      if (!stack.length && !/\bdata-page-panel=["'][^"']+["']/.test(token[0])) errors.push("PRODUCT_HTML top-level elements must be page panels; overlays belong inside their page");
      if (stack.length && /\bdata-page-panel=/.test(token[0])) errors.push("page panels cannot be nested");
      if (/\b(?:popover|on[a-z]+\s*=)/i.test(token[0])) errors.push("PRODUCT_HTML cannot use top-layer popovers or inline event handlers");
      if (!voidTags.has(tag) && !/\/>$/.test(token[0])) stack.push(tag);
    }
  }
  if (stack.length) errors.push("PRODUCT_HTML has unclosed elements");
  return errors;
};
const validateVisualConfig = (page) => {
  const errors = [];
  if (!["mall-admin", "mobile", "custom-admin"].includes(page.surface)) errors.push(`${page.id}.surface must be "mall-admin", "mobile", or "custom-admin"`);
  const visual = page.visual;
  if (!visual || !["reference", "none"].includes(visual.status)) return [`${page.id}.visual.status must be "reference" or "none"`];
  const states = Array.isArray(page.states) ? page.states : [];
  const stateIds = states.map((state) => state?.id).filter(Boolean);
  if (!stateIds.includes("default") || new Set(stateIds).size !== stateIds.length || stateIds.length !== states.length || states.some((state) => typeof state.label !== "string" || !state.label.trim())) errors.push(`${page.id}.states must contain unique labeled states including default`);
  {
    const width = Number(page.viewport?.width);
    const height = Number(page.viewport?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || !(width > 0) || !(height > 0)) errors.push(`${page.id}.viewport needs positive finite width and height`);
  }
  if (visual.status === "reference") {
    if (typeof visual.baseline !== "string" || !visual.baseline.trim()) errors.push(`${page.id}.visual.baseline is required for reference pages`);
    if (!Array.isArray(visual.preserve) || !visual.preserve.length) errors.push(`${page.id}.visual.preserve is required for reference pages`);
    if (!Array.isArray(visual.allowedChanges)) errors.push(`${page.id}.visual.allowedChanges must be an array`);
    if (!Array.isArray(visual.cases) || !visual.cases.length) errors.push(`${page.id}.visual.cases is required for reference pages`);
    for (const visualCase of visual.cases || []) {
      if (!visualCase?.id || !stateIds.includes(visualCase.state)) errors.push(`${page.id}.visual.cases must reference declared states`);
    }
  }
  return errors;
};
const validateBusinessFlow = (flow) => {
  const errors = [];
  if (flow === undefined || flow === null) return errors;
  if (!flow || typeof flow !== "object" || Array.isArray(flow) || flow.status === "placeholder") return ["CONFIG.businessFlow must contain a confirmed end-to-end business flow"];
  for (const key of ["title", "summary", "outcome"]) if (typeof flow[key] !== "string" || !flow[key].trim()) errors.push(`businessFlow.${key} is required`);
  if (flow.flows !== undefined) {
    if (flow.stages !== undefined) errors.push("businessFlow must use either flows or stages, not both");
    if (!Array.isArray(flow.flows) || !flow.flows.length) return [...errors, "businessFlow.flows must be a non-empty array"];
    const flowIds = new Set();
    for (const [index, item] of flow.flows.entries()) {
      const prefix = `businessFlow.flows[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) { errors.push(`${prefix} must be an object`); continue; }
      if (typeof item.id !== "string" || !item.id.trim() || flowIds.has(item.id)) errors.push(`${prefix}.id must be unique and non-empty`);
      flowIds.add(item.id);
      if (item.flows !== undefined) errors.push(`${prefix} cannot contain nested flows`);
      errors.push(...validateBusinessFlow({ title: item.title, summary: flow.summary, outcome: flow.outcome, stages: item.stages }).map(error => error.replace(/businessFlow/g, prefix)));
    }
    if (flow.readingRules !== undefined && (!Array.isArray(flow.readingRules) || flow.readingRules.some(rule => typeof rule !== "string" || !rule.trim()))) errors.push("businessFlow.readingRules must contain non-empty strings");
    return errors;
  }
  if (!Array.isArray(flow.stages) || flow.stages.length < 2) return [...errors, "businessFlow.stages needs at least two ordered business stages"];
  const ids = new Set();
  for (const [index, stage] of flow.stages.entries()) {
    const prefix = `businessFlow.stages[${index}]`;
    if (!stage || typeof stage !== "object") { errors.push(`${prefix} must be an object`); continue; }
    if (typeof stage.id !== "string" || !stage.id.trim() || ids.has(stage.id)) errors.push(`${prefix}.id must be unique and non-empty`);
    ids.add(stage.id);
    for (const key of ["label", "summary"]) if (typeof stage[key] !== "string" || !stage[key].trim()) errors.push(`${prefix}.${key} is required`);
    if (!Array.isArray(stage.actions) || !stage.actions.length) errors.push(`${prefix}.actions needs at least one role-linked action`);
    for (const [actionIndex, action] of (stage.actions || []).entries()) {
      const actionPrefix = `${prefix}.actions[${actionIndex}]`;
      if (!action || typeof action !== "object") { errors.push(`${actionPrefix} must be an object`); continue; }
      for (const key of ["role", "text"]) if (typeof action[key] !== "string" || !action[key].trim()) errors.push(`${actionPrefix}.${key} is required`);
      if (!["trigger", "execute"].includes(action.kind)) errors.push(`${actionPrefix}.kind must be trigger or execute`);
      if (!["online", "offline"].includes(action.mode)) errors.push(`${actionPrefix}.mode must be online or offline`);
      const locationKey = action.mode === "online" ? "system" : action.mode === "offline" ? "location" : null;
      if (locationKey && (typeof action[locationKey] !== "string" || !action[locationKey].trim())) errors.push(`${actionPrefix}.${locationKey} is required for ${action.mode} actions`);
    }
    if (!Array.isArray(stage.records)) errors.push(`${prefix}.records must be an array (use [] when no system trace is confirmed)`);
    for (const [recordIndex, record] of (stage.records || []).entries()) {
      const recordPrefix = `${prefix}.records[${recordIndex}]`;
      for (const key of ["name", "sampleData"]) if (typeof record?.[key] !== "string" || !record[key].trim()) errors.push(`${recordPrefix}.${key} is required`);
    }
  }
  if (flow.readingRules !== undefined && (!Array.isArray(flow.readingRules) || flow.readingRules.some(rule => typeof rule !== "string" || !rule.trim()))) errors.push("businessFlow.readingRules must contain non-empty strings");
  return errors;
};
const validateAdminShell = (page, html) => {
  if (page.surface !== "mall-admin") return [];
  const shell = page.adminShell;
  if (!shell) return [`${page.id}.adminShell is required for an admin shell page`];
  const errors = [];
  if (Number(page.viewport?.width) !== mallAdminViewport.width || Number(page.viewport?.height) !== mallAdminViewport.height) {
    errors.push(`${page.id}.viewport must stay ${mallAdminViewport.width}x${mallAdminViewport.height} for mall-admin; use scrolling instead of shrinking the backend page`);
  }
  for (const marker of ["data-admin-content"]) {
    if (!html.includes(marker)) errors.push(`${page.id} admin shell missing ${marker}`);
  }
  if (Object.prototype.hasOwnProperty.call(shell, "modules")) errors.push(`${page.id}.adminShell.modules is locked by the mall admin template; remove it from CONFIG`);
  for (const key of ["secondary", "tabs", "localTabs"]) if (!Array.isArray(shell[key])) errors.push(`${page.id}.adminShell.${key} must be an array`);
  for (const key of ["activeModule", "activeSecondary", "activeTab", "activeLocalTab"]) if (typeof shell[key] !== "string" || !shell[key]) errors.push(`${page.id}.adminShell.${key} must be a non-empty string`);
  if (!mallAdminModules.includes(shell.activeModule)) errors.push(`${page.id}.adminShell.activeModule must be one of the locked mall admin modules`);
  if (!(shell.tabs || []).includes(shell.activeTab)) errors.push(`${page.id}.adminShell.activeTab must exist in tabs`);
  if (!(shell.localTabs || []).includes(shell.activeLocalTab)) errors.push(`${page.id}.adminShell.activeLocalTab must exist in localTabs`);
  if (!(shell.secondary || []).some((group) => Array.isArray(group?.children) && group.children.includes(shell.activeSecondary))) errors.push(`${page.id}.adminShell.activeSecondary must exist in secondary children`);
  return errors;
};
const validateTerminal = (page, html, style) => {
  const isMobileViewport = Number(page.viewport?.width) === 390 && Number(page.viewport?.height) === 844;
  if (page.surface !== "mobile") return isMobileViewport ? [`${page.id} uses the 390×844 mobile viewport; set surface to "mobile" and declare terminal`] : [];
  const errors = [];
  if (!['mini-program', 'app', 'h5'].includes(page.terminal)) {
    errors.push(`${page.id}.terminal must be "mini-program", "app", or "h5" for a mobile page`);
    return errors;
  }
  if (page.terminal === 'mini-program' && !/\bmini-(?:program-system-ui|capsule)\b/.test(html)) errors.push(`${page.id} is mini-program but lacks the reusable mini-program chrome`);
  if (page.terminal !== 'mini-program' && /\bmini-(?:program-system-ui|capsule|close-program)\b/.test(html + style)) errors.push(`${page.id} is ${page.terminal}; remove the mini-program capsule and chrome`);
  if (/\b(?:es-)?mobile-device\b/.test(html + style)) errors.push(`${page.id} must use the fixed mobile canvas, not a simulated device frame`);
  if (/\b(?:width|height)\s*:\s*min\(\s*(?:390px|844px)/i.test(style)) errors.push(`${page.id} must keep a fixed 390×844 mobile canvas; do not use min() to shrink it`);
  if (/[\u{1F300}-\u{1FAFF}]/u.test(html)) errors.push(`${page.id} must use SVG or data-demo-icon for mobile UI icons, not Emoji`);
  return errors;
};
const validateDeclaredStateCalls = (config, script) => {
  const statesByPage = new Map((config.pages || []).map(page => [page.id, new Set((page.states || []).map(state => state?.id))]));
  const errors = [];
  for (const match of script.matchAll(/\.setPageState\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g)) {
    const [, pageId, stateId] = match;
    if (!statesByPage.has(pageId)) errors.push(`PRODUCT_SCRIPT sets state for unknown page: ${pageId}`);
    else if (!statesByPage.get(pageId).has(stateId)) errors.push(`PRODUCT_SCRIPT sets undeclared state: ${pageId}/${stateId}`);
  }
  return errors;
};
const p0FromSpec = (source) => new Set([...source.matchAll(/^\|\s*(P0-[A-Za-z0-9_-]+)\s*\|/gm)].map(match => match[1]));
const validateProductIcons = (html) => {
  const errors = [];
  for (const match of html.matchAll(/\bdata-demo-icon=["']([^"']+)["']/gi)) {
    if (!knownIcons.has(match[1])) errors.push(`unknown data-demo-icon: ${match[1]}`);
  }
  for (const match of html.matchAll(/<button\b([^>]*)>[\s\S]*?<\/button>/gi)) {
    const visibleText = match[0].replace(/<svg\b[\s\S]*?<\/svg>/gi, "").replace(/<[^>]*>/g, "").trim();
    if (!visibleText && !match[1].match(/\baria-label=["']([^"']*)["']/i)?.[1].trim()) errors.push("icon-only or empty button needs aria-label");
  }
  return errors;
};
const validateScopedStyle = (block) => {
  const css = block.match(/^\s*<style id=["']productStyles["']>([\s\S]*)<\/style>\s*$/)?.[1];
  if (!css || /<\/?style\b/i.test(css)) return false;
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const prefix = "@scope ([data-page-panel])";
  if (!clean.startsWith(prefix)) return false;
  const scoped = clean.slice(prefix.length).trim();
  if (!scoped.startsWith("{") || !scoped.endsWith("}")) return false;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < scoped.length; index += 1) {
    const char = scoped[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) return false;
    if (depth === 0 && index !== scoped.length - 1) return false;
  }
  return depth === 0 && !quote;
};

if (!fs.existsSync(template)) fail([`template not found: ${template}`]);

if (checkShell) {
  if (!fs.existsSync(output)) fail([`Demo not found: ${output}`]);
  const source = templateText;
  const candidate = fs.readFileSync(output, "utf8");
  const expected = extractLocked(source);
  const actual = extractLocked(candidate);
  const errors = [];

  if (!candidate.includes('data-demo-shell="v2"')) errors.push('missing data-demo-shell="v2"');
  for (const [name, content] of expected) {
    if (!actual.has(name)) errors.push(`missing locked block: ${name}`);
    else if (actual.get(name) !== content) errors.push(`locked block changed: ${name}`);
  }
  if (actual.size !== expected.size) errors.push("unexpected or duplicate locked block");
  for (const name of editableNames) {
    for (const edge of ["START", "END"]) {
      const marker = `<!-- EDITABLE:${name}:${edge} -->`;
      if (markerCount(candidate, marker) !== 1) errors.push(`editable marker must appear once: ${name}:${edge}`);
    }
  }
  for (const id of requiredIds) {
    if (!candidate.includes(`id="${id}"`)) errors.push(`missing shell element: #${id}`);
  }
  for (const heading of ["概述", "原型", "说明"]) {
    if (!candidate.includes(`<h2 class="heading">${heading}</h2>`)) errors.push(`missing shell heading: ${heading}`);
  }
  if (maskEditable(candidate) !== maskEditable(source)) errors.push("content outside editable blocks changed");
  const productStyle = extractEditable(candidate, "PRODUCT_STYLE");
  const productHtml = extractEditable(candidate, "PRODUCT_HTML");
  const originalProductScript = extractEditable(candidate, "PRODUCT_SCRIPT");
  const scriptBody = originalProductScript.match(/^\s*<script>([\s\S]*?)<\/script>\s*$/)?.[1];
  if (scriptBody === undefined || /<\/?script\b/i.test(scriptBody)) errors.push("PRODUCT_SCRIPT must contain exactly one script");
  else { try { new vm.Script(scriptBody); } catch (error) { errors.push(`PRODUCT_SCRIPT syntax error: ${error.message}`); } }
  const rawProductScript = originalProductScript.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const productScript = rawProductScript
    .replace(/([\u0022\u0027`])(?:\\.|(?!\1)[\s\S])*?\1/g, "");
  if (!validateScopedStyle(productStyle)) errors.push("PRODUCT_STYLE must contain one productStyles element wrapped by @scope ([data-page-panel])");
  if (/\bdata-template-placeholder\b/.test(productHtml) || /\bdata-template-placeholder\b/.test(rawProductScript)) errors.push("template content placeholder remains; replace it with the confirmed page implementation before delivery");
  if (/\b(?:document|window|globalThis)\b/.test(productScript) || /\$\{[^}]*\b(?:document|window|globalThis)\b[^}]*\}/s.test(rawProductScript)) errors.push("PRODUCT_SCRIPT must access product nodes through productDemo, not global DOM");
  if (/\bdata-admin-primary\b/.test(rawProductScript)) errors.push("PRODUCT_SCRIPT must not render mall-admin primary navigation; use productDemo.renderMallAdminShell(pageId)");
  if (/\.(?:ownerDocument|parentNode|parentElement|defaultView)\b/.test(productScript)) errors.push("PRODUCT_SCRIPT cannot traverse outside product pages");
  if (/!important|@import|\bzoom\s*:|\bscale\s*:|transform\s*:[^;}]*scale/i.test(productStyle)) errors.push("product styles cannot override locked rules, import resources, or scale the canvas");
  if (/\.(?:admin-(?!content\b)[\w-]+)|\[data-admin-(?!content\b)/.test(productStyle)) errors.push("mall shell styles are locked; style business content only");
  if (/\bdata-admin-shell\b/.test(productHtml)) errors.push("mall shell markup is runtime-owned; provide data-admin-content only");
  if (/\b(?:src|href)\s*=\s*["'](?:https?:|\/\/)|url\(\s*["']?(?:https?:|\/\/)/i.test(productHtml + productStyle)) errors.push("Demo assets must be embedded, not external URLs");
  errors.push(...validateProductIcons(productHtml));
  for (const match of rawProductScript.matchAll(/(?:createIcon\(\s*|data-demo-icon=)["']([a-z][a-z-]*)["']/g)) {
    if (!knownIcons.has(match[1])) errors.push(`unknown script icon: ${match[1]}`);
  }
  for (const id of templateText.matchAll(/\bid="([^"]+)"/g)) {
    if (new RegExp(`\\bid=["']${id[1]}["']`).test(productHtml)) errors.push(`PRODUCT_HTML duplicates reserved ID: ${id[1]}`);
  }
  if (/\bstyle\s*=/i.test(productHtml)) errors.push("put product CSS in PRODUCT_STYLE, not inline style attributes");
  if (/:scope\s*[{,]|\b(?:contain|isolation)\s*:|\bposition\s*:\s*fixed/i.test(productStyle)) errors.push("do not restyle page roots or isolation; use an inner business root and absolute overlays");
  if (/\.(?:closest|getRootNode|insertAdjacentHTML|outerHTML)\b/.test(productScript)) errors.push("use queries and innerHTML within the page; ancestor lookup and structural escape APIs are not allowed");
  errors.push(...validateProductStructure(productHtml));
  if (/\b(?:showModal|requestFullscreen)\s*\(/.test(rawProductScript)) errors.push("product overlays must stay inside their page; browser top-layer APIs are not allowed");
  try {
    const config = parseConfig(extractEditable(candidate, "CONFIG"));
    const panels = parsePanels(extractEditable(candidate, "PRODUCT_HTML"));
    if (!config || !Array.isArray(config.pages) || !config.pages.length) throw new Error("DEMO_CONFIG.pages must be a non-empty array");
    const ids = config.pages.map((page) => page?.id);
    if (ids.some((id) => typeof id !== "string" || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) || new Set(ids).size !== ids.length) throw new Error("page IDs must be unique valid identifiers");
    if (typeof config.overview !== "string" || !config.overview.trim()) errors.push("CONFIG.overview must explain the overall requirement");
    if (!shellAsset) errors.push(...validateBusinessFlow(config.businessFlow));
    if (panels.size !== config.pages.length) errors.push("CONFIG pages and PRODUCT_HTML panels differ");
    if (!shellAsset && !config.pages.some((page) => Array.isArray(page.p0) && page.p0.length)) errors.push("Demo must map at least one confirmed P0 requirement");
    errors.push(...validateDeclaredStateCalls(config, rawProductScript));
    if (specFile) {
      const resolvedSpec = path.resolve(specFile);
      if (!fs.existsSync(resolvedSpec)) errors.push(`SPEC not found: ${resolvedSpec}`);
      else {
        const specP0 = p0FromSpec(fs.readFileSync(resolvedSpec, "utf8"));
        const demoP0 = new Set(config.pages.flatMap(page => page.p0 || []));
        for (const id of demoP0) if (!specP0.has(id)) errors.push(`Demo P0 is absent from SPEC mapping: ${id}`);
        for (const id of specP0) if (!demoP0.has(id)) errors.push(`SPEC P0 is absent from Demo mapping: ${id}`);
      }
    }

    if (config.specSections !== undefined && (!config.specSections || typeof config.specSections !== "object" || Array.isArray(config.specSections))) errors.push("specSections must be an object");
    for (const [id, section] of Object.entries(config.specSections || {})) {
      if (!section || typeof section.title !== "string" || !section.title.trim() || !Array.isArray(section.items) || !section.items.length || section.items.some(item => typeof item !== "string" || !item.trim())) errors.push(`specSections.${id} needs an exact Spec title and non-empty rule items`);
    }
    for (const page of config.pages) {
      if (typeof page.label !== "string" || !page.label.trim()) errors.push(`${page.id}.label must name the actual product page`);
      if (typeof page.overview !== "string" || !page.overview.trim()) errors.push(`${page.id}.overview must explain this page's functional change`);
      for (const key of ["description", "result", "boundary"]) if (typeof page.notes?.[key] !== "string" || !page.notes[key].trim()) errors.push(`${page.id}.notes.${key} is required`);
      for (const notes of [page.notes, ...(page.states || []).map((state) => state.notes).filter(Boolean)]) {
        if (!notes || typeof notes !== "object" || Array.isArray(notes)) { errors.push(`${page.id}: notes must be an object`); continue; }
        for (const key of ["description", "result", "boundary"]) if (notes[key] !== undefined && typeof notes[key] !== "string") errors.push(`${page.id}: notes.${key} must be a string`);
        if (notes.specRefs !== undefined && (!Array.isArray(notes.specRefs) || notes.specRefs.some(ref => typeof ref !== "string" || !Object.hasOwn(config.specSections || {}, ref)))) errors.push(`${page.id}: specRefs must reference embedded Spec sections`);
        if (notes.groups !== undefined && (!Array.isArray(notes.groups) || notes.groups.some((group) => !group || typeof group.title !== "string" || !Array.isArray(group.items) || group.items.some((item) => typeof item !== "string")))) errors.push(`${page.id}: note groups need title and string items`);
      }
      if (!Array.isArray(page.p0) || page.p0.some((id) => typeof id !== "string" || !/^P0-[A-Za-z0-9_-]+$/.test(id))) errors.push(`${page.id}.p0 must contain valid P0 identifiers`);
      const expectedP0 = sortedP0(page.p0);
      const actualP0 = panels.get(page.id);
      if (!actualP0) errors.push(`PRODUCT_HTML missing page panel: ${page.id}`);
      else if (expectedP0.join("\n") !== actualP0.join("\n")) errors.push(`P0 mapping differs on page ${page.id} (CONFIG: ${expectedP0.join(", ") || "none"}; HTML: ${actualP0.join(", ") || "none"})`);
      errors.push(...validateVisualConfig(page));
      const blocks = productHtml.split(/(?=<[a-z][\w-]*\b[^>]*\bdata-page-panel=)/i);
      const pageHtml = blocks.find((block) => block.match(/\bdata-page-panel=["']([^"']+)["']/)?.[1] === page.id) || "";
      errors.push(...validateAdminShell(page, pageHtml));
      errors.push(...validateTerminal(page, pageHtml, shellAsset ? "" : productStyle));
      if (page.surface !== "mall-admin" && /\bdata-admin-(?:shell|content)\b/.test(pageHtml)) errors.push(`${page.id} must not contain mall admin nodes`);
    }
  } catch (error) {
    errors.push(`invalid editable interface: ${error.message}`);
  }
  if (errors.length) fail(errors);
  console.log(`PASS: Demo shell v2 is intact: ${output}`);
  process.exit(0);
}

if (fs.existsSync(output)) fail([`Demo already exists; edit it directly: ${output}`]);
const assembled = compose(systemId);
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(output, assembled);
console.log(`Demo scaffold created: ${output}`);
