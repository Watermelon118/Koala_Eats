using KoalaEats.Api;
using KoalaEats.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

ValidateCloudConfiguration(builder.Configuration, builder.Environment);

builder.Services.AddControllers();
builder.Services.AddDbContextFactory<KoalaEatsDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("KoalaEatsDatabase")
        ?? "Server=localhost;Database=KoalaEats;Trusted_Connection=True;TrustServerCertificate=True;";
    options.UseSqlServer(connectionString);
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
    {
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        var allowedOrigins = configuredOrigins is { Length: > 0 }
            ? configuredOrigins
            :
            [
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:5176",
                "http://192.168.88.100:5173",
                "http://192.168.88.100:5174",
                "http://192.168.88.100:5175",
                "http://192.168.88.100:5176",
            ];

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = AuthService.GetIssuer(builder.Configuration),
            ValidAudience = AuthService.GetAudience(builder.Configuration),
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AuthService.GetSigningKey(builder.Configuration))),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<BusinessStateStore>();
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<KoalaEatsDbContext>>();
    await using var dbContext = await dbContextFactory.CreateDbContextAsync();
    await dbContext.Database.MigrateAsync();
    _ = scope.ServiceProvider.GetRequiredService<BusinessStateStore>();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static void ValidateCloudConfiguration(IConfiguration configuration, IWebHostEnvironment environment)
{
    if (environment.IsDevelopment())
    {
        return;
    }

    var signingKey = configuration["Auth:SigningKey"];
    if (string.IsNullOrWhiteSpace(signingKey) || signingKey.Length < 32)
    {
        throw new InvalidOperationException("Auth:SigningKey must be configured with at least 32 characters outside Development.");
    }

    var connectionString = configuration.GetConnectionString("KoalaEatsDatabase");
    if (string.IsNullOrWhiteSpace(connectionString) ||
        connectionString.Contains("localhost", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("ConnectionStrings:KoalaEatsDatabase must point to Azure SQL outside Development.");
    }

    var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (allowedOrigins is not { Length: > 0 })
    {
        throw new InvalidOperationException("Cors:AllowedOrigins must be configured outside Development.");
    }
}
