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

## 开发期共享 Mock API

状态：`Mocked`

用途：前端业务完全跑通前，四个独立 Web 应用通过开发期 mock 服务共享订单、商家订单、配送单、异常订单、账号和配送区域状态。该服务不是正式后端实现，后续由 ASP.NET Core Web API 按本文档契约逐个替换。

Base URL：

```json
{
  "mockApiBaseUrl": "http://192.168.88.100:5180"
}
```

前端通过 `VITE_MOCK_API_BASE_URL` 可覆盖默认地址。

### GET `/api/mock/state`

状态：`Mocked`

用途：四端读取同一份 mock 业务状态。

Response `200`：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "customerOrders": [],
    "merchantOrders": [],
    "merchantMenuItems": [],
    "merchantProfile": {},
    "deliveryTasks": [],
    "merchantApplications": [],
    "platformOrders": [],
    "accountRecords": [],
    "deliveryAreas": []
  }
}
```

### POST `/api/mock/reset`

状态：`Mocked`

用途：重置开发期 mock 业务状态，方便重复验证完整流程。

### 状态机规则

用户订单主状态：

```text
PendingPayment -> PendingMerchantAccept -> Preparing -> WaitingForRider -> RiderAccepted -> RiderArrivedStore -> RiderPickedUp -> Delivering -> Completed
```

异常分支：

```text
PendingPayment -> Canceled
PendingMerchantAccept -> Refunded
```

商家端只能推进：

```text
PendingAccept -> Preparing -> ReadyForPickup
PendingAccept -> Rejected
```

骑手端只能推进：

```text
Available -> Accepted -> ArrivedStore -> PickedUp -> Delivering -> Delivered
```

补充业务规则：

- 用户端提交订单前必须用店铺坐标和收货地址坐标计算配送距离；超过 `deliveryRadiusKm` 时前端禁用下单，后端必须返回 `DELIVERY_OUT_OF_RANGE`。
- 菜品可带 `optionGroups`，用于规格、口味、加料等单选项；购物车必须按 `cartKey = menuItemId + selectedOptions` 拆行，同菜品不同规格不能合并。
- 订单行必须保存用户选择的 `selectedOptions`、最终 `unitPrice` 和 `cartKey`，供商家小票、退款和后端订单明细表使用。
- 用户取消规则：`PendingPayment` 可直接取消为 `Canceled`；支付倒计时结束后也按该规则自动取消；`Paid` / `PendingMerchantAccept` 可自动退款为 `Refunded`；商家已接单、备餐、骑手配送后不自动取消，后续进入人工售后/退款流程。
- 骑手端异常上报进入 `platformOrders` 异常池，由管理端人工派单、关闭异常或后续售后处理。
- 管理端配送区域可调整启停状态、服务半径和起步配送费；后端实现时需要把区域规则和店铺配送半径、用户地址坐标统一校验。

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

## Google Maps Address Service

状态：`Mocked`

用途：前端地址输入使用 Google Maps JavaScript API 的 Places Autocomplete Data API 直接提供 New Zealand 地址联想。真实 Google Maps API key 不写进仓库，前端通过 `VITE_GOOGLE_MAPS_API_KEY` 读取。

前端配置：

```json
{
  "VITE_GOOGLE_MAPS_API_KEY": "local-only-secret"
}
```

约束：

- 地址联想只在用户输入 3 个字符以上时触发。
- 请求使用 session token 聚合同一次输入和选中行为。
- 结果限制为 New Zealand：`includedRegionCodes: ["nz"]`，并使用 NZ 附近 `locationRestriction`。
- 选中地址后必须读取 `formattedAddress` 和 `location`，存入业务状态时使用统一坐标结构。
- API key 必须在 Google Cloud 中限制 HTTP referrer，并启用 Maps JavaScript API 和 Places API。

前端选中地址后的结构：

```json
{
  "placeId": "google-place-id",
  "displayName": "Queen Street",
  "formattedAddress": "Queen Street, Auckland CBD, Auckland, New Zealand",
  "coordinates": {
    "latitude": -36.8485,
    "longitude": 174.7633
  }
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

状态：`Done`

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
      "coverTone": "rice",
      "deliveryRadiusKm": 4.5,
      "location": {
        "latitude": -36.8478,
        "longitude": 174.765
      }
    }
  ]
}
```

#### GET `/api/customer/stores/{storeId}`

状态：`Done`

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
    "coverTone": "rice",
    "deliveryRadiusKm": 4.5,
    "location": {
      "latitude": -36.8478,
      "longitude": 174.765
    }
  }
}
```

### Menu

#### GET `/api/customer/stores/{storeId}/menu`

状态：`Done`

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
      "tag": "招牌",
      "optionGroups": [
        {
          "id": "rice-size",
          "name": "饭量",
          "required": true,
          "options": [
            { "id": "regular", "name": "标准", "priceDelta": 0 },
            { "id": "large", "name": "加饭", "priceDelta": 1.5 }
          ]
        }
      ]
    }
  ]
}
```

### Orders

#### POST `/api/customer/orders/preview`

状态：`Done`

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

状态：`Done`

用途：用户端提交订单。订单创建后进入待支付状态。

Request:

```json
{
  "storeId": "store-koala-bowl",
  "storeName": "考拉能量饭",
  "storeLocation": {
    "latitude": -36.8478,
    "longitude": 174.765
  },
  "deliveryRadiusKm": 4.5,
  "address": {
    "id": "address-home",
    "label": "家",
    "addressLine": "12 Queen Street, Auckland CBD",
    "coordinates": {
      "latitude": -36.8489,
      "longitude": 174.7633
    }
  },
  "items": [
    {
      "menuItemId": "bowl-teriyaki",
      "quantity": 2,
      "cartKey": "bowl-teriyaki::flavor:less-salt|rice-size:large",
      "unitPrice": 18.3,
      "selectedOptions": [
        {
          "groupId": "rice-size",
          "groupName": "饭量",
          "id": "large",
          "name": "加饭",
          "priceDelta": 1.5
        }
      ]
    }
  ],
  "remark": "少盐"
}
```

#### PATCH `/api/mock/rider/deliveries/{deliveryId}/issue`

状态：`Done`

用途：骑手上报配送异常，例如联系不上顾客、商家未出餐、地址异常、餐品破损。上报后对应订单进入平台异常池。

Request:

```json
{
  "reason": "联系不上顾客"
}
```

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

Response `400` when the address is outside delivery range:

```json
{
  "code": "DELIVERY_OUT_OF_RANGE",
  "message": "Delivery address is outside this store delivery range",
  "data": null
}
```

#### POST `/api/customer/orders/{orderId}/mock-payment`

状态：`Done`

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

#### POST `/api/customer/orders/{orderId}/cancel`

状态：`Done`

用途：用户端取消订单。待支付订单直接取消；已支付但商家未开始履约的订单自动退款；履约中订单不自动取消。

Response `200`:

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "order-1001",
    "status": "Canceled"
  }
}
```

Response `409`:

```json
{
  "code": "ORDER_CANNOT_CANCEL",
  "message": "Order can no longer be cancelled automatically",
  "data": null
}
```

#### GET `/api/customer/orders/{orderId}`

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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

状态：`Done`

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
