using KoalaEats.Api;
using Microsoft.AspNetCore.Mvc;

namespace KoalaEats.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminController : ApiControllerBase
{
    private readonly BusinessStateStore _stateStore;

    public AdminController(BusinessStateStore stateStore)
    {
        _stateStore = stateStore;
    }

    [HttpGet("dashboard")]
    public IActionResult GetDashboard()
    {
        return Execute(() => _stateStore.GetAdminDashboard());
    }

    [HttpGet("tasks")]
    public IActionResult GetTasks()
    {
        return Execute(() => _stateStore.GetAdminTasks());
    }

    [HttpGet("merchant-applications")]
    public IActionResult GetMerchantApplications()
    {
        return Execute(() => _stateStore.GetMerchantApplications());
    }

    [HttpPatch("merchant-applications/{applicationId}/status")]
    public IActionResult UpdateMerchantApplicationStatus([FromRoute] string applicationId, [FromBody] UpdateMerchantApplicationStatusRequest request)
    {
        return Execute(() => _stateStore.UpdateMerchantApplicationStatus(applicationId, request));
    }

    [HttpGet("orders")]
    public IActionResult GetOrders()
    {
        return Execute(() =>
            _stateStore.GetAdminOrders().Select(order => new
            {
                id = order.Id,
                storeName = order.StoreName,
                customerName = order.CustomerName,
                riderName = order.RiderName,
                status = order.Status,
                totalAmount = order.TotalAmount,
                riskLevel = order.RiskLevel,
            }).ToArray());
    }

    [HttpPatch("orders/{orderId}/assign-rider")]
    public IActionResult AssignRider([FromRoute] string orderId, [FromBody] AssignRiderRequest request)
    {
        return Execute(() => _stateStore.AssignRider(orderId, request));
    }

    [HttpPatch("accounts/{accountId}/status")]
    public IActionResult UpdateAccountStatus([FromRoute] string accountId, [FromBody] UpdateAccountStatusRequest request)
    {
        return Execute(() => _stateStore.UpdateAccountStatus(accountId, request));
    }

    [HttpPatch("delivery-areas/{deliveryAreaId}")]
    public IActionResult UpdateDeliveryArea([FromRoute] string deliveryAreaId, [FromBody] UpdateDeliveryAreaRequest request)
    {
        return Execute(() => _stateStore.UpdateDeliveryArea(deliveryAreaId, request));
    }
}
