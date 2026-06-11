import type { Cart, CartLine } from './types'
import { stores } from './mockData'

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function buildCartLines(cart: Cart): CartLine[] {
  return stores.flatMap((store) =>
    store.menu
      .filter((item) => cart[item.id] > 0)
      .map((item) => ({
        ...item,
        quantity: cart[item.id],
      })),
  )
}

export function getCartTotal(cartLines: CartLine[]): number {
  return cartLines.reduce((total, line) => total + line.price * line.quantity, 0)
}
