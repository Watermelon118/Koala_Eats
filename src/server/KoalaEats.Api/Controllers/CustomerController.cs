using KoalaEats.Api;
using Microsoft.AspNetCore.Mvc;

namespace KoalaEats.Api.Controllers;

[ApiController]
[Route("api/customer")]
public sealed class CustomerController : ApiControllerBase
{
    private readonly BusinessStateStore _stateStore;

    public CustomerController(BusinessStateStore stateStore)
    {
        _stateStore = stateStore;
    }

    [HttpGet("stores")]
    public IActionResult GetStores([FromQuery] string? category, [FromQuery] double? latitude, [FromQuery] double? longitude)
    {
        Coordinates? coordinates = latitude is not null && longitude is not null
            ? new Coordinates { Latitude = latitude.Value, Longitude = longitude.Value }
            : null;

        return Execute(() => _stateStore.GetStores(category, coordinates));
    }

    [HttpGet("stores/{storeId}")]
    public IActionResult GetStore([FromRoute] string storeId, [FromQuery] double? latitude, [FromQuery] double? longitude)
    {
        Coordinates? coordinates = latitude is not null && longitude is not null
            ? new Coordinates { Latitude = latitude.Value, Longitude = longitude.Value }
            : null;

        return Execute(() => _stateStore.GetStore(storeId, coordinates) ?? throw new KeyNotFoundException("Store not found"));
    }

    [HttpGet("stores/{storeId}/menu")]
    public IActionResult GetStoreMenu([FromRoute] string storeId)
    {
        return Execute(() => _stateStore.GetStoreMenu(storeId) ?? throw new KeyNotFoundException("Store not found"));
    }

    [HttpPost("orders/preview")]
    public IActionResult PreviewOrder([FromBody] PreviewOrderRequest request)
    {
        return Execute(() => _stateStore.PreviewOrder(request));
    }

    [HttpPost("orders")]
    public IActionResult CreateOrder([FromBody] CreateCustomerOrderRequest request)
    {
        return Execute(() =>
        {
            var order = _stateStore.CreateOrder(request);
            return new
            {
                orderId = order.Id,
                status = order.Status,
                totalAmount = order.Price.TotalAmount,
            };
        });
    }

    [HttpPost("orders/{orderId}/mock-payment")]
    public IActionResult MockPayment([FromRoute] string orderId, [FromBody] MockPaymentRequest? request)
    {
        return Execute(() => _stateStore.PayOrder(orderId, request));
    }

    [HttpPost("orders/{orderId}/cancel")]
    public IActionResult CancelOrder([FromRoute] string orderId)
    {
        return Execute(() => _stateStore.CancelOrder(orderId));
    }

    [HttpGet("orders/{orderId}")]
    public IActionResult GetOrder([FromRoute] string orderId)
    {
        return Execute<object>(() =>
        {
            var order = _stateStore.GetCustomerOrder(orderId) ?? throw new KeyNotFoundException("Order not found");
            object response = string.Equals(order.Status, "PendingPayment", StringComparison.OrdinalIgnoreCase)
                ? new
                {
                    orderId = order.Id,
                    status = order.Status,
                    totalAmount = order.Price.TotalAmount,
                }
                : new
                {
                    id = order.Id,
                    storeId = order.StoreId,
                    storeName = order.StoreName,
                    deliveryDistanceKm = order.DeliveryDistanceKm,
                    deliveryRadiusKm = order.DeliveryRadiusKm,
                    status = order.Status,
                    statusText = order.StatusText,
                    estimatedArrivalMinutes = order.EstimatedArrivalMinutes,
                    riderName = order.RiderName,
                    riderLocation = order.RiderLocation,
                    address = order.Address,
                    items = order.Items,
                    price = order.Price,
                    timeline = order.Timeline,
                };
            return response;
        });
    }
}
