import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Flame,
  Gift,
  Home,
  LocateFixed,
  Map,
  MapPin,
  MessageSquareText,
  Minus,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  TicketPercent,
  Timer,
  Utensils,
  WalletCards,
} from 'lucide-react'
import {
  buildCartLines,
  calculateOrderPreview,
  calculateDistanceKm,
  formatDistance,
  formatMinutes,
  formatMoney,
  getCartKey,
  getDefaultSelectedOptions,
} from '../../shared/format'
import { cancelMockOrder, createMockOrder, payMockOrder } from '../../shared/mockApi'
import { categories, coupons, customerAddresses, initialMockBusinessState, stores } from '../../shared/mockData'
import { GoogleAddressAutocomplete } from '../../shared/GoogleAddressAutocomplete'
import type {
  Cart,
  CustomerAddress,
  CustomerOrder,
  CustomerOrderStatus,
  GoogleResolvedAddress,
  MenuItem,
  SelectedMenuOption,
  SelectedOptionsByItem,
  StoreSummary,
} from '../../shared/types'
import { useMockBusinessState } from '../../shared/useMockBusinessState'

type CustomerView = 'stores' | 'store' | 'checkout' | 'payment' | 'tracking'

const statusTextByStatus: Record<CustomerOrderStatus, string> = {
  PendingPayment: '待支付',
  Paid: '已支付',
  PendingMerchantAccept: '等待商家接单',
  MerchantAccepted: '商家已接单',
  Preparing: '商家备餐中',
  ReadyForPickup: '餐品已出餐',
  WaitingForRider: '等待骑手接单',
  RiderAccepted: '骑手已接单',
  RiderArrivedStore: '骑手已到店',
  RiderPickedUp: '骑手已取餐',
  Delivering: '骑手配送中',
  Completed: '已完成',
  Rejected: '商家已拒单',
  Refunded: '已退款',
  Canceled: '已取消',
}

const shortcutItems = [
  { label: '美食外卖', icon: Utensils, tone: 'yellow' },
  { label: '品牌快餐', icon: Flame, tone: 'red' },
  { label: '甜品饮品', icon: Gift, tone: 'green' },
  { label: '准时达', icon: Timer, tone: 'blue' },
  { label: '放心吃', icon: ShieldCheck, tone: 'purple' },
]

const PAYMENT_TIMEOUT_SECONDS = 15 * 60

function App() {
  const { errorMessage, setState: setMockState, state: mockState } =
    useMockBusinessState(initialMockBusinessState)
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0].id)
  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState(stores[0].menuCategories[0].id)
  const [cart, setCart] = useState<Cart>({})
  const [selectedOptionsByItem, setSelectedOptionsByItem] = useState<SelectedOptionsByItem>({})
  const [view, setView] = useState<CustomerView>('stores')
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>(customerAddresses)
  const [selectedAddressId, setSelectedAddressId] = useState(customerAddresses[0].id)
  const [googleAddress, setGoogleAddress] = useState<CustomerAddress | null>(null)
  const [addressDraft, setAddressDraft] = useState({
    detail: '',
    label: '公司',
    phoneMasked: customerAddresses[0].phoneMasked,
    receiverName: customerAddresses[0].receiverName,
  })
  const [selectedCouponId, setSelectedCouponId] = useState(coupons[0].id)
  const [remark, setRemark] = useState('少盐，不要葱')
  const [createdOrderId, setCreatedOrderId] = useState('')
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(PAYMENT_TIMEOUT_SECONDS)

  const filteredStores = useMemo(() => {
    const matchingStores =
      selectedCategory === '全部'
        ? stores
        : stores.filter((storeItem) => storeItem.category === selectedCategory)

    return [...matchingStores].sort((firstStore, secondStore) => {
      if (firstStore.deliveryMinutes !== secondStore.deliveryMinutes) {
        return firstStore.deliveryMinutes - secondStore.deliveryMinutes
      }

      return secondStore.monthlySales - firstStore.monthlySales
    })
  }, [selectedCategory])

  const selectedStore = stores.find((storeItem) => storeItem.id === selectedStoreId) ?? stores[0]
  const selectedAddress =
    selectedAddressId === 'google-address' && googleAddress
      ? googleAddress
      : savedAddresses.find((address) => address.id === selectedAddressId) ?? savedAddresses[0]
  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId) ?? null
  const visibleMenu = selectedStore.menu.filter((item) => item.categoryId === activeMenuCategoryId)
  const cartLines = buildCartLines(cart, selectedStore.menu)
  const cartQuantity = cartLines.reduce((total, line) => total + line.quantity, 0)
  const deliveryDistanceKm = calculateDistanceKm(selectedStore.location, selectedAddress.coordinates)
  const isWithinDeliveryRange = deliveryDistanceKm <= selectedStore.deliveryRadiusKm
  const orderPreview = calculateOrderPreview(cartLines, selectedStore, selectedCoupon)
  const canCheckout =
    cartLines.length > 0 &&
    orderPreview.itemsAmount >= selectedStore.minOrderAmount &&
    isWithinDeliveryRange
  const orderToShow =
    mockState.customerOrders.find((order) => order.id === createdOrderId) ??
    mockState.customerOrders[0] ??
    initialMockBusinessState.customerOrders[0]

  useEffect(() => {
    if (view !== 'payment' || orderToShow.status !== 'PendingPayment') {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setPaymentSecondsLeft((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [orderToShow.status, view])

  useEffect(() => {
    if (view !== 'payment' || orderToShow.status !== 'PendingPayment' || paymentSecondsLeft > 0) {
      return
    }

    void cancelOrder()
  }, [orderToShow.status, paymentSecondsLeft, view])

  function openStore(storeId: string) {
    const nextStore = stores.find((storeItem) => storeItem.id === storeId) ?? stores[0]
    setSelectedStoreId(storeId)
    setActiveMenuCategoryId(nextStore.menuCategories[0].id)
    setCart({})
    setSelectedOptionsByItem({})
    setView('store')
  }

  function updateQuantity(item: MenuItem, quantityDelta: number) {
    const selectedOptions = selectedOptionsByItem[item.id] ?? getDefaultSelectedOptions(item)
    const cartKey = getCartKey(item.id, selectedOptions)

    setCart((currentCart) => {
      const currentEntry = currentCart[cartKey]
      const nextQuantity = Math.max((currentEntry?.quantity ?? 0) + quantityDelta, 0)
      const nextCart = { ...currentCart }

      if (nextQuantity === 0) {
        delete nextCart[cartKey]
      } else {
        nextCart[cartKey] = {
          itemId: item.id,
          quantity: nextQuantity,
          selectedOptions,
        }
      }

      return nextCart
    })
  }

  function updateSelectedOption(item: MenuItem, groupId: string, option: SelectedMenuOption) {
    setSelectedOptionsByItem((currentOptions) => {
      const existingOptions = currentOptions[item.id] ?? getDefaultSelectedOptions(item)
      const nextOptions = existingOptions.filter((selectedOption) => selectedOption.groupId !== groupId)

      return {
        ...currentOptions,
        [item.id]: [...nextOptions, option],
      }
    })
  }

  async function createOrder() {
    const nextState = await createMockOrder({
      address: selectedAddress,
      deliveryRadiusKm: selectedStore.deliveryRadiusKm,
      items: cartLines,
      price: orderPreview,
      remark,
      storeId: selectedStore.id,
      storeLocation: selectedStore.location,
      storeName: selectedStore.name,
    })
    const nextOrder = nextState.customerOrders[0]
    setMockState(nextState)
    setCreatedOrderId(nextOrder.id)
    setPaymentSecondsLeft(PAYMENT_TIMEOUT_SECONDS)
    setView('payment')
  }

  async function simulatePayment() {
    if (!createdOrderId) {
      return
    }

    const nextState = await payMockOrder(createdOrderId)
    setMockState(nextState)
    setView('tracking')
  }

  function selectGoogleAddress(address: GoogleResolvedAddress) {
    const nextAddress = {
      addressLine: address.formattedAddress,
      coordinates: address.coordinates,
      detail: address.displayName,
      id: 'google-address',
      label: 'Google',
      phoneMasked: customerAddresses[0].phoneMasked,
      placeId: address.placeId,
      receiverName: customerAddresses[0].receiverName,
    }
    setGoogleAddress(nextAddress)
    setSavedAddresses((currentAddresses) => [
      nextAddress,
      ...currentAddresses.filter((savedAddress) => savedAddress.id !== nextAddress.id),
    ])
    setSelectedAddressId('google-address')
  }

  function saveGoogleAddress() {
    if (!googleAddress) {
      return
    }

    const nextAddress = {
      ...googleAddress,
      detail: addressDraft.detail || googleAddress.detail,
      id: `address-${Date.now()}`,
      label: addressDraft.label || '收货地址',
      phoneMasked: addressDraft.phoneMasked,
      receiverName: addressDraft.receiverName,
    }

    setSavedAddresses((currentAddresses) => [nextAddress, ...currentAddresses])
    setSelectedAddressId(nextAddress.id)
  }

  function deleteAddress(addressId: string) {
    const nextAddresses = savedAddresses.filter((address) => address.id !== addressId)
    setSavedAddresses(nextAddresses)

    if (selectedAddressId === addressId) {
      setSelectedAddressId(nextAddresses[0]?.id ?? googleAddress?.id ?? customerAddresses[0].id)
    }
  }

  async function cancelOrder() {
    if (!orderToShow.id) {
      return
    }

    const nextState = await cancelMockOrder(orderToShow.id)
    setMockState(nextState)
  }

  function formatPaymentCountdown(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const restSeconds = seconds % 60

    return `${minutes}:${restSeconds.toString().padStart(2, '0')}`
  }

  return (
    <main className="app-shell customer-app">
      <header className="customer-topbar">
        <button className="location-button" type="button">
          <MapPin size={18} strokeWidth={2.5} />
          Auckland CBD
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
        <button className="search-field" type="button">
          <Search size={18} strokeWidth={2.4} />
          搜索商家、菜品
        </button>
        <button className="round-tool" type="button" aria-label="定位">
          <LocateFixed size={19} strokeWidth={2.4} />
        </button>
      </header>

      <nav className="stage-tabs" aria-label="用户端流程">
        {[
          ['stores', '首页'],
          ['store', '点餐'],
          ['checkout', '结算'],
          ['payment', '支付'],
          ['tracking', '配送'],
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

      {errorMessage && <div className="mock-alert">Mock API 未连接：{errorMessage}</div>}

      {view === 'stores' && (
        <section className="customer-layout">
          <div className="feed-column">
            <section className="delivery-hero">
              <div>
                <p>考拉外卖</p>
                <h1>今天想吃什么？</h1>
                <span>附近 {stores.length} 家好店营业中，最快 18 分钟送达。</span>
              </div>
              <div className="hero-coupon">
                <strong>$6</strong>
                <span>满减券待用</span>
              </div>
            </section>

            <section className="shortcut-grid" aria-label="快捷分类">
              {shortcutItems.map((item) => {
                const Icon = item.icon

                return (
                  <button className={`shortcut ${item.tone}`} key={item.label} type="button">
                    <span>
                      <Icon size={22} strokeWidth={2.4} />
                    </span>
                    {item.label}
                  </button>
                )
              })}
            </section>

            <section className="promo-strip">
              <div>
                <Gift size={18} strokeWidth={2.4} />
                新用户专享
              </div>
              <strong>最高立减 $8，支持模拟支付完成下单闭环</strong>
              <ChevronRight size={18} strokeWidth={2.5} />
            </section>

            <div className="section-heading">
              <div>
                <p className="eyebrow">Nearby restaurants</p>
                <h2>附近商家</h2>
              </div>
              <button className="filter-button" type="button">
                <SlidersHorizontal size={17} strokeWidth={2.4} />
                综合排序
              </button>
            </div>

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
              {filteredStores.map((storeItem, index) => (
                <StoreCard key={storeItem.id} onOpenStore={openStore} rank={index + 1} store={storeItem} />
              ))}
            </div>
          </div>

          <CustomerOrderAside order={orderToShow} onViewTracking={() => setView('tracking')} />
        </section>
      )}

      {view === 'store' && (
        <section className="customer-layout">
          <div className="panel store-panel">
            <button className="back-button" onClick={() => setView('stores')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回首页
            </button>

            <section className={`store-hero ${selectedStore.coverTone}`}>
              <div className="store-brand">
                <FoodVisual tone={selectedStore.coverTone} />
                <div>
                  <p>{selectedStore.category}</p>
                  <h2>{selectedStore.name}</h2>
                  <span>
                    <Star size={15} fill="currentColor" strokeWidth={0} /> {selectedStore.rating} · 月售{' '}
                    {selectedStore.monthlySales} · {formatMinutes(selectedStore.deliveryMinutes)}送达
                  </span>
                </div>
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
                <BadgeCheck size={18} strokeWidth={2.4} />
                <span>{selectedStore.serviceTags.join(' · ')}</span>
              </article>
              <article className={isWithinDeliveryRange ? '' : 'range-warning'}>
                <Navigation size={18} strokeWidth={2.4} />
                <span>
                  配送 {formatDistance(deliveryDistanceKm)} / 范围 {formatDistance(selectedStore.deliveryRadiusKm)}
                </span>
              </article>
            </div>

            <div className="notice-bar">
              <MessageSquareText size={18} strokeWidth={2.4} />
              {selectedStore.announcement}
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
                  const selectedOptions = selectedOptionsByItem[item.id] ?? getDefaultSelectedOptions(item)
                  const activeCartKey = getCartKey(item.id, selectedOptions)
                  const quantity = cart[activeCartKey]?.quantity ?? 0
                  const currentUnitPrice =
                    item.price + selectedOptions.reduce((total, option) => total + option.priceDelta, 0)

                  return (
                    <article className="menu-item" key={item.id}>
                      <FoodVisual tone={item.imageTone} />
                      <div>
                        <div className="item-title-row">
                          <h3>{item.name}</h3>
                          <span>{item.tag}</span>
                        </div>
                        <p>{item.description}</p>
                        <small>
                          月售 {item.monthlySales} · 库存 {item.stock}
                        </small>
                        {item.optionGroups && (
                          <div className="option-groups">
                            {item.optionGroups.map((group) => {
                              const selectedOptionId = selectedOptions.find(
                                (option) => option.groupId === group.id,
                              )?.id

                              return (
                                <fieldset key={group.id}>
                                  <legend>{group.name}</legend>
                                  <div>
                                    {group.options.map((option) => (
                                      <button
                                        className={selectedOptionId === option.id ? 'active' : ''}
                                        key={option.id}
                                        onClick={() =>
                                          updateSelectedOption(item, group.id, {
                                            ...option,
                                            groupId: group.id,
                                            groupName: group.name,
                                          })
                                        }
                                        type="button"
                                      >
                                        {option.name}
                                        {option.priceDelta > 0 && ` +${formatMoney(option.priceDelta)}`}
                                      </button>
                                    ))}
                                  </div>
                                </fieldset>
                              )
                            })}
                          </div>
                        )}
                        <div className="price-row">
                          <strong>{formatMoney(currentUnitPrice)}</strong>
                          <div className="quantity-control">
                            {quantity > 0 && (
                              <button onClick={() => updateQuantity(item, -1)} type="button">
                                <Minus size={16} strokeWidth={2.6} />
                              </button>
                            )}
                            {quantity > 0 && <span>{quantity}</span>}
                            <button disabled={!item.isAvailable || item.stock <= 0} onClick={() => updateQuantity(item, 1)} type="button">
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
            cartQuantity={cartQuantity}
            isWithinDeliveryRange={isWithinDeliveryRange}
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
              <GoogleAddressAutocomplete
                label="搜索 New Zealand 收货地址"
                onSelect={selectGoogleAddress}
                placeholder="输入街道、门牌号、区域，例如 Queen Street"
              />
              {googleAddress && (
                <div className="address-editor">
                  <label>
                    标签
                    <input
                      value={addressDraft.label}
                      onChange={(event) =>
                        setAddressDraft((currentDraft) => ({ ...currentDraft, label: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    联系人
                    <input
                      value={addressDraft.receiverName}
                      onChange={(event) =>
                        setAddressDraft((currentDraft) => ({
                          ...currentDraft,
                          receiverName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    电话
                    <input
                      value={addressDraft.phoneMasked}
                      onChange={(event) =>
                        setAddressDraft((currentDraft) => ({
                          ...currentDraft,
                          phoneMasked: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    门牌/楼层
                    <input
                      value={addressDraft.detail}
                      onChange={(event) =>
                        setAddressDraft((currentDraft) => ({ ...currentDraft, detail: event.target.value }))
                      }
                      placeholder="例如 Unit 8B / 前台 / 公司门口"
                    />
                  </label>
                  <button className="light-button" onClick={saveGoogleAddress} type="button">
                    保存到地址簿
                  </button>
                </div>
              )}
              <div className="address-grid">
                {googleAddress && (
                  <button
                    className={selectedAddressId === googleAddress.id ? 'selected' : ''}
                    onClick={() => setSelectedAddressId(googleAddress.id)}
                    type="button"
                  >
                    <strong>
                      {googleAddress.label} · {googleAddress.receiverName}
                    </strong>
                    <span>{googleAddress.phoneMasked}</span>
                    <p>{googleAddress.addressLine}</p>
                    <small>{googleAddress.detail}</small>
                  </button>
                )}
                {savedAddresses
                  .filter((address) => address.id !== googleAddress?.id)
                  .map((address) => (
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
              <div className="address-actions">
                {savedAddresses.map((address) => (
                  <button
                    disabled={savedAddresses.length <= 1}
                    key={address.id}
                    onClick={() => deleteAddress(address.id)}
                    type="button"
                  >
                    删除 {address.label}
                  </button>
                ))}
              </div>
              {!isWithinDeliveryRange && (
                <div className="range-blocker">
                  当前地址距商家 {formatDistance(deliveryDistanceKm)}，超出{' '}
                  {formatDistance(selectedStore.deliveryRadiusKm)} 配送范围，暂不能下单。
                </div>
              )}
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
              <WalletCards size={34} strokeWidth={2.4} />
            </div>
            <p className="eyebrow">Mock payment</p>
            <h2>模拟支付</h2>
            <p>
              真实支付暂不接入。当前订单会先进入待支付，点击支付后进入商家接单和配送流程。
            </p>
            {orderToShow.status === 'PendingPayment' && (
              <div className="payment-countdown">
                <Clock3 size={18} strokeWidth={2.4} />
                剩余 {formatPaymentCountdown(paymentSecondsLeft)}，超时自动取消
              </div>
            )}
            <button className="primary-button" onClick={simulatePayment} type="button">
              <CreditCard size={18} strokeWidth={2.4} />
              确认模拟支付 {formatMoney(orderToShow.price.totalAmount)}
            </button>
            {orderToShow.status === 'PendingPayment' && (
              <button className="light-button" onClick={() => void cancelOrder()} type="button">
                取消订单
              </button>
            )}
          </div>

          <OrderSummary
            buttonLabel="等待支付"
            disabled
            orderPreview={orderToShow.price}
            lines={orderToShow.items}
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
            {['PendingPayment', 'PendingMerchantAccept'].includes(orderToShow.status) && (
              <button className="light-button tracking-action" onClick={() => void cancelOrder()} type="button">
                取消订单
              </button>
            )}

            <div className="map-card">
              <div className="map-road road-main"></div>
              <div className="map-road road-side"></div>
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

type StoreCardProps = {
  onOpenStore: (storeId: string) => void
  rank: number
  store: StoreSummary
}

function StoreCard({ onOpenStore, rank, store }: StoreCardProps) {
  return (
    <button className="store-card" onClick={() => onOpenStore(store.id)} type="button">
      <FoodVisual tone={store.coverTone} />
      <div className="store-info">
        <div className="store-title-row">
          <h3>{store.name}</h3>
          <span className="rank-badge">附近第 {rank}</span>
        </div>
        <p className="score-line">
          <Star size={14} fill="currentColor" strokeWidth={0} />
          {store.rating} · 月售 {store.monthlySales} · {formatDistance(store.distanceKm)}
        </p>
        <p>
          {formatMinutes(store.deliveryMinutes)} · 配送费 {formatMoney(store.deliveryFee)} · 人均{' '}
          {formatMoney(store.averagePrice)}
        </p>
        <div className="store-tags">
          <span>{store.promotion}</span>
          {store.serviceTags.slice(0, 2).map((tag) => (
            <small key={tag}>{tag}</small>
          ))}
        </div>
      </div>
      <ChevronRight className="store-arrow" size={18} strokeWidth={2.5} />
    </button>
  )
}

function FoodVisual({ tone }: { tone: StoreSummary['coverTone'] }) {
  return (
    <div className={`food-visual ${tone}`}>
      <span className="food-plate"></span>
      <span className="food-dot one"></span>
      <span className="food-dot two"></span>
      <Utensils size={24} strokeWidth={2.5} />
    </div>
  )
}

type CartAsideProps = {
  canCheckout: boolean
  cartLines: ReturnType<typeof buildCartLines>
  cartQuantity: number
  isWithinDeliveryRange: boolean
  minOrderAmount: number
  orderPreview: ReturnType<typeof calculateOrderPreview>
  onCheckout: () => void
}

function CartAside({
  canCheckout,
  cartLines,
  cartQuantity,
  isWithinDeliveryRange,
  minOrderAmount,
  orderPreview,
  onCheckout,
}: CartAsideProps) {
  return (
    <aside className="panel cart-panel">
      <div className="panel-heading">
        <h2>购物车</h2>
        <span>{cartQuantity} 件商品</span>
      </div>

      {cartLines.length === 0 ? (
        <div className="empty-cart">
          <ShoppingBag size={34} strokeWidth={2.4} />
          <p>先选择一家商家点餐</p>
        </div>
      ) : (
        <div className="cart-lines">
          {cartLines.map((line) => (
            <div className="cart-line" key={line.cartKey}>
              <span>
                {line.name}
                {line.selectedOptions && line.selectedOptions.length > 0 && (
                  <small>{line.selectedOptions.map((option) => option.name).join(' / ')}</small>
                )}
              </span>
              <strong>
                x{line.quantity} · {formatMoney((line.unitPrice ?? line.price) * line.quantity)}
              </strong>
            </div>
          ))}
        </div>
      )}

      <div className="checkout-bar">
        <PriceRows orderPreview={orderPreview} />
        <button className="primary-button" disabled={!canCheckout} onClick={onCheckout} type="button">
          {canCheckout
            ? '去结算'
            : isWithinDeliveryRange
              ? `差 ${formatMoney(Math.max(minOrderAmount - orderPreview.itemsAmount, 0))} 起送`
              : '超出配送范围'}
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
          <div className="cart-line" key={line.cartKey ?? line.id}>
            <span>
              {line.name}
              {line.selectedOptions && line.selectedOptions.length > 0 && (
                <small>{line.selectedOptions.map((option) => option.name).join(' / ')}</small>
              )}
            </span>
            <strong>
              x{line.quantity} · {formatMoney((line.unitPrice ?? line.price) * line.quantity)}
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
    <aside className="panel cart-panel recent-panel">
      <div className="panel-heading">
        <h2>最近订单</h2>
        <span>{order.statusText}</span>
      </div>
      <div className="recent-order">
        <Store size={24} strokeWidth={2.4} />
        <div>
          <strong>{order.storeName}</strong>
          <p>
            {order.items
              .map((item) => {
                const optionsText =
                  item.selectedOptions && item.selectedOptions.length > 0
                    ? `（${item.selectedOptions.map((option) => option.name).join('/')}）`
                    : ''
                return `${item.name}${optionsText} x${item.quantity}`
              })
              .join('、')}
          </p>
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
