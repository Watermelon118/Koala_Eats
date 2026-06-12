using KoalaEats.Api;
using KoalaEats.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddDbContextFactory<KoalaEatsDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("KoalaEatsDatabase")
        ?? "Server=localhost;Database=KoalaEats;Trusted_Connection=True;TrustServerCertificate=True;";
    options.UseSqlServer(connectionString);
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("dev", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin();
    });
});
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

app.UseCors("dev");

app.MapControllers();

app.Run();
