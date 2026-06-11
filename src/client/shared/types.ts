export type Coordinates = {
  latitude: number
  longitude: number
}

export type StoreCoverTone = 'rice' | 'burger' | 'tea' | 'sushi'

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
  coverTone: StoreCoverTone
  address: string
  openingHours: string
  announcement: string
  minOrderAmount: number
  averagePrice: number
  serviceTags: string[]
  location: Coordinates
  menuCategories: MenuCategory[]
  menu: MenuItem[]
}

export type MenuCategory = {
  id: string
  name: string
}

export type MenuItem = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  monthlySales: number
  tag: string
  stock: number
  isAvailable: boolean
  imageTone: StoreCoverTone
}

export type Cart = Record<string, number>

export type CartLine = MenuItem & {
  quantity: number
}

export type CustomerAddress = {
  id: string
  label: string
  receiverName: string
  phoneMasked: string
  addressLine: string
  detail: string
  coordinates: Coordinates
}

export type Coupon = {
  id: string
  title: string
  thresholdAmount: number
  discountAmount: number
}

export type OrderPricePreview = {
  itemsAmount: number
  deliveryFee: number
  packagingFee: number
  discountAmount: number
  totalAmount: number
}

export type CustomerOrderStatus =
  | 'PendingPayment'
  | 'Paid'
  | 'MerchantAccepted'
  | 'Preparing'
  | 'WaitingForRider'
  | 'RiderPickedUp'
  | 'Delivering'
  | 'Completed'

export type OrderTimelineStep = {
  key: CustomerOrderStatus
  label: string
  description: string
  happenedAt: string
  isCompleted: boolean
}

export type CustomerOrder = {
  id: string
  storeId: string
  storeName: string
  status: CustomerOrderStatus
  statusText: string
  address: CustomerAddress
  items: CartLine[]
  price: OrderPricePreview
  riderName: string
  riderPhoneMasked: string
  riderLocation: Coordinates
  estimatedArrivalMinutes: number
  timeline: OrderTimelineStep[]
}

export type MerchantOrderStatus = 'PendingAccept' | 'Preparing' | 'ReadyForPickup' | 'PickedUp' | 'Rejected'

export type MerchantOrder = {
  id: string
  customerName: string
  itemsSummary: string
  items: CartLine[]
  status: MerchantOrderStatus
  statusText: string
  totalAmount: number
  placedMinutesAgo: number
  deliveryAddressMasked: string
  customerNote: string
  paymentStatus: 'Paid' | 'Refunding'
}

export type MerchantStoreProfile = {
  id: string
  name: string
  address: string
  openingHours: string
  isOpen: boolean
  deliveryRadiusKm: number
  averagePreparationMinutes: number
  announcement: string
  coordinates: Coordinates
}

export type MerchantMenuItem = MenuItem & {
  categoryName: string
}

export type DeliveryTaskStatus = 'Available' | 'Accepted' | 'ArrivedStore' | 'PickedUp' | 'Delivering' | 'Delivered'

export type DeliveryTask = {
  id: string
  orderId: string
  storeName: string
  pickupAddress: string
  customerAddress: string
  distanceKm: number
  fee: number
  status: DeliveryTaskStatus
  statusText: string
  pickupCode: string
  customerPhoneMasked: string
  estimatedMinutes: number
  pickupLocation: Coordinates
  dropoffLocation: Coordinates
}

export type AdminTask = {
  id: string
  title: string
  owner: string
  status: string
  severity: 'normal' | 'warning' | 'urgent'
}

export type MerchantApplication = {
  id: string
  storeName: string
  applicantName: string
  category: string
  address: string
  submittedHoursAgo: number
  status: 'Pending' | 'Approved' | 'Rejected'
}

export type PlatformOrder = {
  id: string
  storeName: string
  customerName: string
  riderName: string
  status: string
  totalAmount: number
  riskLevel: 'normal' | 'warning' | 'urgent'
}

export type AccountRecord = {
  id: string
  name: string
  role: 'Customer' | 'Merchant' | 'Rider'
  status: 'Active' | 'Frozen' | 'PendingReview'
}

export type DeliveryArea = {
  id: string
  name: string
  radiusKm: number
  baseFee: number
  isEnabled: boolean
}
