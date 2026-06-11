import { useMemo, useState, type ComponentType } from 'react'
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Utensils,
  WalletCards,
} from 'lucide-react'
import './App.css'

type PortalKey = 'customer' | 'merchant' | 'rider' | 'admin'

type Portal = {
  key: PortalKey
  title: string
  subtitle: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  status: string
}

type StoreSummary = {
  id: string
  name: string
  category: string
  rating: number
  monthlySales: number
  deliveryMinutes: number
  deliveryFee: number
  distanceKm: number
  promotion: string
  coverTone: string
  menu: MenuItem[]
}

type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  monthlySales: number
  tag: string
}

type Cart = Record<string, number>

const portals: Portal[] = [
  {
    key: 'customer',
    title: '用户端',
    subtitle: '商家浏览、菜单点餐、购物车结算',
    icon: ShoppingBag,
    status: '正在细化',
  },
  {
    key: 'merchant',
    title: '商家端',
    subtitle: '店铺资料、菜品价格、订单处理',
    icon: Store,
    status: '首页骨架',
  },
  {
    key: 'rider',
    title: '骑手端',
    subtitle: '抢单接单、路线导航、状态上报',
    icon: Bike,
    status: '首页骨架',
  },
  {
    key: 'admin',
    title: '管理端',
    subtitle: '商家审核、账号管理、异常兜底',
    icon: ShieldCheck,
    status: '首页骨架',
  },
]

const categories = ['全部', '炸鸡汉堡', '米饭套餐', '奶茶咖啡', '日韩料理', '夜宵烧烤']

const stores: StoreSummary[] = [
  {
    id: 'store-koala-bowl',
    name: '考拉能量饭',
    category: '米饭套餐',
    rating: 4.8,
    monthlySales: 1320,
    deliveryMinutes: 28,
    deliveryFee: 2.99,
    distanceKm: 1.4,
    promotion: '满 $35 减 $6',
    coverTone: 'rice',
    menu: [
      {
        id: 'bowl-teriyaki',
        name: '照烧鸡腿饭',
        description: '去骨鸡腿、溏心蛋、时蔬、秘制照烧汁',
        price: 16.8,
        monthlySales: 420,
        tag: '招牌',
      },
      {
        id: 'bowl-beef',
        name: '黑椒牛肉饭',
        description: '嫩牛肉片、洋葱、青椒、黑椒酱',
        price: 18.5,
        monthlySales: 316,
        tag: '热卖',
      },
      {
        id: 'bowl-veggie',
        name: '南瓜素食饭',
        description: '烤南瓜、豆腐、玉米、芝麻酱',
        price: 14.2,
        monthlySales: 128,
        tag: '轻食',
      },
    ],
  },
  {
    id: 'store-burger',
    name: '金袋汉堡',
    category: '炸鸡汉堡',
    rating: 4.7,
    monthlySales: 2210,
    deliveryMinutes: 24,
    deliveryFee: 1.99,
    distanceKm: 0.9,
    promotion: '第二份半价',
    coverTone: 'burger',
    menu: [
      {
        id: 'burger-classic',
        name: '双层芝士牛堡',
        description: '双层牛肉饼、车达芝士、酸黄瓜',
        price: 15.9,
        monthlySales: 760,
        tag: '爆款',
      },
      {
        id: 'burger-chicken',
        name: '脆皮鸡腿堡',
        description: '整块鸡腿排、生菜、蜂蜜芥末酱',
        price: 13.8,
        monthlySales: 540,
        tag: '人气',
      },
      {
        id: 'fries-combo',
        name: '薯条可乐套餐',
        description: '大份薯条、无糖可乐、蒜香蘸酱',
        price: 8.8,
        monthlySales: 690,
        tag: '套餐',
      },
    ],
  },
  {
    id: 'store-milk-tea',
    name: '黄罐奶茶',
    category: '奶茶咖啡',
    rating: 4.9,
    monthlySales: 1880,
    deliveryMinutes: 18,
    deliveryFee: 0.99,
    distanceKm: 0.6,
    promotion: '新品立减 $2',
    coverTone: 'tea',
    menu: [
      {
        id: 'tea-boba',
        name: '黑糖珍珠鲜奶',
        description: '黑糖珍珠、鲜奶、轻冰默认',
        price: 7.6,
        monthlySales: 880,
        tag: '必点',
      },
      {
        id: 'tea-lemon',
        name: '鸭屎香柠檬茶',
        description: '现捣香水柠檬、凤凰单丛茶底',
        price: 7.2,
        monthlySales: 520,
        tag: '清爽',
      },
      {
        id: 'coffee-latte',
        name: '燕麦拿铁',
        description: '双份浓缩、燕麦奶、少糖',
        price: 6.9,
        monthlySales: 260,
        tag: '咖啡',
      },
    ],
  },
]

const merchantTasks = ['完善店铺地址', '上传菜品图片', '处理 12 个新订单']
const riderTasks = ['查看附近可接单', '上传当前位置', '完成 4 单配送中订单']
const adminTasks = ['审核 7 家新店', '处理 2 个异常订单', '检查骑手在线热力']

function App() {
  const [activePortal, setActivePortal] = useState<PortalKey>('customer')

  return (
    <main className="app-shell">
      <AppHeader />
      <PortalSwitcher activePortal={activePortal} onSelectPortal={setActivePortal} />

      {activePortal === 'customer' && <CustomerPortal />}
      {activePortal === 'merchant' && (
        <RoleHome
          icon={Store}
          title="商家工作台"
          subtitle="维护店铺、管理菜品、处理订单。"
          metricLabel="待接单"
          metricValue="12"
          tasks={merchantTasks}
        />
      )}
      {activePortal === 'rider' && (
        <RoleHome
          icon={Bike}
          title="骑手工作台"
          subtitle="接单配送、查看路线、上报状态。"
          metricLabel="今日收入"
          metricValue="$86"
          tasks={riderTasks}
        />
      )}
      {activePortal === 'admin' && (
        <RoleHome
          icon={ShieldCheck}
          title="平台管理台"
          subtitle="审核商家、管理账号、人工兜底派单。"
          metricLabel="待处理"
          metricValue="7"
          tasks={adminTasks}
        />
      )}
    </main>
  )
}

function AppHeader() {
  return (
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
        <span>搜索商家、菜品</span>
      </div>

      <button className="location-button" type="button">
        <MapPin size={18} strokeWidth={2.4} />
        Auckland CBD
      </button>
    </section>
  )
}

function PortalSwitcher({
  activePortal,
  onSelectPortal,
}: {
  activePortal: PortalKey
  onSelectPortal: (portal: PortalKey) => void
}) {
  return (
    <nav className="portal-switcher" aria-label="客户端入口">
      {portals.map((portal) => {
        const Icon = portal.icon
        const isActive = portal.key === activePortal

        return (
          <button
            className={isActive ? 'active' : ''}
            key={portal.key}
            onClick={() => onSelectPortal(portal.key)}
            type="button"
          >
            <Icon size={20} strokeWidth={2.4} />
            <span>
              <strong>{portal.title}</strong>
              <small>{portal.status}</small>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function CustomerPortal() {
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart>({})

  const filteredStores = useMemo(() => {
    if (selectedCategory === '全部') {
      return stores
    }

    return stores.filter((store) => store.category === selectedCategory)
  }, [selectedCategory])

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null
  const cartLines = buildCartLines(cart)
  const cartTotal = cartLines.reduce((total, line) => total + line.price * line.quantity, 0)

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

  if (selectedStore) {
    return (
      <section className="customer-layout">
        <div className="store-detail">
          <button className="back-button" onClick={() => setSelectedStoreId(null)} type="button">
            <ChevronLeft size={18} strokeWidth={2.4} />
            返回商家
          </button>

          <div className={`store-hero ${selectedStore.coverTone}`}>
            <div>
              <p>{selectedStore.category}</p>
              <h2>{selectedStore.name}</h2>
              <span>
                {selectedStore.rating} 分 · 月售 {selectedStore.monthlySales} ·{' '}
                {selectedStore.deliveryMinutes} 分钟送达
              </span>
            </div>
            <strong>{selectedStore.promotion}</strong>
          </div>

          <div className="menu-list">
            {selectedStore.menu.map((item) => {
              const quantity = cart[item.id] ?? 0

              return (
                <article className="menu-item" key={item.id}>
                  <div className="dish-thumb">
                    <Utensils size={24} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div className="item-title-row">
                      <h3>{item.name}</h3>
                      <span>{item.tag}</span>
                    </div>
                    <p>{item.description}</p>
                    <small>月售 {item.monthlySales}</small>
                    <div className="price-row">
                      <strong>${item.price.toFixed(2)}</strong>
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

        <CartPanel cartLines={cartLines} cartTotal={cartTotal} />
      </section>
    )
  }

  return (
    <section className="customer-layout">
      <div className="store-browser">
        <section className="customer-hero">
          <div>
            <span>用户端首页</span>
            <h2>先选商家，再进店点餐。</h2>
            <p>模拟真实外卖平台：首页展示附近商家、优惠、预计送达时间。</p>
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
          {filteredStores.map((store) => (
            <button className="store-card" key={store.id} onClick={() => setSelectedStoreId(store.id)} type="button">
              <div className={`store-cover ${store.coverTone}`}>
                <Utensils size={26} strokeWidth={2.4} />
              </div>
              <div className="store-info">
                <div className="store-title-row">
                  <h3>{store.name}</h3>
                  <ChevronRight size={18} strokeWidth={2.4} />
                </div>
                <p>
                  {store.rating} 分 · 月售 {store.monthlySales} · {store.distanceKm} km
                </p>
                <p>
                  {store.deliveryMinutes} 分钟 · 配送费 ${store.deliveryFee.toFixed(2)}
                </p>
                <span>{store.promotion}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <CartPanel cartLines={cartLines} cartTotal={cartTotal} />
    </section>
  )
}

function CartPanel({ cartLines, cartTotal }: { cartLines: CartLine[]; cartTotal: number }) {
  return (
    <aside className="cart-panel">
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
                x{line.quantity} · ${(line.price * line.quantity).toFixed(2)}
              </strong>
            </div>
          ))}
        </div>
      )}

      <div className="checkout-bar">
        <div>
          <span>合计</span>
          <strong>${cartTotal.toFixed(2)}</strong>
        </div>
        <button disabled={cartLines.length === 0} type="button">
          去结算
        </button>
      </div>
    </aside>
  )
}

type CartLine = MenuItem & { quantity: number }

function buildCartLines(cart: Cart): CartLine[] {
  return stores.flatMap((store) =>
    store.menu
      .filter((item) => cart[item.id] > 0)
      .map((item) => ({
        ...item,
        quantity: cart[item.id],
      })),
  )
}

function RoleHome({
  icon: Icon,
  title,
  subtitle,
  metricLabel,
  metricValue,
  tasks,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  title: string
  subtitle: string
  metricLabel: string
  metricValue: string
  tasks: string[]
}) {
  return (
    <section className="role-home">
      <div className="role-hero">
        <div className="portal-icon large">
          <Icon size={32} strokeWidth={2.4} />
        </div>
        <div>
          <p className="eyebrow">Coming next</p>
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <strong>{metricValue}</strong>
        <small>{metricLabel}</small>
      </div>

      <div className="task-grid">
        {tasks.map((task) => (
          <article key={task}>
            <PackageCheck size={18} strokeWidth={2.4} />
            <span>{task}</span>
          </article>
        ))}
      </div>

      <div className="role-note">
        <ClipboardCheck size={20} strokeWidth={2.4} />
        <p>当前先完成用户端下单主链路，后续再按商家端、骑手端、管理端顺序细化。</p>
        <WalletCards size={20} strokeWidth={2.4} />
      </div>
    </section>
  )
}

export default App
