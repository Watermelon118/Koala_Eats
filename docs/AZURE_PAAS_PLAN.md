# Azure PaaS Deployment Plan

## Target Shape

- API: Azure App Service running ASP.NET Core.
- Database: Azure SQL Database.
- Frontend: Azure Static Web Apps, one app per role.
- Maps: Google Maps Platform key restricted by HTTP referrer.
- Payment: mock payment only. No Stripe, PayPal, bank, Alipay, or WeChat Pay integration in this phase.

No virtual machines, no manually managed IIS, no SSH deployment host, and no long-running process started by hand.

## Required App Service Settings

Set these in Azure App Service configuration, not in source control:

```text
ASPNETCORE_ENVIRONMENT=Production
Auth__Issuer=KoalaEats.Api
Auth__Audience=KoalaEats.Web
Auth__SigningKey=<secret-at-least-32-characters>
Auth__AccessTokenMinutes=120
ConnectionStrings__KoalaEatsDatabase=<azure-sql-connection-string>
Cors__AllowedOrigins__0=https://<customer-static-web-app>
Cors__AllowedOrigins__1=https://<merchant-static-web-app>
Cors__AllowedOrigins__2=https://<rider-static-web-app>
Cors__AllowedOrigins__3=https://<admin-static-web-app>
```

The API fails fast outside Development when `Auth__SigningKey`, Azure SQL connection string, or CORS origins are missing.

## Required Static Web App Settings

Set per frontend app:

```text
VITE_API_BASE_URL=https://<api-app-service>
VITE_GOOGLE_MAPS_API_KEY=<restricted-google-maps-key>
```

`admin-web` does not need Google Maps today.

## Build Outputs

- Customer: `src/client/customer-web/dist`
- Merchant: `src/client/merchant-web/dist`
- Rider: `src/client/rider-web/dist`
- Admin: `src/client/admin-web/dist`
- API publish source: `src/server/KoalaEats.Api`

## Pre-Cloud Checklist

- `dotnet build src/server/KoalaEats.Api/KoalaEats.Api.csproj --configuration Release`
- `cd src/client && npm ci && npm run build`
- Confirm `docs/API_CONTRACT.md` marks implemented endpoints as `Done`.
- Confirm Google Maps key has HTTP referrer restrictions for local and Azure frontend domains.
- Confirm Azure SQL firewall / private access allows App Service.
- Confirm App Service logs do not include tokens, passwords, Google key, or full PII.
- Confirm payment remains mock-only before any production traffic.

## Known Production Hardening After First PaaS Deploy

- Move database migrations from app startup to a release step before real production traffic.
- Replace development demo accounts with persisted users and password hashing.
- Add refresh tokens or short-lived access tokens with re-authentication.
- Add Application Insights, alerts, and request correlation IDs.
- Add rate limits for login and order mutation endpoints.
