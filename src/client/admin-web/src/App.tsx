import { AlertTriangle, ClipboardCheck, Search, ShieldCheck, Store, Users } from 'lucide-react'
import { adminTasks } from '../../shared/mockData'

function App() {
  return (
    <main className="app-shell admin-app">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">A</div>
          <div>
            <p className="eyebrow">Admin</p>
            <h1>平台管理端</h1>
          </div>
        </div>
        <div className="search-box">
          <Search size={18} strokeWidth={2.4} />
          <span>搜索用户、商家、订单</span>
        </div>
        <div className="header-pill">
          <ShieldCheck size={18} strokeWidth={2.4} />
          平台方后台
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <span>待审核商家</span>
          <strong>7</strong>
        </article>
        <article className="metric-card">
          <span>异常订单</span>
          <strong>2</strong>
        </article>
        <article className="metric-card">
          <span>在线骑手</span>
          <strong>24</strong>
        </article>
        <article className="metric-card">
          <span>今日订单</span>
          <strong>128</strong>
        </article>
      </section>

      <section className="admin-grid">
        <div className="panel">
          <div className="panel-title">
            <h2>待处理事项</h2>
            <ClipboardCheck size={20} strokeWidth={2.4} />
          </div>
          <div className="task-list">
            {adminTasks.map((task) => (
              <article className={`task-card ${task.severity}`} key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.owner}</span>
                </div>
                <small>{task.status}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="panel modules-panel">
          <h2>管理模块</h2>
          <div className="module-grid">
            <article>
              <Store size={22} strokeWidth={2.4} />
              <strong>商家审核</strong>
              <span>资料、地址、营业资质</span>
            </article>
            <article>
              <Users size={22} strokeWidth={2.4} />
              <strong>账号管理</strong>
              <span>用户、商家、骑手状态</span>
            </article>
            <article>
              <AlertTriangle size={22} strokeWidth={2.4} />
              <strong>异常订单</strong>
              <span>投诉、拒单、配送异常</span>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
