      const MALL_SHELL_HTML = "<div class=\"admin-shell\" data-admin-shell>\n              <aside class=\"admin-primary\"><div class=\"admin-brand\">优+</div><nav class=\"admin-primary-list\" data-admin-primary aria-label=\"一级导航\"></nav><div class=\"admin-account\">管理后台</div></aside>\n              <aside class=\"admin-secondary\"><div class=\"admin-secondary-title\" data-admin-secondary-title></div><nav data-admin-secondary aria-label=\"二级导航\"></nav></aside>\n              <main class=\"admin-workspace\"><header class=\"admin-topbar\"><div class=\"admin-current-module\" data-admin-module-name></div><nav class=\"admin-tabs\" data-admin-tabs aria-label=\"工作页签\"></nav></header><nav class=\"admin-local-tabs\" data-admin-local-tabs aria-label=\"页面内页签\"></nav><section class=\"admin-content-frame\" data-admin-content></section></main>\n            </div>";
      const renderMallAdminShell = (pageId) => {
        const pageConfig = pageById.get(pageId);
        const shell = pageConfig?.adminShell;
        const panel = $("[data-page-panel=\"" + CSS.escape(pageId) + "\"]");
        if (pageConfig?.surface !== "mall-admin") throw new Error(`${pageId} 不是商城后台页面`);
        if (!panel || !shell) throw new Error(`${pageId} 缺少商城后台外壳配置`);
        if (Object.prototype.hasOwnProperty.call(shell, "modules")) throw new Error("商城后台一级导航由母版锁定，不能在 adminShell.modules 中改写");
        if (!panel.querySelector("[data-admin-shell]")) {
          const content = panel.querySelector("[data-admin-content]");
          if (!content) throw new Error(`${pageId} 缺少 data-admin-content`);
          const children = [...content.childNodes];
          panel.innerHTML = MALL_SHELL_HTML;
          panel.querySelector("[data-admin-content]").replaceChildren(...children);
        }
        const activeModule = MALL_ADMIN_MODULES.some((item) => item.label === shell.activeModule) ? shell.activeModule : MALL_ADMIN_MODULES[0].label;
        $("[data-admin-module-name]", panel).textContent = activeModule;
        $("[data-admin-secondary-title]", panel).textContent = activeModule;

        const primary = $("[data-admin-primary]", panel);
        primary.replaceChildren();
        for (const item of MALL_ADMIN_MODULES) {
          const button = document.createElement("button");
          button.className = "admin-primary-item";
          button.type = "button";
          button.dataset.primary = item.label;
          button.title = item.label;
          button.setAttribute("aria-current", String(item.label === activeModule));
          addIconText(button, item.icon, item.label);
          primary.appendChild(button);
        }

        const secondary = $("[data-admin-secondary]", panel);
        secondary.replaceChildren();
        for (const group of shell.secondary || []) {
          const section = document.createElement("section");
          const heading = document.createElement("button");
          heading.type = "button";
          const title = document.createElement("span");
          title.textContent = group.label || "";
          heading.append(title, createIcon("chevron-down"));
          section.className = "admin-menu-group";
          section.appendChild(heading);
          for (const label of group.children || []) {
            const item = document.createElement("button");
            item.className = "admin-secondary-item";
            item.type = "button";
            item.textContent = label;
            item.setAttribute("aria-current", label === shell.activeSecondary ? "page" : "false");
            section.appendChild(item);
          }
          secondary.appendChild(section);
        }

        const tabs = $("[data-admin-tabs]", panel);
        tabs.replaceChildren();
        for (const labelText of shell.tabs || []) {
          const tab = document.createElement("button");
          const label = document.createElement("span");
          tab.className = "admin-tab";
          tab.type = "button";
          tab.setAttribute("aria-label", `切换到${labelText}`);
          tab.setAttribute("aria-selected", String(labelText === shell.activeTab));
          label.textContent = labelText;
          const close = document.createElement("span");
          close.className = "admin-tab-close";
          close.appendChild(createIcon("close"));
          tab.append(label, close);
          tabs.appendChild(tab);
        }

        const localTabs = $("[data-admin-local-tabs]", panel);
        localTabs.replaceChildren();
        for (const labelText of shell.localTabs || []) {
          const tab = document.createElement("button");
          tab.className = "admin-local-tab";
          tab.type = "button";
          tab.textContent = labelText;
          tab.setAttribute("aria-selected", String(labelText === shell.activeLocalTab));
          localTabs.appendChild(tab);
        }
      };
