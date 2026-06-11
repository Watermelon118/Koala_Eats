import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Utensils,
} from 'lucide-react'
import { buildCartLines, formatMoney, getCartTotal } from '../../shared/format'
import { categories, stores } from '../../shared/mockData'
import type { Cart } from '../../shared/types'

function App() {
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
  const cartTotal = getCartTotal(cartLines)

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
          <span>搜索商家、菜品</span>
        </div>

        <div className="header-pill">
          <MapPin size={18} strokeWidth={2.4} />
          Auckland CBD
        </div>
      </header>

      <section className="customer-layout">
        <div className="panel">
          {selectedStore ? (
            <>
              <button className="back-button" onClick={() => setSelectedStoreId(null)} type="button">
                <ChevronLeft size={18} strokeWidth={2.4} />
                返回商家
              </button>

              <section className={`store-hero ${selectedStore.coverTone}`}>
                <div>
                  <p>{selectedStore.category}</p>
                  <h2>{selectedStore.name}</h2>
                  <span>
                    {selectedStore.rating} 分 · 月售 {selectedStore.monthlySales} ·{' '}
                    {selectedStore.deliveryMinutes} 分钟送达
                  </span>
                </div>
                <strong>{selectedStore.promotion}</strong>
              </section>

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
            </>
          ) : (
            <>
              <section className="customer-hero">
                <div>
                  <span>用户端</span>
                  <h2>先选商家，再进店点餐。</h2>
                  <p>附近商家、优惠活动、送达时间一眼可见。</p>
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
                  <button
                    className="store-card"
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    type="button"
                  >
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
                        {store.deliveryMinutes} 分钟 · 配送费 {formatMoney(store.deliveryFee)}
                      </p>
                      <span>{store.promotion}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

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
            <div>
              <span>合计</span>
              <strong>{formatMoney(cartTotal)}</strong>
            </div>
            <button className="primary-button" disabled={cartLines.length === 0} type="button">
              去结算
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
