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
import { merchantMenuItems, merchantOrders, merchantProfile } from '../../shared/mockData'
import type { MerchantMenuItem, MerchantOrder, MerchantOrderStatus } from '../../shared/types'

type MerchantTab = 'orders' | 'menu' | 'store'

const nextOrderStatus: Partial<Record<MerchantOrderStatus, MerchantOrderStatus>> = {
  PendingAccept: 'Preparing',
  Preparing: 'ReadyForPickup',
  ReadyForPickup: 'PickedUp',
}

const orderStatusText: Record<MerchantOrderStatus, string> = {
  PendingAccept: '待接单',
  Preparing: '备餐中',
  ReadyForPickup: '待骑手取餐',
  PickedUp: '骑手已取餐',
  Rejected: '已拒单',
}

function App() {
  const [activeTab, setActiveTab] = useState<MerchantTab>('orders')
  const [isOpen, setIsOpen] = useState(merchantProfile.isOpen)
  const [orders, setOrders] = useState<MerchantOrder[]>(merchantOrders)
  const [menuItems, setMenuItems] = useState<MerchantMenuItem[]>(merchantMenuItems)
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? '')

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

  function updateOrderStatus(orderId: string, status: MerchantOrderStatus) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              statusText: orderStatusText[status],
            }
          : order,
      ),
    )
  }

  function moveOrderForward(order: MerchantOrder) {
    const nextStatus = nextOrderStatus[order.status]

    if (nextStatus) {
      updateOrderStatus(order.id, nextStatus)
    }
  }

  function toggleMenuItem(itemId: string) {
    setMenuItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isAvailable: !item.isAvailable,
            }
          : item,
      ),
    )
  }

  function changeStock(itemId: string, delta: number) {
    setMenuItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              stock: Math.max(item.stock + delta, 0),
            }
          : item,
      ),
    )
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
        <button className={`header-pill status-toggle ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)} type="button">
          <Power size={18} strokeWidth={2.4} />
          {isOpen ? '营业中' : '已打烊'}
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
                  <div key={item.id}>
                    <span>{item.name}</span>
                    <strong>
                      x{item.quantity} · {formatMoney(item.price * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="action-row">
                {selectedOrder.status === 'PendingAccept' && (
                  <button
                    className="danger-button"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'Rejected')}
                    type="button"
                  >
                    <XCircle size={18} strokeWidth={2.4} />
                    拒单
                  </button>
                )}
                <button
                  className="primary-button"
                  disabled={!nextOrderStatus[selectedOrder.status] && selectedOrder.status !== 'PendingAccept'}
                  onClick={() => moveOrderForward(selectedOrder)}
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
                        <button onClick={() => changeStock(item.id, -1)} type="button">
                          <Minus size={14} strokeWidth={2.6} />
                        </button>
                        <span>{item.stock}</span>
                        <button onClick={() => changeStock(item.id, 1)} type="button">
                          <Plus size={14} strokeWidth={2.6} />
                        </button>
                      </div>
                      <button className="icon-toggle" onClick={() => toggleMenuItem(item.id)} type="button">
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
              <input value={merchantProfile.name} readOnly />
            </label>
            <label>
              营业时间
              <input value={merchantProfile.openingHours} readOnly />
            </label>
            <label>
              店铺公告
              <textarea value={merchantProfile.announcement} readOnly />
            </label>
            <label>
              配送范围
              <input value={`${merchantProfile.deliveryRadiusKm} km`} readOnly />
            </label>
          </div>

          <div className="panel location-panel">
            <MapPin size={22} strokeWidth={2.4} />
            <div>
              <h2>店铺位置</h2>
              <p>{merchantProfile.address}</p>
              <span>后续接 Google Maps 维护店铺坐标和配送范围。</span>
            </div>
          </div>

          <div className="panel prep-panel">
            <PackageCheck size={22} strokeWidth={2.4} />
            <div>
              <h2>出餐设置</h2>
              <p>平均 {merchantProfile.averagePreparationMinutes} 分钟出餐</p>
              <span>商家接单后，订单会进入备餐中，再变更为待骑手取餐。</span>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
