# Koala Eats Frontend

四个前端应用独立运行，不在用户端暴露其他端入口。

## Apps

- `customer-web`：用户端，默认端口 `5173`
- `merchant-web`：商家端，默认端口 `5174`
- `rider-web`：骑手端，默认端口 `5175`
- `admin-web`：管理端，默认端口 `5176`

## Install

```powershell
cd D:\practices\Koala_Eats\src\client
npm install
```

## Build

```powershell
npm run build
```

## Run

```powershell
npm run dev:customer
npm run dev:merchant
npm run dev:rider
npm run dev:admin
```

同局域网设备访问：

- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`
- `http://localhost:5176`
