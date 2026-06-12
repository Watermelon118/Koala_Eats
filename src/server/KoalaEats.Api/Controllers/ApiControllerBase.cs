using KoalaEats.Api;
using Microsoft.AspNetCore.Mvc;

namespace KoalaEats.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult Execute<T>(Func<T> action)
    {
        try
        {
            return Ok(ApiResponse<T>.Ok(action()));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail("NOT_FOUND", ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail("INVALID_STATE", ex.Message));
        }
        catch (Exception ex) when (ex.Message.Contains("Delivery address is outside this store delivery range", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResponse<object>.Fail("DELIVERY_OUT_OF_RANGE", ex.Message));
        }
        catch (Exception ex) when (ex.Message.Contains("Order can no longer be cancelled automatically", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(ApiResponse<object>.Fail("ORDER_CANNOT_CANCEL", ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponse<object>.Fail("INTERNAL_ERROR", ex.Message));
        }
    }
}
