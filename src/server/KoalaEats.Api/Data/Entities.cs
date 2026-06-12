namespace KoalaEats.Api.Data;

public interface IStringIdEntity
{
    string Id { get; set; }
}

public sealed class StoreEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string? MerchantAccountId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public int MonthlySales { get; set; }
    public int DeliveryMinutes { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal MinOrderAmount { get; set; }
    public decimal DeliveryRadiusKm { get; set; }
    public string Promotion { get; set; } = string.Empty;
    public string CoverTone { get; set; } = string.Empty;
    public bool IsOpen { get; set; }
    public string OpeningHours { get; set; } = string.Empty;
    public string Announcement { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public decimal LocationLatitude { get; set; }
    public decimal LocationLongitude { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class MenuCategoryEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public sealed class MenuItemEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string? MenuCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int MonthlySales { get; set; }
    public string Tag { get; set; } = string.Empty;
    public int Stock { get; set; }
    public bool IsAvailable { get; set; }
    public string ImageTone { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public sealed class MenuOptionGroupEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string MenuItemId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Required { get; set; }
    public int SortOrder { get; set; }
}

public sealed class MenuOptionEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string MenuOptionGroupId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal PriceDelta { get; set; }
    public int SortOrder { get; set; }
}

public sealed class CustomerEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class CustomerAddressEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string ReceiverName { get; set; } = string.Empty;
    public string? PhoneMasked { get; set; }
    public string AddressLine { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? PlaceId { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public bool IsDefault { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class OrderEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public decimal StoreLatitude { get; set; }
    public decimal StoreLongitude { get; set; }
    public decimal DeliveryRadiusKm { get; set; }
    public string? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhoneMasked { get; set; }
    public string? CustomerAddressId { get; set; }
    public string ReceiverName { get; set; } = string.Empty;
    public string AddressLabel { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string? AddressDetail { get; set; }
    public decimal AddressLatitude { get; set; }
    public decimal AddressLongitude { get; set; }
    public decimal DeliveryDistanceKm { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusText { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal ItemsAmount { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal PackagingFee { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Remark { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTimeOffset PlacedAtUtc { get; set; }
    public DateTimeOffset? PaidAtUtc { get; set; }
    public DateTimeOffset? CanceledAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public DateTimeOffset LastStatusChangedAtUtc { get; set; }
    public int EstimatedArrivalMinutes { get; set; }
    public string? RiderId { get; set; }
    public string RiderName { get; set; } = string.Empty;
    public string? RiderPhoneMasked { get; set; }
    public decimal RiderLatitude { get; set; }
    public decimal RiderLongitude { get; set; }
}

public sealed class OrderItemEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string? MenuItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string? CartKey { get; set; }
    public int SortOrder { get; set; }
}

public sealed class OrderItemOptionEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string OrderItemId { get; set; } = string.Empty;
    public string? GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string? OptionId { get; set; }
    public string OptionName { get; set; } = string.Empty;
    public decimal PriceDelta { get; set; }
}

public sealed class OrderStatusEventEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusText { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public DateTimeOffset HappenedAtUtc { get; set; }
}

public sealed class RiderEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string? AccountId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal CurrentLatitude { get; set; }
    public decimal CurrentLongitude { get; set; }
    public decimal Rating { get; set; }
    public bool IsOnline { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class DeliveryTaskEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string? RiderId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string PickupAddress { get; set; } = string.Empty;
    public string CustomerAddress { get; set; } = string.Empty;
    public decimal DistanceKm { get; set; }
    public decimal Fee { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusText { get; set; } = string.Empty;
    public string PickupCode { get; set; } = string.Empty;
    public string CustomerPhoneMasked { get; set; } = string.Empty;
    public int EstimatedMinutes { get; set; }
    public decimal PickupLatitude { get; set; }
    public decimal PickupLongitude { get; set; }
    public decimal DropoffLatitude { get; set; }
    public decimal DropoffLongitude { get; set; }
    public decimal? CurrentLatitude { get; set; }
    public decimal? CurrentLongitude { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class MerchantApplicationEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public DateTimeOffset SubmittedAtUtc { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTimeOffset? ReviewedAtUtc { get; set; }
    public string? ReviewedBy { get; set; }
}

public sealed class PlatformOrderEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string? OrderId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string RiderName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class AccountEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class DeliveryAreaEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal RadiusKm { get; set; }
    public decimal BaseFee { get; set; }
    public bool IsEnabled { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class AdminTaskEntity : IStringIdEntity
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}
