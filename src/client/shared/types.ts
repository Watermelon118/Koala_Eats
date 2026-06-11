export type StoreSummary = {
  id: string
  name: string
  category: string
  rating: number
  monthlySales: number
  deliveryMinutes: number
  deliveryFee: number
  distanceKm: number
  promotion: string
  coverTone: 'rice' | 'burger' | 'tea' | 'sushi'
  menu: MenuItem[]
}

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  monthlySales: number
  tag: string
}

export type Cart = Record<string, number>

export type CartLine = MenuItem & {
  quantity: number
}

export type MerchantOrder = {
  id: string
  customerName: string
  itemsSummary: string
  status: string
  totalAmount: number
  placedMinutesAgo: number
}

export type DeliveryTask = {
  id: string
  storeName: string
  customerAddress: string
  distanceKm: number
  fee: number
  status: string
}

export type AdminTask = {
  id: string
  title: string
  owner: string
  status: string
  severity: 'normal' | 'warning' | 'urgent'
}
