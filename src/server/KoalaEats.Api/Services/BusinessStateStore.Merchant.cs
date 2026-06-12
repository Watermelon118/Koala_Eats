namespace KoalaEats.Api;

public sealed partial class BusinessStateStore
{
    public object UpdateMerchantOrderStatus(string orderId, UpdateMerchantOrderStatusRequest request)
    {
        lock (_gate)
        {
            var merchantIndex = _merchantOrders.FindIndex(order => order.Id == orderId);
            if (merchantIndex < 0)
            {
                throw new KeyNotFoundException("Order not found");
            }

            var nextStatus = request.Status;
            _merchantOrders[merchantIndex] = _merchantOrders[merchantIndex] with
            {
                Status = nextStatus,
                StatusText = MerchantStatusText.TryGetValue(nextStatus, out var statusText) ? statusText : nextStatus,
            };

            if (string.Equals(nextStatus, "Preparing", StringComparison.OrdinalIgnoreCase))
            {
                UpdateCustomerOrderStatus(orderId, "Preparing");
            }
            else if (string.Equals(nextStatus, "ReadyForPickup", StringComparison.OrdinalIgnoreCase))
            {
                UpdateCustomerOrderStatus(orderId, "WaitingForRider");
                EnsureDeliveryForOrder(orderId);
                AddOrUpdatePlatformOrder(orderId, new PlatformOrder
                {
                    Id = orderId,
                    StoreName = GetCustomerOrder(orderId)?.StoreName ?? _merchantOrders[merchantIndex].DeliveryAddressMasked,
                    CustomerName = _merchantOrders[merchantIndex].CustomerName,
                    RiderName = "Unassigned",
                    Status = "Awaiting rider",
                    TotalAmount = _merchantOrders[merchantIndex].TotalAmount,
                    RiskLevel = "warning",
                });
            }
            else if (string.Equals(nextStatus, "Rejected", StringComparison.OrdinalIgnoreCase))
            {
                UpdateCustomerOrderStatus(orderId, "Refunded");
                RemoveDeliveryForOrder(orderId);
                AddOrUpdatePlatformOrder(orderId, new PlatformOrder
                {
                    Id = orderId,
                    StoreName = GetCustomerOrder(orderId)?.StoreName ?? _merchantOrders[merchantIndex].DeliveryAddressMasked,
                    CustomerName = _merchantOrders[merchantIndex].CustomerName,
                    RiderName = "Unassigned",
                    Status = "Merchant rejected",
                    TotalAmount = _merchantOrders[merchantIndex].TotalAmount,
                    RiskLevel = "warning",
                });
            }

            PersistSnapshot();
            return new
            {
                id = orderId,
                status = nextStatus,
                statusText = _merchantOrders[merchantIndex].StatusText,
            };
        }
    }

    public MerchantDashboardData GetMerchantDashboard()
    {
        lock (_gate)
        {
            var store = BuildPrimaryStoreSummary(0m, _merchantProfile, _storeSeeds["store-koala-bowl"].MenuCategories, _merchantMenuItems.ToArray());
            return new MerchantDashboardData
            {
                Store = new MerchantDashboardStore
                {
                    Id = store.Id,
                    Name = store.Name,
                    Rating = store.Rating,
                    MonthlySales = store.MonthlySales,
                    DeliveryMinutes = store.DeliveryMinutes,
                    Address = store.Address,
                },
                Metrics = new MerchantDashboardMetrics
                {
                    PendingOrders = _merchantOrders.Count(order => string.Equals(order.Status, "PendingAccept", StringComparison.OrdinalIgnoreCase)),
                    PreparingOrders = _merchantOrders.Count(order => string.Equals(order.Status, "Preparing", StringComparison.OrdinalIgnoreCase) || string.Equals(order.Status, "ReadyForPickup", StringComparison.OrdinalIgnoreCase)),
                    TodayRevenue = RoundMoney(_merchantOrders.Where(order => !string.Equals(order.PaymentStatus, "Refunding", StringComparison.OrdinalIgnoreCase)).Sum(order => order.TotalAmount)),
                    ActiveMenuItems = _merchantMenuItems.Count(item => item.IsAvailable),
                },
            };
        }
    }

    public MerchantOrder[] GetMerchantOrders()
    {
        lock (_gate)
        {
            return _merchantOrders.ToArray();
        }
    }

    public MerchantMenuItem[] GetMerchantMenuItems()
    {
        lock (_gate)
        {
            return GetMerchantMenuItemSnapshot();
        }
    }

    public object UpdateMerchantMenuItem(string menuItemId, UpdateMerchantMenuItemRequest request)
    {
        lock (_gate)
        {
            var index = _merchantMenuItems.FindIndex(item => item.Id == menuItemId);
            if (index < 0)
            {
                throw new KeyNotFoundException("Menu item not found");
            }

            var current = _merchantMenuItems[index];
            var updated = current with
            {
                IsAvailable = request.IsAvailable ?? current.IsAvailable,
                Stock = request.Stock ?? current.Stock,
                Price = request.Price ?? current.Price,
            };
            _merchantMenuItems[index] = updated;
            RefreshPrimaryStoreSeed();
            PersistSnapshot();

            return new
            {
                id = updated.Id,
                isAvailable = updated.IsAvailable,
                stock = updated.Stock,
                price = updated.Price,
            };
        }
    }

    public MerchantStoreProfile UpdateMerchantStoreProfile(UpdateMerchantStoreProfileRequest request)
    {
        lock (_gate)
        {
            _merchantProfile = _merchantProfile with
            {
                IsOpen = request.IsOpen ?? _merchantProfile.IsOpen,
                OpeningHours = request.OpeningHours ?? _merchantProfile.OpeningHours,
                Announcement = request.Announcement ?? _merchantProfile.Announcement,
                DeliveryRadiusKm = request.DeliveryRadiusKm ?? _merchantProfile.DeliveryRadiusKm,
                Coordinates = request.Coordinates ?? _merchantProfile.Coordinates,
                Address = request.Address ?? _merchantProfile.Address,
            };

            _deliveryTasks = _deliveryTasks
                .Select(task => task with
                {
                    PickupAddress = _merchantProfile.Address,
                    PickupLocation = _merchantProfile.Coordinates,
                })
                .ToList();

            RefreshPrimaryStoreSeed();
            PersistSnapshot();
            return _merchantProfile;
        }
    }

}