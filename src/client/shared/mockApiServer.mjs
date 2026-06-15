import http from 'node:http'

const HOST = '0.0.0.0'
const PORT = Number.parseInt(process.env.MOCK_API_PORT ?? '5180', 10)

const customerAddresses = [
  {
    id: 'address-home',
    label: '家',
    receiverName: 'Shuaijie',
    phoneMasked: '021 **** 118',
    addressLine: '12 Queen Street, Auckland CBD',
    detail: 'Apartment 8B',
    coordinates: { latitude: -36.8489, longitude: 174.7633 },
  },
]

const menuItems = [
  {
    id: 'bowl-teriyaki',
    categoryId: 'signature',
    categoryName: '招牌套餐',
    name: '照烧鸡腿饭',
    description: '去骨鸡腿、溏心蛋、时蔬、秘制照烧汁',
    price: 16.8,
    monthlySales: 420,
    tag: '招牌',
    stock: 38,
    isAvailable: true,
    imageTone: 'rice',
  },
  {
    id: 'bowl-beef',
    categoryId: 'signature',
    categoryName: '招牌套餐',
    name: '黑椒牛肉饭',
    description: '嫩牛肉片、洋葱、青椒、黑椒酱',
    price: 18.5,
    monthlySales: 316,
    tag: '热卖',
    stock: 26,
    isAvailable: true,
    imageTone: 'rice',
  },
  {
    id: 'bowl-veggie',
    categoryId: 'light',
    categoryName: '轻食热卖',
    name: '南瓜素食饭',
    description: '烤南瓜、豆腐、玉米、芝麻酱',
    price: 14.2,
    monthlySales: 128,
    tag: '轻食',
    stock: 12,
    isAvailable: true,
    imageTone: 'tea',
  },
  {
    id: 'miso-soup',
    categoryId: 'side',
    categoryName: '小食饮品',
    name: '味噌汤',
    description: '海带、豆腐、葱花',
    price: 4.2,
    monthlySales: 310,
    tag: '配餐',
    stock: 80,
    isAvailable: true,
    imageTone: 'sushi',
  },
]

const merchantProfile = {
  id: 'store-koala-bowl',
  name: '考拉能量饭',
  address: '18 Queen Street, Auckland CBD',
  openingHours: '10:30 - 21:30',
  isOpen: true,
  deliveryRadiusKm: 4.5,
  averagePreparationMinutes: 12,
  announcement: '午高峰预计出餐 12 分钟，支持少盐少油备注。',
  coordinates: { latitude: -36.8478, longitude: 174.765 },
}

const statusTextByCustomerStatus = {
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

const statusTextByMerchantStatus = {
  PendingAccept: '待接单',
  Preparing: '备餐中',
  ReadyForPickup: '待骑手取餐',
  PickedUp: '骑手已取餐',
  Rejected: '已拒单',
}

const statusTextByDeliveryStatus = {
  Available: '可接单',
  Accepted: '已接单',
  ArrivedStore: '已到店',
  PickedUp: '已取餐',
  Delivering: '配送中',
  Delivered: '已送达',
}

const nowLabel = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const EARTH_RADIUS_KM = 6371

function createTimeline(status) {
  const steps = [
    ['PendingPayment', '提交订单', '订单已提交，等待支付'],
    ['PendingMerchantAccept', '等待接单', '支付完成，订单已推送给商家'],
    ['Preparing', '商家备餐', '商家正在准备餐品'],
    ['WaitingForRider', '等待骑手', '餐品已出餐，等待骑手接单'],
    ['RiderPickedUp', '骑手取餐', '骑手已取到餐品'],
    ['Delivering', '配送中', '骑手正在配送'],
    ['Completed', '已送达', '订单完成，可评价商家和骑手'],
  ]
  const statusRank = {
    PendingPayment: 0,
    Paid: 1,
    PendingMerchantAccept: 1,
    MerchantAccepted: 2,
    Preparing: 2,
    ReadyForPickup: 3,
    WaitingForRider: 3,
    RiderAccepted: 3,
    RiderArrivedStore: 3,
    RiderPickedUp: 4,
    Delivering: 5,
    Completed: 6,
    Rejected: 1,
    Refunded: 1,
    Canceled: 0,
  }[status]

  return steps.map(([key, label, description], index) => ({
    key,
    label,
    description,
    happenedAt: index <= statusRank ? nowLabel() : '--',
    isCompleted: index <= statusRank,
  }))
}

function createCustomerOrder({
  address = customerAddresses[0],
  deliveryRadiusKm = merchantProfile.deliveryRadiusKm,
  id,
  items,
  price,
  status,
  storeLocation = merchantProfile.coordinates,
  storeId = merchantProfile.id,
  storeName = merchantProfile.name,
}) {
  return {
    id,
    storeId,
    storeName,
    deliveryDistanceKm: calculateDistanceKm(storeLocation, address.coordinates),
    deliveryRadiusKm,
    status,
    statusText: statusTextByCustomerStatus[status],
    address,
    items,
    price,
    riderName: status === 'PendingPayment' ? '待分配' : 'Liam',
    riderPhoneMasked: '020 **** 776',
    riderLocation: { latitude: -36.8482, longitude: 174.764 },
    estimatedArrivalMinutes: 12,
    timeline: createTimeline(status),
  }
}

function calculateDistanceKm(from, to) {
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

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function createInitialState() {
  const activeOrderItems = [
    { ...menuItems[0], cartKey: 'bowl-teriyaki', quantity: 2 },
    { ...menuItems[3], cartKey: 'miso-soup', quantity: 1 },
  ]

  return {
    customerOrders: [
      createCustomerOrder({
        id: 'KE-2048',
        items: activeOrderItems,
        price: {
          itemsAmount: 37.8,
          deliveryFee: 2.99,
          packagingFee: 0.8,
          discountAmount: 6,
          totalAmount: 35.59,
        },
        status: 'Delivering',
      }),
    ],
    merchantOrders: [
      {
        id: 'KE-2049',
        customerName: 'Mia',
        itemsSummary: '黑椒牛肉饭 x1、南瓜素食饭 x1',
        items: [
          { ...menuItems[1], cartKey: 'bowl-beef', quantity: 1 },
          { ...menuItems[2], cartKey: 'bowl-veggie', quantity: 1 },
        ],
        status: 'Preparing',
        statusText: '备餐中',
        totalAmount: 35.1,
        placedMinutesAgo: 9,
        deliveryAddressMasked: 'Hobson Street 附近',
        customerNote: '餐具 2 份。',
        paymentStatus: 'Paid',
      },
      {
        id: 'KE-2050',
        customerName: 'Noah',
        itemsSummary: '照烧鸡腿饭 x1',
        items: [{ ...menuItems[0], cartKey: 'bowl-teriyaki', quantity: 1 }],
        status: 'ReadyForPickup',
        statusText: '待骑手取餐',
        totalAmount: 20.19,
        placedMinutesAgo: 14,
        deliveryAddressMasked: 'Wakefield Street 附近',
        customerNote: '放前台。',
        paymentStatus: 'Paid',
      },
    ],
    merchantMenuItems: [...menuItems],
    merchantProfile,
    deliveryTasks: [
      {
        id: 'D-801',
        orderId: 'KE-2050',
        storeName: merchantProfile.name,
        pickupAddress: merchantProfile.address,
        customerAddress: '12 Queen Street, Auckland CBD',
        distanceKm: 2.8,
        fee: 8.5,
        status: 'Available',
        statusText: '可接单',
        pickupCode: '7421',
        customerPhoneMasked: '021 **** 118',
        estimatedMinutes: 24,
        pickupLocation: merchantProfile.coordinates,
        dropoffLocation: { latitude: -36.8489, longitude: 174.7633 },
      },
      {
        id: 'D-802',
        orderId: 'KE-2048',
        storeName: merchantProfile.name,
        pickupAddress: merchantProfile.address,
        customerAddress: '12 Queen Street, Auckland CBD',
        distanceKm: 1.7,
        fee: 6.2,
        status: 'Delivering',
        statusText: '配送中',
        pickupCode: '5180',
        customerPhoneMasked: '022 **** 301',
        estimatedMinutes: 12,
        pickupLocation: merchantProfile.coordinates,
        dropoffLocation: { latitude: -36.852, longitude: 174.7592 },
      },
    ],
    merchantApplications: [
      {
        id: 'MA-101',
        storeName: '海港寿司',
        applicantName: 'Haruto',
        category: '日韩料理',
        address: '9 Customs Street East',
        submittedHoursAgo: 5,
        status: 'Pending',
      },
      {
        id: 'MA-102',
        storeName: '湾区烧烤',
        applicantName: 'Chen',
        category: '夜宵烧烤',
        address: '22 Lorne Street',
        submittedHoursAgo: 13,
        status: 'Pending',
      },
    ],
    platformOrders: [
      {
        id: 'KE-2047',
        storeName: '金袋汉堡',
        customerName: 'Mia',
        riderName: '未分配',
        status: '派单超时',
        totalAmount: 24.7,
        riskLevel: 'urgent',
      },
      {
        id: 'KE-2049',
        storeName: merchantProfile.name,
        customerName: 'Mia',
        riderName: '未分配',
        status: '备餐中',
        totalAmount: 35.1,
        riskLevel: 'warning',
      },
    ],
    accountRecords: [
      { id: 'U-1001', name: 'Shuaijie', role: 'Customer', status: 'Active' },
      { id: 'M-2001', name: merchantProfile.name, role: 'Merchant', status: 'Active' },
      { id: 'R-3001', name: 'Liam', role: 'Rider', status: 'Active' },
      { id: 'R-3002', name: 'Rider #18', role: 'Rider', status: 'PendingReview' },
      { id: 'A-9001', name: 'Platform Admin', role: 'Admin', status: 'Active' },
    ],
    deliveryAreas: [
      { id: 'DA-1', name: 'Auckland CBD', radiusKm: 5, baseFee: 2.99, isEnabled: true },
      { id: 'DA-2', name: 'Newmarket', radiusKm: 4, baseFee: 3.49, isEnabled: true },
      { id: 'DA-3', name: 'Parnell', radiusKm: 3, baseFee: 3.99, isEnabled: false },
    ],
  }
}

let state = createInitialState()
let nextOrderNumber = 3001
let nextDeliveryNumber = 900

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

function ok(response, data) {
  sendJson(response, 200, { code: 'OK', message: 'success', data })
}

function fail(response, statusCode, message, code = 'ERROR') {
  sendJson(response, statusCode, { code, message, data: null })
}

async function readJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function updateCustomerOrder(orderId, patch) {
  state.customerOrders = state.customerOrders.map((order) => {
    if (order.id !== orderId) {
      return order
    }

    const nextStatus = patch.status ?? order.status

    return {
      ...order,
      ...patch,
      status: nextStatus,
      statusText: statusTextByCustomerStatus[nextStatus],
      timeline: createTimeline(nextStatus),
    }
  })
}

function addOrUpdatePlatformOrder(orderId, patch) {
  const existingOrder = state.platformOrders.find((order) => order.id === orderId)

  if (existingOrder) {
    state.platformOrders = state.platformOrders.map((order) =>
      order.id === orderId ? { ...order, ...patch } : order,
    )
    return
  }

  state.platformOrders = [
    {
      id: orderId,
      storeName: merchantProfile.name,
      customerName: 'Shuaijie',
      riderName: '未分配',
      status: '待处理',
      totalAmount: 0,
      riskLevel: 'warning',
      ...patch,
    },
    ...state.platformOrders,
  ]
}

function ensureDeliveryForOrder(orderId) {
  const existingDelivery = state.deliveryTasks.find((task) => task.orderId === orderId)
  const customerOrder = state.customerOrders.find((order) => order.id === orderId)

  if (existingDelivery || !customerOrder) {
    return existingDelivery
  }

  const delivery = {
    id: `D-${nextDeliveryNumber++}`,
    orderId,
    storeName: customerOrder.storeName,
    pickupAddress: merchantProfile.address,
    customerAddress: customerOrder.address.addressLine,
    distanceKm: 2.4,
    fee: 7.5,
    status: 'Available',
    statusText: '可接单',
    pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
    customerPhoneMasked: customerOrder.address.phoneMasked,
    estimatedMinutes: 22,
    pickupLocation: merchantProfile.coordinates,
    dropoffLocation: customerOrder.address.coordinates,
  }

  state.deliveryTasks = [delivery, ...state.deliveryTasks]
  return delivery
}

function summarizeItems(items) {
  return items
    .map((item) => {
      const optionsText =
        item.selectedOptions?.length > 0
          ? `（${item.selectedOptions.map((option) => option.name).join('/')}）`
          : ''

      return `${item.name}${optionsText} x${item.quantity}`
    })
    .join('、')
}

async function handleRequest(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, null)
    return
  }

  try {
    if (request.method === 'GET' && path === '/api/mock/state') {
      ok(response, state)
      return
    }

    if (request.method === 'POST' && path === '/api/mock/reset') {
      state = createInitialState()
      nextOrderNumber = 3001
      nextDeliveryNumber = 900
      ok(response, state)
      return
    }

    if (request.method === 'POST' && path === '/api/mock/customer/orders') {
      const input = await readJson(request)
      const deliveryDistanceKm = calculateDistanceKm(input.storeLocation, input.address.coordinates)

      if (deliveryDistanceKm > input.deliveryRadiusKm) {
        fail(
          response,
          400,
          'Delivery address is outside this store delivery range',
          'DELIVERY_OUT_OF_RANGE',
        )
        return
      }

      const orderId = `KE-${nextOrderNumber++}`
      const customerOrder = createCustomerOrder({
        address: input.address,
        deliveryRadiusKm: input.deliveryRadiusKm,
        id: orderId,
        items: input.items,
        price: input.price,
        status: 'PendingPayment',
        storeLocation: input.storeLocation,
        storeId: input.storeId,
        storeName: input.storeName,
      })
      state.customerOrders = [customerOrder, ...state.customerOrders]
      ok(response, state)
      return
    }

    const paymentMatch = path.match(/^\/api\/mock\/customer\/orders\/([^/]+)\/mock-payment$/)
    if (request.method === 'POST' && paymentMatch) {
      const orderId = paymentMatch[1]
      const order = state.customerOrders.find((item) => item.id === orderId)

      if (!order) {
        fail(response, 404, 'Order not found')
        return
      }

      updateCustomerOrder(orderId, { riderName: '待分配', status: 'PendingMerchantAccept' })
      state.merchantOrders = [
        {
          id: orderId,
          customerName: order.address.receiverName,
          itemsSummary: summarizeItems(order.items),
          items: order.items,
          status: 'PendingAccept',
          statusText: '待接单',
          totalAmount: order.price.totalAmount,
          placedMinutesAgo: 0,
          deliveryAddressMasked: `${order.address.label} · ${order.address.addressLine}`,
          customerNote: '少盐，不要葱',
          paymentStatus: 'Paid',
        },
        ...state.merchantOrders.filter((item) => item.id !== orderId),
      ]
      ok(response, state)
      return
    }

    const cancelMatch = path.match(/^\/api\/mock\/customer\/orders\/([^/]+)\/cancel$/)
    if (request.method === 'POST' && cancelMatch) {
      const order = state.customerOrders.find((item) => item.id === cancelMatch[1])

      if (!order) {
        fail(response, 404, 'Order not found')
        return
      }

      if (order.status === 'PendingPayment') {
        updateCustomerOrder(cancelMatch[1], { status: 'Canceled' })
        ok(response, state)
        return
      }

      if (['PendingMerchantAccept', 'Paid'].includes(order.status)) {
        updateCustomerOrder(cancelMatch[1], { status: 'Refunded' })
        state.merchantOrders = state.merchantOrders.filter((merchantOrder) => merchantOrder.id !== order.id)
        addOrUpdatePlatformOrder(order.id, {
          status: '用户取消，自动退款',
          totalAmount: order.price.totalAmount,
          riskLevel: 'normal',
        })
        ok(response, state)
        return
      }

      fail(response, 409, 'Order can no longer be cancelled automatically', 'ORDER_CANNOT_CANCEL')
      return
    }

    const merchantStatusMatch = path.match(/^\/api\/mock\/merchant\/orders\/([^/]+)\/status$/)
    if (request.method === 'PATCH' && merchantStatusMatch) {
      const orderId = merchantStatusMatch[1]
      const { status } = await readJson(request)

      state.merchantOrders = state.merchantOrders.map((order) =>
        order.id === orderId ? { ...order, status, statusText: statusTextByMerchantStatus[status] } : order,
      )

      if (status === 'Rejected') {
        updateCustomerOrder(orderId, { status: 'Refunded' })
        addOrUpdatePlatformOrder(orderId, {
          status: '商家拒单退款',
          riskLevel: 'warning',
        })
      }

      if (status === 'Preparing') {
        updateCustomerOrder(orderId, { status: 'Preparing' })
      }

      if (status === 'ReadyForPickup') {
        updateCustomerOrder(orderId, { status: 'WaitingForRider' })
        const delivery = ensureDeliveryForOrder(orderId)
        addOrUpdatePlatformOrder(orderId, {
          riderName: delivery?.status === 'Available' ? '未分配' : 'Liam',
          status: '待骑手接单',
          totalAmount: state.customerOrders.find((order) => order.id === orderId)?.price.totalAmount ?? 0,
          riskLevel: 'warning',
        })
      }

      ok(response, state)
      return
    }

    const menuItemMatch = path.match(/^\/api\/mock\/merchant\/menu-items\/([^/]+)$/)
    if (request.method === 'PATCH' && menuItemMatch) {
      const input = await readJson(request)
      state.merchantMenuItems = state.merchantMenuItems.map((item) =>
        item.id === menuItemMatch[1] ? { ...item, ...input } : item,
      )
      ok(response, state)
      return
    }

    if (request.method === 'PATCH' && path === '/api/mock/merchant/store-profile') {
      const input = await readJson(request)
      state.merchantProfile = { ...state.merchantProfile, ...input }
      state.deliveryTasks = state.deliveryTasks.map((task) => ({
        ...task,
        pickupAddress: state.merchantProfile.address,
        pickupLocation: state.merchantProfile.coordinates,
      }))
      ok(response, state)
      return
    }

    const deliveryStatusMatch = path.match(/^\/api\/mock\/rider\/deliveries\/([^/]+)\/status$/)
    if (request.method === 'PATCH' && deliveryStatusMatch) {
      const deliveryId = deliveryStatusMatch[1]
      const { status } = await readJson(request)
      const delivery = state.deliveryTasks.find((task) => task.id === deliveryId)

      state.deliveryTasks = state.deliveryTasks.map((task) =>
        task.id === deliveryId ? { ...task, status, statusText: statusTextByDeliveryStatus[status] } : task,
      )

      if (delivery) {
        const nextCustomerStatusByDeliveryStatus = {
          Accepted: 'RiderAccepted',
          ArrivedStore: 'RiderArrivedStore',
          PickedUp: 'RiderPickedUp',
          Delivering: 'Delivering',
          Delivered: 'Completed',
        }
        const nextCustomerStatus = nextCustomerStatusByDeliveryStatus[status]

        if (nextCustomerStatus) {
          updateCustomerOrder(delivery.orderId, {
            riderName: 'Liam',
            status: nextCustomerStatus,
          })
        }

        if (status === 'PickedUp') {
          state.merchantOrders = state.merchantOrders.map((order) =>
            order.id === delivery.orderId
              ? { ...order, status: 'PickedUp', statusText: statusTextByMerchantStatus.PickedUp }
              : order,
          )
        }

        if (status === 'Accepted' || status === 'Delivered') {
          addOrUpdatePlatformOrder(delivery.orderId, {
            riderName: 'Liam',
            status: status === 'Accepted' ? '骑手已接单' : '已送达',
            riskLevel: 'normal',
          })
        }
      }

      ok(response, state)
      return
    }

    const deliveryIssueMatch = path.match(/^\/api\/mock\/rider\/deliveries\/([^/]+)\/issue$/)
    if (request.method === 'PATCH' && deliveryIssueMatch) {
      const deliveryId = deliveryIssueMatch[1]
      const { reason = '骑手上报异常' } = await readJson(request)
      const delivery = state.deliveryTasks.find((task) => task.id === deliveryId)

      if (!delivery) {
        fail(response, 404, 'Delivery task not found')
        return
      }

      addOrUpdatePlatformOrder(delivery.orderId, {
        riderName: 'Liam',
        status: reason,
        totalAmount: state.customerOrders.find((order) => order.id === delivery.orderId)?.price.totalAmount ?? 0,
        riskLevel: 'urgent',
      })
      ok(response, state)
      return
    }

    const applicationMatch = path.match(/^\/api\/mock\/admin\/merchant-applications\/([^/]+)\/status$/)
    if (request.method === 'PATCH' && applicationMatch) {
      const { status } = await readJson(request)
      state.merchantApplications = state.merchantApplications.map((application) =>
        application.id === applicationMatch[1] ? { ...application, status } : application,
      )
      ok(response, state)
      return
    }

    const assignRiderMatch = path.match(/^\/api\/mock\/admin\/orders\/([^/]+)\/assign-rider$/)
    if (request.method === 'PATCH' && assignRiderMatch) {
      const orderId = assignRiderMatch[1]
      const { riderName = 'Liam' } = await readJson(request)
      const delivery = ensureDeliveryForOrder(orderId)

      if (delivery) {
        state.deliveryTasks = state.deliveryTasks.map((task) =>
          task.id === delivery.id
            ? { ...task, status: 'Accepted', statusText: statusTextByDeliveryStatus.Accepted }
            : task,
        )
      }

      updateCustomerOrder(orderId, { riderName, status: 'RiderAccepted' })
      addOrUpdatePlatformOrder(orderId, {
        riderName,
        status: '已人工派单',
        riskLevel: 'normal',
      })
      ok(response, state)
      return
    }

    const dismissPlatformOrderMatch = path.match(/^\/api\/mock\/admin\/orders\/([^/]+)\/dismiss$/)
    if (request.method === 'PATCH' && dismissPlatformOrderMatch) {
      state.platformOrders = state.platformOrders.filter((order) => order.id !== dismissPlatformOrderMatch[1])
      ok(response, state)
      return
    }

    const accountMatch = path.match(/^\/api\/mock\/admin\/accounts\/([^/]+)\/status$/)
    if (request.method === 'PATCH' && accountMatch) {
      const { status } = await readJson(request)
      state.accountRecords = state.accountRecords.map((account) =>
        account.id === accountMatch[1] ? { ...account, status } : account,
      )
      ok(response, state)
      return
    }

    const areaMatch = path.match(/^\/api\/mock\/admin\/delivery-areas\/([^/]+)$/)
    if (request.method === 'PATCH' && areaMatch) {
      const input = await readJson(request)
      state.deliveryAreas = state.deliveryAreas.map((area) =>
        area.id === areaMatch[1] ? { ...area, ...input } : area,
      )
      ok(response, state)
      return
    }

    fail(response, 404, 'Mock route not found')
  } catch (error) {
    fail(response, 500, error instanceof Error ? error.message : 'Unexpected mock API error')
  }
}

const server = http.createServer(handleRequest)

server.listen(PORT, HOST, () => {
  console.log(`Koala Eats mock API listening on http://${HOST}:${PORT}`)
})
