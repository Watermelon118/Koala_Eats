using KoalaEats.Api;
using Microsoft.AspNetCore.Mvc;

namespace KoalaEats.Api.Controllers;

[ApiController]
[Route("api/mock")]
public sealed class MockController : ApiControllerBase
{
    private readonly BusinessStateStore _stateStore;

    public MockController(BusinessStateStore stateStore)
    {
        _stateStore = stateStore;
    }

    [HttpGet("state")]
    public IActionResult GetState()
    {
        return Execute(() => _stateStore.GetMockStateSnapshot());
    }

    [HttpPost("reset")]
    public IActionResult Reset()
    {
        return Execute(() =>
        {
            _stateStore.Reset();
            return _stateStore.GetMockStateSnapshot();
        });
    }
}
