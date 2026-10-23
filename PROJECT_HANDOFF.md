# product-demo 技能优化｜项目交接

- **版本：** v1
- **最后更新：** 2026-10-22
- **项目目录：** `/Users/liuyu/Documents/agents/skills/product-demo`

## 1. 目标与当前状态

优化 product-demo 技能，使生成的原型按终端选择合适组件，主动处理边距、对齐、图标及交互问题；让研发能依据 Spec 理解、实现和验收全部已确认业务，Demo 完整演示流程，Spec、中栏原型、右栏说明逐业务点对应且逻辑一致。

用户已确认六大项 check 方案，维护已完成；最新补充的“结论形成后清理过程截图”也已写入规则。当前没有正在进行的实现任务、没有明确下一阶段需求或阻塞。此次仅创建交接文档，不启动产品 check 或新会话。

安装入口 `/Users/liuyu/.codex/skills/product-demo` 是本项目的符号链接，修改源目录即更新安装内容。

## 2. 已完成与验证边界

- 建立终端组件清单、recipe、tokens 和 `productDemo.auditUI()`，修正混合 APP/H5/小程序检查，保留原 `audit()`。组装输出仍是自包含单 HTML。
- 保留四个可编辑插槽和母版保护；统一有 Spec 时的 `--check-shell --spec` 要求。共享非模态 dialog helper 支持焦点、取消、关闭及切页清理，不阻断左右栏操作。
- 右栏说明默认隐藏；主动依据任务选择合适图标，优先现有系统资源、母版 36 个 SVG 图标、同风格内联 SVG，不强制每个控件加图标。
- 加强 check 路由，完成独立 Agent 路由试用、对抗审查及示例清理。此前完整测试通过 76 个合同用例与四套系统外壳回归；示例真实操作、状态保持及 audit 曾通过 Ego Lite 验证。此为历史验证记录，不代表后续版本自动通过。
- 六项 check 维护经独立 Agent `/root/six_item_review` 审查及六类场景推演，无实质问题；主 Agent 修正了缺失 Demo 的适用性措辞。元数据 YAML、差异格式及旧检查编号残留核对通过。
- 最新截图清理规则仅完成文档修改与差异格式核对，没有实际浏览器清理演练。系统 Python 缺 PyYAML，skill-creator 的 quick_validate 未运行成功；已用 Ruby 检查元数据，不能称其脚本通过。
- 最近几轮仅改技能文档，未重跑整个项目测试、未执行实际产品 check。此前某轮 Ego Lite 截图超时，功能/DOM验证成功而视觉截图未验证；不得混写为全部视觉通过。

## 3. 核心决策与约束

### check：六项汇总、一份业务明细

1. C01 业务范围与流程完整性。
2. C02 Spec 可开发与可验收性。
3. C03 Spec—Demo—右栏一致性。
4. C04 Demo 实际操作与业务结果。
5. C05 终端交互与界面质量。
6. C06 Demo 框架与运行可靠性。

26 项已合并，不恢复重复目录。执行步骤写入报告开头，自动检查、真实操作、截图作为证据。最终报告顺序：结论与执行说明 → 六项清单 → 一份业务对应与验收明细 → 问题及待验证范围。

完整性包括全部已确认交付功能，不能只查 P0。逐终端/角色、页面、字段取值、状态/场景、操作/结果及适用异常盘点；Spec 可开发性、三方一致性、真实功能验证分别判定。六项均列出不等于全部业务通过。不得发明业务答案或要求生产技术设计、无关异常穷举。

结果为通过、不通过、未验证、不适用。同项有失败和未验证时汇总不通过，但两者都披露。没有关联 Demo 且非本轮交付对象可不适用；要求交付却缺失或读不到须未验证。截图失败仅影响依赖截图的视觉子项，不抹去有效操作证据。

裸 `check`（忽略大小写）在当前产品上下文中触发；最明确入口是 `$product-demo check`。讨论/修改 check 属于技能维护，不触发产品审查。产品 check 只读，首轮真实调用 fresh 独立 Agent，复查优先复用同一审查者，只验证问题及修改影响。保留 CHK 编号与关闭条件，旧 C 编号按含义归类，不因合并重新扩大审查。

### 终端、浏览器与截图

PC 后台、APP、H5、小程序分别选组件和导航/返回方式，移动页声明准确 terminal；仅小程序显示胶囊。已有系统参考优先，保留系统外壳，先通过代表页及关键态再扩展。

网页 UI、真实操作和视觉验证只用 Ego Lite：先读 `/Users/liuyu/.agents/skills/ego-browser/SKILL.md`，执行其版本指南，通过 `ego-browser nodejs` 使用同一目标的一个 TaskSpace；故障不得换 Chrome、Playwright、CUA 浏览器或 IAB。完成后按指南结束 TaskSpace。

过程截图存本轮专用临时目录，待实际查看、必要独立审查和主 Agent 复核完成，形成结论与文字记录后，在最终回复前默认删除。本轮子 Agent 截图同样协调回收。只清理本轮明确创建的临时截图；用户参考图、正式交付图和明确要求保留的证据不删，不批量扫描旧图片。报告保留版本、终端/viewport、页面/状态、观察与结果，不链接已删除图片。已有文字记录是否可沿用须核实版本及依赖，必要时重新截图。

## 4. 文件与工作区

相对路径均基于上述项目根目录：

| 入口 | 用途 |
|---|---|
| `SKILL.md`、`agents/openai.yaml` | 路由、主工作流、发现与调用元数据 |
| `references/spec-review.md` | check 执行、六项清单、业务明细、结果及复查规则 |
| `references/spec-templates.md` | Spec 逐页/字段/状态/操作完整性 |
| `references/demo-guidelines.md` | Demo 合同、Ego Lite 验证、截图生命周期 |
| `references/ui-design-guidelines.md` | 终端、组件、tokens、图标与 UI 审查 |
| `assets/business-ui/` | manifest、styles、runtime、recipes |
| `assets/demo-template/index.html`、`assets/system-shells/` | 公共三栏母版及四套系统片段 |
| `scripts/test-demo.js`、`scaffold-demo.js`、`shell-library.js` | 合同回归、组装与只读校验 |
| `examples/membership-points/` | 教学示例，不是真实需求已确认基线 |

工作区有大量未提交改动，必须保留；未要求提交或推送。五个新增文件已暂存：`assets/business-ui/` 的四个文件及 `references/ui-design-guidelines.md`；其余修改多数未暂存，继续前读实际 `git status`。本交接文件是用户要求的额外文档。

已删除生成的 `assets/shell-preview/` 和 `.DS_Store`。历史 `examples/business-scenario-overview.html` 移至项目外 `/Users/liuyu/Documents/agents/archives/product-demo-cleanup-2026-10-15/`，保留原件及说明，不要当成误删恢复。历史 Demo 后续编辑时备份迁移，不批量迁移。README 的旧静态截图已注明历史性质。

## 5. 下一阶段接手

当前无待执行功能。新会话先读此文件和必要实际资料，用不超过 5 行确认目标、状态与约束，再根据用户新任务开展；不要仅因接手自动审查全部示例、删除历史截图或提交代码。

若用户要求继续验证技能，可先确认工作区实际差异，按变更性质选择文档检查、`npm test` 或 Ego Lite 行为验证；这只是后续建议，不是已授权的新任务。需要审查产品时明确目标 Spec/Demo，按当前六项 check 执行，不能把技能维护审查冒充产品验收。

## 最近变更

- v1｜2026-10-22：首次交接，汇总终端设计、check 六项合并、独立审查与截图清理规则，区分历史验证和当前未验证范围。
