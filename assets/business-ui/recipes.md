# 可复制的终端组件结构

这些片段是自包含单 HTML Demo 内可复制的最小结构，不引入外部组件库。先读 `references/ui-design-guidelines.md` 决定任务和终端，再选 recipe；recipe 不会替需求决定分页、保存时机或业务结果。交互逻辑仍须在 `PRODUCT_SCRIPT` 中实现并用 Ego Lite 实际验证。

## PC 后台列表

筛选条件位于表格上方。短枚举使用原生 `select`，查询和重置的位置固定；宽表格用于真实跨行比较，数字列右对齐。

```html
<section data-ui-scope>
  <form data-ui-recipe="pc-filter-bar" aria-label="筛选供应商">
    <label>供应商名称<input name="name" type="search"></label>
    <label>签约日期<input name="signedAt" type="date"></label>
    <label>状态<select name="status"><option value="">全部</option></select></label>
    <div><button type="submit" class="ui-icon-label"><span data-demo-icon="search"></span><span>查询</span></button><button type="reset">重置</button></div>
  </form>
  <table data-ui-recipe="pc-data-table">
    <caption>供应商列表</caption>
    <thead><tr><th scope="col">供应商</th><th scope="col">状态</th><th scope="col" data-ui-align="numeric">订单数</th><th scope="col">操作</th></tr></thead>
    <tbody><tr><th scope="row">示例供应商</th><td>合作中</td><td data-ui-align="numeric">1,280</td><td><button type="button">查看详情</button></td></tr></tbody>
  </table>
</section>
```

## PC 对齐表单

每个字段使用明确关联的 `label`；recipe 提供共用标签列。强关联的短字段才并排，其余字段逐行阅读。

```html
<form data-ui-recipe="pc-aligned-form" data-ui-scope>
  <label for="supplier-name">供应商名称</label><input id="supplier-name" name="name" required>
  <label for="supplier-status">合作状态</label><select id="supplier-status" name="status"><option>请选择</option></select>
</form>
```

## PC 上下文抽屉与确认框

抽屉用于保留列表上下文的非模态编辑；它不调用 `openDialog()`、不声明 `aria-modal`、不禁用背景列表。触发器打开后把焦点移到有名称的抽屉标题或首字段；关闭后将焦点还给触发器。短而有后果的决定用真正的对话框，并提供取消与确认按钮。

```html
<aside data-ui-recipe="pc-context-drawer" aria-labelledby="edit-title">
  <h2 id="edit-title" tabindex="-1">编辑供应商</h2>
  <button type="button" aria-label="关闭编辑面板">关闭</button>
  <!-- 放置一列对齐表单；列表仍可访问 -->
</aside>
<div data-ui-dialog-layer data-ui-scope hidden>
  <section data-ui-recipe="pc-confirm-dialog" aria-label="确认停用供应商">
    <h2>确认停用？</h2><p>停用后该供应商不能接收新订单。</p>
    <button type="button">取消</button><button type="button">确认停用</button>
  </section>
</div>
```

确认操作发生时，将上面的 `data-ui-dialog-layer` 作为 `overlay`、`section` 作为 `dialog` 交给 `productDemo.openDialog(pageId, { overlay, dialog, onCancel })`；确认后先完成 Demo 内状态变更，再调用返回句柄的 `close()`。取消或 Escape 走 `onCancel` 并恢复原焦点。

## 移动列表和筛选面板

列表默认让用户先扫描摘要再进入详情。简单筛选放在轻量面板；打开后保留清晰的应用、重置和取消操作。若面板作为业务对话框，使用命名的 dialog 并遵循 UI 指引中的非模态 helper。

```html
<main class="mobile-actions" data-ui-recipe="mobile-record-list" data-ui-scope>
  <button class="ui-icon-label" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="order-filter"><span data-demo-icon="filter"></span><span>筛选</span></button>
  <article><h2>订单 #2026</h2><p>待发货 · ￥128.00</p><button type="button">查看详情</button></article>
</main>
<div id="order-filter" data-ui-recipe="mobile-filter-sheet" hidden>
  <section aria-label="筛选订单">
    <h2>筛选订单</h2><label>状态<select><option>全部</option></select></label>
    <button type="button">重置</button><button type="button">取消</button><button type="button">应用</button>
  </section>
</div>
```

打开筛选时用 `productDemo.openDialog(pageId, { overlay, dialog, initialFocus, onCancel })`；`onCancel` 恢复暂存筛选值，取消调用返回句柄的 `cancel()`，应用先提交筛选再 `close()`，并同步触发器的 `aria-expanded`。搜索和多选等字段只在 Spec 有对应规则时添加。

```js
let filterHandle;
const page = productDemo.getPage(pageId);
const trigger = page.querySelector('[aria-controls="order-filter"]');
const overlay = page.querySelector("#order-filter");
const dialog = overlay.querySelector("[aria-label='筛选订单']");
trigger.addEventListener("click", () => {
  trigger.setAttribute("aria-expanded", "true");
  filterHandle = productDemo.openDialog(pageId, { overlay, dialog, initialFocus: dialog.querySelector("select"), onCancel: () => { restoreFilters(); trigger.setAttribute("aria-expanded", "false"); } });
});
dialog.querySelector("button:first-of-type").addEventListener("click", resetDraftFilters);
dialog.querySelector("button:nth-of-type(2)").addEventListener("click", () => filterHandle.cancel("cancel-button"));
dialog.querySelector("button:last-of-type").addEventListener("click", () => { applyFilters(); trigger.setAttribute("aria-expanded", "false"); filterHandle.close(); });
```

## 移动选择与比较

长枚举进入选择页或可搜索面板，临时选择、确认回写和取消行为要由需求明确。只有跨项比较是核心任务时才用移动表格；滚动容器需在键盘和触控下都能横向访问，并有可访问名称。

```html
<div data-ui-recipe="mobile-comparison-table" role="region" aria-label="订单对比" tabindex="0">
  <table><thead><tr><th scope="col">属性</th><th scope="col">订单 A</th><th scope="col">订单 B</th></tr></thead>
    <tbody><tr><th scope="row">状态</th><td>待发货</td><td>已完成</td></tr></tbody>
  </table>
</div>
```

小程序在业务区显式避让 82px 系统状态与胶囊层；顶部区可标记 `data-ui-safe-area-top`，固定底部操作使用 `data-ui-recipe="mobile-bottom-action"` 并标记 `data-ui-safe-area-bottom`。滚动内容应留出完整按钮高度。安全区 token 不是视觉通过凭证，仍需在小程序终端截图和滚动检查。

```html
<div data-ui-mobile-page data-ui-scope>
  <header data-ui-safe-area-top><h1>页面标题</h1></header>
  <main data-ui-scroll-content><!-- 可滚动表单或列表 --></main>
  <footer data-ui-recipe="mobile-bottom-action" data-ui-safe-area-bottom><button type="button">保存</button></footer>
</div>
```

该 grid 将表单/列表留在独立滚动行，底栏在固定 390×844 小程序画布内占据自己的底行，因此按钮持续可见而不覆盖内容；较短页面也不需要人为堆叠固定高度的底部 padding。


## 图标与文字操作

上面的查询/筛选示例主动使用图标辅助识别，其余按钮不要求逐个加图标。先按 UI 指引确认终端和系统风格；将以下声明合并到 `PRODUCT_STYLE` 已有的唯一 `@scope ([data-page-panel])` 中。`mobile-actions` 放在移动业务区内层容器上，避免改动页面根和系统组件。沿用现有系统尺寸时调整这些局部变量。

```css
.mobile-actions { --ui-icon-size: 20px; --ui-icon-gap: 8px; }
.ui-icon-label, .ui-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--ui-touch-target, 32px);
  gap: var(--ui-icon-gap, 6px);
  font: inherit;
}
.ui-icon-button { min-width: var(--ui-touch-target, 32px); }
.ui-icon-label .demo-icon, .ui-icon-button .demo-icon {
  width: var(--ui-icon-size, 16px);
  height: var(--ui-icon-size, 16px);
  flex: 0 0 auto;
}
```

```html
<button type="button" class="ui-icon-label">
  <span data-demo-icon="plus"></span><span>新增供应商</span>
</button>
<button type="button" class="ui-icon-button" aria-label="关闭筛选面板">
  <span data-demo-icon="close"></span>
</button>
```

仅在 Spec 已包含相应操作时使用，并在 `PRODUCT_SCRIPT` 中绑定真实行为。文字与图标保持在同一个按钮内；不要给图标单独注册点击、把文字写进 `data-demo-icon` 宿主，或让视觉图标尺寸代替按钮点击区域。母版自动将图标标记为装饰，不重复朗读；按钮名称来自可见文字或 `aria-label`。同风格专有 SVG 的装饰属性和按钮名称沿用这一合同。
