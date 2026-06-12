import type {
  Cart,
  CartLine,
  Coupon,
  Coordinates,
  MenuItem,
  OrderPricePreview,
  SelectedMenuOption,
  StoreSummary,
} from './types'
import { stores } from './mockData'

const PACKAGING_FEE_PER_LINE = 0.4
const EARTH_RADIUS_KM = 6371

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function buildCartLines(
  cart: Cart,
  menuItems?: MenuItem[],
): CartLine[] {
  const sourceMenuItems = menuItems ?? stores.flatMap((store) => store.menu)

  return Object.entries(cart)
    .reduce<CartLine[]>((lines, [cartKey, entry]) => {
      const item = sourceMenuItems.find((menuItem) => menuItem.id === entry.itemId)

      if (!item || entry.quantity <= 0) {
        return lines
      }

      const selectedOptions = entry.selectedOptions.length > 0
        ? entry.selectedOptions
        : getDefaultSelectedOptions(item)

      lines.push({
        ...item,
        cartKey,
        quantity: entry.quantity,
        selectedOptions,
        unitPrice: item.price + selectedOptions.reduce((total, option) => total + option.priceDelta, 0),
      })

      return lines
    }, [])
}

export function getCartTotal(cartLines: CartLine[]): number {
  return cartLines.reduce((total, line) => total + (line.unitPrice ?? line.price) * line.quantity, 0)
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

export function calculateDistanceKm(from: Coordinates, to: Coordinates): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2)

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function getDefaultSelectedOptions(item: MenuItem): SelectedMenuOption[] {
  return (
    item.optionGroups?.flatMap((group) => {
      const firstOption = group.options[0]

      if (!group.required || !firstOption) {
        return []
      }

      return [
        {
          ...firstOption,
          groupId: group.id,
          groupName: group.name,
        },
      ]
    }) ?? []
  )
}

export function getCartKey(itemId: string, selectedOptions: SelectedMenuOption[]): string {
  const optionKey = selectedOptions
    .map((option) => `${option.groupId}:${option.id}`)
    .sort()
    .join('|')

  return optionKey ? `${itemId}::${optionKey}` : itemId
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
