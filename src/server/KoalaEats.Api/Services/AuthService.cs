using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace KoalaEats.Api;

public static class AppRoles
{
    public const string Customer = "Customer";
    public const string Merchant = "Merchant";
    public const string Rider = "Rider";
    public const string Admin = "Admin";
}

public sealed record AuthenticatedUser
{
    public required string Id { get; init; }
    public required string Email { get; init; }
    public required string DisplayName { get; init; }
    public required string Role { get; init; }
}

public sealed record LoginRequest
{
    public required string Email { get; init; }
    public required string Password { get; init; }
    public required string Role { get; init; }
}

public sealed record LoginResponse
{
    public required string AccessToken { get; init; }
    public required DateTimeOffset ExpiresAtUtc { get; init; }
    public required AuthenticatedUser User { get; init; }
}

public sealed record DemoAccountOptions
{
    public required string Id { get; init; }
    public required string Email { get; init; }
    public required string DisplayName { get; init; }
    public required string Role { get; init; }
    public required string Password { get; init; }
}

public sealed class AuthService
{
    private readonly IConfiguration _configuration;
    private readonly DemoAccountOptions[] _demoAccounts;

    public AuthService(IConfiguration configuration)
    {
        _configuration = configuration;
        _demoAccounts = configuration.GetSection("Auth:DemoAccounts").Get<DemoAccountOptions[]>()
            ?? BuildDevelopmentAccounts();
    }

    public LoginResponse Login(LoginRequest request)
    {
        var account = _demoAccounts.FirstOrDefault(candidate =>
            string.Equals(candidate.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase) &&
            string.Equals(candidate.Role, request.Role.Trim(), StringComparison.OrdinalIgnoreCase));

        if (account is null || account.Password != request.Password)
        {
            throw new UnauthorizedAccessException("Invalid email, password, or role");
        }

        var user = new AuthenticatedUser
        {
            Id = account.Id,
            Email = account.Email,
            DisplayName = account.DisplayName,
            Role = account.Role,
        };
        var expiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(GetTokenLifetimeMinutes());

        return new LoginResponse
        {
            AccessToken = CreateAccessToken(user, expiresAtUtc),
            ExpiresAtUtc = expiresAtUtc,
            User = user,
        };
    }

    public static AuthenticatedUser GetCurrentUser(ClaimsPrincipal principal)
    {
        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("Missing authenticated user id");
        var email = principal.FindFirstValue(ClaimTypes.Email)
            ?? throw new UnauthorizedAccessException("Missing authenticated user email");
        var displayName = principal.FindFirstValue(ClaimTypes.Name)
            ?? throw new UnauthorizedAccessException("Missing authenticated user name");
        var role = principal.FindFirstValue(ClaimTypes.Role)
            ?? throw new UnauthorizedAccessException("Missing authenticated user role");

        return new AuthenticatedUser
        {
            Id = id,
            Email = email,
            DisplayName = displayName,
            Role = role,
        };
    }

    private string CreateAccessToken(AuthenticatedUser user, DateTimeOffset expiresAtUtc)
    {
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetSigningKey(_configuration)));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role),
        };
        var token = new JwtSecurityToken(
            issuer: GetIssuer(_configuration),
            audience: GetAudience(_configuration),
            claims: claims,
            expires: expiresAtUtc.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetTokenLifetimeMinutes()
    {
        var configuredMinutes = _configuration.GetValue<int?>("Auth:AccessTokenMinutes");
        return configuredMinutes is > 0 ? configuredMinutes.Value : 120;
    }

    public static string GetIssuer(IConfiguration configuration)
    {
        return configuration["Auth:Issuer"] ?? "KoalaEats.Api";
    }

    public static string GetAudience(IConfiguration configuration)
    {
        return configuration["Auth:Audience"] ?? "KoalaEats.Web";
    }

    public static string GetSigningKey(IConfiguration configuration)
    {
        return configuration["Auth:SigningKey"]
            ?? "development-only-koala-eats-signing-key-change-before-cloud-2026";
    }

    private static DemoAccountOptions[] BuildDevelopmentAccounts()
    {
        return
        [
            new DemoAccountOptions { Id = "U-1001", Email = "customer@koala.test", DisplayName = "Shuaijie", Role = AppRoles.Customer, Password = "Customer#2026" },
            new DemoAccountOptions { Id = "M-2001", Email = "merchant@koala.test", DisplayName = "Koala Bowl", Role = AppRoles.Merchant, Password = "Merchant#2026" },
            new DemoAccountOptions { Id = "R-3001", Email = "rider@koala.test", DisplayName = "Liam", Role = AppRoles.Rider, Password = "Rider#2026" },
            new DemoAccountOptions { Id = "A-9001", Email = "admin@koala.test", DisplayName = "Platform Admin", Role = AppRoles.Admin, Password = "Admin#2026" },
        ];
    }
}
