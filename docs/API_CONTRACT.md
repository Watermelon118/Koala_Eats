# API Contract

## 维护规则

- 前端需要的所有接口必须先登记在本文档。
- 前端 mock data 必须遵守本文档里的 request / response 结构。
- 后端实现接口后，把状态从 `Planned` 改为 `Done`。
- 后端接口完成后，删除前端对应 mock。
- 接口契约变更必须先改本文档，再改前端或后端代码。
- 真实 secrets、token、Google Maps API key 不写进本文档。

## 状态说明

- `Planned`：前端需要，尚未实现后端。
- `Mocked`：前端已有 mock data，后端尚未完成。
- `Done`：后端已实现，前端已删除对应 mock。

## 通用约定

### Base URL

- 本地开发 API：`http://192.168.88.100:5156`
- 前端通过 `VITE_API_BASE_URL` 读取。
- 多设备测试时不能使用 `localhost` 或 `127.0.0.1` 作为前端 API 地址。
- 前端本地端口：
  - Customer Web：`http://192.168.88.100:5173`
  - Merchant Web：`http://192.168.88.100:5174`
  - Rider Web：`http://192.168.88.100:5175`
  - Admin Web：`http://192.168.88.100:5176`

### 端隔离

- 用户端不能出现进入商家端、骑手端、管理端的入口。
- 商家端、骑手端、管理端同理，只展示自身角色功能。
- 后端实现认证后，必须按角色鉴权；前端隔离不是安全边界。

### 响应格式

所有业务接口统一返回 `code`、`message`、`data`。

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

错误响应：

```json
{
  "code": "string",
  "message": "string",
  "data": null
}
```

### 时间格式

- 所有时间字段使用 ISO 8601。
- 后端存储和接口传输使用 UTC。
- 前端按用户本地时区展示。

### 金额格式

- 金额字段使用 decimal，不使用 float。
- 字段名包含货币语义，例如 `totalAmount`、`deliveryFee`。
- 第一阶段默认货币为 NZD。

### 坐标格式

```json
{
  "latitude": -36.8485,
  "longitude": 174.7633
}
```

## Health

### GET `/api/health`

状态：`Done`

用途：检查 API 服务是否存活。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "status": "ok",
    "checkedAtUtc": "2026-06-11T01:17:57.4859659+00:00"
  }
}
```

## Auth

后续由前端登录页面需求补充。

## Customer API

### Stores

#### GET `/api/customer/stores`

状态：`Mocked`

用途：用户端首页获取附近商家列表。

Query:

```json
{
  "category": "全部",
  "latitude": -36.8485,
  "longitude": 174.7633
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "store-koala-bowl",
      "name": "考拉能量饭",
      "category": "米饭套餐",
      "rating": 4.8,
      "monthlySales": 1320,
      "deliveryMinutes": 28,
      "deliveryFee": 2.99,
      "distanceKm": 1.4,
      "promotion": "满 $35 减 $6",
      "coverTone": "rice"
    }
  ]
}
```

#### GET `/api/customer/stores/{storeId}`

状态：`Mocked`

用途：用户端进入商家详情页。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "store-koala-bowl",
    "name": "考拉能量饭",
    "category": "米饭套餐",
    "rating": 4.8,
    "monthlySales": 1320,
    "deliveryMinutes": 28,
    "deliveryFee": 2.99,
    "distanceKm": 1.4,
    "promotion": "满 $35 减 $6",
    "coverTone": "rice"
  }
}
```

### Menu

#### GET `/api/customer/stores/{storeId}/menu`

状态：`Mocked`

用途：用户端进入商家后获取菜单。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "bowl-teriyaki",
      "name": "照烧鸡腿饭",
      "description": "去骨鸡腿、溏心蛋、时蔬、秘制照烧汁",
      "price": 16.8,
      "monthlySales": 420,
      "tag": "招牌"
    }
  ]
}
```

### Orders

#### POST `/api/customer/orders/preview`

状态：`Mocked`

用途：用户端购物车计算价格预览。

Request:

```json
{
  "storeId": "store-koala-bowl",
  "items": [
    {
      "menuItemId": "bowl-teriyaki",
      "quantity": 2
    }
  ]
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "itemsAmount": 33.6,
    "deliveryFee": 2.99,
    "discountAmount": 0,
    "totalAmount": 36.59
  }
}
```

#### POST `/api/customer/orders`

状态：`Mocked`

用途：用户端提交订单。订单创建后进入待支付状态。

Request:

```json
{
  "storeId": "store-koala-bowl",
  "addressId": "address-home",
  "items": [
    {
      "menuItemId": "bowl-teriyaki",
      "quantity": 2
    }
  ],
  "remark": "少盐"
}
```

#### POST `/api/customer/orders/{orderId}/mock-payment`

状态：`Mocked`

用途：用户端模拟支付。真实支付暂不接入，点击模拟支付后订单进入已支付并继续流转。

Request:

```json
{
  "paymentMethod": "MockBalance"
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "orderId": "order-1001",
    "status": "Paid",
    "paidAtUtc": "2026-06-11T02:00:00Z"
  }
}
```

#### GET `/api/customer/orders/{orderId}`

状态：`Mocked`

用途：用户端查看订单详情、订单进度、骑手位置和预计送达时间。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "KE-2048",
    "storeId": "store-koala-bowl",
    "storeName": "考拉能量饭",
    "status": "Delivering",
    "statusText": "骑手配送中",
    "estimatedArrivalMinutes": 12,
    "riderName": "Liam",
    "riderLocation": {
      "latitude": -36.8482,
      "longitude": 174.764
    }
  }
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "orderId": "order-1001",
    "status": "PendingPayment",
    "totalAmount": 36.59
  }
}
```

## Merchant API

### GET `/api/merchant/dashboard`

状态：`Mocked`

用途：商家端首页获取店铺概览、今日指标和位置摘要。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "store": {
      "id": "store-koala-bowl",
      "name": "考拉能量饭",
      "rating": 4.8,
      "monthlySales": 1320,
      "deliveryMinutes": 28,
      "address": "Queen Street, Auckland CBD"
    },
    "metrics": {
      "pendingOrders": 12,
      "preparingOrders": 8,
      "todayRevenue": 860,
      "activeMenuItems": 3
    }
  }
}
```

### GET `/api/merchant/orders`

状态：`Mocked`

用途：商家端首页订单队列。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "KE-2048",
      "customerName": "Shuaijie",
      "itemsSummary": "照烧鸡腿饭 x2、味噌汤 x1",
      "status": "待接单",
      "totalAmount": 37.8,
      "placedMinutesAgo": 3
    }
  ]
}
```

### PATCH `/api/merchant/orders/{orderId}/status`

状态：`Mocked`

用途：商家接单、拒单、更新备餐和待取餐状态。

Request:

```json
{
  "status": "Preparing"
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "KE-2048",
    "status": "Preparing",
    "statusText": "备餐中"
  }
}
```

### GET `/api/merchant/menu-items`

状态：`Mocked`

用途：商家端首页菜品管理列表。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "bowl-teriyaki",
      "name": "照烧鸡腿饭",
      "price": 16.8,
      "monthlySales": 420,
      "tag": "招牌"
    }
  ]
}
```

### PATCH `/api/merchant/menu-items/{menuItemId}`

状态：`Mocked`

用途：商家修改菜品上架状态、库存、价格等信息。

Request:

```json
{
  "isAvailable": true,
  "stock": 38,
  "price": 16.8
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "bowl-teriyaki",
    "isAvailable": true,
    "stock": 38,
    "price": 16.8
  }
}
```

### PATCH `/api/merchant/store-profile`

状态：`Mocked`

用途：商家维护店铺资料、营业状态、营业时间、公告、配送范围和位置。

Request:

```json
{
  "isOpen": true,
  "openingHours": "10:30 - 21:30",
  "announcement": "午高峰预计出餐 12 分钟",
  "deliveryRadiusKm": 4.5
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "store-koala-bowl",
    "isOpen": true
  }
}
```

## Rider API

### GET `/api/rider/dashboard`

状态：`Mocked`

用途：骑手端首页获取接单概览。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "availableDeliveries": 9,
    "activeDeliveries": 2,
    "todayIncome": 86,
    "averageDeliveryMinutes": 24
  }
}
```

### GET `/api/rider/deliveries`

状态：`Mocked`

用途：骑手端首页配送单列表。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "D-801",
      "storeName": "考拉能量饭",
      "customerAddress": "12 Queen Street",
      "distanceKm": 2.8,
      "fee": 8.5,
      "status": "可接单"
    }
  ]
}
```

### PATCH `/api/rider/deliveries/{deliveryId}/status`

状态：`Mocked`

用途：骑手接单、到店、取餐、配送中、送达的状态流转。

Request:

```json
{
  "status": "PickedUp",
  "currentLocation": {
    "latitude": -36.8482,
    "longitude": 174.764
  }
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "D-801",
    "status": "PickedUp",
    "statusText": "已取餐"
  }
}
```

### POST `/api/rider/location-reports`

状态：`Mocked`

用途：骑手上报当前位置，用于用户端订单地图追踪。

Request:

```json
{
  "deliveryId": "D-801",
  "currentLocation": {
    "latitude": -36.8482,
    "longitude": 174.764
  },
  "reportedAtUtc": "2026-06-11T02:00:00Z"
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "accepted": true
  }
}
```

## Admin

### GET `/api/admin/dashboard`

状态：`Mocked`

用途：管理端首页获取平台指标。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "pendingMerchantReviews": 7,
    "abnormalOrders": 2,
    "onlineRiders": 24,
    "todayOrders": 128
  }
}
```

### GET `/api/admin/tasks`

状态：`Mocked`

用途：管理端首页待处理事项。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "A-301",
      "title": "新商家资质审核",
      "owner": "海港寿司",
      "status": "待审核",
      "severity": "warning"
    }
  ]
}
```

### GET `/api/admin/merchant-applications`

状态：`Mocked`

用途：管理端查看商家入驻审核列表。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "MA-101",
      "storeName": "海港寿司",
      "applicantName": "Haruto",
      "category": "日韩料理",
      "address": "9 Customs Street East",
      "status": "Pending"
    }
  ]
}
```

### PATCH `/api/admin/merchant-applications/{applicationId}/status`

状态：`Mocked`

用途：管理端通过或拒绝商家入驻审核。

Request:

```json
{
  "status": "Approved"
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "MA-101",
    "status": "Approved"
  }
}
```

### GET `/api/admin/orders`

状态：`Mocked`

用途：管理端查看订单列表和异常订单。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "KE-2047",
      "storeName": "金袋汉堡",
      "customerName": "Mia",
      "riderName": "未分配",
      "status": "派单超时",
      "riskLevel": "urgent"
    }
  ]
}
```

### PATCH `/api/admin/orders/{orderId}/assign-rider`

状态：`Mocked`

用途：自动派单失败时，管理端人工指定骑手。

Request:

```json
{
  "riderId": "R-3001"
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "KE-2047",
    "riderName": "Liam",
    "status": "已人工派单"
  }
}
```

### PATCH `/api/admin/accounts/{accountId}/status`

状态：`Mocked`

用途：管理端冻结或解冻用户、商家、骑手账号。

Request:

```json
{
  "status": "Frozen"
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "R-3001",
    "status": "Frozen"
  }
}
```

### PATCH `/api/admin/delivery-areas/{deliveryAreaId}`

状态：`Mocked`

用途：管理端维护配送区域、起步配送费和启停状态。

Request:

```json
{
  "isEnabled": true,
  "baseFee": 2.99,
  "radiusKm": 5
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "DA-1",
    "isEnabled": true
  }
}
```
