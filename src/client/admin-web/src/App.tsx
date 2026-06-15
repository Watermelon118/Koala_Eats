import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  MapPinned,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react'
import { formatMoney } from '../../shared/format'
import {
  adminTasks,
  initialMockBusinessState,
} from '../../shared/mockData'
import {
  assignMockRider,
  dismissMockPlatformOrder,
  updateMockAccountStatus,
  updateMockDeliveryArea,
  updateMockMerchantApplicationStatus,
} from '../../shared/mockApi'
import { AuthGate } from '../../shared/auth'
import type {
  AccountRecord,
  DeliveryArea,
  MerchantApplication,
} from '../../shared/types'
import { useMockBusinessState } from '../../shared/useMockBusinessState'

type AdminTab = 'reviews' | 'orders' | 'accounts' | 'areas'

function App() {
  return (
    <AuthGate productName="考拉外卖管理端" role="Admin">
      <AdminApp />
    </AuthGate>
  )
}

function AdminApp() {
  const { errorMessage, setState: setMockState, state: mockState } =
    useMockBusinessState(initialMockBusinessState)
  const [activeTab, setActiveTab] = useState<AdminTab>('reviews')
  const applications = mockState.merchantApplications
  const orders = mockState.platformOrders
  const accounts = mockState.accountRecords
  const areas = mockState.deliveryAreas

  const pendingMerchantReviews = applications.filter((item) => item.status === 'Pending').length
  const abnormalOrders = orders.filter((order) => order.riskLevel !== 'normal').length
  const onlineRiders = accounts.filter((account) => account.role === 'Rider' && account.status === 'Active').length
  const todayOrders = 128

  async function updateApplicationStatus(applicationId: string, status: MerchantApplication['status']) {
    const nextState = await updateMockMerchantApplicationStatus(applicationId, status)
    setMockState(nextState)
  }

  async function assignRider(orderId: string) {
    const nextState = await assignMockRider(orderId)
    setMockState(nextState)
  }

  async function dismissOrder(orderId: string) {
    const nextState = await dismissMockPlatformOrder(orderId)
    setMockState(nextState)
  }

  async function toggleAccountStatus(account: AccountRecord) {
    const nextState = await updateMockAccountStatus(
      account.id,
      account.status === 'Frozen' ? 'Active' : 'Frozen',
    )
    setMockState(nextState)
  }

  async function toggleArea(area: DeliveryArea) {
    const nextState = await updateMockDeliveryArea({
      ...area,
      isEnabled: !area.isEnabled,
    })
    setMockState(nextState)
  }

  async function updateArea(area: DeliveryArea, patch: Partial<DeliveryArea>) {
    const nextState = await updateMockDeliveryArea({
      ...area,
      ...patch,
    })
    setMockState(nextState)
  }

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
          <strong>{pendingMerchantReviews}</strong>
        </article>
        <article className="metric-card">
          <span>异常订单</span>
          <strong>{abnormalOrders}</strong>
        </article>
        <article className="metric-card">
          <span>在线骑手</span>
          <strong>{onlineRiders}</strong>
        </article>
        <article className="metric-card">
          <span>今日订单</span>
          <strong>{todayOrders}</strong>
        </article>
      </section>

      <nav className="admin-tabs">
        {[
          ['reviews', '商家审核'],
          ['orders', '异常订单'],
          ['accounts', '账号管理'],
          ['areas', '配送区域'],
        ].map(([key, label]) => (
          <button
            className={activeTab === key ? 'active' : ''}
            key={key}
            onClick={() => setActiveTab(key as AdminTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {errorMessage && <div className="mock-alert">Mock API 未连接：{errorMessage}</div>}

      <section className="admin-grid">
        <aside className="panel">
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
        </aside>

        <div className="panel admin-workspace">
          {activeTab === 'reviews' && (
            <>
              <div className="panel-title">
                <h2>商家入驻审核</h2>
                <Store size={20} strokeWidth={2.4} />
              </div>
              <div className="review-list">
                {applications.map((application) => (
                  <article key={application.id}>
                    <div>
                      <strong>{application.storeName}</strong>
                      <span>
                        {application.category} · {application.address} · {application.submittedHoursAgo} 小时前
                      </span>
                    </div>
                    <small>{application.status}</small>
                    <div className="row-actions">
                      <button
                        className="primary-button"
                        disabled={application.status !== 'Pending'}
                        onClick={() => void updateApplicationStatus(application.id, 'Approved')}
                        type="button"
                      >
                        <CheckCircle2 size={16} strokeWidth={2.4} />
                        通过
                      </button>
                      <button
                        className="danger-button"
                        disabled={application.status !== 'Pending'}
                        onClick={() => void updateApplicationStatus(application.id, 'Rejected')}
                        type="button"
                      >
                        <XCircle size={16} strokeWidth={2.4} />
                        拒绝
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {activeTab === 'orders' && (
            <>
              <div className="panel-title">
                <h2>异常订单处理</h2>
                <AlertTriangle size={20} strokeWidth={2.4} />
              </div>
              <div className="review-list">
                {orders.map((order) => (
                  <article className={order.riskLevel} key={order.id}>
                    <div>
                      <strong>{order.id}</strong>
                      <span>
                        {order.storeName} · {order.customerName} · {order.status}
                      </span>
                    </div>
                    <small>{formatMoney(order.totalAmount)}</small>
                    <div className="row-actions">
                      <button className="primary-button" onClick={() => void assignRider(order.id)} type="button">
                        <Truck size={16} strokeWidth={2.4} />
                        指定骑手
                      </button>
                      <button className="dark-button" onClick={() => void dismissOrder(order.id)} type="button">
                        关闭异常
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {activeTab === 'accounts' && (
            <>
              <div className="panel-title">
                <h2>账号状态</h2>
                <Users size={20} strokeWidth={2.4} />
              </div>
              <div className="account-grid">
                {accounts.map((account) => (
                  <article key={account.id}>
                    <UserCog size={22} strokeWidth={2.4} />
                    <div>
                      <strong>{account.name}</strong>
                      <span>
                        {account.role} · {account.status}
                      </span>
                    </div>
                    <button className="dark-button" onClick={() => void toggleAccountStatus(account)} type="button">
                      {account.status === 'Frozen' ? '解冻' : '冻结'}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {activeTab === 'areas' && (
            <>
              <div className="panel-title">
                <h2>配送区域</h2>
                <MapPinned size={20} strokeWidth={2.4} />
              </div>
              <div className="account-grid">
                {areas.map((area) => (
                  <article className="area-card" key={area.id}>
                    <MapPinned size={22} strokeWidth={2.4} />
                    <div>
                      <strong>{area.name}</strong>
                      <span>
                        {area.radiusKm} km · 起步配送费 {formatMoney(area.baseFee)}
                      </span>
                    </div>
                    <button className="dark-button" onClick={() => void toggleArea(area)} type="button">
                      {area.isEnabled ? '停用' : '启用'}
                    </button>
                    <button
                      className="dark-button"
                      onClick={() => void updateArea(area, { radiusKm: Math.max(1, area.radiusKm - 0.5) })}
                      type="button"
                    >
                      半径-
                    </button>
                    <button
                      className="dark-button"
                      onClick={() => void updateArea(area, { radiusKm: area.radiusKm + 0.5 })}
                      type="button"
                    >
                      半径+
                    </button>
                    <button
                      className="dark-button"
                      onClick={() => void updateArea(area, { baseFee: Math.max(0, area.baseFee - 0.5) })}
                      type="button"
                    >
                      费用-
                    </button>
                    <button
                      className="dark-button"
                      onClick={() => void updateArea(area, { baseFee: area.baseFee + 0.5 })}
                      type="button"
                    >
                      费用+
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
