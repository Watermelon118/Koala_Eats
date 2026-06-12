namespace KoalaEats.Api;

public sealed record ApiResponse<T>(string Code, string Message, T? Data)
{
    public static ApiResponse<T> Ok(T data) => new("OK", "success", data);

    public static ApiResponse<T> Fail(string code, string message) => new(code, message, default);
}

public sealed record Coordinates
{
    public required double Latitude { get; init; }
    public required double Longitude { get; init; }
}

public sealed record MenuOption
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required decimal PriceDelta { get; init; }
}

public sealed record MenuOptionGroup
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required bool Required { get; init; }
    public required MenuOption[] Options { get; init; }
}

public sealed record MenuCategory
{
    public required string Id { get; init; }
    public required string Name { get; init; }
}

public sealed record MenuItem
{
    public required string Id { get; init; }
    public required string CategoryId { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required decimal Price { get; init; }
    public required int MonthlySales { get; init; }
    public required string Tag { get; init; }
    public required int Stock { get; init; }
    public required bool IsAvailable { get; init; }
    public required string ImageTone { get; init; }
    public MenuOptionGroup[]? OptionGroups { get; init; }
}

public sealed record MerchantMenuItem
{
    public required string Id { get; init; }
    public required string CategoryId { get; init; }
    public required string CategoryName { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required decimal Price { get; init; }
    public required int MonthlySales { get; init; }
    public required string Tag { get; init; }
    public required int Stock { get; init; }
    public required bool IsAvailable { get; init; }
    public required string ImageTone { get; init; }
    public MenuOptionGroup[]? OptionGroups { get; init; }
}

public sealed record StoreSummary
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Category { get; init; }
    public required decimal Rating { get; init; }
    public required int MonthlySales { get; init; }
    public required int DeliveryMinutes { get; init; }
    public required decimal DeliveryFee { get; init; }
    public required decimal DistanceKm { get; init; }
    public required string Promotion { get; init; }
    public required string CoverTone { get; init; }
    public required string Address { get; init; }
    public required string OpeningHours { get; init; }
    public required string Announcement { get; init; }
    public required decimal MinOrderAmount { get; init; }
    public required decimal AveragePrice { get; init; }
    public required decimal DeliveryRadiusKm { get; init; }
    public required string[] ServiceTags { get; init; }
    public required Coordinates Location { get; init; }
    public required MenuCategory[] MenuCategories { get; init; }
    public required MenuItem[] Menu { get; init; }
}

public sealed record CustomerAddress
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public required string ReceiverName { get; init; }
    public required string PhoneMasked { get; init; }
    public required string AddressLine { get; init; }
    public required string Detail { get; init; }
    public string? PlaceId { get; init; }
    public required Coordinates Coordinates { get; init; }
}

public sealed record SelectedMenuOption
{
    public required string GroupId { get; init; }
    public required string GroupName { get; init; }
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required decimal PriceDelta { get; init; }
}

public sealed record CartLine
{
    public string? MenuItemId { get; init; }
    public string? Id { get; init; }
    public string? CategoryId { get; init; }
    public string? CategoryName { get; init; }
    public string? Name { get; init; }
    public string? Description { get; init; }
    public decimal? Price { get; init; }
    public int? MonthlySales { get; init; }
    public string? Tag { get; init; }
    public int? Stock { get; init; }
    public bool? IsAvailable { get; init; }
    public string? ImageTone { get; init; }
    public string? CartKey { get; init; }
    public required int Quantity { get; init; }
    public SelectedMenuOption[]? SelectedOptions { get; init; }
    public decimal? UnitPrice { get; init; }
}

public sealed record OrderPricePreview
{
    public required decimal ItemsAmount { get; init; }
    public required decimal DeliveryFee { get; init; }
    public required decimal PackagingFee { get; init; }
    public required decimal DiscountAmount { get; init; }
    public required decimal TotalAmount { get; init; }
}

public sealed record OrderTimelineStep
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public required string Description { get; init; }
    public required string HappenedAt { get; init; }
    public required bool IsCompleted { get; init; }
}

public sealed record CustomerOrder
{
    public required string Id { get; init; }
    public required string StoreId { get; init; }
    public required string StoreName { get; init; }
    public decimal? DeliveryDistanceKm { get; init; }
    public decimal? DeliveryRadiusKm { get; init; }
    public required string Status { get; init; }
    public required string StatusText { get; init; }
    public required CustomerAddress Address { get; init; }
    public required CartLine[] Items { get; init; }
    public required OrderPricePreview Price { get; init; }
    public required string RiderName { get; init; }
    public required string RiderPhoneMasked { get; init; }
    public required Coordinates RiderLocation { get; init; }
    public required int EstimatedArrivalMinutes { get; init; }
    public required OrderTimelineStep[] Timeline { get; init; }
    public string? Remark { get; init; }
}

public sealed record MerchantOrder
{
    public required string Id { get; init; }
    public required string CustomerName { get; init; }
    public required string ItemsSummary { get; init; }
    public required CartLine[] Items { get; init; }
    public required string Status { get; init; }
    public required string StatusText { get; init; }
    public required decimal TotalAmount { get; init; }
    public required int PlacedMinutesAgo { get; init; }
    public required string DeliveryAddressMasked { get; init; }
    public required string CustomerNote { get; init; }
    public required string PaymentStatus { get; init; }
}

public sealed record MerchantStoreProfile
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Address { get; init; }
    public required string OpeningHours { get; init; }
    public required bool IsOpen { get; init; }
    public required decimal DeliveryRadiusKm { get; init; }
    public required int AveragePreparationMinutes { get; init; }
    public required string Announcement { get; init; }
    public required Coordinates Coordinates { get; init; }
}

public sealed record DeliveryTask
{
    public required string Id { get; init; }
    public required string OrderId { get; init; }
    public required string StoreName { get; init; }
    public required string PickupAddress { get; init; }
    public required string CustomerAddress { get; init; }
    public required decimal DistanceKm { get; init; }
    public required decimal Fee { get; init; }
    public required string Status { get; init; }
    public required string StatusText { get; init; }
    public required string PickupCode { get; init; }
    public required string CustomerPhoneMasked { get; init; }
    public required int EstimatedMinutes { get; init; }
    public required Coordinates PickupLocation { get; init; }
    public required Coordinates DropoffLocation { get; init; }
    public Coordinates? CurrentLocation { get; init; }
}

public sealed record MerchantApplication
{
    public required string Id { get; init; }
    public required string StoreName { get; init; }
    public required string ApplicantName { get; init; }
    public required string Category { get; init; }
    public required string Address { get; init; }
    public required int SubmittedHoursAgo { get; init; }
    public required string Status { get; init; }
}

public sealed record PlatformOrder
{
    public required string Id { get; init; }
    public required string StoreName { get; init; }
    public required string CustomerName { get; init; }
    public required string RiderName { get; init; }
    public required string Status { get; init; }
    public required decimal TotalAmount { get; init; }
    public required string RiskLevel { get; init; }
}

public sealed record AccountRecord
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Role { get; init; }
    public required string Status { get; init; }
}

public sealed record DeliveryArea
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required decimal RadiusKm { get; init; }
    public required decimal BaseFee { get; init; }
    public required bool IsEnabled { get; init; }
}

public sealed record AdminTask
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Owner { get; init; }
    public required string Status { get; init; }
    public required string Severity { get; init; }
}

public sealed record MockBusinessStateSnapshot
{
    public required CustomerOrder[] CustomerOrders { get; init; }
    public required MerchantOrder[] MerchantOrders { get; init; }
    public required MerchantMenuItem[] MerchantMenuItems { get; init; }
    public required MerchantStoreProfile MerchantProfile { get; init; }
    public required DeliveryTask[] DeliveryTasks { get; init; }
    public required MerchantApplication[] MerchantApplications { get; init; }
    public required PlatformOrder[] PlatformOrders { get; init; }
    public required AccountRecord[] AccountRecords { get; init; }
    public required DeliveryArea[] DeliveryAreas { get; init; }
}

public sealed record PreviewOrderItemRequest
{
    public string? MenuItemId { get; init; }
    public string? Id { get; init; }
    public required int Quantity { get; init; }
    public SelectedMenuOption[]? SelectedOptions { get; init; }
    public decimal? UnitPrice { get; init; }
}

public sealed record PreviewOrderRequest
{
    public required string StoreId { get; init; }
    public required PreviewOrderItemRequest[] Items { get; init; }
}

public sealed record CreateCustomerOrderRequest
{
    public required string StoreId { get; init; }
    public required string StoreName { get; init; }
    public required Coordinates StoreLocation { get; init; }
    public required decimal DeliveryRadiusKm { get; init; }
    public required CreateCustomerAddressRequest Address { get; init; }
    public required CartLine[] Items { get; init; }
    public OrderPricePreview? Price { get; init; }
    public string? Remark { get; init; }
}

public sealed record CreateCustomerAddressRequest
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public string? ReceiverName { get; init; }
    public string? PhoneMasked { get; init; }
    public required string AddressLine { get; init; }
    public string? Detail { get; init; }
    public string? PlaceId { get; init; }
    public required Coordinates Coordinates { get; init; }
}

public sealed record MockPaymentRequest
{
    public string? PaymentMethod { get; init; }
}

public sealed record UpdateMerchantOrderStatusRequest
{
    public required string Status { get; init; }
}

public sealed record UpdateMerchantMenuItemRequest
{
    public bool? IsAvailable { get; init; }
    public int? Stock { get; init; }
    public decimal? Price { get; init; }
}

public sealed record UpdateMerchantStoreProfileRequest
{
    public bool? IsOpen { get; init; }
    public string? OpeningHours { get; init; }
    public string? Announcement { get; init; }
    public decimal? DeliveryRadiusKm { get; init; }
    public Coordinates? Coordinates { get; init; }
    public string? Address { get; init; }
}

public sealed record UpdateDeliveryStatusRequest
{
    public required string Status { get; init; }
    public Coordinates? CurrentLocation { get; init; }
}

public sealed record ReportDeliveryLocationRequest
{
    public required string DeliveryId { get; init; }
    public required Coordinates CurrentLocation { get; init; }
    public required DateTimeOffset ReportedAtUtc { get; init; }
}

public sealed record ReportDeliveryIssueRequest
{
    public string? Reason { get; init; }
}

public sealed record UpdateMerchantApplicationStatusRequest
{
    public required string Status { get; init; }
}

public sealed record AssignRiderRequest
{
    public string? RiderId { get; init; }
    public string? RiderName { get; init; }
}

public sealed record UpdateAccountStatusRequest
{
    public required string Status { get; init; }
}

public sealed record UpdateDeliveryAreaRequest
{
    public bool? IsEnabled { get; init; }
    public decimal? BaseFee { get; init; }
    public decimal? RadiusKm { get; init; }
}

public sealed record HealthResponse(string Status, DateTimeOffset CheckedAtUtc);
