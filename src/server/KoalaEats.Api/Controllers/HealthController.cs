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

public sealed record ApiResponse<T>(string Code, string Message, T? Data)
{
    public static ApiResponse<T> Ok(T data)
    {
        return new ApiResponse<T>("OK", "success", data);
    }
}

public sealed record HealthResponse(string Status, DateTimeOffset CheckedAtUtc);
