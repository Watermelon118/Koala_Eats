import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Home,
  Map,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  ShoppingBag,
  Store,
  TicketPercent,
  Utensils,
} from 'lucide-react'
import {
  buildCartLines,
  calculateOrderPreview,
  formatDistance,
  formatMinutes,
  formatMoney,
} from '../../shared/format'
import { categories, coupons, customerAddresses, customerOrder, stores } from '../../shared/mockData'
import type { Cart, CustomerOrder, CustomerOrderStatus } from '../../shared/types'

type CustomerView = 'stores' | 'store' | 'checkout' | 'payment' | 'tracking'

const statusTextByStatus: Record<CustomerOrderStatus, string> = {
  PendingPayment: '待支付',
  Paid: '已支付',
  MerchantAccepted: '商家已接单',
  Preparing: '商家备餐中',
  WaitingForRider: '等待骑手接单',
  RiderPickedUp: '骑手已取餐',
  Delivering: '骑手配送中',
  Completed: '已完成',
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0].id)
  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState(stores[0].menuCategories[0].id)
  const [cart, setCart] = useState<Cart>({})
  const [view, setView] = useState<CustomerView>('stores')
  const [selectedAddressId, setSelectedAddressId] = useState(customerAddresses[0].id)
  const [selectedCouponId, setSelectedCouponId] = useState(coupons[0].id)
  const [remark, setRemark] = useState('少盐，不要葱')
  const [createdOrder, setCreatedOrder] = useState<CustomerOrder | null>(null)

  const filteredStores = useMemo(() => {
    if (selectedCategory === '全部') {
      return stores
    }

    return stores.filter((storeItem) => storeItem.category === selectedCategory)
  }, [selectedCategory])

  const selectedStore = stores.find((storeItem) => storeItem.id === selectedStoreId) ?? stores[0]
  const selectedAddress =
    customerAddresses.find((address) => address.id === selectedAddressId) ?? customerAddresses[0]
  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId) ?? null
  const visibleMenu = selectedStore.menu.filter((item) => item.categoryId === activeMenuCategoryId)
  const cartLines = buildCartLines(cart, selectedStore.menu)
  const orderPreview = calculateOrderPreview(cartLines, selectedStore, selectedCoupon)
  const canCheckout =
    cartLines.length > 0 && orderPreview.itemsAmount >= selectedStore.minOrderAmount
  const orderToShow = createdOrder ?? customerOrder

  function openStore(storeId: string) {
    const nextStore = stores.find((storeItem) => storeItem.id === storeId) ?? stores[0]
    setSelectedStoreId(storeId)
    setActiveMenuCategoryId(nextStore.menuCategories[0].id)
    setCart({})
    setView('store')
  }

  function updateQuantity(itemId: string, quantityDelta: number) {
    setCart((currentCart) => {
      const nextQuantity = Math.max((currentCart[itemId] ?? 0) + quantityDelta, 0)
      const nextCart = { ...currentCart }

      if (nextQuantity === 0) {
        delete nextCart[itemId]
      } else {
        nextCart[itemId] = nextQuantity
      }

      return nextCart
    })
  }

  function createOrder() {
    setCreatedOrder({
      ...customerOrder,
      id: 'KE-3001',
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      status: 'PendingPayment',
      statusText: statusTextByStatus.PendingPayment,
      address: selectedAddress,
      items: cartLines,
      price: orderPreview,
      timeline: customerOrder.timeline.map((step, index) => ({
        ...step,
        happenedAt: index === 0 ? '现在' : '--',
        isCompleted: index === 0,
      })),
    })
    setView('payment')
  }

  function simulatePayment() {
    if (!createdOrder) {
      return
    }

    setCreatedOrder({
      ...createdOrder,
      status: 'Delivering',
      statusText: statusTextByStatus.Delivering,
      timeline: customerOrder.timeline,
    })
    setView('tracking')
  }

  return (
    <main className="app-shell customer-app">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">K</div>
          <div>
            <p className="eyebrow">Customer</p>
            <h1>考拉外卖</h1>
          </div>
        </div>

        <div className="search-box">
          <Search size={18} strokeWidth={2.4} />
          <span>搜索商家、菜品、订单</span>
        </div>

        <div className="header-pill">
          <MapPin size={18} strokeWidth={2.4} />
          Auckland CBD
        </div>
      </header>

      <nav className="stage-tabs" aria-label="用户端流程">
        {[
          ['stores', '选商家'],
          ['store', '点餐'],
          ['checkout', '结算'],
          ['payment', '支付'],
          ['tracking', '追踪'],
        ].map(([key, label]) => (
          <button
            className={view === key ? 'active' : ''}
            key={key}
            onClick={() => setView(key as CustomerView)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {view === 'stores' && (
        <section className="customer-layout">
          <div className="panel">
            <section className="customer-hero">
              <div>
                <span>用户端</span>
                <h2>附近好店，最快 18 分钟送达。</h2>
                <p>按距离、销量、优惠和配送时间筛选，进入商家后直接点餐。</p>
              </div>
              <div className="hero-bag">
                <ShoppingBag size={42} strokeWidth={2.4} />
              </div>
            </section>

            <div className="category-row">
              {categories.map((category) => (
                <button
                  className={category === selectedCategory ? 'active' : ''}
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="store-list">
              {filteredStores.map((storeItem) => (
                <button
                  className="store-card"
                  key={storeItem.id}
                  onClick={() => openStore(storeItem.id)}
                  type="button"
                >
                  <div className={`store-cover ${storeItem.coverTone}`}>
                    <Utensils size={26} strokeWidth={2.4} />
                  </div>
                  <div className="store-info">
                    <div className="store-title-row">
                      <h3>{storeItem.name}</h3>
                      <ChevronRight size={18} strokeWidth={2.4} />
                    </div>
                    <p>
                      {storeItem.rating} 分 · 月售 {storeItem.monthlySales} ·{' '}
                      {formatDistance(storeItem.distanceKm)}
                    </p>
                    <p>
                      {formatMinutes(storeItem.deliveryMinutes)} · 配送费{' '}
                      {formatMoney(storeItem.deliveryFee)} · 人均 {formatMoney(storeItem.averagePrice)}
                    </p>
                    <span>{storeItem.promotion}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <CustomerOrderAside order={orderToShow} onViewTracking={() => setView('tracking')} />
        </section>
      )}

      {view === 'store' && (
        <section className="customer-layout">
          <div className="panel">
            <button className="back-button" onClick={() => setView('stores')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回商家
            </button>

            <section className={`store-hero ${selectedStore.coverTone}`}>
              <div>
                <p>{selectedStore.category}</p>
                <h2>{selectedStore.name}</h2>
                <span>
                  {selectedStore.rating} 分 · 月售 {selectedStore.monthlySales} ·{' '}
                  {formatMinutes(selectedStore.deliveryMinutes)}送达
                </span>
              </div>
              <strong>{selectedStore.promotion}</strong>
            </section>

            <div className="store-meta-grid">
              <article>
                <Clock3 size={18} strokeWidth={2.4} />
                <span>{selectedStore.openingHours}</span>
              </article>
              <article>
                <MapPin size={18} strokeWidth={2.4} />
                <span>{selectedStore.address}</span>
              </article>
              <article>
                <TicketPercent size={18} strokeWidth={2.4} />
                <span>起送 {formatMoney(selectedStore.minOrderAmount)}</span>
              </article>
            </div>

            <div className="menu-layout">
              <aside className="menu-category-list">
                {selectedStore.menuCategories.map((category) => (
                  <button
                    className={activeMenuCategoryId === category.id ? 'active' : ''}
                    key={category.id}
                    onClick={() => setActiveMenuCategoryId(category.id)}
                    type="button"
                  >
                    {category.name}
                  </button>
                ))}
              </aside>

              <div className="menu-list">
                {visibleMenu.map((item) => {
                  const quantity = cart[item.id] ?? 0

                  return (
                    <article className="menu-item" key={item.id}>
                      <div className={`dish-thumb ${item.imageTone}`}>
                        <Utensils size={24} strokeWidth={2.4} />
                      </div>
                      <div>
                        <div className="item-title-row">
                          <h3>{item.name}</h3>
                          <span>{item.tag}</span>
                        </div>
                        <p>{item.description}</p>
                        <small>
                          月售 {item.monthlySales} · 库存 {item.stock}
                        </small>
                        <div className="price-row">
                          <strong>{formatMoney(item.price)}</strong>
                          <div className="quantity-control">
                            {quantity > 0 && (
                              <button onClick={() => updateQuantity(item.id, -1)} type="button">
                                <Minus size={16} strokeWidth={2.6} />
                              </button>
                            )}
                            {quantity > 0 && <span>{quantity}</span>}
                            <button onClick={() => updateQuantity(item.id, 1)} type="button">
                              <Plus size={16} strokeWidth={2.6} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>

          <CartAside
            canCheckout={canCheckout}
            cartLines={cartLines}
            minOrderAmount={selectedStore.minOrderAmount}
            orderPreview={orderPreview}
            onCheckout={() => setView('checkout')}
          />
        </section>
      )}

      {view === 'checkout' && (
        <section className="checkout-layout">
          <div className="panel">
            <button className="back-button" onClick={() => setView('store')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回点餐
            </button>
            <div className="panel-heading">
              <h2>确认订单</h2>
              <span>{selectedStore.name}</span>
            </div>

            <div className="checkout-section">
              <h3>收货地址</h3>
              <div className="address-grid">
                {customerAddresses.map((address) => (
                  <button
                    className={selectedAddressId === address.id ? 'selected' : ''}
                    key={address.id}
                    onClick={() => setSelectedAddressId(address.id)}
                    type="button"
                  >
                    <strong>
                      {address.label} · {address.receiverName}
                    </strong>
                    <span>{address.phoneMasked}</span>
                    <p>{address.addressLine}</p>
                    <small>{address.detail}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="checkout-section">
              <h3>优惠券</h3>
              <div className="coupon-row">
                {coupons.map((coupon) => (
                  <button
                    className={selectedCouponId === coupon.id ? 'selected' : ''}
                    key={coupon.id}
                    onClick={() => setSelectedCouponId(coupon.id)}
                    type="button"
                  >
                    <TicketPercent size={18} strokeWidth={2.4} />
                    {coupon.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="checkout-section">
              <h3>订单备注</h3>
              <textarea value={remark} onChange={(event) => setRemark(event.target.value)} />
            </div>
          </div>

          <OrderSummary
            buttonLabel="提交订单"
            disabled={!canCheckout}
            orderPreview={orderPreview}
            lines={cartLines}
            onSubmit={createOrder}
          />
        </section>
      )}

      {view === 'payment' && (
        <section className="checkout-layout">
          <div className="panel payment-panel">
            <div className="payment-icon">
              <CreditCard size={34} strokeWidth={2.4} />
            </div>
            <p className="eyebrow">Mock payment</p>
            <h2>模拟支付</h2>
            <p>
              真实支付暂不接入。当前订单会先进入待支付，点击支付后进入商家接单和配送流程。
            </p>
            <button className="primary-button" onClick={simulatePayment} type="button">
              确认模拟支付 {formatMoney(createdOrder?.price.totalAmount ?? 0)}
            </button>
          </div>

          <OrderSummary
            buttonLabel="等待支付"
            disabled
            orderPreview={createdOrder?.price ?? orderPreview}
            lines={createdOrder?.items ?? cartLines}
          />
        </section>
      )}

      {view === 'tracking' && (
        <section className="tracking-layout">
          <div className="panel">
            <div className="panel-heading">
              <h2>{orderToShow.statusText}</h2>
              <span>{orderToShow.id}</span>
            </div>

            <div className="map-card">
              <div className="route-line"></div>
              <span className="pin store-pin">店</span>
              <span className="pin rider-pin">骑</span>
              <span className="pin home-pin">收</span>
            </div>

            <div className="tracking-meta">
              <article>
                <Navigation size={20} strokeWidth={2.4} />
                <div>
                  <strong>{orderToShow.riderName} 正在配送</strong>
                  <span>
                    预计 {orderToShow.estimatedArrivalMinutes} 分钟送达 ·{' '}
                    {orderToShow.riderPhoneMasked}
                  </span>
                </div>
              </article>
              <article>
                <Home size={20} strokeWidth={2.4} />
                <div>
                  <strong>{orderToShow.address.addressLine}</strong>
                  <span>{orderToShow.address.detail}</span>
                </div>
              </article>
            </div>
          </div>

          <div className="panel timeline-panel">
            <h2>订单进度</h2>
            <div className="timeline">
              {orderToShow.timeline.map((step) => (
                <article className={step.isCompleted ? 'done' : ''} key={step.key}>
                  <CheckCircle2 size={20} strokeWidth={2.4} />
                  <div>
                    <strong>{step.label}</strong>
                    <p>{step.description}</p>
                    <span>{step.happenedAt}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

type CartAsideProps = {
  canCheckout: boolean
  cartLines: ReturnType<typeof buildCartLines>
  minOrderAmount: number
  orderPreview: ReturnType<typeof calculateOrderPreview>
  onCheckout: () => void
}

function CartAside({
  canCheckout,
  cartLines,
  minOrderAmount,
  orderPreview,
  onCheckout,
}: CartAsideProps) {
  return (
    <aside className="panel cart-panel">
      <div className="panel-heading">
        <h2>购物车</h2>
        <span>{cartLines.length} 种商品</span>
      </div>

      {cartLines.length === 0 ? (
        <div className="empty-cart">
          <ShoppingBag size={34} strokeWidth={2.4} />
          <p>先选择一家商家点餐</p>
        </div>
      ) : (
        <div className="cart-lines">
          {cartLines.map((line) => (
            <div className="cart-line" key={line.id}>
              <span>{line.name}</span>
              <strong>
                x{line.quantity} · {formatMoney(line.price * line.quantity)}
              </strong>
            </div>
          ))}
        </div>
      )}

      <div className="checkout-bar">
        <PriceRows orderPreview={orderPreview} />
        <button className="primary-button" disabled={!canCheckout} onClick={onCheckout} type="button">
          {canCheckout ? '去结算' : `差 ${formatMoney(Math.max(minOrderAmount - orderPreview.itemsAmount, 0))} 起送`}
        </button>
      </div>
    </aside>
  )
}

type OrderSummaryProps = {
  buttonLabel: string
  disabled: boolean
  lines: ReturnType<typeof buildCartLines>
  orderPreview: ReturnType<typeof calculateOrderPreview>
  onSubmit?: () => void
}

function OrderSummary({ buttonLabel, disabled, lines, orderPreview, onSubmit }: OrderSummaryProps) {
  return (
    <aside className="panel cart-panel">
      <div className="panel-heading">
        <h2>订单明细</h2>
        <span>{lines.length} 种商品</span>
      </div>
      <div className="cart-lines">
        {lines.map((line) => (
          <div className="cart-line" key={line.id}>
            <span>{line.name}</span>
            <strong>
              x{line.quantity} · {formatMoney(line.price * line.quantity)}
            </strong>
          </div>
        ))}
      </div>
      <div className="checkout-bar">
        <PriceRows orderPreview={orderPreview} />
        <button className="primary-button" disabled={disabled} onClick={onSubmit} type="button">
          {buttonLabel}
        </button>
      </div>
    </aside>
  )
}

function PriceRows({ orderPreview }: { orderPreview: ReturnType<typeof calculateOrderPreview> }) {
  return (
    <div className="price-breakdown">
      <div>
        <span>商品小计</span>
        <strong>{formatMoney(orderPreview.itemsAmount)}</strong>
      </div>
      <div>
        <span>配送费</span>
        <strong>{formatMoney(orderPreview.deliveryFee)}</strong>
      </div>
      <div>
        <span>打包费</span>
        <strong>{formatMoney(orderPreview.packagingFee)}</strong>
      </div>
      <div>
        <span>优惠</span>
        <strong>-{formatMoney(orderPreview.discountAmount)}</strong>
      </div>
      <div className="total-row">
        <span>合计</span>
        <strong>{formatMoney(orderPreview.totalAmount)}</strong>
      </div>
    </div>
  )
}

function CustomerOrderAside({
  order,
  onViewTracking,
}: {
  order: CustomerOrder
  onViewTracking: () => void
}) {
  return (
    <aside className="panel cart-panel">
      <div className="panel-heading">
        <h2>最近订单</h2>
        <span>{order.statusText}</span>
      </div>
      <div className="recent-order">
        <Store size={24} strokeWidth={2.4} />
        <div>
          <strong>{order.storeName}</strong>
          <p>{order.items.map((item) => `${item.name} x${item.quantity}`).join('、')}</p>
          <span>{formatMoney(order.price.totalAmount)}</span>
        </div>
      </div>
      <button className="dark-button" onClick={onViewTracking} type="button">
        <Map size={18} strokeWidth={2.4} />
        查看配送
      </button>
    </aside>
  )
}

export default App
