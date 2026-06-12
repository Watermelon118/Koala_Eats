using KoalaEats.Api;
using Microsoft.AspNetCore.Mvc;

namespace KoalaEats.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<HealthResponse>> GetHealth()
    {
        return Ok(ApiResponse<HealthResponse>.Ok(new HealthResponse("ok", DateTimeOffset.UtcNow)));
    }
}
