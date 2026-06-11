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
npm run dev -w customer-web -- --host 0.0.0.0 --port 5173
npm run dev -w merchant-web -- --host 0.0.0.0 --port 5174
npm run dev -w rider-web -- --host 0.0.0.0 --port 5175
npm run dev -w admin-web -- --host 0.0.0.0 --port 5176
```

同局域网设备访问：

- `http://192.168.88.100:5173`
- `http://192.168.88.100:5174`
- `http://192.168.88.100:5175`
- `http://192.168.88.100:5176`
