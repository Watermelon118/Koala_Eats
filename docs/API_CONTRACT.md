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

## Stores

后续由用户端商家列表和商家端店铺资料页面补充。

## Menu

后续由用户端菜单页面和商家端菜品管理页面补充。

## Orders

后续由购物车、下单、商家接单页面补充。

## Delivery

后续由骑手端和订单地图追踪页面补充。

## Admin

后续由管理端页面补充。
