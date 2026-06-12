import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Power,
  Store,
  ToggleLeft,
  ToggleRight,
  Utensils,
  XCircle,
} from 'lucide-react'
import { formatMoney } from '../../shared/format'
import {
  updateMockMenuItem,
  updateMockMerchantOrderStatus,
  updateMockMerchantProfile,
} from '../../shared/mockApi'
import { initialMockBusinessState } from '../../shared/mockData'
import { GoogleAddressAutocomplete } from '../../shared/GoogleAddressAutocomplete'
import type {
  GoogleResolvedAddress,
  MerchantMenuItem,
  MerchantOrder,
  MerchantOrderStatus,
} from '../../shared/types'
import { useMockBusinessState } from '../../shared/useMockBusinessState'

type MerchantTab = 'orders' | 'menu' | 'store'

const nextOrderStatus: Partial<Record<MerchantOrderStatus, MerchantOrderStatus>> = {
  PendingAccept: 'Preparing',
  Preparing: 'ReadyForPickup',
}

const orderStatusText: Record<MerchantOrderStatus, string> = {
  PendingAccept: '待接单',
  Preparing: '备餐中',
  ReadyForPickup: '待骑手取餐',
  PickedUp: '骑手已取餐',
  Rejected: '已拒单',
}

function App() {
  const { errorMessage, setState: setMockState, state: mockState } =
    useMockBusinessState(initialMockBusinessState)
  const [activeTab, setActiveTab] = useState<MerchantTab>('orders')
  const [selectedOrderId, setSelectedOrderId] = useState(mockState.merchantOrders[0]?.id ?? '')

  const merchantProfile = mockState.merchantProfile
  const orders = mockState.merchantOrders
  const menuItems = mockState.merchantMenuItems
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0]
  const pendingOrders = orders.filter((order) => order.status === 'PendingAccept').length
  const preparingOrders = orders.filter((order) => order.status === 'Preparing').length
  const todayRevenue = orders
    .filter((order) => order.status !== 'Rejected')
    .reduce((total, order) => total + order.totalAmount, 0)
  const availableItems = menuItems.filter((item) => item.isAvailable).length

  const groupedMenu = useMemo(() => {
    return menuItems.reduce<Record<string, MerchantMenuItem[]>>((result, item) => {
      result[item.categoryName] = [...(result[item.categoryName] ?? []), item]
      return result
    }, {})
  }, [menuItems])

  async function updateOrderStatus(orderId: string, status: MerchantOrderStatus) {
    const nextState = await updateMockMerchantOrderStatus(orderId, status)
    setMockState(nextState)
  }

  async function moveOrderForward(order: MerchantOrder) {
    const nextStatus = nextOrderStatus[order.status]

    if (nextStatus) {
      await updateOrderStatus(order.id, nextStatus)
    }
  }

  async function toggleMenuItem(item: MerchantMenuItem) {
    const nextState = await updateMockMenuItem({
      ...item,
      isAvailable: !item.isAvailable,
    })
    setMockState(nextState)
  }

  async function changeStock(item: MerchantMenuItem, delta: number) {
    const nextState = await updateMockMenuItem({
      ...item,
      stock: Math.max(item.stock + delta, 0),
    })
    setMockState(nextState)
  }

  async function selectStoreAddress(address: GoogleResolvedAddress) {
    const nextState = await updateMockMerchantProfile({
      ...merchantProfile,
      address: address.formattedAddress,
      coordinates: address.coordinates,
    })
    setMockState(nextState)
  }

  async function updateStoreProfilePatch(patch: Partial<typeof merchantProfile>) {
    const nextState = await updateMockMerchantProfile({
      ...merchantProfile,
      ...patch,
    })
    setMockState(nextState)
  }

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
          <span>{merchantProfile.name}</span>
        </div>
        <button
          className={`header-pill status-toggle ${merchantProfile.isOpen ? 'open' : ''}`}
          onClick={() => void updateStoreProfilePatch({ isOpen: !merchantProfile.isOpen })}
          type="button"
        >
          <Power size={18} strokeWidth={2.4} />
          {merchantProfile.isOpen ? '营业中' : '已打烊'}
        </button>
      </header>

      <section className="merchant-hero panel">
        <div>
          <p className="eyebrow">Store profile</p>
          <h2>{merchantProfile.name}</h2>
          <span>
            {merchantProfile.openingHours} · 平均出餐 {merchantProfile.averagePreparationMinutes} 分钟 · 配送{' '}
            {merchantProfile.deliveryRadiusKm} km
          </span>
        </div>
        <div className="hero-actions">
          <button className="dark-button" type="button">
            编辑店铺
          </button>
          <button className="primary-button" type="button">
            发布公告
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>待接单</span>
          <strong>{pendingOrders}</strong>
        </article>
        <article className="metric-card">
          <span>备餐中</span>
          <strong>{preparingOrders}</strong>
        </article>
        <article className="metric-card">
          <span>今日营业额</span>
          <strong>{formatMoney(todayRevenue)}</strong>
        </article>
        <article className="metric-card">
          <span>在售菜品</span>
          <strong>{availableItems}</strong>
        </article>
      </section>

      <nav className="merchant-tabs">
        {[
          ['orders', '订单处理'],
          ['menu', '菜单库存'],
          ['store', '店铺资料'],
        ].map(([key, label]) => (
          <button
            className={activeTab === key ? 'active' : ''}
            key={key}
            onClick={() => setActiveTab(key as MerchantTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {errorMessage && <div className="mock-alert">Mock API 未连接：{errorMessage}</div>}

      {activeTab === 'orders' && (
        <section className="merchant-grid">
          <div className="panel">
            <div className="panel-title">
              <h2>订单队列</h2>
              <ClipboardCheck size={20} strokeWidth={2.4} />
            </div>
            <div className="order-list">
              {orders.map((order) => (
                <button
                  className={selectedOrder?.id === order.id ? 'order-card selected' : 'order-card'}
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  type="button"
                >
                  <div>
                    <strong>{order.id}</strong>
                    <span>{order.customerName}</span>
                  </div>
                  <p>{order.itemsSummary}</p>
                  <div className="order-footer">
                    <span>{order.placedMinutesAgo} 分钟前 · {order.statusText}</span>
                    <strong>{formatMoney(order.totalAmount)}</strong>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedOrder && (
            <aside className="panel order-detail">
              <div className="panel-title">
                <h2>{selectedOrder.id}</h2>
                <span>{selectedOrder.statusText}</span>
              </div>
              <div className="detail-stack">
                <article>
                  <strong>顾客</strong>
                  <span>{selectedOrder.customerName}</span>
                </article>
                <article>
                  <strong>地址</strong>
                  <span>{selectedOrder.deliveryAddressMasked}</span>
                </article>
                <article>
                  <strong>备注</strong>
                  <span>{selectedOrder.customerNote}</span>
                </article>
              </div>
              <div className="order-items">
                {selectedOrder.items.map((item) => (
                  <div key={item.cartKey ?? item.id}>
                    <span>
                      {item.name}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <small>{item.selectedOptions.map((option) => option.name).join(' / ')}</small>
                      )}
                    </span>
                    <strong>
                      x{item.quantity} · {formatMoney((item.unitPrice ?? item.price) * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="action-row">
                {selectedOrder.status === 'PendingAccept' && (
                  <button
                    className="danger-button"
                    onClick={() => void updateOrderStatus(selectedOrder.id, 'Rejected')}
                    type="button"
                  >
                    <XCircle size={18} strokeWidth={2.4} />
                    拒单
                  </button>
                )}
                <button
                  className="primary-button"
                  disabled={!nextOrderStatus[selectedOrder.status] && selectedOrder.status !== 'PendingAccept'}
                  onClick={() => void moveOrderForward(selectedOrder)}
                  type="button"
                >
                  <CheckCircle2 size={18} strokeWidth={2.4} />
                  {selectedOrder.status === 'PendingAccept' ? '接单' : '推进状态'}
                </button>
              </div>
            </aside>
          )}
        </section>
      )}

      {activeTab === 'menu' && (
        <section className="panel">
          <div className="panel-title">
            <h2>菜单与库存</h2>
            <button className="primary-button compact" type="button">
              <Plus size={16} strokeWidth={2.6} />
              新增菜品
            </button>
          </div>
          <div className="menu-management">
            {Object.entries(groupedMenu).map(([categoryName, items]) => (
              <section key={categoryName}>
                <h3>{categoryName}</h3>
                <div className="dish-list">
                  {items.map((item) => (
                    <article key={item.id}>
                      <div className={`dish-icon ${item.imageTone}`}>
                        <Utensils size={20} strokeWidth={2.4} />
                      </div>
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.tag} · 月售 {item.monthlySales} · {item.isAvailable ? '已上架' : '已下架'}
                        </span>
                      </div>
                      <strong>{formatMoney(item.price)}</strong>
                      <div className="stock-control">
                        <button onClick={() => void changeStock(item, -1)} type="button">
                          <Minus size={14} strokeWidth={2.6} />
                        </button>
                        <span>{item.stock}</span>
                        <button onClick={() => void changeStock(item, 1)} type="button">
                          <Plus size={14} strokeWidth={2.6} />
                        </button>
                      </div>
                      <button className="icon-toggle" onClick={() => void toggleMenuItem(item)} type="button">
                        {item.isAvailable ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'store' && (
        <section className="merchant-grid">
          <div className="panel store-settings">
            <h2>店铺资料</h2>
            <label>
              店铺名称
              <input
                defaultValue={merchantProfile.name}
                onBlur={(event) => void updateStoreProfilePatch({ name: event.currentTarget.value })}
              />
            </label>
            <GoogleAddressAutocomplete
              initialValue={merchantProfile.address}
              label="店铺地址"
              onSelect={(address) => void selectStoreAddress(address)}
              placeholder="输入 NZ 店铺地址，例如 Queen Street"
            />
            <label>
              营业时间
              <input
                defaultValue={merchantProfile.openingHours}
                onBlur={(event) => void updateStoreProfilePatch({ openingHours: event.currentTarget.value })}
              />
            </label>
            <label>
              店铺公告
              <textarea
                defaultValue={merchantProfile.announcement}
                onBlur={(event) => void updateStoreProfilePatch({ announcement: event.currentTarget.value })}
              />
            </label>
            <label>
              配送范围
              <span className="readonly-field">{merchantProfile.deliveryRadiusKm} km</span>
            </label>
            <div className="settings-actions">
              <button
                className="light-button"
                onClick={() =>
                  void updateStoreProfilePatch({
                    deliveryRadiusKm: Math.max(1, Number((merchantProfile.deliveryRadiusKm - 0.5).toFixed(1))),
                  })
                }
                type="button"
              >
                缩小配送范围
              </button>
              <button
                className="light-button"
                onClick={() =>
                  void updateStoreProfilePatch({
                    deliveryRadiusKm: Number((merchantProfile.deliveryRadiusKm + 0.5).toFixed(1)),
                  })
                }
                type="button"
              >
                扩大配送范围
              </button>
            </div>
          </div>

          <div className="panel location-panel">
            <MapPin size={22} strokeWidth={2.4} />
            <div>
              <h2>店铺位置</h2>
              <p>{merchantProfile.address}</p>
              <span>通过 Google 地址联想维护店铺坐标，配送范围在店铺资料中调整。</span>
            </div>
          </div>

          <div className="panel prep-panel">
            <PackageCheck size={22} strokeWidth={2.4} />
            <div>
              <h2>出餐设置</h2>
              <p>平均 {merchantProfile.averagePreparationMinutes} 分钟出餐</p>
              <span>商家接单后，订单会进入备餐中，再变更为待骑手取餐。</span>
              <div className="settings-actions">
                <button
                  className="light-button"
                  onClick={() =>
                    void updateStoreProfilePatch({
                      averagePreparationMinutes: Math.max(5, merchantProfile.averagePreparationMinutes - 1),
                    })
                  }
                  type="button"
                >
                  减 1 分钟
                </button>
                <button
                  className="light-button"
                  onClick={() =>
                    void updateStoreProfilePatch({
                      averagePreparationMinutes: merchantProfile.averagePreparationMinutes + 1,
                    })
                  }
                  type="button"
                >
                  加 1 分钟
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
