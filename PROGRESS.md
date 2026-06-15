# Koala Eats 进度记录

## 当前阶段

2026-06-15：四端前端 mock 业务闭环已完成；本次在 `feature/pre-cloud-auth-paas` 上继续按美团外卖截图抽取基础用户端 Web 逻辑和布局：底部主导航改为外卖 / 订单 / 我的，首页只保留地址、搜索、分类、附近商家，去掉广告、活动券和无业务意义的流程标签；购物车改为右下角悬浮入口，打开后按商家分组展示商品，单个商家分别结算；用户端不再限制为手机壳宽度，改为桌面 Web 宽布局。支付仍保持模拟支付，不接第三方支付接口。

## 已做决策

- 2026-06-11：后端使用 C# / ASP.NET Core Web API。原因：用户明确希望使用 C# 后端。放弃替代方案：Node.js、Python、Java。
- 2026-06-11：数据库使用 SQL Server。原因：用户明确希望使用微软数据库。放弃替代方案：SQLite、PostgreSQL、MySQL。
- 2026-06-11：前端使用 React Web。原因：用户希望先做 Web 端，不做 App。放弃替代方案：移动 App 优先。
- 2026-06-11：角色包含用户端、商家端、骑手端、管理端。原因：目标是完整外卖平台流程。放弃替代方案：只做用户端和商家端的简化系统。
- 2026-06-11：支付第一阶段使用模拟支付。原因：用户明确暂不接真实支付。放弃替代方案：Stripe、PayPal、微信支付、支付宝。
- 2026-06-11：地图使用 Google Maps Platform。原因：用户希望直接接入 Google Maps。注意：Google Maps Platform 按 SKU 有免费调用额度，超过额度会计费，开发期必须设置 key 限制、预算提醒和配额。
- 2026-06-11：本机开发环境已检查通过。.NET SDK 10.0.300、Node.js 24.15.0、npm 11.12.1、Git 2.53.0 可用；SQL Server 默认实例 `localhost` 正在运行，版本 17.0.1000.7，Edition 为 Standard Developer Edition，当前 Windows 用户 `LOUIS\shuai` 可创建数据库。
- 2026-06-11：Google Maps API key 已由用户准备好。真实 key 不写入仓库，只通过本地 `.env.local` 或部署环境变量配置。
- 2026-06-11：Git 远程仓库已连接为 `origin`，地址为 `https://github.com/Watermelon118/Koala_Eats.git`。未提交、未推送。
- 2026-06-11：开发顺序调整为前端优先。原因：单人开发无法稳定并行推进前后端，先用 mock data 做完整前端流程，再按接口契约逐个实现后端接口。放弃替代方案：前后端同步开发。
- 2026-06-11：所有前端需要的接口必须登记在 `docs/API_CONTRACT.md`。后端接口完成后，删除对应 mock，并把接口状态标记为 `Done`。
- 2026-06-11：业务接口统一响应结构为 `code` / `message` / `data`。原因：保持用户一贯接口习惯，方便前端统一处理。放弃替代方案：`code` / `message` / `details`。
- 2026-06-11：本地多设备测试默认 API 地址为 `http://192.168.88.100:5156`。原因：手机、平板、其他电脑访问前端时，`localhost` 指向设备自己，不能用于调用开发机 API。放弃替代方案：前端默认使用 `localhost` 或 `127.0.0.1`。
- 2026-06-11：前端首页先做用户端、商家端、骑手端、管理端四个客户端风格预览。原因：先看清四个入口的业务逻辑和视觉方向，再细化页面与接口。放弃替代方案：先写后端接口或只做单一运营台首页。
- 2026-06-11：四端入口开始拆分，优先实现用户端点餐主流程。当前用户端 mock 已包含商家列表、分类筛选、商家详情、菜单点餐、购物车合计。商家端、骑手端、管理端先保留独立首页骨架。
- 2026-06-11：`feature/project-bootstrap` 已通过构建检查并 `--no-ff` 合并到 `main`，本地和远程 feature 分支已删除。GitHub 默认分支已切换为 `main`。
- 2026-06-11：后续每个 feature 由 AI 判断是否达成目标；完成后自动检查、最小提交、合并到 `main`、推送并删除 feature 分支。
- 2026-06-11：前端从单一 `koala-eats-web` 拆为 `customer-web`、`merchant-web`、`rider-web`、`admin-web` 四个独立应用。原因：真实外卖平台不同角色入口应物理隔离，用户端不能访问其他端。放弃替代方案：单个 React 应用内用角色切换模拟四端。
- 2026-06-11：四端首页 mock 接口均已登记到 `docs/API_CONTRACT.md`。原因：前端 mock data 必须先有接口契约，后端后续按契约替换。放弃替代方案：只登记用户端接口。
- 2026-06-11：四个独立前端应用必须各自提供 `dev` 脚本，`src/client` 根目录提供按端启动的快捷脚本。原因：workspace build 通过不代表本地预览命令可用，用户验证页面时需要稳定入口。放弃替代方案：要求用户手写 `npm run dev -w ... -- --host ... --port ...`。
- 2026-06-11：四端前端 mock 继续按完整外卖业务闭环推进。用户端包含选店、点餐、结算、模拟支付、订单追踪；商家端包含营业状态、订单接单/拒单/出餐、菜单库存；骑手端包含接单、到店、取餐、配送、送达；管理端包含商家审核、异常订单人工派单、账号状态、配送区域。
- 2026-06-11：前端视觉方向继续参考通用真实外卖平台体验，但不复制任何现有平台商标、素材、专有 UI 或文案。用户端优先做成移动外卖客户端的信息层级，商家端、骑手端、管理端保持高密度业务工作台。
- 2026-06-11：四端跨端业务联动用开发期 mock API 承载，默认地址 `http://192.168.88.100:5180`。原因：四个 Vite 应用运行在不同端口，浏览器本地状态不能可靠跨端口共享。放弃替代方案：每个端各自维护 local state。
- 2026-06-12：地址输入使用 Google Maps JavaScript API 的 Places Autocomplete Data API。原因：地址联想需要真实 NZ 地址和坐标，前端阶段即可验证收货地址、店铺地址和后续配送地图数据。真实 API key 只放各端 `.env.local` 的 `VITE_GOOGLE_MAPS_API_KEY`。放弃替代方案：继续使用静态地址 mock。
- 2026-06-12：用户端下单前执行配送范围校验，mock API 同步做服务端校验。原因：真实外卖平台必须按店铺配送半径和收货地址坐标阻止不可配送订单。放弃替代方案：只在页面展示距离但仍允许提交。
- 2026-06-12：菜品规格、口味、加料先按单选 `optionGroups` 建模，并把 `selectedOptions` / `unitPrice` 写入订单行。原因：后端落库和商家小票都需要保留用户实际选择，而不能只保存菜品 ID。放弃替代方案：规格只影响 UI 不进入订单数据。
- 2026-06-12：取消订单规则先覆盖待支付取消、已支付未履约自动退款、履约中禁止自动取消。原因：这是外卖履约链路的基础售后边界；更复杂的超时赔付、骑手异常和人工售后留到后端阶段。放弃替代方案：任何状态都允许一键取消。
- 2026-06-12：购物车从按菜品 ID 聚合改为按 `cartKey` 聚合。原因：真实外卖订单中同一菜品的不同规格、口味、加料必须拆成不同订单行，商家小票和退款也依赖该结构。放弃替代方案：只保留每个菜品一个当前规格。
- 2026-06-12：骑手异常上报进入管理端异常池，管理端可人工派单或关闭异常。原因：配送履约中常见的联系不上顾客、商家未出餐、地址异常不能只停留在骑手本地状态。放弃替代方案：骑手端只推进正常状态。
- 2026-06-12：管理端配送区域支持启停、半径和起步配送费调整。原因：后端实现配送范围、配送费和店铺覆盖关系时需要前端先确认运营规则入口。放弃替代方案：配送区域只读展示。
- 2026-06-12：登录鉴权采用 JWT Bearer，不使用 Cookie 会话。原因：四个独立 Web 端口和后续 Azure PaaS 分离部署更适合无状态 token；后端能直接按角色保护 API。放弃替代方案：服务端 Cookie session。
- 2026-06-12：上云目标明确为 Azure PaaS。后端用 Azure App Service，数据库用 Azure SQL Database，四个前端用 Azure Static Web Apps。原因：用户明确不要 IaaS，且当前项目不需要 VM、手工 IIS 或服务器 SSH 运维。放弃替代方案：Azure VM / IaaS。
- 2026-06-12：生产环境缺少 `Auth__SigningKey`、Azure SQL 连接串或 CORS origins 时 API 启动失败。原因：上云前把安全边界前移，避免生产误用本地默认配置。放弃替代方案：生产继续使用开发默认值。
- 2026-06-12：用户端配送追踪页支持在配置 Google Maps API key 后渲染真实地图底图，无 key 或加载失败时保留本地路线示意图。原因：当前只有 Google Maps API，地图能力可以先接；支付等第三方接口继续不接。放弃替代方案：继续只显示 CSS 假地图。
- 2026-06-12：用户端点餐逻辑改为首页浏览/搜索商家、进入商家页点餐、按商家保留购物车、从购物车进入结算。原因：外卖平台购物车通常属于单个商家点餐场景，顶部流程标签不是用户真实操作入口。放弃替代方案：继续用“首页/点餐/结算/支付/配送”标签模拟流程。
- 2026-06-15：用户端首页不再放活动、优惠券和广告位，只保留外卖基础路径。原因：当前目标是对齐外卖下单逻辑和页面结构，不做营销运营。放弃替代方案：继续展示新用户券、促销条和大额优惠。
- 2026-06-15：用户端购物车改为全局悬浮入口，购物车页按商家分组并从对应商家进入结算。原因：用户明确要求 Web 端不要做成 App 小屏，但业务逻辑要对齐外卖平台的购物车入口和打开后的结构。放弃替代方案：商家详情页右侧固定购物车面板、底部“继续下单”入口。

## 待办

- 把开发期 demo 账号替换为数据库持久化用户和密码哈希。
- 上 Azure 前配置 App Service settings、Static Web Apps env vars、Azure SQL 连接串和 Google Maps referrer 限制。
- 后端继续按 `docs/API_CONTRACT.md` 将剩余开发期 mock 语义拆成真实领域服务和持久化接口。

## 阻塞

- 暂无。

## 上次对话结尾状态

本次已完成外卖 App 风格前端强化、共享 mock 业务状态机、Google Places 地址联想、配送范围校验、菜品规格、取消退款、购物车规格拆行、地址簿、支付超时、骑手异常和管理端配送区域规则，`npm run build` 已通过。当前需要继续按 `docs/API_CONTRACT.md` 把 Mocked 接口逐个实现为 ASP.NET Core 后端接口。

2026-06-12: ASP.NET Core in-memory API is live on 5156; next step is switching client mockApi.ts to the real routes.
2026-06-12: SQL Server schema baseline created with EF Core InitialCreate migration and applied locally as empty tables.
2026-06-12: Frontend now targets the real ASP.NET Core API on localhost:5156; mutation helpers refresh state from the backend snapshot after each successful action, and rider/admin dismiss flows are wired end-to-end.
2026-06-15: Customer web now matches the basic takeaway web structure from the supplied Meituan screenshots: bottom nav only has 外卖 / 订单 / 我的, home feed has no promo/ad blocks or staged flow tabs, the layout is desktop-width, and cart access is a bottom-right floating button. Browser smoke test verifies desktop width, no 继续下单 nav item, floating cart, add-item flow, grouped cart page, and checkout entry. Next step is user visual review in the browser and then commit/merge when accepted.
2026-06-15: Customer web follow-up cleanup removed remaining customer-side promo/coupon UI traces and dead old cart/recent-order components, fixed the store-page floating cart so it no longer intercepts menu plus clicks, and changed pending-order tracking copy to avoid showing an unassigned rider as delivering. Verified customer-web build, backend build, and browser flow: home -> store add -> grouped cart by merchant -> single-store checkout -> mock payment -> tracking.
2026-06-15: Customer web profile interactions are now clickable: address management supports manual add, set default, and delete; order tabs filter all/review/after-sales; support entries create visible consultation records; reviews support star selection and saved rating state; settings toggles update in place. Browser smoke test verified each profile entry from the live customer web.
2026-06-15: Customer web profile was simplified back to the minimal business flow: removed the asset summary card and the consultation/support record entry so the customer side focuses on address management, orders, reviews, checkout, mock payment, and delivery tracking. Chat with merchants or riders stays out of scope for now.
