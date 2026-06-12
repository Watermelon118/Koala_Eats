namespace KoalaEats.Api;

public sealed partial class BusinessStateStore
{
    public IReadOnlyList<StoreSummary> GetStores(string? category, Coordinates? userLocation)
    {
        lock (_gate)
        {
            return _storeSeeds.Values
                .Select(seed => BuildStoreSummary(seed, GetDistance(seed.Location, userLocation, seed.DistanceKm), _merchantProfile))
                .Where(store => string.IsNullOrWhiteSpace(category) || category == "全部" || store.Category == category)
                .OrderBy(store => store.DistanceKm)
                .ToArray();
        }
    }

    public StoreSummary? GetStore(string storeId, Coordinates? userLocation)
    {
        lock (_gate)
        {
            if (!_storeSeeds.TryGetValue(storeId, out var seed))
            {
                return null;
            }

            return BuildStoreSummary(seed, GetDistance(seed.Location, userLocation, seed.DistanceKm), _merchantProfile);
        }
    }

    public MenuItem[]? GetStoreMenu(string storeId)
    {
        lock (_gate)
        {
            if (storeId == "store-koala-bowl")
            {
                return _merchantMenuItems.ToArray();
            }

            return _storeSeeds.TryGetValue(storeId, out var seed) ? seed.Menu.ToArray() : null;
        }
    }

    public OrderPricePreview PreviewOrder(PreviewOrderRequest request)
    {
        lock (_gate)
        {
            if (!_storeSeeds.TryGetValue(request.StoreId, out var seed))
            {
                throw new KeyNotFoundException("Store not found");
            }

            var itemsAmount = request.Items.Sum(item =>
            {
                var menuItemId = NormalizeMenuItemId(item.MenuItemId, item.Id);
                var menuItem = FindMenuItem(seed, menuItemId);
                var itemBasePrice = item.UnitPrice ?? menuItem?.Price ?? 0m;
                var optionsDelta = item.SelectedOptions?.Sum(option => option.PriceDelta) ?? 0m;
                return (item.UnitPrice.HasValue ? itemBasePrice : itemBasePrice + optionsDelta) * item.Quantity;
            });

            var deliveryFee = seed.DeliveryFee;
            var packagingFee = 0.8m;
            var discountAmount = 0m;
            var totalAmount = itemsAmount + deliveryFee + packagingFee - discountAmount;

            return new OrderPricePreview
            {
                ItemsAmount = RoundMoney(itemsAmount),
                DeliveryFee = RoundMoney(deliveryFee),
                PackagingFee = RoundMoney(packagingFee),
                DiscountAmount = RoundMoney(discountAmount),
                TotalAmount = RoundMoney(totalAmount),
            };
        }
    }

    public CustomerOrder CreateOrder(CreateCustomerOrderRequest request)
    {
        lock (_gate)
        {
            if (!_storeSeeds.TryGetValue(request.StoreId, out var seed))
            {
                throw new KeyNotFoundException("Store not found");
            }

            var distanceKm = CalculateDistanceKm(request.StoreLocation, request.Address.Coordinates);
            if (distanceKm > request.DeliveryRadiusKm)
            {
                throw new DeliveryOutOfRangeException();
            }

            var orderId = $"KE-{_nextCustomerOrderNumber++}";
            var preview = request.Price ?? BuildOrderPrice(request.Items, seed);
            var order = new CustomerOrder
            {
                Id = orderId,
                StoreId = request.StoreId,
                StoreName = request.StoreName,
                DeliveryDistanceKm = RoundMoney(distanceKm),
                DeliveryRadiusKm = request.DeliveryRadiusKm,
                Status = "PendingPayment",
                StatusText = CustomerStatusText["PendingPayment"],
                Address = new CustomerAddress
                {
                    Id = request.Address.Id,
                    Label = request.Address.Label,
                    ReceiverName = request.Address.ReceiverName ?? "Customer",
                    PhoneMasked = request.Address.PhoneMasked ?? string.Empty,
                    AddressLine = request.Address.AddressLine,
                    Detail = request.Address.Detail ?? string.Empty,
                    PlaceId = request.Address.PlaceId,
                    Coordinates = request.Address.Coordinates,
                },
                Items = NormalizeOrderLines(seed, request.Items),
                Price = preview,
                RiderName = "Unassigned",
                RiderPhoneMasked = string.Empty,
                RiderLocation = request.StoreLocation,
                EstimatedArrivalMinutes = seed.DeliveryMinutes,
                Timeline = BuildTimeline("PendingPayment"),
                Remark = request.Remark,
            };

            _customerOrders.Insert(0, order);
            PersistSnapshot();
            return order;
        }
    }

    public object PayOrder(string orderId, MockPaymentRequest? request)
    {
        lock (_gate)
        {
            var orderIndex = _customerOrders.FindIndex(order => order.Id == orderId);
            if (orderIndex < 0)
            {
                throw new KeyNotFoundException("Order not found");
            }

            var order = _customerOrders[orderIndex];
            if (!string.Equals(order.Status, "PendingPayment", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Order is not awaiting payment");
            }

            var updatedOrder = order with
            {
                Status = "PendingMerchantAccept",
                StatusText = CustomerStatusText["PendingMerchantAccept"],
                Timeline = BuildTimeline("PendingMerchantAccept"),
            };

            _customerOrders[orderIndex] = updatedOrder;

            var merchantOrderIndex = _merchantOrders.FindIndex(item => item.Id == orderId);
            var merchantOrder = new MerchantOrder
            {
                Id = orderId,
                CustomerName = order.Address.ReceiverName,
                ItemsSummary = SummarizeItems(order.Items),
                Items = order.Items,
                Status = "PendingAccept",
                StatusText = MerchantStatusText["PendingAccept"],
                TotalAmount = order.Price.TotalAmount,
                PlacedMinutesAgo = 0,
                DeliveryAddressMasked = $"{order.Address.Label} 璺?{order.Address.AddressLine}",
                CustomerNote = string.IsNullOrWhiteSpace(order.Remark) ? "No note" : order.Remark!,
                PaymentStatus = "Paid",
            };

            if (merchantOrderIndex >= 0)
            {
                _merchantOrders[merchantOrderIndex] = merchantOrder;
            }
            else
            {
                _merchantOrders.Insert(0, merchantOrder);
            }

            PersistSnapshot();
            return new
            {
                orderId,
                status = "Paid",
                paidAtUtc = DateTimeOffset.UtcNow,
                paymentMethod = request?.PaymentMethod ?? "MockBalance",
            };
        }
    }

    public object CancelOrder(string orderId)
    {
        lock (_gate)
        {
            var orderIndex = _customerOrders.FindIndex(order => order.Id == orderId);
            if (orderIndex < 0)
            {
                throw new KeyNotFoundException("Order not found");
            }

            var order = _customerOrders[orderIndex];

            if (string.Equals(order.Status, "PendingPayment", StringComparison.OrdinalIgnoreCase))
            {
                _customerOrders[orderIndex] = order with
                {
                    Status = "Canceled",
                    StatusText = CustomerStatusText["Canceled"],
                    Timeline = BuildTimeline("Canceled"),
                };
                PersistSnapshot();
                return new { id = orderId, status = "Canceled" };
            }

            if (string.Equals(order.Status, "PendingMerchantAccept", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(order.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                _customerOrders[orderIndex] = order with
                {
                    Status = "Refunded",
                    StatusText = CustomerStatusText["Refunded"],
                    Timeline = BuildTimeline("Refunded"),
                };
                _merchantOrders = _merchantOrders.Where(item => item.Id != orderId).ToList();
                AddOrUpdatePlatformOrder(orderId, new PlatformOrder
                {
                    Id = orderId,
                    StoreName = order.StoreName,
                    CustomerName = order.Address.ReceiverName,
                    RiderName = "Unassigned",
                    Status = "User cancelled, auto refund",
                    TotalAmount = order.Price.TotalAmount,
                    RiskLevel = "normal",
                });

                PersistSnapshot();
                return new { id = orderId, status = "Refunded" };
            }

            throw new OrderCannotCancelException();
        }
    }

    public CustomerOrder? GetCustomerOrder(string orderId)
    {
        lock (_gate)
        {
            return _customerOrders.FirstOrDefault(order => order.Id == orderId);
        }
    }

}
