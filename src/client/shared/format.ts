import type { Cart, CartLine, Coupon, MenuItem, OrderPricePreview, StoreSummary } from './types'
import { stores } from './mockData'

const PACKAGING_FEE_PER_LINE = 0.4

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function buildCartLines(cart: Cart, menuItems?: MenuItem[]): CartLine[] {
  const sourceMenuItems = menuItems ?? stores.flatMap((store) => store.menu)

  return sourceMenuItems
    .filter((item) => cart[item.id] > 0)
    .map((item) => ({
      ...item,
      quantity: cart[item.id],
    }))
}

export function getCartTotal(cartLines: CartLine[]): number {
  return cartLines.reduce((total, line) => total + line.price * line.quantity, 0)
}

export function calculateOrderPreview(
  cartLines: CartLine[],
  store: StoreSummary,
  coupon: Coupon | null,
): OrderPricePreview {
  const itemsAmount = getCartTotal(cartLines)
  const packagingFee = cartLines.length * PACKAGING_FEE_PER_LINE
  const discountAmount =
    coupon && itemsAmount >= coupon.thresholdAmount ? coupon.discountAmount : 0

  return {
    itemsAmount,
    deliveryFee: store.deliveryFee,
    packagingFee,
    discountAmount,
    totalAmount: Math.max(itemsAmount + store.deliveryFee + packagingFee - discountAmount, 0),
  }
}

export function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`
}

export function formatMinutes(minutes: number): string {
  return `${minutes} 分钟`
}
