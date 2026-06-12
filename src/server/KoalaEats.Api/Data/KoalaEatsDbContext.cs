using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KoalaEats.Api.Data;

public sealed class KoalaEatsDbContext : DbContext
{
    public KoalaEatsDbContext(DbContextOptions<KoalaEatsDbContext> options)
        : base(options)
    {
    }

    public DbSet<StoreEntity> Stores => Set<StoreEntity>();
    public DbSet<MenuCategoryEntity> MenuCategories => Set<MenuCategoryEntity>();
    public DbSet<MenuItemEntity> MenuItems => Set<MenuItemEntity>();
    public DbSet<MenuOptionGroupEntity> MenuOptionGroups => Set<MenuOptionGroupEntity>();
    public DbSet<MenuOptionEntity> MenuOptions => Set<MenuOptionEntity>();
    public DbSet<CustomerEntity> Customers => Set<CustomerEntity>();
    public DbSet<CustomerAddressEntity> CustomerAddresses => Set<CustomerAddressEntity>();
    public DbSet<OrderEntity> Orders => Set<OrderEntity>();
    public DbSet<OrderItemEntity> OrderItems => Set<OrderItemEntity>();
    public DbSet<OrderItemOptionEntity> OrderItemOptions => Set<OrderItemOptionEntity>();
    public DbSet<OrderStatusEventEntity> OrderStatusEvents => Set<OrderStatusEventEntity>();
    public DbSet<RiderEntity> Riders => Set<RiderEntity>();
    public DbSet<DeliveryTaskEntity> DeliveryTasks => Set<DeliveryTaskEntity>();
    public DbSet<MerchantApplicationEntity> MerchantApplications => Set<MerchantApplicationEntity>();
    public DbSet<PlatformOrderEntity> PlatformOrders => Set<PlatformOrderEntity>();
    public DbSet<AccountEntity> Accounts => Set<AccountEntity>();
    public DbSet<DeliveryAreaEntity> DeliveryAreas => Set<DeliveryAreaEntity>();
    public DbSet<AdminTaskEntity> AdminTasks => Set<AdminTaskEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureStringEntity<StoreEntity>(modelBuilder.Entity<StoreEntity>(), "Stores");
        modelBuilder.Entity<StoreEntity>(builder =>
        {
            builder.Property(entity => entity.Name).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Category).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Rating).HasPrecision(3, 1);
            builder.Property(entity => entity.DeliveryFee).HasPrecision(10, 2);
            builder.Property(entity => entity.MinOrderAmount).HasPrecision(10, 2);
            builder.Property(entity => entity.DeliveryRadiusKm).HasPrecision(10, 2);
            builder.Property(entity => entity.Promotion).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.CoverTone).HasMaxLength(50).IsRequired();
            builder.Property(entity => entity.OpeningHours).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Announcement).HasMaxLength(500).IsRequired();
            builder.Property(entity => entity.AddressLine).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.LocationLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.LocationLongitude).HasPrecision(9, 6);
            builder.Property(entity => entity.MerchantAccountId).HasMaxLength(64);
            builder.HasIndex(entity => entity.MerchantAccountId);
        });

        ConfigureStringEntity<MenuCategoryEntity>(modelBuilder.Entity<MenuCategoryEntity>(), "MenuCategories");
        modelBuilder.Entity<MenuCategoryEntity>(builder =>
        {
            builder.Property(entity => entity.StoreId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.Name).HasMaxLength(100).IsRequired();
            builder.HasIndex(entity => new { entity.StoreId, entity.SortOrder });
            builder.HasIndex(entity => new { entity.StoreId, entity.Name }).IsUnique();
        });

        ConfigureStringEntity<MenuItemEntity>(modelBuilder.Entity<MenuItemEntity>(), "MenuItems");
        modelBuilder.Entity<MenuItemEntity>(builder =>
        {
            builder.Property(entity => entity.StoreId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.MenuCategoryId).HasMaxLength(64);
            builder.Property(entity => entity.Name).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Description).HasMaxLength(500).IsRequired();
            builder.Property(entity => entity.Price).HasPrecision(10, 2);
            builder.Property(entity => entity.Tag).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.ImageTone).HasMaxLength(50).IsRequired();
            builder.HasIndex(entity => new { entity.StoreId, entity.MenuCategoryId, entity.SortOrder });
        });

        ConfigureStringEntity<MenuOptionGroupEntity>(modelBuilder.Entity<MenuOptionGroupEntity>(), "MenuOptionGroups");
        modelBuilder.Entity<MenuOptionGroupEntity>(builder =>
        {
            builder.Property(entity => entity.MenuItemId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.Name).HasMaxLength(100).IsRequired();
            builder.HasIndex(entity => new { entity.MenuItemId, entity.SortOrder });
        });

        ConfigureStringEntity<MenuOptionEntity>(modelBuilder.Entity<MenuOptionEntity>(), "MenuOptions");
        modelBuilder.Entity<MenuOptionEntity>(builder =>
        {
            builder.Property(entity => entity.MenuOptionGroupId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.Name).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.PriceDelta).HasPrecision(10, 2);
            builder.HasIndex(entity => new { entity.MenuOptionGroupId, entity.SortOrder });
        });

        ConfigureStringEntity<CustomerEntity>(modelBuilder.Entity<CustomerEntity>(), "Customers");
        modelBuilder.Entity<CustomerEntity>(builder =>
        {
            builder.Property(entity => entity.Name).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Phone).HasMaxLength(40);
            builder.Property(entity => entity.Email).HasMaxLength(200);
        });

        ConfigureStringEntity<CustomerAddressEntity>(modelBuilder.Entity<CustomerAddressEntity>(), "CustomerAddresses");
        modelBuilder.Entity<CustomerAddressEntity>(builder =>
        {
            builder.Property(entity => entity.CustomerId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.Label).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.ReceiverName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.PhoneMasked).HasMaxLength(40);
            builder.Property(entity => entity.AddressLine).HasMaxLength(300).IsRequired();
            builder.Property(entity => entity.Detail).HasMaxLength(300);
            builder.Property(entity => entity.PlaceId).HasMaxLength(200);
            builder.Property(entity => entity.Latitude).HasPrecision(9, 6);
            builder.Property(entity => entity.Longitude).HasPrecision(9, 6);
            builder.HasIndex(entity => new { entity.CustomerId, entity.IsDefault });
        });

        ConfigureStringEntity<OrderEntity>(modelBuilder.Entity<OrderEntity>(), "Orders");
        modelBuilder.Entity<OrderEntity>(builder =>
        {
            builder.Property(entity => entity.StoreId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.StoreName).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.StoreLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.StoreLongitude).HasPrecision(9, 6);
            builder.Property(entity => entity.DeliveryRadiusKm).HasPrecision(10, 2);
            builder.Property(entity => entity.CustomerId).HasMaxLength(64);
            builder.Property(entity => entity.CustomerName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.CustomerPhoneMasked).HasMaxLength(40);
            builder.Property(entity => entity.CustomerAddressId).HasMaxLength(64);
            builder.Property(entity => entity.ReceiverName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.AddressLabel).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.AddressLine).HasMaxLength(300).IsRequired();
            builder.Property(entity => entity.AddressDetail).HasMaxLength(300);
            builder.Property(entity => entity.AddressLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.AddressLongitude).HasPrecision(9, 6);
            builder.Property(entity => entity.DeliveryDistanceKm).HasPrecision(10, 2);
            builder.Property(entity => entity.Status).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.StatusText).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.PaymentStatus).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.ItemsAmount).HasPrecision(10, 2);
            builder.Property(entity => entity.DeliveryFee).HasPrecision(10, 2);
            builder.Property(entity => entity.PackagingFee).HasPrecision(10, 2);
            builder.Property(entity => entity.DiscountAmount).HasPrecision(10, 2);
            builder.Property(entity => entity.TotalAmount).HasPrecision(10, 2);
            builder.Property(entity => entity.Remark).HasMaxLength(500);
            builder.Property(entity => entity.PaymentMethod).HasMaxLength(50);
            builder.Property(entity => entity.RiderId).HasMaxLength(64);
            builder.Property(entity => entity.RiderName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.RiderPhoneMasked).HasMaxLength(40);
            builder.Property(entity => entity.RiderLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.RiderLongitude).HasPrecision(9, 6);
            builder.HasIndex(entity => new { entity.StoreId, entity.PlacedAtUtc });
            builder.HasIndex(entity => new { entity.CustomerId, entity.PlacedAtUtc });
            builder.HasIndex(entity => new { entity.Status, entity.LastStatusChangedAtUtc });
        });

        ConfigureStringEntity<OrderItemEntity>(modelBuilder.Entity<OrderItemEntity>(), "OrderItems");
        modelBuilder.Entity<OrderItemEntity>(builder =>
        {
            builder.Property(entity => entity.OrderId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.MenuItemId).HasMaxLength(64);
            builder.Property(entity => entity.Name).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.CategoryId).HasMaxLength(64);
            builder.Property(entity => entity.CategoryName).HasMaxLength(100);
            builder.Property(entity => entity.UnitPrice).HasPrecision(10, 2);
            builder.Property(entity => entity.LineTotal).HasPrecision(10, 2);
            builder.Property(entity => entity.CartKey).HasMaxLength(200);
            builder.HasIndex(entity => new { entity.OrderId, entity.SortOrder });
        });

        ConfigureStringEntity<OrderItemOptionEntity>(modelBuilder.Entity<OrderItemOptionEntity>(), "OrderItemOptions");
        modelBuilder.Entity<OrderItemOptionEntity>(builder =>
        {
            builder.Property(entity => entity.OrderItemId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.GroupId).HasMaxLength(64);
            builder.Property(entity => entity.GroupName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.OptionId).HasMaxLength(64);
            builder.Property(entity => entity.OptionName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.PriceDelta).HasPrecision(10, 2);
            builder.HasIndex(entity => entity.OrderItemId);
        });

        ConfigureStringEntity<OrderStatusEventEntity>(modelBuilder.Entity<OrderStatusEventEntity>(), "OrderStatusEvents");
        modelBuilder.Entity<OrderStatusEventEntity>(builder =>
        {
            builder.Property(entity => entity.OrderId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.Status).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.StatusText).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Description).HasMaxLength(300).IsRequired();
            builder.Property(entity => entity.Source).HasMaxLength(40).IsRequired();
            builder.HasIndex(entity => new { entity.OrderId, entity.HappenedAtUtc });
        });

        ConfigureStringEntity<RiderEntity>(modelBuilder.Entity<RiderEntity>(), "Riders");
        modelBuilder.Entity<RiderEntity>(builder =>
        {
            builder.Property(entity => entity.AccountId).HasMaxLength(64);
            builder.Property(entity => entity.Name).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Phone).HasMaxLength(40);
            builder.Property(entity => entity.Status).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.CurrentLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.CurrentLongitude).HasPrecision(9, 6);
            builder.Property(entity => entity.Rating).HasPrecision(3, 2);
            builder.HasIndex(entity => entity.AccountId);
        });

        ConfigureStringEntity<DeliveryTaskEntity>(modelBuilder.Entity<DeliveryTaskEntity>(), "DeliveryTasks");
        modelBuilder.Entity<DeliveryTaskEntity>(builder =>
        {
            builder.Property(entity => entity.OrderId).HasMaxLength(64).IsRequired();
            builder.Property(entity => entity.RiderId).HasMaxLength(64);
            builder.Property(entity => entity.StoreName).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.PickupAddress).HasMaxLength(300).IsRequired();
            builder.Property(entity => entity.CustomerAddress).HasMaxLength(300).IsRequired();
            builder.Property(entity => entity.DistanceKm).HasPrecision(10, 2);
            builder.Property(entity => entity.Fee).HasPrecision(10, 2);
            builder.Property(entity => entity.Status).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.StatusText).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.PickupCode).HasMaxLength(20).IsRequired();
            builder.Property(entity => entity.CustomerPhoneMasked).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.EstimatedMinutes).HasDefaultValue(0);
            builder.Property(entity => entity.PickupLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.PickupLongitude).HasPrecision(9, 6);
            builder.Property(entity => entity.DropoffLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.DropoffLongitude).HasPrecision(9, 6);
            builder.Property(entity => entity.CurrentLatitude).HasPrecision(9, 6);
            builder.Property(entity => entity.CurrentLongitude).HasPrecision(9, 6);
            builder.HasIndex(entity => new { entity.Status, entity.CreatedAtUtc });
            builder.HasIndex(entity => entity.OrderId).IsUnique();
        });

        ConfigureStringEntity<MerchantApplicationEntity>(modelBuilder.Entity<MerchantApplicationEntity>(), "MerchantApplications");
        modelBuilder.Entity<MerchantApplicationEntity>(builder =>
        {
            builder.Property(entity => entity.StoreName).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.ApplicantName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Category).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Address).HasMaxLength(300).IsRequired();
            builder.Property(entity => entity.Status).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.ReviewedBy).HasMaxLength(100);
            builder.HasIndex(entity => entity.Status);
        });

        ConfigureStringEntity<PlatformOrderEntity>(modelBuilder.Entity<PlatformOrderEntity>(), "PlatformOrders");
        modelBuilder.Entity<PlatformOrderEntity>(builder =>
        {
            builder.Property(entity => entity.OrderId).HasMaxLength(64);
            builder.Property(entity => entity.StoreName).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.CustomerName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.RiderName).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Status).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.TotalAmount).HasPrecision(10, 2);
            builder.Property(entity => entity.RiskLevel).HasMaxLength(20).IsRequired();
            builder.Property(entity => entity.Reason).HasMaxLength(300);
            builder.HasIndex(entity => entity.RiskLevel);
            builder.HasIndex(entity => entity.OrderId);
        });

        ConfigureStringEntity<AccountEntity>(modelBuilder.Entity<AccountEntity>(), "Accounts");
        modelBuilder.Entity<AccountEntity>(builder =>
        {
            builder.Property(entity => entity.Name).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Role).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.Status).HasMaxLength(40).IsRequired();
            builder.Property(entity => entity.Phone).HasMaxLength(40);
            builder.Property(entity => entity.Email).HasMaxLength(200);
            builder.HasIndex(entity => new { entity.Role, entity.Status });
        });

        ConfigureStringEntity<DeliveryAreaEntity>(modelBuilder.Entity<DeliveryAreaEntity>(), "DeliveryAreas");
        modelBuilder.Entity<DeliveryAreaEntity>(builder =>
        {
            builder.Property(entity => entity.Name).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.RadiusKm).HasPrecision(10, 2);
            builder.Property(entity => entity.BaseFee).HasPrecision(10, 2);
            builder.HasIndex(entity => entity.IsEnabled);
        });

        ConfigureStringEntity<AdminTaskEntity>(modelBuilder.Entity<AdminTaskEntity>(), "AdminTasks");
        modelBuilder.Entity<AdminTaskEntity>(builder =>
        {
            builder.Property(entity => entity.Title).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Owner).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Status).HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Severity).HasMaxLength(40).IsRequired();
            builder.HasIndex(entity => entity.Severity);
        });
    }

    private static void ConfigureStringEntity<TEntity>(EntityTypeBuilder<TEntity> builder, string tableName)
        where TEntity : class, IStringIdEntity
    {
        builder.ToTable(tableName);
        builder.HasKey(entity => entity.Id);
        builder.Property(entity => entity.Id).HasMaxLength(64).IsRequired().ValueGeneratedNever();
    }
}
