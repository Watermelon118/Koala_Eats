import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  Flame,
  Home,
  LocateFixed,
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
  Timer,
  Utensils,
  UserRound,
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
import { categories, customerAddresses, initialMockBusinessState, stores } from '../../shared/mockData'
import { GoogleAddressAutocomplete } from '../../shared/GoogleAddressAutocomplete'
import { GoogleDeliveryMap } from '../../shared/GoogleDeliveryMap'
import { AuthGate } from '../../shared/auth'
import type {
  Cart,
  CartLine,
  CustomerAddress,
  CustomerOrderStatus,
  GoogleResolvedAddress,
  MenuItem,
  SelectedMenuOption,
  SelectedOptionsByItem,
  StoreSummary,
} from '../../shared/types'
import { useMockBusinessState } from '../../shared/useMockBusinessState'

type CustomerView =
  | 'stores'
  | 'store'
  | 'cart'
  | 'checkout'
  | 'payment'
  | 'tracking'
  | 'orders'
  | 'profile'
  | 'addresses'
  | 'support'
  | 'reviews'
  | 'settings'

type OrderFilter = 'all' | 'review' | 'afterSales'

type SupportRecord = {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
}

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
  { label: '美食', icon: Utensils, tone: 'yellow' },
  { label: '快餐', icon: Flame, tone: 'red' },
  { label: '甜品饮品', icon: WalletCards, tone: 'green' },
  { label: '准时达', icon: Timer, tone: 'blue' },
  { label: '放心吃', icon: ShieldCheck, tone: 'purple' },
]

const PAYMENT_TIMEOUT_SECONDS = 15 * 60

function App() {
  return (
    <AuthGate productName="考拉外卖用户端" role="Customer">
      <CustomerApp />
    </AuthGate>
  )
}

function CustomerApp() {
  const { errorMessage, setState: setMockState, state: mockState } =
    useMockBusinessState(initialMockBusinessState)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0].id)
  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState(stores[0].menuCategories[0].id)
  const [cartsByStore, setCartsByStore] = useState<Record<string, Cart>>({})
  const [selectedOptionsByItem, setSelectedOptionsByItem] = useState<SelectedOptionsByItem>({})
  const [view, setView] = useState<CustomerView>('stores')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>(customerAddresses)
  const [selectedAddressId, setSelectedAddressId] = useState(customerAddresses[0].id)
  const [googleAddress, setGoogleAddress] = useState<CustomerAddress | null>(null)
  const [addressDraft, setAddressDraft] = useState({
    addressLine: '',
    detail: '',
    label: '公司',
    phoneMasked: customerAddresses[0].phoneMasked,
    receiverName: customerAddresses[0].receiverName,
  })
  const [supportRecords, setSupportRecords] = useState<SupportRecord[]>([])
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({})
  const [settings, setSettings] = useState({
    contactlessDelivery: true,
    orderNotifications: true,
  })
  const [remark, setRemark] = useState('少盐，不要葱')
  const [createdOrderId, setCreatedOrderId] = useState('')
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(PAYMENT_TIMEOUT_SECONDS)

  const filteredStores = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const matchingStores =
      selectedCategory === '全部'
        ? stores
        : stores.filter((storeItem) => storeItem.category === selectedCategory)

    const searchedStores = normalizedQuery
      ? matchingStores.filter((storeItem) => {
          const menuText = storeItem.menu.map((item) => `${item.name} ${item.description}`).join(' ')
          return `${storeItem.name} ${storeItem.category} ${menuText}`.toLowerCase().includes(normalizedQuery)
        })
      : matchingStores

    return [...searchedStores].sort((firstStore, secondStore) => {
      if (firstStore.deliveryMinutes !== secondStore.deliveryMinutes) {
        return firstStore.deliveryMinutes - secondStore.deliveryMinutes
      }

      return secondStore.monthlySales - firstStore.monthlySales
    })
  }, [searchQuery, selectedCategory])

  const selectedStore = stores.find((storeItem) => storeItem.id === selectedStoreId) ?? stores[0]
  const selectedAddress =
    selectedAddressId === 'google-address' && googleAddress
      ? googleAddress
      : savedAddresses.find((address) => address.id === selectedAddressId) ?? savedAddresses[0]
  const visibleMenu = selectedStore.menu.filter((item) => item.categoryId === activeMenuCategoryId)
  const cart = cartsByStore[selectedStoreId] ?? {}
  const cartLines = buildCartLines(cart, selectedStore.menu)
  const cartQuantity = cartLines.reduce((total, line) => total + line.quantity, 0)
  const cartGroups = useMemo(
    () =>
      stores
        .map((storeItem) => {
          const lines = buildCartLines(cartsByStore[storeItem.id] ?? {}, storeItem.menu)
          const orderPricePreview = calculateOrderPreview(lines, storeItem, null)
          const quantity = lines.reduce((total, line) => total + line.quantity, 0)
          const isDeliverable =
            calculateDistanceKm(storeItem.location, selectedAddress.coordinates) <= storeItem.deliveryRadiusKm

          return {
            canCheckout:
              lines.length > 0 &&
              orderPricePreview.itemsAmount >= storeItem.minOrderAmount &&
              isDeliverable,
            isDeliverable,
            lines,
            orderPreview: orderPricePreview,
            quantity,
            store: storeItem,
          }
        })
        .filter((group) => group.lines.length > 0),
    [cartsByStore, selectedAddress.coordinates],
  )
  const totalCartQuantity = cartGroups.reduce((total, group) => total + group.quantity, 0)
  const totalCartAmount = cartGroups.reduce((total, group) => total + group.orderPreview.totalAmount, 0)
  const filteredOrders = mockState.customerOrders.filter((order) => {
    if (orderFilter === 'review') {
      return order.status === 'Completed'
    }

    if (orderFilter === 'afterSales') {
      return ['Canceled', 'Refunded', 'Rejected'].includes(order.status)
    }

    return true
  })
  const deliveryDistanceKm = calculateDistanceKm(selectedStore.location, selectedAddress.coordinates)
  const isWithinDeliveryRange = deliveryDistanceKm <= selectedStore.deliveryRadiusKm
  const orderPreview = calculateOrderPreview(cartLines, selectedStore, null)
  const canCheckout =
    cartLines.length > 0 &&
    orderPreview.itemsAmount >= selectedStore.minOrderAmount &&
    isWithinDeliveryRange
  const orderToShow =
    mockState.customerOrders.find((order) => order.id === createdOrderId) ??
    mockState.customerOrders[0] ??
    initialMockBusinessState.customerOrders[0]
  const orderStore = stores.find((storeItem) => storeItem.id === orderToShow.storeId) ?? selectedStore
  const hasAssignedRider = [
    'RiderAccepted',
    'RiderArrivedStore',
    'RiderPickedUp',
    'Delivering',
    'Completed',
  ].includes(orderToShow.status)

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
    setView('store')
  }

  function selectShortcut(categoryLabel: string) {
    const categoryByShortcut: Record<string, string> = {
      快餐: '炸鸡汉堡',
      甜品饮品: '奶茶咖啡',
      美食: '全部',
      准时达: '全部',
      放心吃: '全部',
    }

    setSelectedCategory(categoryByShortcut[categoryLabel] ?? '全部')
    setSearchQuery('')
  }

  function updateQuantity(item: MenuItem, quantityDelta: number) {
    const selectedOptions = selectedOptionsByItem[item.id] ?? getDefaultSelectedOptions(item)

    updateStoreCartQuantity(selectedStoreId, item, selectedOptions, quantityDelta)
  }

  function updateStoreCartQuantity(
    storeId: string,
    item: MenuItem | CartLine,
    selectedOptions: SelectedMenuOption[],
    quantityDelta: number,
  ) {
    const cartKey = getCartKey(item.id, selectedOptions)

    setCartsByStore((currentCartsByStore) => {
      const currentStoreCart = currentCartsByStore[storeId] ?? {}
      const currentEntry = currentStoreCart[cartKey]
      const nextQuantity = Math.max((currentEntry?.quantity ?? 0) + quantityDelta, 0)
      const nextStoreCart = { ...currentStoreCart }

      if (nextQuantity === 0) {
        delete nextStoreCart[cartKey]
      } else {
        nextStoreCart[cartKey] = {
          itemId: item.id,
          quantity: nextQuantity,
          selectedOptions,
        }
      }

      const nextCartsByStore = { ...currentCartsByStore }

      if (Object.keys(nextStoreCart).length === 0) {
        delete nextCartsByStore[storeId]
      } else {
        nextCartsByStore[storeId] = nextStoreCart
      }

      return nextCartsByStore
    })
  }

  function openCartStoreCheckout(storeId: string) {
    const nextStore = stores.find((storeItem) => storeItem.id === storeId) ?? stores[0]
    setSelectedStoreId(storeId)
    setActiveMenuCategoryId(nextStore.menuCategories[0].id)
    setView('checkout')
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
    setCartsByStore((currentCartsByStore) => {
      const nextCartsByStore = { ...currentCartsByStore }
      delete nextCartsByStore[selectedStore.id]
      return nextCartsByStore
    })
    setPaymentSecondsLeft(PAYMENT_TIMEOUT_SECONDS)
    setView('payment')
  }

  async function simulatePayment() {
    if (!createdOrderId || orderToShow.status !== 'PendingPayment') {
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
    setAddressDraft((currentDraft) => ({
      ...currentDraft,
      addressLine: address.formattedAddress,
      detail: address.displayName,
    }))
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

  function saveManualAddress() {
    const trimmedAddressLine = addressDraft.addressLine.trim()
    if (!trimmedAddressLine && !googleAddress) {
      return
    }

    const nextAddress = {
      addressLine: trimmedAddressLine || googleAddress?.addressLine || selectedAddress.addressLine,
      coordinates: googleAddress?.coordinates ?? selectedAddress.coordinates,
      detail: addressDraft.detail.trim() || googleAddress?.detail || '门口',
      id: `address-${Date.now()}`,
      label: addressDraft.label.trim() || '收货地址',
      phoneMasked: addressDraft.phoneMasked.trim() || customerAddresses[0].phoneMasked,
      receiverName: addressDraft.receiverName.trim() || customerAddresses[0].receiverName,
    }

    setSavedAddresses((currentAddresses) => [nextAddress, ...currentAddresses])
    setSelectedAddressId(nextAddress.id)
    setAddressDraft((currentDraft) => ({
      ...currentDraft,
      addressLine: '',
      detail: '',
      label: '公司',
    }))
  }

  function deleteAddress(addressId: string) {
    const nextAddresses = savedAddresses.filter((address) => address.id !== addressId)
    setSavedAddresses(nextAddresses)

    if (selectedAddressId === addressId) {
      setSelectedAddressId(nextAddresses[0]?.id ?? googleAddress?.id ?? customerAddresses[0].id)
    }
  }

  function createSupportRecord(title: string, description: string) {
    const nextRecord = {
      createdAt: '刚刚',
      description,
      id: `support-${Date.now()}`,
      status: '待客服回复',
      title,
    }

    setSupportRecords((currentRecords) => [nextRecord, ...currentRecords])
  }

  function submitReview(orderId: string) {
    setReviewRatings((currentRatings) => ({
      ...currentRatings,
      [orderId]: currentRatings[orderId] ?? 5,
    }))
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
      {view === 'stores' && (
        <header className="customer-topbar">
          <button className="location-button" onClick={() => setView('addresses')} type="button">
            <MapPin size={18} strokeWidth={2.5} />
            {selectedAddress.label}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
          <label className="search-field">
            <Search size={18} strokeWidth={2.4} />
            <input
              aria-label="搜索商家、菜品"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索商家、菜品"
            />
          </label>
          <button className="round-tool" onClick={() => setView('addresses')} type="button" aria-label="定位">
            <LocateFixed size={19} strokeWidth={2.4} />
          </button>
        </header>
      )}

      {errorMessage && <div className="mock-alert">Mock API 未连接：{errorMessage}</div>}

      {view === 'stores' && (
        <section className="customer-home">
          <div className="feed-column">
            <div className="home-title">
              <h1>附近商家</h1>
              <span>按商家点餐，购物车会为每家店单独保留。</span>
            </div>

            <section className="shortcut-grid" aria-label="快捷分类">
              {shortcutItems.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    className={`shortcut ${item.tone}`}
                    key={item.label}
                    onClick={() => selectShortcut(item.label)}
                    type="button"
                  >
                    <span>
                      <Icon size={22} strokeWidth={2.4} />
                    </span>
                    {item.label}
                  </button>
                )
              })}
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
              {filteredStores.length > 0 ? (
                filteredStores.map((storeItem, index) => (
                  <StoreCard
                    cartQuantity={Object.values(cartsByStore[storeItem.id] ?? {}).reduce(
                      (total, entry) => total + entry.quantity,
                      0,
                    )}
                    key={storeItem.id}
                    onOpenStore={openStore}
                    rank={index + 1}
                    store={storeItem}
                  />
                ))
              ) : (
                <div className="empty-search">没有找到匹配的商家或菜品</div>
              )}
            </div>
          </div>
        </section>
      )}

      {view === 'orders' && (
        <section className="mobile-page orders-page">
          <header className="mobile-page-header">
            <h1>订单</h1>
            <div>
              <button className="icon-only-button" onClick={() => setOrderFilter('all')} type="button" aria-label="全部订单">
                <Search size={22} strokeWidth={2.4} />
              </button>
              <button className="icon-only-button" onClick={() => setView('support')} type="button" aria-label="咨询记录">
                <MessageSquareText size={22} strokeWidth={2.4} />
              </button>
            </div>
          </header>

          <div className="order-filter-row">
            <button className={orderFilter === 'all' ? 'active' : ''} onClick={() => setOrderFilter('all')} type="button">
              全部订单
            </button>
            <button className={orderFilter === 'review' ? 'active' : ''} onClick={() => setOrderFilter('review')} type="button">
              待评价
            </button>
            <button
              className={orderFilter === 'afterSales' ? 'active' : ''}
              onClick={() => setOrderFilter('afterSales')}
              type="button"
            >
              退款/售后
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <section className="order-empty">
              <ClipboardList size={78} strokeWidth={1.6} />
              <strong>{orderFilter === 'all' ? '一个订单都没有哦' : '当前分类暂无订单'}</strong>
              <span>{orderFilter === 'all' ? '先去附近商家下一单' : '可以切换到全部订单查看历史记录'}</span>
              <button className="primary-button" onClick={() => setOrderFilter('all')} type="button">
                查看全部
              </button>
            </section>
          ) : (
            <div className="order-history-list">
              {filteredOrders.map((order) => (
                <article key={order.id}>
                  <div>
                    <strong>{order.storeName}</strong>
                    <span>{statusTextByStatus[order.status] ?? order.statusText}</span>
                  </div>
                  <p>{order.items.map((item) => `${item.name} x${item.quantity}`).join('、')}</p>
                  <footer>
                    <span>{order.id}</span>
                    <strong>{formatMoney(order.price.totalAmount)}</strong>
                  </footer>
                  <button
                    className="light-button"
                    onClick={() => {
                      setCreatedOrderId(order.id)
                      setView('tracking')
                    }}
                    type="button"
                  >
                    查看详情
                  </button>
                  {order.status === 'Completed' && (
                    <button className="light-button" onClick={() => setView('reviews')} type="button">
                      去评价
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {view === 'profile' && (
        <section className="mobile-page profile-page">
          <header className="profile-header">
            <div className="profile-avatar">考</div>
            <div>
              <h1>Shuaijie</h1>
              <span>用户端演示账号</span>
            </div>
            <button className="round-tool light" onClick={() => setView('settings')} type="button" aria-label="设置">
              <SlidersHorizontal size={19} strokeWidth={2.4} />
            </button>
          </header>

          <section className="profile-card">
            <h2>我的资产</h2>
            <div className="asset-grid">
              <article>
                <strong>{savedAddresses.length}</strong>
                <span>地址</span>
              </article>
              <article>
                <strong>{mockState.customerOrders.length}</strong>
                <span>订单</span>
              </article>
              <article>
                <strong>{Object.keys(cartsByStore).length}</strong>
                <span>购物车</span>
              </article>
            </div>
          </section>

          <section className="profile-card">
            <h2>我的功能</h2>
            <div className="profile-actions">
              <button onClick={() => setView('addresses')} type="button">
                <MapPin size={22} strokeWidth={2.4} />
                我的地址
              </button>
              <button onClick={() => setView('orders')} type="button">
                <ClipboardList size={22} strokeWidth={2.4} />
                全部订单
              </button>
              <button onClick={() => setView('support')} type="button">
                <MessageSquareText size={22} strokeWidth={2.4} />
                咨询记录
              </button>
              <button onClick={() => setView('reviews')} type="button">
                <Star size={22} strokeWidth={2.4} />
                我的评价
              </button>
            </div>
          </section>
        </section>
      )}

      {view === 'addresses' && (
        <section className="mobile-page utility-page">
          <header className="mobile-page-header">
            <button className="back-button" onClick={() => setView('profile')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回我的
            </button>
            <h1>地址管理</h1>
          </header>

          <section className="profile-card address-manager">
            <h2>新增地址</h2>
            <GoogleAddressAutocomplete
              label="搜索 New Zealand 收货地址"
              onSelect={selectGoogleAddress}
              placeholder="输入街道、门牌号、区域"
            />
            <div className="address-editor always-open">
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
                地址
                <input
                  value={addressDraft.addressLine}
                  onChange={(event) =>
                    setAddressDraft((currentDraft) => ({ ...currentDraft, addressLine: event.target.value }))
                  }
                  placeholder="例如 12 Queen Street"
                />
              </label>
              <label>
                门牌/楼层
                <input
                  value={addressDraft.detail}
                  onChange={(event) =>
                    setAddressDraft((currentDraft) => ({ ...currentDraft, detail: event.target.value }))
                  }
                />
              </label>
              <label>
                联系人
                <input
                  value={addressDraft.receiverName}
                  onChange={(event) =>
                    setAddressDraft((currentDraft) => ({ ...currentDraft, receiverName: event.target.value }))
                  }
                />
              </label>
              <label>
                电话
                <input
                  value={addressDraft.phoneMasked}
                  onChange={(event) =>
                    setAddressDraft((currentDraft) => ({ ...currentDraft, phoneMasked: event.target.value }))
                  }
                />
              </label>
              <button
                className="primary-button"
                disabled={!addressDraft.addressLine.trim() && !googleAddress}
                onClick={saveManualAddress}
                type="button"
              >
                保存地址
              </button>
            </div>
          </section>

          <section className="profile-card">
            <h2>已保存地址</h2>
            <div className="managed-address-list">
              {savedAddresses.map((address) => (
                <article className={selectedAddressId === address.id ? 'selected' : ''} key={address.id}>
                  <div>
                    <strong>
                      {address.label} · {address.receiverName}
                    </strong>
                    <span>{address.phoneMasked}</span>
                    <p>{address.addressLine}</p>
                    <small>{address.detail}</small>
                  </div>
                  <footer>
                    <button onClick={() => setSelectedAddressId(address.id)} type="button">
                      {selectedAddressId === address.id ? '默认地址' : '设为默认'}
                    </button>
                    <button disabled={savedAddresses.length <= 1} onClick={() => deleteAddress(address.id)} type="button">
                      删除
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {view === 'support' && (
        <section className="mobile-page utility-page">
          <header className="mobile-page-header">
            <button className="back-button" onClick={() => setView('profile')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回我的
            </button>
            <h1>咨询记录</h1>
          </header>

          <section className="profile-card support-actions">
            <h2>快速咨询</h2>
            <button
              onClick={() => createSupportRecord('联系商家', `关于 ${orderToShow.storeName} 的订单咨询`)}
              type="button"
            >
              <Store size={22} strokeWidth={2.4} />
              联系商家
            </button>
            <button
              onClick={() => createSupportRecord('配送问题', '已记录配送进度或骑手联系问题')}
              type="button"
            >
              <Navigation size={22} strokeWidth={2.4} />
              配送问题
            </button>
            <button
              onClick={() => createSupportRecord('退款/售后', '已提交订单售后咨询')}
              type="button"
            >
              <MessageSquareText size={22} strokeWidth={2.4} />
              退款/售后
            </button>
          </section>

          <section className="profile-card">
            <h2>记录</h2>
            {supportRecords.length === 0 ? (
              <div className="quiet-empty">暂无咨询记录，可以先用上方入口创建一条。</div>
            ) : (
              <div className="support-record-list">
                {supportRecords.map((record) => (
                  <article key={record.id}>
                    <strong>{record.title}</strong>
                    <p>{record.description}</p>
                    <span>
                      {record.status} · {record.createdAt}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      )}

      {view === 'reviews' && (
        <section className="mobile-page utility-page">
          <header className="mobile-page-header">
            <button className="back-button" onClick={() => setView('profile')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回我的
            </button>
            <h1>我的评价</h1>
          </header>

          <section className="profile-card review-list">
            {mockState.customerOrders.length === 0 ? (
              <div className="quiet-empty">暂无可评价订单。</div>
            ) : (
              mockState.customerOrders.slice(0, 4).map((order) => {
                const rating = reviewRatings[order.id] ?? 0

                return (
                  <article key={order.id}>
                    <div>
                      <strong>{order.storeName}</strong>
                      <span>{order.id}</span>
                    </div>
                    <div className="rating-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          className={star <= rating ? 'active' : ''}
                          key={star}
                          onClick={() =>
                            setReviewRatings((currentRatings) => ({ ...currentRatings, [order.id]: star }))
                          }
                          type="button"
                        >
                          <Star size={20} fill="currentColor" strokeWidth={0} />
                        </button>
                      ))}
                    </div>
                    <button className="light-button" onClick={() => submitReview(order.id)} type="button">
                      {rating > 0 ? `已保存 ${rating} 星评价` : '保存评价'}
                    </button>
                  </article>
                )
              })
            )}
          </section>
        </section>
      )}

      {view === 'settings' && (
        <section className="mobile-page utility-page">
          <header className="mobile-page-header">
            <button className="back-button" onClick={() => setView('profile')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回我的
            </button>
            <h1>设置</h1>
          </header>

          <section className="profile-card settings-list">
            <button
              className={settings.orderNotifications ? 'enabled' : ''}
              onClick={() =>
                setSettings((currentSettings) => ({
                  ...currentSettings,
                  orderNotifications: !currentSettings.orderNotifications,
                }))
              }
              type="button"
            >
              <span>订单通知</span>
              <strong>{settings.orderNotifications ? '已开启' : '已关闭'}</strong>
            </button>
            <button
              className={settings.contactlessDelivery ? 'enabled' : ''}
              onClick={() =>
                setSettings((currentSettings) => ({
                  ...currentSettings,
                  contactlessDelivery: !currentSettings.contactlessDelivery,
                }))
              }
              type="button"
            >
              <span>无接触配送偏好</span>
              <strong>{settings.contactlessDelivery ? '已开启' : '已关闭'}</strong>
            </button>
          </section>
        </section>
      )}

      {view === 'cart' && (
        <section className="cart-page">
          <header className="cart-page-header">
            <button className="back-button" onClick={() => setView('stores')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回外卖
            </button>
            <div>
              <h1>购物车</h1>
              <span>{totalCartQuantity} 件商品，按商家分组结算</span>
            </div>
          </header>

          {cartGroups.length === 0 ? (
            <section className="cart-empty-page">
              <ShoppingBag size={58} strokeWidth={1.8} />
              <strong>购物车还是空的</strong>
              <span>先从附近商家选择想吃的菜品。</span>
              <button className="primary-button" onClick={() => setView('stores')} type="button">
                去点餐
              </button>
            </section>
          ) : (
            <>
              <div className="cart-group-list">
                {cartGroups.map((group) => (
                  <article className="cart-group" key={group.store.id}>
                    <header>
                      <button onClick={() => openStore(group.store.id)} type="button">
                        <Store size={19} strokeWidth={2.4} />
                        {group.store.name}
                        <ChevronRight size={16} strokeWidth={2.4} />
                      </button>
                      <span>
                        {formatMinutes(group.store.deliveryMinutes)} · {formatDistance(group.store.distanceKm)}
                      </span>
                    </header>

                    <div className="cart-item-list">
                      {group.lines.map((line) => (
                        <div className="cart-page-line" key={line.cartKey}>
                          <FoodVisual tone={line.imageTone} />
                          <div>
                            <strong>{line.name}</strong>
                            {line.selectedOptions && line.selectedOptions.length > 0 && (
                              <span>{line.selectedOptions.map((option) => option.name).join(' / ')}</span>
                            )}
                            <p>{formatMoney((line.unitPrice ?? line.price) * line.quantity)}</p>
                          </div>
                          <div className="quantity-control">
                            <button
                              onClick={() =>
                                updateStoreCartQuantity(group.store.id, line, line.selectedOptions ?? [], -1)
                              }
                              type="button"
                            >
                              <Minus size={16} strokeWidth={2.6} />
                            </button>
                            <span>{line.quantity}</span>
                            <button
                              disabled={!line.isAvailable || line.stock <= 0}
                              onClick={() =>
                                updateStoreCartQuantity(group.store.id, line, line.selectedOptions ?? [], 1)
                              }
                              type="button"
                            >
                              <Plus size={16} strokeWidth={2.6} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <footer>
                      <div>
                        <span>小计</span>
                        <strong>{formatMoney(group.orderPreview.totalAmount)}</strong>
                      </div>
                      <button
                        className="primary-button"
                        disabled={!group.canCheckout}
                        onClick={() => openCartStoreCheckout(group.store.id)}
                        type="button"
                      >
                        {group.canCheckout
                          ? '去结算'
                          : group.isDeliverable
                            ? `差 ${formatMoney(Math.max(group.store.minOrderAmount - group.orderPreview.itemsAmount, 0))} 起送`
                            : '超出配送范围'}
                      </button>
                    </footer>
                  </article>
                ))}
              </div>

              <footer className="cart-total-bar">
                <span>合计</span>
                <strong>{formatMoney(totalCartAmount)}</strong>
                <small>不同商家需要分别结算</small>
              </footer>
            </>
          )}
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
              <strong>
                起送 {formatMoney(selectedStore.minOrderAmount)} · 配送费 {formatMoney(selectedStore.deliveryFee)}
              </strong>
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
            {orderToShow.status === 'PendingPayment' ? (
              <>
                <button className="primary-button" onClick={simulatePayment} type="button">
                  <CreditCard size={18} strokeWidth={2.4} />
                  确认模拟支付 {formatMoney(orderToShow.price.totalAmount)}
                </button>
                <button className="light-button" onClick={() => void cancelOrder()} type="button">
                  取消订单
                </button>
              </>
            ) : (
              <button className="light-button" onClick={() => setView('orders')} type="button">
                订单已{orderToShow.status === 'Canceled' ? '取消' : statusTextByStatus[orderToShow.status]}，查看订单
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
            <button className="back-button" onClick={() => setView('stores')} type="button">
              <ChevronLeft size={18} strokeWidth={2.4} />
              返回首页
            </button>
            <div className="panel-heading">
              <h2>{statusTextByStatus[orderToShow.status] ?? orderToShow.statusText}</h2>
              <span>{orderToShow.id}</span>
            </div>
            {['PendingPayment', 'PendingMerchantAccept'].includes(orderToShow.status) && (
              <button className="light-button tracking-action" onClick={() => void cancelOrder()} type="button">
                取消订单
              </button>
            )}

            <div className="map-card">
              <GoogleDeliveryMap
                dropoffLocation={orderToShow.address.coordinates}
                pickupLocation={orderStore.location}
                riderLocation={orderToShow.riderLocation}
              />
            </div>

            <div className="tracking-meta">
              <article>
                {hasAssignedRider ? (
                  <Navigation size={20} strokeWidth={2.4} />
                ) : (
                  <Store size={20} strokeWidth={2.4} />
                )}
                <div>
                  {hasAssignedRider ? (
                    <>
                      <strong>{orderToShow.riderName} 正在配送</strong>
                      <span>
                        预计 {orderToShow.estimatedArrivalMinutes} 分钟送达 · {orderToShow.riderPhoneMasked}
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>{orderToShow.storeName} 正在处理订单</strong>
                      <span>商家接单并分配骑手后，这里会显示骑手和配送进度。</span>
                    </>
                  )}
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

      {['stores', 'store'].includes(view) && (
        <button
          className={`floating-cart-button ${view === 'store' ? 'store-floating-cart' : ''}`}
          onClick={() => setView('cart')}
          type="button"
        >
          <ShoppingBag size={24} strokeWidth={2.5} />
          <span>{totalCartQuantity}</span>
          <strong>{totalCartQuantity > 0 ? formatMoney(totalCartAmount) : '购物车'}</strong>
        </button>
      )}

      {['stores', 'orders', 'profile'].includes(view) && (
        <nav className="customer-bottom-nav" aria-label="用户端主导航">
          <button className={view === 'stores' ? 'active' : ''} onClick={() => setView('stores')} type="button">
            <ShoppingBag size={24} strokeWidth={2.4} />
            外卖
          </button>
          <button className={view === 'orders' ? 'active' : ''} onClick={() => setView('orders')} type="button">
            <ClipboardList size={24} strokeWidth={2.4} />
            订单
          </button>
          <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')} type="button">
            <UserRound size={24} strokeWidth={2.4} />
            我的
          </button>
        </nav>
      )}
    </main>
  )
}

type StoreCardProps = {
  cartQuantity: number
  onOpenStore: (storeId: string) => void
  rank: number
  store: StoreSummary
}

function StoreCard({ cartQuantity, onOpenStore, rank, store }: StoreCardProps) {
  return (
    <button className="store-card" onClick={() => onOpenStore(store.id)} type="button">
      <FoodVisual tone={store.coverTone} />
      <div className="store-info">
        <div className="store-title-row">
          <h3>{store.name}</h3>
          <span className="rank-badge">{cartQuantity > 0 ? `购物车 ${cartQuantity} 件` : `附近第 ${rank}`}</span>
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
          <span>起送 {formatMoney(store.minOrderAmount)}</span>
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
      <div className="total-row">
        <span>合计</span>
        <strong>{formatMoney(orderPreview.totalAmount)}</strong>
      </div>
    </div>
  )
}

export default App
