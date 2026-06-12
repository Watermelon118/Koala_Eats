namespace KoalaEats.Api;

public sealed class BusinessStateStore
{
    private sealed record StoreSeed(
        string Id,
        string Name,
        string Category,
        decimal Rating,
        int MonthlySales,
        int DeliveryMinutes,
        decimal DeliveryFee,
        decimal DistanceKm,
        string Promotion,
        string CoverTone,
        string Address,
        string OpeningHours,
        string Announcement,
        decimal MinOrderAmount,
        decimal AveragePrice,
        decimal DeliveryRadiusKm,
        string[] ServiceTags,
        Coordinates Location,
        MenuCategory[] MenuCategories,
        MenuItem[] Menu);

    private static readonly string[] CustomerStatusOrder =
    [
        "PendingPayment",
        "Paid",
        "PendingMerchantAccept",
        "MerchantAccepted",
        "Preparing",
        "ReadyForPickup",
        "WaitingForRider",
        "RiderAccepted",
        "RiderArrivedStore",
        "RiderPickedUp",
        "Delivering",
        "Completed",
        "Rejected",
        "Refunded",
        "Canceled",
    ];

    private static readonly Dictionary<string, string> CustomerStatusText = new(StringComparer.OrdinalIgnoreCase)
    {
        ["PendingPayment"] = "Awaiting payment",
        ["Paid"] = "Paid",
        ["PendingMerchantAccept"] = "Waiting for merchant",
        ["MerchantAccepted"] = "Merchant accepted",
        ["Preparing"] = "Preparing",
        ["ReadyForPickup"] = "Ready for pickup",
        ["WaitingForRider"] = "Waiting for rider",
        ["RiderAccepted"] = "Rider accepted",
        ["RiderArrivedStore"] = "Rider arrived at store",
        ["RiderPickedUp"] = "Rider picked up",
        ["Delivering"] = "Delivering",
        ["Completed"] = "Completed",
        ["Rejected"] = "Rejected",
        ["Refunded"] = "Refunded",
        ["Canceled"] = "Canceled",
    };

    private static readonly Dictionary<string, string> MerchantStatusText = new(StringComparer.OrdinalIgnoreCase)
    {
        ["PendingAccept"] = "Pending accept",
        ["Preparing"] = "Preparing",
        ["ReadyForPickup"] = "Ready for pickup",
        ["PickedUp"] = "Picked up",
        ["Rejected"] = "Rejected",
    };

    private static readonly Dictionary<string, string> DeliveryStatusText = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Available"] = "Available",
        ["Accepted"] = "Accepted",
        ["ArrivedStore"] = "Arrived at store",
        ["PickedUp"] = "Picked up",
        ["Delivering"] = "Delivering",
        ["Delivered"] = "Delivered",
    };

    private readonly object _gate = new();
    private readonly Dictionary<string, StoreSeed> _storeSeeds;
    private readonly MenuItem[] _primaryStoreBaseMenu;
    private MerchantStoreProfile _merchantProfile;
    private List<CustomerOrder> _customerOrders;
    private List<MerchantOrder> _merchantOrders;
    private List<MenuItem> _merchantMenuItems;
    private List<DeliveryTask> _deliveryTasks;
    private List<MerchantApplication> _merchantApplications;
    private List<PlatformOrder> _platformOrders;
    private List<AccountRecord> _accountRecords;
    private List<DeliveryArea> _deliveryAreas;
    private readonly AdminTask[] _adminTasks;
    private int _nextCustomerOrderNumber;
    private int _nextDeliveryNumber;

    public BusinessStateStore()
    {
        _storeSeeds = BuildStoreSeeds();
        _primaryStoreBaseMenu = _storeSeeds["store-koala-bowl"].Menu;
        _merchantProfile = BuildInitialMerchantProfile();
        _customerOrders = BuildInitialCustomerOrders().ToList();
        _merchantOrders = BuildInitialMerchantOrders().ToList();
        _merchantMenuItems = _primaryStoreBaseMenu.ToList();
        _deliveryTasks = BuildInitialDeliveryTasks().ToList();
        _merchantApplications = BuildInitialMerchantApplications().ToList();
        _platformOrders = BuildInitialPlatformOrders().ToList();
        _accountRecords = BuildInitialAccountRecords().ToList();
        _deliveryAreas = BuildInitialDeliveryAreas().ToList();
        _adminTasks = BuildInitialAdminTasks();
        _nextCustomerOrderNumber = 3001;
        _nextDeliveryNumber = 900;
    }

    public MockBusinessStateSnapshot GetMockStateSnapshot()
    {
        lock (_gate)
        {
            return new MockBusinessStateSnapshot
            {
                CustomerOrders = _customerOrders.ToArray(),
                MerchantOrders = _merchantOrders.ToArray(),
                MerchantMenuItems = GetMerchantMenuItemSnapshot(),
                MerchantProfile = _merchantProfile,
                DeliveryTasks = _deliveryTasks.ToArray(),
                MerchantApplications = _merchantApplications.ToArray(),
                PlatformOrders = _platformOrders.ToArray(),
                AccountRecords = _accountRecords.ToArray(),
                DeliveryAreas = _deliveryAreas.ToArray(),
            };
        }
    }

    public void Reset()
    {
        lock (_gate)
        {
            _merchantProfile = BuildInitialMerchantProfile();
            _customerOrders = BuildInitialCustomerOrders().ToList();
            _merchantOrders = BuildInitialMerchantOrders().ToList();
            _merchantMenuItems = _primaryStoreBaseMenu.ToList();
            _deliveryTasks = BuildInitialDeliveryTasks().ToList();
            _merchantApplications = BuildInitialMerchantApplications().ToList();
            _platformOrders = BuildInitialPlatformOrders().ToList();
            _accountRecords = BuildInitialAccountRecords().ToList();
            _deliveryAreas = BuildInitialDeliveryAreas().ToList();
            _nextCustomerOrderNumber = 3001;
            _nextDeliveryNumber = 900;
        }
    }

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
                DeliveryAddressMasked = $"{order.Address.Label} · {order.Address.AddressLine}",
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

            return _merchantProfile;
        }
    }

    public RiderDashboardData GetRiderDashboard()
    {
        lock (_gate)
        {
            return new RiderDashboardData
            {
                AvailableDeliveries = _deliveryTasks.Count(task => string.Equals(task.Status, "Available", StringComparison.OrdinalIgnoreCase)),
                ActiveDeliveries = _deliveryTasks.Count(task => string.Equals(task.Status, "Accepted", StringComparison.OrdinalIgnoreCase) || string.Equals(task.Status, "ArrivedStore", StringComparison.OrdinalIgnoreCase) || string.Equals(task.Status, "PickedUp", StringComparison.OrdinalIgnoreCase) || string.Equals(task.Status, "Delivering", StringComparison.OrdinalIgnoreCase)),
                TodayIncome = RoundMoney(_deliveryTasks.Where(task => string.Equals(task.Status, "Delivered", StringComparison.OrdinalIgnoreCase)).Sum(task => task.Fee)),
                AverageDeliveryMinutes = _deliveryTasks.Count == 0 ? 0 : (int)Math.Round(_deliveryTasks.Average(task => task.EstimatedMinutes)),
            };
        }
    }

    public DeliveryTask[] GetDeliveries()
    {
        lock (_gate)
        {
            return _deliveryTasks.ToArray();
        }
    }

    public object UpdateDeliveryStatus(string deliveryId, UpdateDeliveryStatusRequest request)
    {
        lock (_gate)
        {
            var index = _deliveryTasks.FindIndex(task => task.Id == deliveryId);
            if (index < 0)
            {
                throw new KeyNotFoundException("Delivery task not found");
            }

            var updated = _deliveryTasks[index] with
            {
                Status = request.Status,
                StatusText = DeliveryStatusText.TryGetValue(request.Status, out var text) ? text : request.Status,
                CurrentLocation = request.CurrentLocation ?? _deliveryTasks[index].CurrentLocation,
            };

            _deliveryTasks[index] = updated;

            switch (request.Status)
            {
                case "Accepted":
                    UpdateCustomerOrderStatus(updated.OrderId, "RiderAccepted");
                    break;
                case "ArrivedStore":
                    UpdateCustomerOrderStatus(updated.OrderId, "RiderArrivedStore");
                    break;
                case "PickedUp":
                    UpdateCustomerOrderStatus(updated.OrderId, "RiderPickedUp");
                    UpdateMerchantOrderStatusOnly(updated.OrderId, "PickedUp");
                    break;
                case "Delivering":
                    UpdateCustomerOrderStatus(updated.OrderId, "Delivering");
                    break;
                case "Delivered":
                    UpdateCustomerOrderStatus(updated.OrderId, "Completed");
                    AddOrUpdatePlatformOrder(updated.OrderId, new PlatformOrder
                    {
                        Id = updated.OrderId,
                        StoreName = updated.StoreName,
                        CustomerName = GetCustomerOrder(updated.OrderId)?.Address.ReceiverName ?? "Unknown",
                        RiderName = "Liam",
                        Status = "Delivered",
                        TotalAmount = GetCustomerOrder(updated.OrderId)?.Price.TotalAmount ?? 0m,
                        RiskLevel = "normal",
                    });
                    break;
            }

            return new
            {
                id = deliveryId,
                status = updated.Status,
                statusText = updated.StatusText,
            };
        }
    }

    public object ReportLocation(ReportDeliveryLocationRequest request)
    {
        lock (_gate)
        {
            var index = _deliveryTasks.FindIndex(task => task.Id == request.DeliveryId);
            if (index < 0)
            {
                throw new KeyNotFoundException("Delivery task not found");
            }

            _deliveryTasks[index] = _deliveryTasks[index] with
            {
                CurrentLocation = request.CurrentLocation,
            };

            var order = _customerOrders.FirstOrDefault(item => item.Id == _deliveryTasks[index].OrderId);
            if (order is not null)
            {
                var orderIndex = _customerOrders.FindIndex(item => item.Id == order.Id);
                if (orderIndex >= 0)
                {
                    _customerOrders[orderIndex] = _customerOrders[orderIndex] with
                    {
                        RiderLocation = request.CurrentLocation,
                    };
                }
            }

            return new { accepted = true };
        }
    }

    public object ReportDeliveryIssue(string deliveryId, ReportDeliveryIssueRequest request)
    {
        lock (_gate)
        {
            var delivery = _deliveryTasks.FirstOrDefault(task => task.Id == deliveryId);
            if (delivery is null)
            {
                throw new KeyNotFoundException("Delivery task not found");
            }

            AddOrUpdatePlatformOrder(delivery.OrderId, new PlatformOrder
            {
                Id = delivery.OrderId,
                StoreName = delivery.StoreName,
                CustomerName = GetCustomerOrder(delivery.OrderId)?.Address.ReceiverName ?? "Unknown",
                RiderName = "Liam",
                Status = string.IsNullOrWhiteSpace(request.Reason) ? "Delivery issue reported" : request.Reason!,
                TotalAmount = GetCustomerOrder(delivery.OrderId)?.Price.TotalAmount ?? 0m,
                RiskLevel = "urgent",
            });

            return new { };
        }
    }

    public AdminDashboardData GetAdminDashboard()
    {
        lock (_gate)
        {
            return new AdminDashboardData
            {
                PendingMerchantReviews = _merchantApplications.Count(application => string.Equals(application.Status, "Pending", StringComparison.OrdinalIgnoreCase)),
                AbnormalOrders = _platformOrders.Count(order => string.Equals(order.RiskLevel, "urgent", StringComparison.OrdinalIgnoreCase)),
                OnlineRiders = _accountRecords.Count(account => string.Equals(account.Role, "Rider", StringComparison.OrdinalIgnoreCase) && string.Equals(account.Status, "Active", StringComparison.OrdinalIgnoreCase)),
                TodayOrders = _customerOrders.Count,
            };
        }
    }

    public AdminTask[] GetAdminTasks()
    {
        return _adminTasks.ToArray();
    }

    public MerchantApplication[] GetMerchantApplications()
    {
        lock (_gate)
        {
            return _merchantApplications.ToArray();
        }
    }

    public object UpdateMerchantApplicationStatus(string applicationId, UpdateMerchantApplicationStatusRequest request)
    {
        lock (_gate)
        {
            var index = _merchantApplications.FindIndex(application => application.Id == applicationId);
            if (index < 0)
            {
                throw new KeyNotFoundException("Merchant application not found");
            }

            _merchantApplications[index] = _merchantApplications[index] with { Status = request.Status };
            return new { id = applicationId, status = request.Status };
        }
    }

    public PlatformOrder[] GetAdminOrders()
    {
        lock (_gate)
        {
            return _platformOrders.ToArray();
        }
    }

    public object AssignRider(string orderId, AssignRiderRequest request)
    {
        lock (_gate)
        {
            var riderName = ResolveRiderName(request);
            var delivery = EnsureDeliveryForOrder(orderId);

            if (delivery is not null)
            {
                var deliveryIndex = _deliveryTasks.FindIndex(task => task.Id == delivery.Id);
                if (deliveryIndex >= 0)
                {
                    _deliveryTasks[deliveryIndex] = _deliveryTasks[deliveryIndex] with
                    {
                        Status = "Accepted",
                        StatusText = DeliveryStatusText["Accepted"],
                    };
                }
            }

            UpdateCustomerOrderStatus(orderId, "RiderAccepted");
            AddOrUpdatePlatformOrder(orderId, new PlatformOrder
            {
                Id = orderId,
                StoreName = GetCustomerOrder(orderId)?.StoreName ?? "Unknown",
                CustomerName = GetCustomerOrder(orderId)?.Address.ReceiverName ?? "Unknown",
                RiderName = riderName,
                Status = "Manually assigned",
                TotalAmount = GetCustomerOrder(orderId)?.Price.TotalAmount ?? 0m,
                RiskLevel = "normal",
            });

            return new
            {
                id = orderId,
                riderName,
                status = "Manually assigned",
            };
        }
    }

    public object UpdateAccountStatus(string accountId, UpdateAccountStatusRequest request)
    {
        lock (_gate)
        {
            var index = _accountRecords.FindIndex(account => account.Id == accountId);
            if (index < 0)
            {
                throw new KeyNotFoundException("Account not found");
            }

            _accountRecords[index] = _accountRecords[index] with { Status = request.Status };
            return new { id = accountId, status = request.Status };
        }
    }

    public object UpdateDeliveryArea(string deliveryAreaId, UpdateDeliveryAreaRequest request)
    {
        lock (_gate)
        {
            var index = _deliveryAreas.FindIndex(area => area.Id == deliveryAreaId);
            if (index < 0)
            {
                throw new KeyNotFoundException("Delivery area not found");
            }

            _deliveryAreas[index] = _deliveryAreas[index] with
            {
                IsEnabled = request.IsEnabled ?? _deliveryAreas[index].IsEnabled,
                BaseFee = request.BaseFee ?? _deliveryAreas[index].BaseFee,
                RadiusKm = request.RadiusKm ?? _deliveryAreas[index].RadiusKm,
            };

            return new { id = deliveryAreaId, isEnabled = _deliveryAreas[index].IsEnabled };
        }
    }

    private MerchantMenuItem[] GetMerchantMenuItemSnapshot()
    {
        return _merchantMenuItems.Select(ToMerchantMenuItem).ToArray();
    }

    private StoreSummary BuildStoreSummary(StoreSeed seed, decimal distanceKm, MerchantStoreProfile merchantProfile)
    {
        if (seed.Id == merchantProfile.Id)
        {
            return BuildPrimaryStoreSummary(distanceKm, merchantProfile, seed.MenuCategories, _merchantMenuItems.ToArray());
        }

        return new StoreSummary
        {
            Id = seed.Id,
            Name = seed.Name,
            Category = seed.Category,
            Rating = seed.Rating,
            MonthlySales = seed.MonthlySales,
            DeliveryMinutes = seed.DeliveryMinutes,
            DeliveryFee = seed.DeliveryFee,
            DistanceKm = distanceKm,
            Promotion = seed.Promotion,
            CoverTone = seed.CoverTone,
            Address = seed.Address,
            OpeningHours = seed.OpeningHours,
            Announcement = seed.Announcement,
            MinOrderAmount = seed.MinOrderAmount,
            AveragePrice = seed.AveragePrice,
            DeliveryRadiusKm = seed.DeliveryRadiusKm,
            ServiceTags = seed.ServiceTags,
            Location = seed.Location,
            MenuCategories = seed.MenuCategories,
            Menu = seed.Menu,
        };
    }

    private static StoreSummary BuildPrimaryStoreSummary(decimal distanceKm, MerchantStoreProfile merchantProfile, MenuCategory[] menuCategories, MenuItem[] menu)
    {
        return new StoreSummary
        {
            Id = merchantProfile.Id,
            Name = merchantProfile.Name,
            Category = "Rice Bowls",
            Rating = 4.8m,
            MonthlySales = 1320,
            DeliveryMinutes = 28,
            DeliveryFee = 2.99m,
            DistanceKm = distanceKm,
            Promotion = "Spend $35 save $6",
            CoverTone = "rice",
            Address = merchantProfile.Address,
            OpeningHours = merchantProfile.OpeningHours,
            Announcement = merchantProfile.Announcement,
            MinOrderAmount = 15,
            AveragePrice = 19,
            DeliveryRadiusKm = merchantProfile.DeliveryRadiusKm,
            ServiceTags = ["On time", "Merchant delivery", "Notes supported"],
            Location = merchantProfile.Coordinates,
            MenuCategories = menuCategories,
            Menu = menu,
        };
    }

    private static decimal GetDistance(Coordinates seedLocation, Coordinates? userLocation, decimal defaultDistanceKm)
    {
        return userLocation is null ? defaultDistanceKm : CalculateDistanceKm(seedLocation, userLocation);
    }

    private static decimal CalculateDistanceKm(Coordinates from, Coordinates to)
    {
        const double earthRadiusKm = 6371d;
        var latitudeDelta = ToRadians(to.Latitude - from.Latitude);
        var longitudeDelta = ToRadians(to.Longitude - from.Longitude);
        var fromLatitude = ToRadians(from.Latitude);
        var toLatitude = ToRadians(to.Latitude);
        var haversine =
            Math.Pow(Math.Sin(latitudeDelta / 2), 2) +
            Math.Cos(fromLatitude) *
            Math.Cos(toLatitude) *
            Math.Pow(Math.Sin(longitudeDelta / 2), 2);

        return RoundMoney((decimal)(2 * earthRadiusKm * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine))));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180d;

    private static decimal RoundMoney(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);

    private static MenuItem? FindMenuItem(StoreSeed seed, string menuItemId)
    {
        return seed.Menu.FirstOrDefault(item => item.Id == menuItemId);
    }

    private static string NormalizeMenuItemId(string? menuItemId, string? fallbackId)
    {
        return menuItemId ?? fallbackId ?? string.Empty;
    }

    private static OrderPricePreview BuildOrderPrice(CartLine[] items, StoreSeed seed)
    {
        var itemsAmount = items.Sum(item =>
        {
            var menuItemId = NormalizeMenuItemId(item.MenuItemId, item.Id);
            var menuItem = seed.Menu.FirstOrDefault(menu => menu.Id == menuItemId);
            var basePrice = item.UnitPrice ?? item.Price ?? menuItem?.Price ?? 0m;
            var optionsDelta = item.SelectedOptions?.Sum(option => option.PriceDelta) ?? 0m;
            return (item.UnitPrice.HasValue || item.Price.HasValue ? basePrice : basePrice + optionsDelta) * item.Quantity;
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

    private static CartLine[] NormalizeOrderLines(StoreSeed seed, CartLine[] items)
    {
        return items.Select(item =>
        {
            var menuItemId = NormalizeMenuItemId(item.MenuItemId, item.Id);
            var menuItem = seed.Menu.FirstOrDefault(menu => menu.Id == menuItemId);
            var resolvedOptions = item.SelectedOptions ?? Array.Empty<SelectedMenuOption>();

            return item with
            {
                MenuItemId = menuItemId,
                Id = menuItemId,
                Name = item.Name ?? menuItem?.Name,
                Description = item.Description ?? menuItem?.Description,
                Price = item.Price ?? menuItem?.Price,
                CategoryId = item.CategoryId ?? menuItem?.CategoryId,
                Tag = item.Tag ?? menuItem?.Tag,
                MonthlySales = item.MonthlySales ?? menuItem?.MonthlySales,
                Stock = item.Stock ?? menuItem?.Stock,
                IsAvailable = item.IsAvailable ?? menuItem?.IsAvailable,
                ImageTone = item.ImageTone ?? menuItem?.ImageTone,
                SelectedOptions = resolvedOptions,
                UnitPrice = item.UnitPrice ?? item.Price ?? menuItem?.Price,
            };
        }).ToArray();
    }

    private static string SummarizeItems(CartLine[] items)
    {
        return string.Join(", ", items.Select(item =>
        {
            var optionsText = item.SelectedOptions is { Length: > 0 }
                ? $"({string.Join("/", item.SelectedOptions.Select(option => option.Name))})"
                : string.Empty;
            return $"{item.Name}{optionsText} x{item.Quantity}";
        }));
    }

    private static OrderTimelineStep[] BuildTimeline(string status)
    {
        var order = CustomerStatusOrder;
        var currentIndex = Array.FindIndex(order, item => string.Equals(item, status, StringComparison.OrdinalIgnoreCase));
        if (currentIndex < 0)
        {
            currentIndex = 0;
        }

        return order.Select((key, index) => new OrderTimelineStep
        {
            Key = key,
            Label = CustomerStatusText.TryGetValue(key, out var text) ? text : key,
            Description = index switch
            {
                0 => "Order submitted, waiting for payment",
                1 => "Payment confirmed",
                2 => "Order sent to merchant",
                3 => "Merchant reviewing order",
                4 => "Merchant preparing food",
                5 => "Food ready for pickup",
                6 => "Waiting for rider",
                7 => "Rider accepted",
                8 => "Rider arrived at store",
                9 => "Rider picked up",
                10 => "Delivering to customer",
                11 => "Order completed",
                12 => "Merchant rejected order",
                13 => "Refund processed",
                14 => "Order cancelled",
                _ => key,
            },
            HappenedAt = index <= currentIndex ? (index == currentIndex ? "now" : DateTimeOffset.Now.ToString("HH:mm")) : "--",
            IsCompleted = index <= currentIndex,
        }).ToArray();
    }

    private void UpdateCustomerOrderStatus(string orderId, string status)
    {
        var index = _customerOrders.FindIndex(order => order.Id == orderId);
        if (index < 0)
        {
            return;
        }

        _customerOrders[index] = _customerOrders[index] with
        {
            Status = status,
            StatusText = CustomerStatusText.TryGetValue(status, out var text) ? text : status,
            Timeline = BuildTimeline(status),
        };
    }

    private void UpdateMerchantOrderStatusOnly(string orderId, string status)
    {
        var index = _merchantOrders.FindIndex(order => order.Id == orderId);
        if (index < 0)
        {
            return;
        }

        _merchantOrders[index] = _merchantOrders[index] with
        {
            Status = status,
            StatusText = MerchantStatusText.TryGetValue(status, out var text) ? text : status,
        };
    }

    private DeliveryTask? EnsureDeliveryForOrder(string orderId)
    {
        var existing = _deliveryTasks.FirstOrDefault(task => task.OrderId == orderId);
        if (existing is not null)
        {
            return existing;
        }

        var order = _customerOrders.FirstOrDefault(item => item.Id == orderId);
        if (order is null)
        {
            return null;
        }

        var delivery = new DeliveryTask
        {
            Id = $"D-{_nextDeliveryNumber++}",
            OrderId = orderId,
            StoreName = order.StoreName,
            PickupAddress = _merchantProfile.Address,
            CustomerAddress = order.Address.AddressLine,
            DistanceKm = 2.4m,
            Fee = 7.5m,
            Status = "Available",
            StatusText = DeliveryStatusText["Available"],
            PickupCode = Random.Shared.Next(1000, 9999).ToString(),
            CustomerPhoneMasked = order.Address.PhoneMasked,
            EstimatedMinutes = 22,
            PickupLocation = _merchantProfile.Coordinates,
            DropoffLocation = order.Address.Coordinates,
            CurrentLocation = null,
        };

        _deliveryTasks.Insert(0, delivery);
        return delivery;
    }

    private void RemoveDeliveryForOrder(string orderId)
    {
        _deliveryTasks = _deliveryTasks.Where(task => task.OrderId != orderId).ToList();
    }

    private void AddOrUpdatePlatformOrder(string orderId, PlatformOrder platformOrder)
    {
        var index = _platformOrders.FindIndex(order => order.Id == orderId);
        if (index >= 0)
        {
            _platformOrders[index] = platformOrder;
            return;
        }

        _platformOrders.Insert(0, platformOrder);
    }

    private static string ResolveRiderName(AssignRiderRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.RiderName))
        {
            return request.RiderName!;
        }

        return string.IsNullOrWhiteSpace(request.RiderId) ? "Assigned rider" : request.RiderId!;
    }

    private static MerchantMenuItem ToMerchantMenuItem(MenuItem item)
    {
        return new MerchantMenuItem
        {
            Id = item.Id,
            CategoryId = item.CategoryId,
            CategoryName = item.CategoryId switch
            {
                "signature" => "Signature",
                "light" => "Light meals",
                "side" => "Sides",
                "burger-main" => "Burgers",
                "fried" => "Fried",
                "combo" => "Combos",
                "milk" => "Milk tea",
                "fruit" => "Fruit tea",
                "coffee" => "Coffee",
                "sushi-box" => "Sushi",
                "bento" => "Bento",
                "soup" => "Soup",
                _ => "General",
            },
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            MonthlySales = item.MonthlySales,
            Tag = item.Tag,
            Stock = item.Stock,
            IsAvailable = item.IsAvailable,
            ImageTone = item.ImageTone,
            OptionGroups = item.OptionGroups,
        };
    }

    private static MerchantStoreProfile BuildInitialMerchantProfile()
    {
        return new MerchantStoreProfile
        {
            Id = "store-koala-bowl",
            Name = "Koala Bowl",
            Address = "18 Queen Street, Auckland CBD",
            OpeningHours = "10:30 - 21:30",
            IsOpen = true,
            DeliveryRadiusKm = 4.5m,
            AveragePreparationMinutes = 12,
            Announcement = "Lunch rush preparation is around 12 minutes.",
            Coordinates = new Coordinates
            {
                Latitude = -36.8478,
                Longitude = 174.765,
            },
        };
    }

    private static Dictionary<string, StoreSeed> BuildStoreSeeds()
    {
        var primaryMenu = new[]
        {
            new MenuItem
            {
                Id = "bowl-teriyaki",
                CategoryId = "signature",
                Name = "Teriyaki chicken bowl",
                Description = "Chicken thigh, onsen egg, greens, house sauce",
                Price = 16.8m,
                MonthlySales = 420,
                Tag = "Bestseller",
                Stock = 38,
                IsAvailable = true,
                ImageTone = "rice",
                OptionGroups = new[]
                {
                    new MenuOptionGroup
                    {
                        Id = "rice-size",
                        Name = "Rice size",
                        Required = true,
                        Options = new[]
                        {
                            new MenuOption { Id = "regular", Name = "Regular", PriceDelta = 0m },
                            new MenuOption { Id = "large", Name = "Large", PriceDelta = 1.5m },
                        },
                    },
                    new MenuOptionGroup
                    {
                        Id = "flavor",
                        Name = "Flavor",
                        Required = true,
                        Options = new[]
                        {
                            new MenuOption { Id = "normal", Name = "Normal", PriceDelta = 0m },
                            new MenuOption { Id = "less-salt", Name = "Less salt", PriceDelta = 0m },
                        },
                    },
                },
            },
            new MenuItem
            {
                Id = "bowl-beef",
                CategoryId = "signature",
                Name = "Black garlic beef bowl",
                Description = "Beef slices, onion, green pepper, black garlic sauce",
                Price = 18.5m,
                MonthlySales = 316,
                Tag = "Hot",
                Stock = 26,
                IsAvailable = true,
                ImageTone = "rice",
            },
            new MenuItem
            {
                Id = "bowl-veggie",
                CategoryId = "light",
                Name = "Pumpkin veggie bowl",
                Description = "Roasted pumpkin, tofu, corn, sesame sauce",
                Price = 14.2m,
                MonthlySales = 128,
                Tag = "Light",
                Stock = 12,
                IsAvailable = true,
                ImageTone = "tea",
            },
            new MenuItem
            {
                Id = "miso-soup",
                CategoryId = "side",
                Name = "Miso soup",
                Description = "Seaweed, tofu, scallions",
                Price = 4.2m,
                MonthlySales = 310,
                Tag = "Side",
                Stock = 80,
                IsAvailable = true,
                ImageTone = "sushi",
            },
        };

        return new Dictionary<string, StoreSeed>
        {
            ["store-koala-bowl"] = new StoreSeed(
                "store-koala-bowl",
                "Koala Bowl",
                "Rice bowls",
                4.8m,
                1320,
                28,
                2.99m,
                1.4m,
                "Spend $35 save $6",
                "rice",
                "18 Queen Street, Auckland CBD",
                "10:30 - 21:30",
                "Lunch rush preparation is around 12 minutes.",
                15m,
                19m,
                4.5m,
                ["On time", "Merchant delivery", "Notes supported"],
                new Coordinates { Latitude = -36.8478, Longitude = 174.765 },
                new[]
                {
                    new MenuCategory { Id = "signature", Name = "Signature combos" },
                    new MenuCategory { Id = "light", Name = "Light meals" },
                    new MenuCategory { Id = "side", Name = "Sides" },
                },
                primaryMenu),
            ["store-burger"] = new StoreSeed(
                "store-burger",
                "Aotea Burger",
                "Burger",
                4.7m,
                2210,
                24,
                1.99m,
                0.9m,
                "Second item half price",
                "burger",
                "68 Hobson Street, Auckland CBD",
                "09:30 - 23:00",
                "Made to order, evening rush should order ahead.",
                12m,
                17m,
                5m,
                ["Fast kitchen", "Night service", "Delivery platform"],
                new Coordinates { Latitude = -36.8496, Longitude = 174.7585 },
                new[]
                {
                    new MenuCategory { Id = "burger-main", Name = "Burgers" },
                    new MenuCategory { Id = "fried", Name = "Fried items" },
                    new MenuCategory { Id = "combo", Name = "Combos" },
                },
                new[]
                {
                    new MenuItem { Id = "burger-classic", CategoryId = "burger-main", Name = "Double cheese beef burger", Description = "Double beef patty, cheese, pickles", Price = 15.9m, MonthlySales = 760, Tag = "Popular", Stock = 44, IsAvailable = true, ImageTone = "burger" },
                    new MenuItem { Id = "burger-chicken", CategoryId = "burger-main", Name = "Crispy chicken burger", Description = "Whole chicken thigh, lettuce, honey mustard", Price = 13.8m, MonthlySales = 540, Tag = "Popular", Stock = 31, IsAvailable = true, ImageTone = "burger" },
                    new MenuItem { Id = "fries-combo", CategoryId = "combo", Name = "Fries & soda combo", Description = "Large fries, zero sugar cola, garlic dip", Price = 8.8m, MonthlySales = 690, Tag = "Combo", Stock = 52, IsAvailable = true, ImageTone = "burger" },
                }),
            ["store-milk-tea"] = new StoreSeed(
                "store-milk-tea",
                "Golden Milk Tea",
                "Milk tea",
                4.9m,
                1880,
                18,
                0.99m,
                0.6m,
                "New product save $2",
                "tea",
                "36 Wakefield Street, Auckland CBD",
                "11:00 - 22:30",
                "Defaults to less ice and less sugar, can adjust in notes.",
                10m,
                9m,
                3.5m,
                ["Custom sweetness", "Custom ice", "Fast delivery"],
                new Coordinates { Latitude = -36.8531, Longitude = 174.7644 },
                new[]
                {
                    new MenuCategory { Id = "milk", Name = "Milk tea" },
                    new MenuCategory { Id = "fruit", Name = "Fruit tea" },
                    new MenuCategory { Id = "coffee", Name = "Coffee" },
                },
                new[]
                {
                    new MenuItem
                    {
                        Id = "tea-boba",
                        CategoryId = "milk",
                        Name = "Brown sugar pearl milk tea",
                        Description = "Brown sugar pearls, fresh milk, light ice",
                        Price = 7.6m,
                        MonthlySales = 880,
                        Tag = "Must order",
                        Stock = 96,
                        IsAvailable = true,
                        ImageTone = "tea",
                        OptionGroups = new[]
                        {
                            new MenuOptionGroup
                            {
                                Id = "sweetness",
                                Name = "Sweetness",
                                Required = true,
                                Options = new[]
                                {
                                    new MenuOption { Id = "less-sugar", Name = "Less sugar", PriceDelta = 0m },
                                    new MenuOption { Id = "half-sugar", Name = "Half sugar", PriceDelta = 0m },
                                    new MenuOption { Id = "full-sugar", Name = "Full sugar", PriceDelta = 0m },
                                },
                            },
                            new MenuOptionGroup
                            {
                                Id = "ice",
                                Name = "Ice",
                                Required = true,
                                Options = new[]
                                {
                                    new MenuOption { Id = "less-ice", Name = "Less ice", PriceDelta = 0m },
                                    new MenuOption { Id = "no-ice", Name = "No ice", PriceDelta = 0m },
                                },
                            },
                            new MenuOptionGroup
                            {
                                Id = "topping",
                                Name = "Toppings",
                                Required = true,
                                Options = new[]
                                {
                                    new MenuOption { Id = "none", Name = "No topping", PriceDelta = 0m },
                                    new MenuOption { Id = "extra-boba", Name = "Extra boba", PriceDelta = 0.8m },
                                    new MenuOption { Id = "cheese-foam", Name = "Cheese foam", PriceDelta = 1.2m },
                                },
                            },
                        },
                    },
                    new MenuItem { Id = "tea-lemon", CategoryId = "fruit", Name = "Lemon black tea", Description = "Fresh lemon and black tea", Price = 7.2m, MonthlySales = 520, Tag = "Fresh", Stock = 60, IsAvailable = true, ImageTone = "tea" },
                    new MenuItem { Id = "coffee-latte", CategoryId = "coffee", Name = "燕麦拿铁", Description = "Double concentrate, oat milk, low sugar", Price = 6.9m, MonthlySales = 260, Tag = "Coffee", Stock = 40, IsAvailable = true, ImageTone = "tea" },
                }),
            ["store-sushi"] = new StoreSeed(
                "store-sushi",
                "Harbour Sushi",
                "Japanese",
                4.6m,
                980,
                32,
                3.49m,
                2.1m,
                "Free delivery for set meals",
                "sushi",
                "9 Customs Street East, Auckland CBD",
                "10:00 - 20:30",
                "Sashimi sells out daily, set meals recommended.",
                18m,
                24m,
                4m,
                ["Fresh cuts", "Reservations", "Warm packs"],
                new Coordinates { Latitude = -36.8442, Longitude = 174.7678 },
                new[]
                {
                    new MenuCategory { Id = "sushi-box", Name = "Sushi boxes" },
                    new MenuCategory { Id = "bento", Name = "Bento" },
                    new MenuCategory { Id = "soup", Name = "Soup" },
                },
                new[]
                {
                    new MenuItem { Id = "sushi-salmon", CategoryId = "sushi-box", Name = "Salmon sushi box", Description = "Salmon nigiri, roll, mayo", Price = 21.8m, MonthlySales = 230, Tag = "Fresh", Stock = 18, IsAvailable = true, ImageTone = "sushi" },
                    new MenuItem { Id = "sushi-chicken", CategoryId = "bento", Name = "Teriyaki chicken bento", Description = "Chicken thigh, rice, salad, tamagoyaki", Price = 17.6m, MonthlySales = 190, Tag = "Bento", Stock = 21, IsAvailable = true, ImageTone = "rice" },
                    new MenuItem { Id = "sushi-miso", CategoryId = "soup", Name = "Miso soup", Description = "Seaweed, tofu, scallions", Price = 4.2m, MonthlySales = 310, Tag = "Side", Stock = 36, IsAvailable = true, ImageTone = "sushi" },
                }),
        };
    }



    private static CustomerOrder[] BuildInitialCustomerOrders()
    {
        var primaryAddress = new CustomerAddress
        {
            Id = "address-home",
            Label = "Home",
            ReceiverName = "Shuaijie",
            PhoneMasked = "021 **** 118",
            AddressLine = "12 Queen Street, Auckland CBD",
            Detail = "Apartment 8B",
            Coordinates = new Coordinates
            {
                Latitude = -36.8489,
                Longitude = 174.7633,
            },
        };

        var order = new CustomerOrder
        {
            Id = "KE-2048",
            StoreId = "store-koala-bowl",
            StoreName = "Koala Bowl",
            DeliveryDistanceKm = 0.22m,
            DeliveryRadiusKm = 4.5m,
            Status = "Delivering",
            StatusText = CustomerStatusText["Delivering"],
            Address = primaryAddress,
            Items = new[]
            {
                new CartLine { MenuItemId = "bowl-teriyaki", Id = "bowl-teriyaki", Name = "Teriyaki chicken bowl", CategoryId = "signature", Quantity = 2, CartKey = "bowl-teriyaki", SelectedOptions = Array.Empty<SelectedMenuOption>(), UnitPrice = 16.8m },
                new CartLine { MenuItemId = "miso-soup", Id = "miso-soup", Name = "Miso soup", CategoryId = "side", Quantity = 1, CartKey = "miso-soup", SelectedOptions = Array.Empty<SelectedMenuOption>(), UnitPrice = 4.2m },
            },
            Price = new OrderPricePreview
            {
                ItemsAmount = 37.8m,
                DeliveryFee = 2.99m,
                PackagingFee = 0.8m,
                DiscountAmount = 6m,
                TotalAmount = 35.59m,
            },
            RiderName = "Liam",
            RiderPhoneMasked = "020 **** 776",
            RiderLocation = new Coordinates { Latitude = -36.8482, Longitude = 174.764 },
            EstimatedArrivalMinutes = 12,
            Timeline = BuildTimeline("Delivering"),
        };

        return [order];
    }

    private static MerchantOrder[] BuildInitialMerchantOrders()
    {
        return
        [
            new MerchantOrder
            {
                Id = "KE-2048",
                CustomerName = "Shuaijie",
                ItemsSummary = "Teriyaki chicken bowl x2, Miso soup x1",
                Items = new[]
                {
                    new CartLine { MenuItemId = "bowl-teriyaki", Id = "bowl-teriyaki", Name = "Teriyaki chicken bowl", Quantity = 2, CartKey = "bowl-teriyaki", UnitPrice = 16.8m },
                    new CartLine { MenuItemId = "miso-soup", Id = "miso-soup", Name = "Miso soup", Quantity = 1, CartKey = "miso-soup", UnitPrice = 4.2m },
                },
                Status = "PendingAccept",
                StatusText = MerchantStatusText["PendingAccept"],
                TotalAmount = 37.8m,
                PlacedMinutesAgo = 3,
                DeliveryAddressMasked = "Queen Street nearby",
                CustomerNote = "Less salt, no onion, call on arrival.",
                PaymentStatus = "Paid",
            },
            new MerchantOrder
            {
                Id = "KE-2049",
                CustomerName = "Mia",
                ItemsSummary = "Black garlic beef bowl x1, Pumpkin veggie bowl x1",
                Items = new[]
                {
                    new CartLine { MenuItemId = "bowl-beef", Id = "bowl-beef", Name = "Black garlic beef bowl", Quantity = 1, CartKey = "bowl-beef", UnitPrice = 18.5m },
                    new CartLine { MenuItemId = "bowl-veggie", Id = "bowl-veggie", Name = "Pumpkin veggie bowl", Quantity = 1, CartKey = "bowl-veggie", UnitPrice = 14.2m },
                },
                Status = "Preparing",
                StatusText = MerchantStatusText["Preparing"],
                TotalAmount = 35.1m,
                PlacedMinutesAgo = 9,
                DeliveryAddressMasked = "Hobson Street nearby",
                CustomerNote = "Extra utensils, please.",
                PaymentStatus = "Paid",
            },
        ];
    }

    private static DeliveryTask[] BuildInitialDeliveryTasks()
    {
        return
        [
            new DeliveryTask
            {
                Id = "D-801",
                OrderId = "KE-2050",
                StoreName = "Koala Bowl",
                PickupAddress = "18 Queen Street, Auckland CBD",
                CustomerAddress = "12 Queen Street, Auckland CBD",
                DistanceKm = 2.8m,
                Fee = 8.5m,
                Status = "Available",
                StatusText = DeliveryStatusText["Available"],
                PickupCode = "7421",
                CustomerPhoneMasked = "021 **** 118",
                EstimatedMinutes = 24,
                PickupLocation = new Coordinates { Latitude = -36.8478, Longitude = 174.765 },
                DropoffLocation = new Coordinates { Latitude = -36.8489, Longitude = 174.7633 },
            },
            new DeliveryTask
            {
                Id = "D-802",
                OrderId = "KE-2048",
                StoreName = "Koala Bowl",
                PickupAddress = "18 Queen Street, Auckland CBD",
                CustomerAddress = "12 Queen Street, Auckland CBD",
                DistanceKm = 1.7m,
                Fee = 6.2m,
                Status = "Delivering",
                StatusText = DeliveryStatusText["Delivering"],
                PickupCode = "5180",
                CustomerPhoneMasked = "022 **** 301",
                EstimatedMinutes = 12,
                PickupLocation = new Coordinates { Latitude = -36.8478, Longitude = 174.765 },
                DropoffLocation = new Coordinates { Latitude = -36.852, Longitude = 174.7592 },
            },
        ];
    }

    private static MerchantApplication[] BuildInitialMerchantApplications()
    {
        return
        [
            new MerchantApplication
            {
                Id = "MA-101",
                StoreName = "Harbour Sushi",
                ApplicantName = "Haruto",
                Category = "Japanese",
                Address = "9 Customs Street East",
                SubmittedHoursAgo = 5,
                Status = "Pending",
            },
            new MerchantApplication
            {
                Id = "MA-102",
                StoreName = "Evening Grill",
                ApplicantName = "Chen",
                Category = "Night barbecue",
                Address = "22 Lorne Street",
                SubmittedHoursAgo = 13,
                Status = "Pending",
            },
        ];
    }

    private static PlatformOrder[] BuildInitialPlatformOrders()
    {
        return
        [
            new PlatformOrder
            {
                Id = "KE-2047",
                StoreName = "Aotea Burger",
                CustomerName = "Mia",
                RiderName = "Unassigned",
                Status = "Dispatcher timeout",
                TotalAmount = 24.7m,
                RiskLevel = "urgent",
            },
            new PlatformOrder
            {
                Id = "KE-2049",
                StoreName = "Koala Bowl",
                CustomerName = "Mia",
                RiderName = "Unassigned",
                Status = "Preparing",
                TotalAmount = 35.1m,
                RiskLevel = "warning",
            },
        ];
    }

    private static AccountRecord[] BuildInitialAccountRecords()
    {
        return
        [
            new AccountRecord { Id = "U-1001", Name = "Shuaijie", Role = "Customer", Status = "Active" },
            new AccountRecord { Id = "M-2001", Name = "Koala Bowl", Role = "Merchant", Status = "Active" },
            new AccountRecord { Id = "R-3001", Name = "Liam", Role = "Rider", Status = "Active" },
            new AccountRecord { Id = "R-3002", Name = "Rider #18", Role = "Rider", Status = "PendingReview" },
        ];
    }

    private static DeliveryArea[] BuildInitialDeliveryAreas()
    {
        return
        [
            new DeliveryArea { Id = "DA-1", Name = "Auckland CBD", RadiusKm = 5, BaseFee = 2.99m, IsEnabled = true },
            new DeliveryArea { Id = "DA-2", Name = "Newmarket", RadiusKm = 4, BaseFee = 3.49m, IsEnabled = true },
            new DeliveryArea { Id = "DA-3", Name = "Parnell", RadiusKm = 3, BaseFee = 3.99m, IsEnabled = false },
        ];
    }

    private static AdminTask[] BuildInitialAdminTasks()
    {
        return
        [
            new AdminTask { Id = "A-301", Title = "New merchant review", Owner = "Harbour Sushi", Status = "Pending review", Severity = "warning" },
            new AdminTask { Id = "A-302", Title = "Order delivery exception", Owner = "KE-2047", Status = "Pending handling", Severity = "urgent" },
            new AdminTask { Id = "A-303", Title = "Rider account verification", Owner = "Rider #18", Status = "Pending review", Severity = "normal" },
        ];
    }

    private sealed class DeliveryOutOfRangeException : Exception
    {
        public DeliveryOutOfRangeException()
            : base("Delivery address is outside this store delivery range")
        {
        }
    }

    private sealed class OrderCannotCancelException : Exception
    {
        public OrderCannotCancelException()
            : base("Order can no longer be cancelled automatically")
        {
        }
    }
}

public sealed record MerchantDashboardData
{
    public required MerchantDashboardStore Store { get; init; }
    public required MerchantDashboardMetrics Metrics { get; init; }
}

public sealed record MerchantDashboardStore
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required decimal Rating { get; init; }
    public required int MonthlySales { get; init; }
    public required int DeliveryMinutes { get; init; }
    public required string Address { get; init; }
}

public sealed record MerchantDashboardMetrics
{
    public required int PendingOrders { get; init; }
    public required int PreparingOrders { get; init; }
    public required decimal TodayRevenue { get; init; }
    public required int ActiveMenuItems { get; init; }
}

public sealed record RiderDashboardData
{
    public required int AvailableDeliveries { get; init; }
    public required int ActiveDeliveries { get; init; }
    public required decimal TodayIncome { get; init; }
    public required int AverageDeliveryMinutes { get; init; }
}

public sealed record AdminDashboardData
{
    public required int PendingMerchantReviews { get; init; }
    public required int AbnormalOrders { get; init; }
    public required int OnlineRiders { get; init; }
    public required int TodayOrders { get; init; }
}
