using KoalaEats.Api;
using Microsoft.AspNetCore.Mvc;

namespace KoalaEats.Api.Controllers;

[ApiController]
[Route("api/merchant")]
public sealed class MerchantController : ApiControllerBase
{
    private readonly BusinessStateStore _stateStore;

    public MerchantController(BusinessStateStore stateStore)
    {
        _stateStore = stateStore;
    }

    [HttpGet("dashboard")]
    public IActionResult GetDashboard()
    {
        return Execute(() => _stateStore.GetMerchantDashboard());
    }

    [HttpGet("orders")]
    public IActionResult GetOrders()
    {
        return Execute(() =>
            _stateStore.GetMerchantOrders().Select(order => new
            {
                id = order.Id,
                customerName = order.CustomerName,
                itemsSummary = order.ItemsSummary,
                status = order.StatusText,
                totalAmount = order.TotalAmount,
                placedMinutesAgo = order.PlacedMinutesAgo,
            }).ToArray());
    }

    [HttpPatch("orders/{orderId}/status")]
    public IActionResult UpdateOrderStatus([FromRoute] string orderId, [FromBody] UpdateMerchantOrderStatusRequest request)
    {
        return Execute(() => _stateStore.UpdateMerchantOrderStatus(orderId, request));
    }

    [HttpGet("menu-items")]
    public IActionResult GetMenuItems()
    {
        return Execute(() =>
            _stateStore.GetMerchantMenuItems().Select(item => new
            {
                id = item.Id,
                name = item.Name,
                price = item.Price,
                monthlySales = item.MonthlySales,
                tag = item.Tag,
            }).ToArray());
    }

    [HttpPatch("menu-items/{menuItemId}")]
    public IActionResult UpdateMenuItem([FromRoute] string menuItemId, [FromBody] UpdateMerchantMenuItemRequest request)
    {
        return Execute(() => _stateStore.UpdateMerchantMenuItem(menuItemId, request));
    }

    [HttpPatch("store-profile")]
    public IActionResult UpdateStoreProfile([FromBody] UpdateMerchantStoreProfileRequest request)
    {
        return Execute(() =>
        {
            var profile = _stateStore.UpdateMerchantStoreProfile(request);
            return new
            {
                id = profile.Id,
                isOpen = profile.IsOpen,
            };
        });
    }
}
