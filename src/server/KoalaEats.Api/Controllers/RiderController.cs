using KoalaEats.Api;
using Microsoft.AspNetCore.Mvc;

namespace KoalaEats.Api.Controllers;

[ApiController]
[Route("api/rider")]
public sealed class RiderController : ApiControllerBase
{
    private readonly BusinessStateStore _stateStore;

    public RiderController(BusinessStateStore stateStore)
    {
        _stateStore = stateStore;
    }

    [HttpGet("dashboard")]
    public IActionResult GetDashboard()
    {
        return Execute(() => _stateStore.GetRiderDashboard());
    }

    [HttpGet("deliveries")]
    public IActionResult GetDeliveries()
    {
        return Execute(() =>
            _stateStore.GetDeliveries().Select(delivery => new
            {
                id = delivery.Id,
                storeName = delivery.StoreName,
                customerAddress = delivery.CustomerAddress,
                distanceKm = delivery.DistanceKm,
                fee = delivery.Fee,
                status = delivery.StatusText,
            }).ToArray());
    }

    [HttpPatch("deliveries/{deliveryId}/status")]
    public IActionResult UpdateDeliveryStatus([FromRoute] string deliveryId, [FromBody] UpdateDeliveryStatusRequest request)
    {
        return Execute(() => _stateStore.UpdateDeliveryStatus(deliveryId, request));
    }

    [HttpPost("location-reports")]
    public IActionResult ReportLocation([FromBody] ReportDeliveryLocationRequest request)
    {
        return Execute(() => _stateStore.ReportLocation(request));
    }
}
