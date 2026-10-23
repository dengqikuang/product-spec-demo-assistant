      const uiManifest = /* INCLUDE:BUSINESS_UI_MANIFEST */;
      const pageTerminal = (page) => page.surface === "mobile" ? page.terminal : "pc-web";
      const defaultProfile = (page) => {
        if (page.surface === "mobile") return page.terminal;
        if (page.surface === "mall-admin") return "mall-admin";
        if (/中台|middle-platform/i.test(page.systemName || "")) return "middle-platform";
        return "desktop-default";
      };
      const normalizeUiPage = (page) => {
        const profile = page.ui?.profile || defaultProfile(page);
        const layout = page.ui?.layout || "mixed";
        return { profile, layout, terminal: pageTerminal(page) };
      };
      const attachUiProfile = (page, panel) => {
        const ui = normalizeUiPage(page);
        panel.dataset.terminal = ui.terminal;
        panel.dataset.uiProfile = ui.profile;
        panel.dataset.uiLayout = ui.layout;
        panel.dataset.uiRoot = "";
      };
      const uiError = (pageId, rule, element, message) => ({
        page: pageId,
        state: navigation.states.get(pageId) || "default",
        rule,
        element: element?.getAttribute?.("data-ui-recipe") || element?.tagName?.toLowerCase() || "page",
        position: element?.getBoundingClientRect ? (() => { const rect = element.getBoundingClientRect(); return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }; })() : null,
        message
      });
      const isSystemChrome = (element) => {
        const shell = element.closest('[data-admin-shell], .mp-shell, .mini-program-shell, .mobile-shell');
        if (!shell || element.closest('[data-ui-scope], [data-ui-recipe], [data-admin-content], .mini-program-content, .mobile-content, .mp-main')) return false;
        if (shell.matches('[data-admin-shell]')) return true;
        if (shell.matches('.mp-shell')) return !!element.closest('.mp-sidebar, .mp-top, .mp-tabs');
        if (shell.matches('.mini-program-shell')) return !!element.closest('.mini-program-system-ui');
        return !!element.closest('.mobile-status-bar');
      };
      const auditUI = () => {
        const errors = [];
        const warnings = [];
        for (const page of config.pages) {
          const panel = $(`[data-page-panel="${CSS.escape(page.id)}"]`);
          if (!panel) { errors.push(uiError(page.id, "ui.page", null, "配置页面没有对应中栏")); continue; }
          const wasHidden = panel.hidden;
          if (wasHidden) panel.hidden = false;
          try {
          if (!page.ui || typeof page.ui !== "object" || Array.isArray(page.ui) || typeof page.ui.profile !== "string" || typeof page.ui.layout !== "string") errors.push(uiError(page.id, "ui.config", panel, "页面必须显式声明 ui.profile 与 ui.layout；不能依赖通用默认值"));
          const ui = normalizeUiPage(page);
          const profile = uiManifest.profiles[ui.profile];
          if (!profile) errors.push(uiError(page.id, "ui.profile", panel, `未知 UI profile：${ui.profile}`));
          else if (profile.terminal !== ui.terminal) errors.push(uiError(page.id, "ui.terminal-profile", panel, `${ui.profile} 不适用于 ${ui.terminal}`));
          else if (profile.surface !== page.surface) errors.push(uiError(page.id, "ui.surface-profile", panel, `${ui.profile} 不适用于 ${page.surface}`));
          if (!uiManifest.layouts.includes(ui.layout)) errors.push(uiError(page.id, "ui.layout", panel, `未知页面布局：${ui.layout}`));
          for (const element of $$('[data-ui-recipe]', panel)) {
            const name = element.dataset.uiRecipe;
            const recipe = uiManifest.recipes[name];
            if (!recipe) { errors.push(uiError(page.id, "ui.recipe-known", element, `未知 recipe：${name}`)); continue; }
            if (!recipe.terminals.includes(ui.terminal)) errors.push(uiError(page.id, "ui.recipe-terminal", element, `${name} 不适用于 ${ui.terminal}`));
            if (!recipe.layouts.includes(ui.layout)) errors.push(uiError(page.id, "ui.recipe-layout", element, `${name} 不适用于 ${ui.layout} 页面`));
            if (recipe.review) warnings.push(uiError(page.id, "ui.recipe-review", element, recipe.review));
            if (name === "mobile-comparison-table") {
              if (element.getAttribute("role") !== "region" || (!element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby"))) errors.push(uiError(page.id, "ui.comparison-name", element, "移动比较表容器须声明 role=region 和可访问名称"));
              if (element.tabIndex < 0) errors.push(uiError(page.id, "ui.comparison-keyboard", element, "移动比较表容器须可通过键盘聚焦，以便键盘用户滚动比较内容"));
              const style = getComputedStyle(element);
              if (element.scrollWidth > element.clientWidth && !["auto", "scroll"].includes(style.overflowX)) errors.push(uiError(page.id, "ui.comparison-scroll", element, "比较内容超出容器时须提供真实横向滚动"));
            }
          }
          for (const group of new Set($$('[data-ui-align-group]', panel).map((element) => element.dataset.uiAlignGroup))) {
            const nodes = $$('[data-ui-align-group]', panel).filter((element) => element.dataset.uiAlignGroup === group && element.getClientRects().length);
            if (nodes.length < 2) continue;
            const positions = nodes.map((element) => element.getBoundingClientRect().left);
            if (Math.max(...positions) - Math.min(...positions) > 1) errors.push(uiError(page.id, "ui.alignment", nodes[0], `对齐组 ${group} 的左边缘相差超过 1px`));
          }
          if (page.surface === "mobile" && page.terminal !== "mini-program" && $$('[class~="mini-capsule"], [class~="mini-program-system-ui"], [class~="mini-status-bar"], [class~="mini-status-icons"], [class~="mini-cellular"], [class~="mini-wifi"], [class~="mini-battery"], [class~="mini-close-program"]', panel).length) errors.push(uiError(page.id, "ui.mini-program-chrome", panel, `${page.terminal} 页面不应包含小程序胶囊或系统层`));
          if (!profile) continue;
          const minTarget = ui.terminal === "pc-web" ? 32 : 44;
          const panelRect = panel.getBoundingClientRect();
          const comparison = '[data-ui-recipe="mobile-comparison-table"]';
          for (const element of $$('h1, h2, h3, button, input:not([type="hidden"]), select, textarea, a[href], [role="button"]', panel)) {
            if (!element.getClientRects().length || isSystemChrome(element) || element.closest('[data-system-ui], .mini-program-system-ui, .mini-capsule, .mobile-status-bar, .mini-status-bar')) continue;
            const rect = element.getBoundingClientRect();
            const scroller = element.closest(comparison);
            const scrollableComparison = scroller && ["auto", "scroll"].includes(getComputedStyle(scroller).overflowX) && scroller.scrollWidth > scroller.clientWidth;
            if ((rect.left < panelRect.left - 1 || rect.right > panelRect.right + 1) && !scrollableComparison) errors.push(uiError(page.id, "ui.horizontal-overflow", element, "页面内容超出终端画布；比较表超出时必须由实际可横向滚动的 recipe 容器承载"));
          }
          if (ui.terminal === "mini-program") {
            const systemUi = panel.querySelector(".mini-program-system-ui");
            const safeTop = systemUi ? systemUi.getBoundingClientRect().bottom + 8 : panelRect.top + 90;
            for (const element of $$('h1, h2, h3, button, input:not([type="hidden"]), select, textarea, a[href], [role="button"]', panel)) {
              if (!element.getClientRects().length || isSystemChrome(element) || element.closest('[data-system-ui], .mini-program-system-ui, .mini-capsule, .mobile-status-bar, .mini-status-bar')) continue;
              if (element.getBoundingClientRect().top < safeTop) errors.push(uiError(page.id, "ui.mini-program-safe-area", element, `业务内容应避让状态栏与胶囊；内容起点需低于 y=${Math.round(safeTop)}px`));
            }
          }
          for (const control of $$('button, input:not([type="hidden"]), select, textarea, a[href], [role="button"]', panel)) {
            if (isSystemChrome(control)) continue;
            if (control.closest('[data-system-ui], .mini-capsule, .mobile-status-bar, .mini-status-bar')) continue;
            let target = control;
            if (/^(checkbox|radio)$/.test(control.type || "") && control.closest("label")) target = control.closest("label");
            const rect = target.getBoundingClientRect();
            if (rect.width && rect.height && (rect.width < minTarget || rect.height < minTarget)) {
              errors.push(uiError(page.id, "ui.target-size", control, `交互目标 ${Math.round(rect.width)}×${Math.round(rect.height)}px，小于 ${minTarget}px 基线`));
            }
            if (control.tagName === "INPUT" || control.tagName === "SELECT" || control.tagName === "TEXTAREA") {
              const label = control.id ? panel.querySelector(`label[for="${CSS.escape(control.id)}"]`) : control.closest("label");
              if (!label && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby")) errors.push(uiError(page.id, "ui.field-name", control, "表单控件缺少可访问名称"));
            }
          }
          for (const button of $$("button", panel)) {
            if (!button.textContent.trim() && !button.getAttribute("aria-label") && !button.getAttribute("aria-labelledby")) errors.push(uiError(page.id, "ui.button-name", button, "按钮缺少可访问名称"));
          }
          for (const content of $$('[data-ui-scroll-content]', panel)) {
            const style = getComputedStyle(content);
            if (ui.terminal !== "pc-web" && style.overflowY === "hidden") errors.push(uiError(page.id, "ui.mobile-scroll", content, "移动内容区被隐藏，用户无法滚动查看完整内容"));
          }
          for (const action of $$('[data-ui-recipe="mobile-bottom-action"]', panel)) {
            const content = panel.querySelector('[data-ui-scroll-content]');
            const position = getComputedStyle(action).position;
            if (content) {
              const contentRect = content.getBoundingClientRect();
              const actionRect = action.getBoundingClientRect();
              const overlaps = contentRect.bottom > actionRect.top + 1 && contentRect.top < actionRect.bottom && contentRect.right > actionRect.left && contentRect.left < actionRect.right;
              if ((["fixed", "absolute"].includes(position) || overlaps) && Number.parseFloat(getComputedStyle(content).paddingBottom) < actionRect.height) errors.push(uiError(page.id, "ui.bottom-action-clearance", action, "滚动内容未为覆盖式底部操作保留足够避让空间"));
            }
          }
          } finally {
            if (wasHidden) panel.hidden = true;
          }
        }
        return { ok: errors.length === 0, errors, warnings };
      };
      let activeUiDialog = null;
      const finishUiDialog = (reason, cancelled, restoreFocus = true) => {
        const active = activeUiDialog;
        if (!active) return false;
        activeUiDialog = null;
        active.overlay.hidden = true;
        active.overlay.removeAttribute("data-ui-dialog-open");
        if (cancelled) {
          try { active.onCancel?.(reason); }
          catch (error) { console.error(`productDemo.openDialog onCancel failed for ${active.pageId} (${reason})`, error); }
        }
        if (restoreFocus && navigation.page === active.pageId) {
          try {
            if (active.trigger?.isConnected && !active.trigger.disabled) active.trigger.focus({ preventScroll: true });
            else {
              const panel = $(`[data-page-panel="${CSS.escape(active.pageId)}"]`);
              if (panel) { panel.tabIndex = -1; panel.focus({ preventScroll: true }); }
            }
          } catch (error) { console.error(`productDemo.openDialog focus restoration failed for ${active.pageId}`, error); }
        }
        return true;
      };
      const openDialog = (pageId, options) => {
        const page = pageById.get(pageId);
        const panel = page && $(`[data-page-panel="${CSS.escape(pageId)}"]`);
        const { overlay, dialog } = options || {};
        if (!page || !panel || panel.hidden || navigation.page !== pageId) throw new Error("页内对话框只能在当前可见页面打开");
        if (!overlay || !dialog || !panel.contains(overlay) || !overlay.contains(dialog)) throw new Error("overlay 与 dialog 必须属于对应的页面画布");
        if (!dialog.getAttribute("aria-label") && !dialog.getAttribute("aria-labelledby")) throw new Error("dialog 需要 aria-label 或 aria-labelledby");
        finishUiDialog("replaced", true, false);
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "false");
        activeUiDialog = { pageId, overlay, dialog, trigger: document.activeElement, onCancel: options.onCancel };
        overlay.hidden = false;
        overlay.setAttribute("data-ui-dialog-open", "true");
        const focusTarget = options.initialFocus || dialog.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="-1"]') || dialog;
        if (!dialog.hasAttribute("tabindex") && focusTarget === dialog) dialog.tabIndex = -1;
        focusTarget.focus({ preventScroll: true });
        return Object.freeze({ close: () => finishUiDialog("close", false), cancel: (reason = "cancel") => finishUiDialog(reason, true) });
      };
      document.addEventListener("keydown", (event) => {
        if (!activeUiDialog || event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
        event.preventDefault();
        finishUiDialog("escape", true);
      });
