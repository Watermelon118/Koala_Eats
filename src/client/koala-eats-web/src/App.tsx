import {
  Bike,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Utensils,
  WalletCards,
} from 'lucide-react'
import './App.css'

type Portal = {
  title: string
  subtitle: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  heroText: string
  primaryAction: string
  statLabel: string
  statValue: string
  items: string[]
}

const portals: Portal[] = [
  {
    title: '用户端',
    subtitle: '附近好店、快速下单、实时配送',
    icon: ShoppingBag,
    heroText: '今晚吃什么',
    primaryAction: '去点餐',
    statLabel: '预计送达',
    statValue: '28 min',
    items: ['热卖餐厅', '优惠套餐', '配送地图'],
  },
  {
    title: '商家端',
    subtitle: '店铺资料、菜品价格、接单出餐',
    icon: Store,
    heroText: '今日营业中',
    primaryAction: '管理店铺',
    statLabel: '待处理订单',
    statValue: '12',
    items: ['菜单维护', '营业状态', '订单队列'],
  },
  {
    title: '骑手端',
    subtitle: '抢单接单、路线导航、状态上报',
    icon: Bike,
    heroText: '附近有新单',
    primaryAction: '查看配送',
    statLabel: '配送中',
    statValue: '4',
    items: ['取餐路线', '送达地址', '位置上报'],
  },
  {
    title: '管理端',
    subtitle: '商家审核、账号管理、异常兜底',
    icon: ShieldCheck,
    heroText: '平台运行稳定',
    primaryAction: '进入后台',
    statLabel: '待审核',
    statValue: '7',
    items: ['商家审核', '订单监控', '人工派单'],
  },
]

const foodCategories = ['汉堡炸鸡', '米饭套餐', '奶茶咖啡', '日韩料理', '夜宵烧烤']

const operations = [
  { label: '今日订单', value: '128', icon: ClipboardCheck },
  { label: '营业商家', value: '36', icon: Store },
  { label: '骑手在线', value: '24', icon: Bike },
  { label: '模拟支付', value: '$3.8k', icon: WalletCards },
]

function App() {
  return (
    <main className="app-shell">
      <section className="market-header">
        <div className="brand-block">
          <div className="brand-mark">K</div>
          <div>
            <p className="eyebrow">Koala Eats</p>
            <h1>考拉外卖</h1>
          </div>
        </div>

        <div className="search-box">
          <Search size={18} strokeWidth={2.4} />
          <span>搜索商家、菜品、订单号</span>
        </div>

        <button className="location-button" type="button">
          <MapPin size={18} strokeWidth={2.4} />
          Auckland CBD
        </button>
      </section>

      <section className="hero-strip">
        <div className="hero-copy">
          <span>黄色外卖平台风格预览</span>
          <h2>先把四个客户端首页跑通，再逐个补接口。</h2>
          <p>当前页面使用 mock data，后续每个数据块都会对应到接口契约。</p>
        </div>
        <div className="delivery-visual" aria-label="Delivery preview">
          <div className="road-line"></div>
          <div className="food-bag">
            <Utensils size={30} strokeWidth={2.4} />
          </div>
          <div className="rider-badge">
            <Bike size={28} strokeWidth={2.4} />
          </div>
          <div className="pin-card">
            <Clock3 size={18} strokeWidth={2.4} />
            28 min
          </div>
        </div>
      </section>

      <section className="category-row" aria-label="Food categories">
        {foodCategories.map((category) => (
          <button key={category} type="button">
            {category}
          </button>
        ))}
      </section>

      <section className="portal-grid" aria-label="Client home previews">
        {portals.map((portal) => {
          const Icon = portal.icon

          return (
            <article className="portal-card" key={portal.title}>
              <header>
                <div className="portal-icon">
                  <Icon size={24} strokeWidth={2.4} />
                </div>
                <div>
                  <h3>{portal.title}</h3>
                  <p>{portal.subtitle}</p>
                </div>
              </header>

              <div className="portal-hero">
                <span>{portal.heroText}</span>
                <strong>{portal.statValue}</strong>
                <small>{portal.statLabel}</small>
              </div>

              <ul>
                {portal.items.map((item) => (
                  <li key={item}>
                    <PackageCheck size={16} strokeWidth={2.4} />
                    {item}
                  </li>
                ))}
              </ul>

              <button className="primary-action" type="button">
                {portal.primaryAction}
                <ChevronRight size={18} strokeWidth={2.4} />
              </button>
            </article>
          )
        })}
      </section>

      <section className="ops-row" aria-label="Operations overview">
        {operations.map((operation) => {
          const Icon = operation.icon

          return (
            <article key={operation.label}>
              <Icon size={20} strokeWidth={2.4} />
              <span>{operation.label}</span>
              <strong>{operation.value}</strong>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default App
