import { ClipboardCheck, Clock3, MapPin, Plus, Store, Utensils } from 'lucide-react'
import { formatMoney } from '../../shared/format'
import { merchantOrders, stores } from '../../shared/mockData'

const store = stores[0]

function App() {
  return (
    <main className="app-shell merchant-app">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">M</div>
          <div>
            <p className="eyebrow">Merchant</p>
            <h1>商家工作台</h1>
          </div>
        </div>
        <div className="search-box">
          <Store size={18} strokeWidth={2.4} />
          <span>{store.name}</span>
        </div>
        <div className="header-pill">
          <Clock3 size={18} strokeWidth={2.4} />
          营业中
        </div>
      </header>

      <section className="merchant-hero panel">
        <div>
          <p className="eyebrow">Store profile</p>
          <h2>{store.name}</h2>
          <span>
            {store.rating} 分 · 月售 {store.monthlySales} · 配送 {store.deliveryMinutes} 分钟
          </span>
        </div>
        <button className="dark-button" type="button">
          编辑店铺
        </button>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>待接单</span>
          <strong>12</strong>
        </article>
        <article className="metric-card">
          <span>备餐中</span>
          <strong>8</strong>
        </article>
        <article className="metric-card">
          <span>今日营业额</span>
          <strong>$860</strong>
        </article>
        <article className="metric-card">
          <span>在售菜品</span>
          <strong>{store.menu.length}</strong>
        </article>
      </section>

      <section className="merchant-grid">
        <div className="panel">
          <div className="panel-title">
            <h2>订单队列</h2>
            <ClipboardCheck size={20} strokeWidth={2.4} />
          </div>
          <div className="order-list">
            {merchantOrders.map((order) => (
              <article className="order-card" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>{order.customerName}</span>
                </div>
                <p>{order.itemsSummary}</p>
                <div className="order-footer">
                  <span>{order.placedMinutesAgo} 分钟前 · {order.status}</span>
                  <strong>{formatMoney(order.totalAmount)}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <h2>菜品管理</h2>
            <button className="primary-button compact" type="button">
              <Plus size={16} strokeWidth={2.6} />
              新增
            </button>
          </div>
          <div className="dish-list">
            {store.menu.map((item) => (
              <article key={item.id}>
                <div className="dish-icon">
                  <Utensils size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.tag} · 月售 {item.monthlySales}</span>
                </div>
                <strong>{formatMoney(item.price)}</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="panel location-panel">
          <MapPin size={22} strokeWidth={2.4} />
          <div>
            <h2>店铺位置</h2>
            <p>Queen Street, Auckland CBD</p>
            <span>后续接 Google Maps 维护店铺坐标和配送范围。</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
