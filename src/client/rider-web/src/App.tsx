import { Bike, Clock3, Map, MapPin, Navigation, PackageCheck } from 'lucide-react'
import { formatMoney } from '../../shared/format'
import { deliveryTasks } from '../../shared/mockData'

function App() {
  return (
    <main className="app-shell rider-app">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">R</div>
          <div>
            <p className="eyebrow">Rider</p>
            <h1>骑手接单台</h1>
          </div>
        </div>
        <div className="search-box">
          <MapPin size={18} strokeWidth={2.4} />
          <span>当前位置：Auckland CBD</span>
        </div>
        <div className="header-pill">
          <Bike size={18} strokeWidth={2.4} />
          在线接单
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <span>可接单</span>
          <strong>9</strong>
        </article>
        <article className="metric-card">
          <span>配送中</span>
          <strong>2</strong>
        </article>
        <article className="metric-card">
          <span>今日收入</span>
          <strong>$86</strong>
        </article>
        <article className="metric-card">
          <span>平均送达</span>
          <strong>24m</strong>
        </article>
      </section>

      <section className="rider-grid">
        <div className="panel">
          <div className="panel-title">
            <h2>配送单</h2>
            <PackageCheck size={20} strokeWidth={2.4} />
          </div>
          <div className="delivery-list">
            {deliveryTasks.map((task) => (
              <article className="delivery-card" key={task.id}>
                <div>
                  <strong>{task.storeName}</strong>
                  <span>{task.id} · {task.status}</span>
                </div>
                <p>{task.customerAddress}</p>
                <div className="delivery-footer">
                  <span>{task.distanceKm} km</span>
                  <strong>{formatMoney(task.fee)}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel map-panel">
          <div className="panel-title">
            <h2>路线预览</h2>
            <Navigation size={20} strokeWidth={2.4} />
          </div>
          <div className="map-preview">
            <div className="route-line"></div>
            <span className="pin pickup">取</span>
            <span className="pin rider">骑</span>
            <span className="pin dropoff">送</span>
          </div>
          <div className="route-steps">
            <span><Clock3 size={16} strokeWidth={2.4} /> 预计 18 分钟</span>
            <span><Map size={16} strokeWidth={2.4} /> 后续接 Google Maps</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
