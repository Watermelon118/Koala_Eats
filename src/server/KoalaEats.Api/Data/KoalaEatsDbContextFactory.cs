using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace KoalaEats.Api.Data;

public sealed class KoalaEatsDbContextFactory : IDesignTimeDbContextFactory<KoalaEatsDbContext>
{
    public KoalaEatsDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("KoalaEatsDatabase")
            ?? "Server=localhost;Database=KoalaEats;Trusted_Connection=True;TrustServerCertificate=True;";

        var optionsBuilder = new DbContextOptionsBuilder<KoalaEatsDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new KoalaEatsDbContext(optionsBuilder.Options);
    }
}
