using System.Globalization;
using KoalaEats.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace KoalaEats.Api;

public sealed partial class BusinessStateStore
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
    private readonly IDbContextFactory<KoalaEatsDbContext> _dbContextFactory;
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
    private AdminTask[] _adminTasks;
    private int _nextCustomerOrderNumber;
    private int _nextDeliveryNumber;

    public BusinessStateStore(IDbContextFactory<KoalaEatsDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
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
        InitializePersistence();
    }

    private void InitializePersistence()
    {
        using var db = _dbContextFactory.CreateDbContext();
        db.Database.Migrate();

        if (!db.Stores.Any() &&
            !db.MenuCategories.Any() &&
            !db.MenuItems.Any() &&
            !db.MenuOptionGroups.Any() &&
            !db.MenuOptions.Any() &&
            !db.Orders.Any() &&
            !db.OrderItems.Any() &&
            !db.OrderItemOptions.Any() &&
            !db.OrderStatusEvents.Any() &&
            !db.Riders.Any() &&
            !db.DeliveryTasks.Any() &&
            !db.MerchantApplications.Any() &&
            !db.PlatformOrders.Any() &&
            !db.Accounts.Any() &&
            !db.DeliveryAreas.Any() &&
            !db.AdminTasks.Any())
        {
            PersistSnapshot(db);
            return;
        }

        LoadStateFromDatabase(db);
    }

    private void LoadStateFromDatabase(KoalaEatsDbContext db)
    {
        var store = db.Stores.FirstOrDefault(entity => entity.Id == "store-koala-bowl");
        if (store is not null)
        {
            _merchantProfile = new MerchantStoreProfile
            {
                Id = store.Id,
                Name = store.Name,
                Address = store.AddressLine,
                OpeningHours = store.OpeningHours,
                IsOpen = store.IsOpen,
                DeliveryRadiusKm = store.DeliveryRadiusKm,
                AveragePreparationMinutes = store.DeliveryMinutes,
                Announcement = store.Announcement,
                Coordinates = new Coordinates
                {
                    Latitude = (double)store.LocationLatitude,
                    Longitude = (double)store.LocationLongitude,
                },
            };
        }

        _merchantMenuItems = LoadMerchantMenuItems(db).Select(item => new MenuItem
        {
            Id = item.Id,
            CategoryId = item.CategoryId,
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            MonthlySales = item.MonthlySales,
            Tag = item.Tag,
            Stock = item.Stock,
            IsAvailable = item.IsAvailable,
            ImageTone = item.ImageTone,
            OptionGroups = item.OptionGroups,
        }).ToList();
        RefreshPrimaryStoreSeed();

        var orderEntities = db.Orders
            .OrderByDescending(order => order.PlacedAtUtc)
            .ToList();
        var orderItemEntities = db.OrderItems
            .OrderBy(item => item.SortOrder)
            .ToList();
        var orderItemOptionEntities = db.OrderItemOptions.ToList();
        _customerOrders = orderEntities.Select(order => MapCustomerOrder(order, orderItemEntities, orderItemOptionEntities)).ToList();
        _merchantOrders = orderEntities.Select(order => MapMerchantOrder(order, orderItemEntities, orderItemOptionEntities)).ToList();
        _nextCustomerOrderNumber = GetNextSequenceNumber(_customerOrders.Select(order => order.Id), "KE-", 3001);

        _deliveryTasks = db.DeliveryTasks
            .OrderByDescending(task => task.CreatedAtUtc)
            .Select(MapDeliveryTask)
            .ToList();
        _nextDeliveryNumber = GetNextSequenceNumber(_deliveryTasks.Select(task => task.Id), "D-", 900);
        _merchantApplications = db.MerchantApplications
            .OrderByDescending(application => application.SubmittedAtUtc)
            .Select(MapMerchantApplication)
            .ToList();
        _platformOrders = db.PlatformOrders
            .OrderByDescending(order => order.CreatedAtUtc)
            .Select(MapPlatformOrder)
            .ToList();
        _accountRecords = db.Accounts
            .OrderBy(record => record.Role)
            .ThenBy(record => record.Name)
            .Select(MapAccountRecord)
            .ToList();
        _deliveryAreas = db.DeliveryAreas
            .OrderBy(area => area.SortOrder)
            .Select(MapDeliveryArea)
            .ToList();

        var adminTasks = db.AdminTasks
            .OrderBy(task => task.CreatedAtUtc)
            .Select(MapAdminTask)
            .ToArray();
        if (adminTasks.Length > 0)
        {
            _adminTasks = adminTasks;
        }
    }

    private void PersistSnapshot()
    {
        using var db = _dbContextFactory.CreateDbContext();
        PersistSnapshot(db);
    }

    private void PersistSnapshot(KoalaEatsDbContext db)
    {
        ReplaceSet(db.Stores, BuildStoreEntities());
        ReplaceSet(db.MenuCategories, BuildMenuCategoryEntities());
        ReplaceSet(db.MenuItems, BuildMenuItemEntities());
        ReplaceSet(db.MenuOptionGroups, BuildMenuOptionGroupEntities());
        ReplaceSet(db.MenuOptions, BuildMenuOptionEntities());
        ReplaceSet(db.Orders, BuildOrderEntities());
        ReplaceSet(db.OrderItems, BuildOrderItemEntities());
        ReplaceSet(db.OrderItemOptions, BuildOrderItemOptionEntities());
        ReplaceSet(db.OrderStatusEvents, BuildOrderStatusEventEntities());
        ReplaceSet(db.Riders, BuildRiderEntities());
        ReplaceSet(db.DeliveryTasks, BuildDeliveryTaskEntities());
        ReplaceSet(db.MerchantApplications, BuildMerchantApplicationEntities());
        ReplaceSet(db.PlatformOrders, BuildPlatformOrderEntities());
        ReplaceSet(db.Accounts, BuildAccountEntities());
        ReplaceSet(db.DeliveryAreas, BuildDeliveryAreaEntities());
        ReplaceSet(db.AdminTasks, BuildAdminTaskEntities());
        db.SaveChanges();
    }

    private static void ReplaceSet<TEntity>(DbSet<TEntity> set, IEnumerable<TEntity> entities)
        where TEntity : class
    {
        var current = set.ToList();
        if (current.Count > 0)
        {
            set.RemoveRange(current);
        }

        set.AddRange(entities);
    }

    private void RefreshPrimaryStoreSeed()
    {
        var current = _storeSeeds["store-koala-bowl"];
        _storeSeeds["store-koala-bowl"] = current with
        {
            Address = _merchantProfile.Address,
            OpeningHours = _merchantProfile.OpeningHours,
            Announcement = _merchantProfile.Announcement,
            DeliveryRadiusKm = _merchantProfile.DeliveryRadiusKm,
            Location = _merchantProfile.Coordinates,
            Menu = _merchantMenuItems.ToArray(),
        };
    }

    private static MenuItem ToSeedMenuItem(MerchantMenuItem item)
    {
        return new MenuItem
        {
            Id = item.Id,
            CategoryId = item.CategoryId,
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

    private IEnumerable<StoreEntity> BuildStoreEntities()
    {
        foreach (var seed in _storeSeeds.Values)
        {
            if (seed.Id == _merchantProfile.Id)
            {
                yield return new StoreEntity
                {
                    Id = seed.Id,
                    MerchantAccountId = "M-2001",
                    Name = _merchantProfile.Name,
                    Category = seed.Category,
                    Rating = seed.Rating,
                    MonthlySales = seed.MonthlySales,
                    DeliveryMinutes = _merchantProfile.AveragePreparationMinutes,
                    DeliveryFee = seed.DeliveryFee,
                    MinOrderAmount = seed.MinOrderAmount,
                    DeliveryRadiusKm = _merchantProfile.DeliveryRadiusKm,
                    Promotion = seed.Promotion,
                    CoverTone = seed.CoverTone,
                    IsOpen = _merchantProfile.IsOpen,
                    OpeningHours = _merchantProfile.OpeningHours,
                    Announcement = _merchantProfile.Announcement,
                    AddressLine = _merchantProfile.Address,
                    LocationLatitude = (decimal)_merchantProfile.Coordinates.Latitude,
                    LocationLongitude = (decimal)_merchantProfile.Coordinates.Longitude,
                    CreatedAtUtc = DateTimeOffset.UtcNow,
                    UpdatedAtUtc = DateTimeOffset.UtcNow,
                };
                continue;
            }

            yield return new StoreEntity
            {
                Id = seed.Id,
                Name = seed.Name,
                Category = seed.Category,
                Rating = seed.Rating,
                MonthlySales = seed.MonthlySales,
                DeliveryMinutes = seed.DeliveryMinutes,
                DeliveryFee = seed.DeliveryFee,
                MinOrderAmount = seed.MinOrderAmount,
                DeliveryRadiusKm = seed.DeliveryRadiusKm,
                Promotion = seed.Promotion,
                CoverTone = seed.CoverTone,
                IsOpen = true,
                OpeningHours = seed.OpeningHours,
                Announcement = seed.Announcement,
                AddressLine = seed.Address,
                LocationLatitude = (decimal)seed.Location.Latitude,
                LocationLongitude = (decimal)seed.Location.Longitude,
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow,
            };
        }
    }

    private IEnumerable<MenuCategoryEntity> BuildMenuCategoryEntities()
    {
        foreach (var seed in _storeSeeds.Values)
        {
            var menuCategories = seed.Id == _merchantProfile.Id
                ? _storeSeeds[seed.Id].MenuCategories
                : seed.MenuCategories;

            for (var index = 0; index < menuCategories.Length; index++)
            {
                var category = menuCategories[index];
                yield return new MenuCategoryEntity
                {
                    Id = $"{seed.Id}-{category.Id}",
                    StoreId = seed.Id,
                    Name = category.Name,
                    SortOrder = index,
                };
            }
        }
    }

    private IEnumerable<MenuItemEntity> BuildMenuItemEntities()
    {
        foreach (var seed in _storeSeeds.Values)
        {
            var menu = seed.Id == _merchantProfile.Id ? _merchantMenuItems.ToArray() : seed.Menu;
            for (var index = 0; index < menu.Length; index++)
            {
                var item = menu[index];
                yield return new MenuItemEntity
                {
                    Id = item.Id,
                    StoreId = seed.Id,
                    MenuCategoryId = item.CategoryId,
                    Name = item.Name,
                    Description = item.Description,
                    Price = item.Price,
                    MonthlySales = item.MonthlySales,
                    Tag = item.Tag,
                    Stock = item.Stock,
                    IsAvailable = item.IsAvailable,
                    ImageTone = item.ImageTone,
                    SortOrder = index,
                };
            }
        }
    }

    private IEnumerable<MenuOptionGroupEntity> BuildMenuOptionGroupEntities()
    {
        foreach (var seed in _storeSeeds.Values)
        {
            var menu = seed.Id == _merchantProfile.Id ? _merchantMenuItems.ToArray() : seed.Menu;
            foreach (var item in menu)
            {
                if (item.OptionGroups is null)
                {
                    continue;
                }

                for (var index = 0; index < item.OptionGroups.Length; index++)
                {
                    var group = item.OptionGroups[index];
                    yield return new MenuOptionGroupEntity
                    {
                        Id = ComposeScopedId(item.Id, group.Id),
                        MenuItemId = item.Id,
                        Name = group.Name,
                        Required = group.Required,
                        SortOrder = index,
                    };
                }
            }
        }
    }

    private IEnumerable<MenuOptionEntity> BuildMenuOptionEntities()
    {
        foreach (var seed in _storeSeeds.Values)
        {
            var menu = seed.Id == _merchantProfile.Id ? _merchantMenuItems.ToArray() : seed.Menu;
            foreach (var item in menu)
            {
                if (item.OptionGroups is null)
                {
                    continue;
                }

                foreach (var group in item.OptionGroups)
                {
                    for (var index = 0; index < group.Options.Length; index++)
                    {
                        var option = group.Options[index];
                        yield return new MenuOptionEntity
                        {
                            Id = ComposeScopedId(ComposeScopedId(item.Id, group.Id), option.Id),
                            MenuOptionGroupId = ComposeScopedId(item.Id, group.Id),
                            Name = option.Name,
                            PriceDelta = option.PriceDelta,
                            SortOrder = index,
                        };
                    }
                }
            }
        }
    }

    private IEnumerable<OrderEntity> BuildOrderEntities()
    {
        var orders = _customerOrders
            .OrderByDescending(order => order.Id)
            .ToArray();

        foreach (var order in orders)
        {
            yield return new OrderEntity
            {
                Id = order.Id,
                StoreId = order.StoreId,
                StoreName = order.StoreName,
                StoreLatitude = (decimal)_merchantProfile.Coordinates.Latitude,
                StoreLongitude = (decimal)_merchantProfile.Coordinates.Longitude,
                DeliveryRadiusKm = order.DeliveryRadiusKm ?? _merchantProfile.DeliveryRadiusKm,
                CustomerId = "U-1001",
                CustomerName = order.Address.ReceiverName,
                CustomerPhoneMasked = order.Address.PhoneMasked,
                CustomerAddressId = order.Address.Id,
                ReceiverName = order.Address.ReceiverName,
                AddressLabel = order.Address.Label,
                AddressLine = order.Address.AddressLine,
                AddressDetail = order.Address.Detail,
                AddressLatitude = (decimal)order.Address.Coordinates.Latitude,
                AddressLongitude = (decimal)order.Address.Coordinates.Longitude,
                DeliveryDistanceKm = order.DeliveryDistanceKm ?? 0m,
                Status = order.Status,
                StatusText = order.StatusText,
                PaymentStatus = ResolvePaymentStatus(order.Status),
                ItemsAmount = order.Price.ItemsAmount,
                DeliveryFee = order.Price.DeliveryFee,
                PackagingFee = order.Price.PackagingFee,
                DiscountAmount = order.Price.DiscountAmount,
                TotalAmount = order.Price.TotalAmount,
                Remark = order.Remark,
                PaymentMethod = order.Status == "PendingPayment" ? null : "MockBalance",
                PlacedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-Math.Max(1, order.EstimatedArrivalMinutes)),
                PaidAtUtc = order.Status is "PendingPayment" or "Canceled" ? null : DateTimeOffset.UtcNow.AddMinutes(-Math.Max(1, order.EstimatedArrivalMinutes - 2)),
                CanceledAtUtc = order.Status is "Canceled" ? DateTimeOffset.UtcNow : null,
                CompletedAtUtc = order.Status is "Completed" ? DateTimeOffset.UtcNow : null,
                LastStatusChangedAtUtc = DateTimeOffset.UtcNow,
                EstimatedArrivalMinutes = order.EstimatedArrivalMinutes,
                RiderId = "R-3001",
                RiderName = order.RiderName,
                RiderPhoneMasked = order.RiderPhoneMasked,
                RiderLatitude = (decimal)order.RiderLocation.Latitude,
                RiderLongitude = (decimal)order.RiderLocation.Longitude,
            };
        }
    }

    private IEnumerable<OrderItemEntity> BuildOrderItemEntities()
    {
        foreach (var order in _customerOrders)
        {
            for (var index = 0; index < order.Items.Length; index++)
            {
                var item = order.Items[index];
                yield return new OrderItemEntity
                {
                    Id = $"{order.Id}-item-{index + 1}",
                    OrderId = order.Id,
                    MenuItemId = item.MenuItemId ?? item.Id,
                    Name = item.Name ?? string.Empty,
                    CategoryId = item.CategoryId,
                    CategoryName = item.CategoryName,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice ?? item.Price ?? 0m,
                    LineTotal = (item.UnitPrice ?? item.Price ?? 0m) * item.Quantity,
                    CartKey = item.CartKey,
                    SortOrder = index,
                };
            }
        }
    }

    private IEnumerable<OrderItemOptionEntity> BuildOrderItemOptionEntities()
    {
        foreach (var order in _customerOrders)
        {
            for (var itemIndex = 0; itemIndex < order.Items.Length; itemIndex++)
            {
                var item = order.Items[itemIndex];
                if (item.SelectedOptions is null)
                {
                    continue;
                }

                foreach (var option in item.SelectedOptions)
                {
                    yield return new OrderItemOptionEntity
                    {
                        Id = $"{order.Id}-item-{itemIndex + 1}-{option.GroupId}-{option.Id}",
                        OrderItemId = $"{order.Id}-item-{itemIndex + 1}",
                        GroupId = option.GroupId,
                        GroupName = option.GroupName,
                        OptionId = option.Id,
                        OptionName = option.Name,
                        PriceDelta = option.PriceDelta,
                    };
                }
            }
        }
    }

    private IEnumerable<OrderStatusEventEntity> BuildOrderStatusEventEntities()
    {
        foreach (var order in _customerOrders)
        {
            yield return new OrderStatusEventEntity
            {
                Id = $"{order.Id}-status",
                OrderId = order.Id,
                Status = order.Status,
                StatusText = order.StatusText,
                Description = order.StatusText,
                Source = "system",
                HappenedAtUtc = DateTimeOffset.UtcNow,
            };
        }
    }

    private static IEnumerable<RiderEntity> BuildRiderEntities()
    {
        return
        [
            new RiderEntity
            {
                Id = "R-3001",
                AccountId = "R-3001",
                Name = "Liam",
                Phone = "020 **** 776",
                Status = "Active",
                CurrentLatitude = -36.8482m,
                CurrentLongitude = 174.764m,
                Rating = 4.92m,
                IsOnline = true,
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow,
            },
        ];
    }

    private IEnumerable<DeliveryTaskEntity> BuildDeliveryTaskEntities()
    {
        foreach (var task in _deliveryTasks)
        {
            yield return new DeliveryTaskEntity
            {
                Id = task.Id,
                OrderId = task.OrderId,
                RiderId = task.Status is "Available" ? null : "R-3001",
                StoreName = task.StoreName,
                PickupAddress = task.PickupAddress,
                CustomerAddress = task.CustomerAddress,
                DistanceKm = task.DistanceKm,
                Fee = task.Fee,
                Status = task.Status,
                StatusText = task.StatusText,
                PickupCode = task.PickupCode,
                CustomerPhoneMasked = task.CustomerPhoneMasked,
                EstimatedMinutes = task.EstimatedMinutes,
                PickupLatitude = (decimal)task.PickupLocation.Latitude,
                PickupLongitude = (decimal)task.PickupLocation.Longitude,
                DropoffLatitude = (decimal)task.DropoffLocation.Latitude,
                DropoffLongitude = (decimal)task.DropoffLocation.Longitude,
                CurrentLatitude = task.CurrentLocation is null ? null : (decimal?)task.CurrentLocation.Latitude,
                CurrentLongitude = task.CurrentLocation is null ? null : (decimal?)task.CurrentLocation.Longitude,
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow,
            };
        }
    }

    private IEnumerable<MerchantApplicationEntity> BuildMerchantApplicationEntities()
    {
        foreach (var application in _merchantApplications)
        {
            yield return new MerchantApplicationEntity
            {
                Id = application.Id,
                StoreName = application.StoreName,
                ApplicantName = application.ApplicantName,
                Category = application.Category,
                Address = application.Address,
                SubmittedAtUtc = DateTimeOffset.UtcNow.AddHours(-Math.Max(1, application.SubmittedHoursAgo)),
                Status = application.Status,
                ReviewedAtUtc = application.Status == "Pending" ? null : DateTimeOffset.UtcNow,
                ReviewedBy = application.Status == "Pending" ? null : "admin",
            };
        }
    }

    private IEnumerable<PlatformOrderEntity> BuildPlatformOrderEntities()
    {
        foreach (var order in _platformOrders)
        {
            yield return new PlatformOrderEntity
            {
                Id = order.Id,
                OrderId = order.Id,
                StoreName = order.StoreName,
                CustomerName = order.CustomerName,
                RiderName = order.RiderName,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                RiskLevel = order.RiskLevel,
                Reason = null,
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow,
            };
        }
    }

    private static IEnumerable<AccountEntity> BuildAccountEntities()
    {
        return
        [
            new AccountEntity { Id = "U-1001", Name = "Shuaijie", Role = "Customer", Status = "Active", CreatedAtUtc = DateTimeOffset.UtcNow, UpdatedAtUtc = DateTimeOffset.UtcNow },
            new AccountEntity { Id = "M-2001", Name = "Koala Bowl", Role = "Merchant", Status = "Active", CreatedAtUtc = DateTimeOffset.UtcNow, UpdatedAtUtc = DateTimeOffset.UtcNow },
            new AccountEntity { Id = "R-3001", Name = "Liam", Role = "Rider", Status = "Active", CreatedAtUtc = DateTimeOffset.UtcNow, UpdatedAtUtc = DateTimeOffset.UtcNow },
            new AccountEntity { Id = "R-3002", Name = "Rider #18", Role = "Rider", Status = "PendingReview", CreatedAtUtc = DateTimeOffset.UtcNow, UpdatedAtUtc = DateTimeOffset.UtcNow },
        ];
    }

    private IEnumerable<DeliveryAreaEntity> BuildDeliveryAreaEntities()
    {
        foreach (var area in _deliveryAreas)
        {
            yield return new DeliveryAreaEntity
            {
                Id = area.Id,
                Name = area.Name,
                RadiusKm = area.RadiusKm,
                BaseFee = area.BaseFee,
                IsEnabled = area.IsEnabled,
                SortOrder = Array.IndexOf(_deliveryAreas.ToArray(), area),
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow,
            };
        }
    }

    private IEnumerable<AdminTaskEntity> BuildAdminTaskEntities()
    {
        foreach (var task in _adminTasks)
        {
            yield return new AdminTaskEntity
            {
                Id = task.Id,
                Title = task.Title,
                Owner = task.Owner,
                Status = task.Status,
                Severity = task.Severity,
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow,
            };
        }
    }

    private static MerchantMenuItem[] LoadMerchantMenuItems(KoalaEatsDbContext db)
    {
        var menuCategories = db.MenuCategories
            .Where(category => category.StoreId == "store-koala-bowl")
            .OrderBy(category => category.SortOrder)
            .ToList();
        var menuItems = db.MenuItems
            .Where(item => item.StoreId == "store-koala-bowl")
            .OrderBy(item => item.SortOrder)
            .ToList();
        var optionGroups = db.MenuOptionGroups
            .Where(group => menuItems.Select(item => item.Id).Contains(group.MenuItemId))
            .OrderBy(group => group.SortOrder)
            .ToList();
        var optionGroupsByItem = optionGroups.GroupBy(group => group.MenuItemId).ToDictionary(group => group.Key, group => group.ToList());
        var options = db.MenuOptions
            .Where(option => optionGroups.Select(group => group.Id).Contains(option.MenuOptionGroupId))
            .OrderBy(option => option.SortOrder)
            .ToList();
        var optionsByGroup = options.GroupBy(option => option.MenuOptionGroupId).ToDictionary(group => group.Key, group => group.ToList());

        return menuItems.Select(item =>
        {
            var categoryName = menuCategories.FirstOrDefault(category => category.Id == item.MenuCategoryId)?.Name ?? "General";
            var itemOptionGroups = optionGroupsByItem.TryGetValue(item.Id, out var groups)
                ? groups.Select(group => new MenuOptionGroup
                {
                    Id = group.Id,
                    Name = group.Name,
                    Required = group.Required,
                    Options = optionsByGroup.TryGetValue(group.Id, out var groupOptions)
                        ? groupOptions.Select(option => new MenuOption
                        {
                            Id = option.Id,
                            Name = option.Name,
                            PriceDelta = option.PriceDelta,
                        }).ToArray()
                        : Array.Empty<MenuOption>(),
                }).ToArray()
                : null;

            return new MerchantMenuItem
            {
                Id = item.Id,
                CategoryId = item.MenuCategoryId ?? "general",
                CategoryName = categoryName,
                Name = item.Name,
                Description = item.Description,
                Price = item.Price,
                MonthlySales = item.MonthlySales,
                Tag = item.Tag,
                Stock = item.Stock,
                IsAvailable = item.IsAvailable,
                ImageTone = item.ImageTone,
                OptionGroups = itemOptionGroups,
            };
        }).ToArray();
    }

    private static string ComposeScopedId(string ownerId, string rawId)
    {
        if (rawId.StartsWith(ownerId + "-", StringComparison.OrdinalIgnoreCase))
        {
            return rawId;
        }

        return $"{ownerId}-{rawId}";
    }

    private static CustomerOrder MapCustomerOrder(OrderEntity order, IReadOnlyCollection<OrderItemEntity> orderItems, IReadOnlyCollection<OrderItemOptionEntity> orderItemOptions)
    {
        var items = BuildCartLines(order, orderItems, orderItemOptions);
        return new CustomerOrder
        {
            Id = order.Id,
            StoreId = order.StoreId,
            StoreName = order.StoreName,
            DeliveryDistanceKm = order.DeliveryDistanceKm,
            DeliveryRadiusKm = order.DeliveryRadiusKm,
            Status = order.Status,
            StatusText = order.StatusText,
            Address = new CustomerAddress
            {
                Id = order.CustomerAddressId ?? $"{order.Id}-address",
                Label = order.AddressLabel,
                ReceiverName = order.ReceiverName,
                PhoneMasked = order.CustomerPhoneMasked ?? string.Empty,
                AddressLine = order.AddressLine,
                Detail = order.AddressDetail ?? string.Empty,
                PlaceId = null,
                Coordinates = new Coordinates
                {
                    Latitude = (double)order.AddressLatitude,
                    Longitude = (double)order.AddressLongitude,
                },
            },
            Items = items,
            Price = new OrderPricePreview
            {
                ItemsAmount = order.ItemsAmount,
                DeliveryFee = order.DeliveryFee,
                PackagingFee = order.PackagingFee,
                DiscountAmount = order.DiscountAmount,
                TotalAmount = order.TotalAmount,
            },
            RiderName = order.RiderName,
            RiderPhoneMasked = order.RiderPhoneMasked ?? string.Empty,
            RiderLocation = new Coordinates
            {
                Latitude = (double)order.RiderLatitude,
                Longitude = (double)order.RiderLongitude,
            },
            EstimatedArrivalMinutes = order.EstimatedArrivalMinutes,
            Timeline = BuildTimeline(order.Status),
            Remark = order.Remark,
        };
    }

    private static MerchantOrder MapMerchantOrder(OrderEntity order, IReadOnlyCollection<OrderItemEntity> orderItems, IReadOnlyCollection<OrderItemOptionEntity> orderItemOptions)
    {
        var items = BuildCartLines(order, orderItems, orderItemOptions);
        return new MerchantOrder
        {
            Id = order.Id,
            CustomerName = order.CustomerName,
            ItemsSummary = SummarizeItems(items),
            Items = items,
            Status = ResolveMerchantStatusFromCustomerStatus(order.Status),
            StatusText = MerchantStatusText.TryGetValue(ResolveMerchantStatusFromCustomerStatus(order.Status), out var statusText) ? statusText : ResolveMerchantStatusFromCustomerStatus(order.Status),
            TotalAmount = order.TotalAmount,
            PlacedMinutesAgo = (int)Math.Max(0, (DateTimeOffset.UtcNow - order.PlacedAtUtc).TotalMinutes),
            DeliveryAddressMasked = $"{order.AddressLabel} nearby",
            CustomerNote = order.Remark ?? "No note",
            PaymentStatus = order.PaymentStatus,
        };
    }

    private static CartLine[] BuildCartLines(OrderEntity order, IReadOnlyCollection<OrderItemEntity> orderItems, IReadOnlyCollection<OrderItemOptionEntity> orderItemOptions)
    {
        return orderItems
            .Where(item => item.OrderId == order.Id)
            .OrderBy(item => item.SortOrder)
            .Select(item =>
            {
                var selectedOptions = orderItemOptions
                    .Where(option => option.OrderItemId == item.Id)
                    .Select(option => new SelectedMenuOption
                    {
                        GroupId = option.GroupId ?? string.Empty,
                        GroupName = option.GroupName,
                        Id = option.OptionId ?? string.Empty,
                        Name = option.OptionName,
                        PriceDelta = option.PriceDelta,
                    })
                    .ToArray();

                return new CartLine
                {
                    MenuItemId = item.MenuItemId,
                    Id = item.MenuItemId ?? item.Id,
                    CategoryId = item.CategoryId,
                    CategoryName = item.CategoryName,
                    Name = item.Name,
                    Quantity = item.Quantity,
                    CartKey = item.CartKey,
                    SelectedOptions = selectedOptions,
                    UnitPrice = item.UnitPrice,
                    Price = item.UnitPrice,
                };
            })
            .ToArray();
    }

    private static DeliveryTask MapDeliveryTask(DeliveryTaskEntity task)
    {
        return new DeliveryTask
        {
            Id = task.Id,
            OrderId = task.OrderId,
            StoreName = task.StoreName,
            PickupAddress = task.PickupAddress,
            CustomerAddress = task.CustomerAddress,
            DistanceKm = task.DistanceKm,
            Fee = task.Fee,
            Status = task.Status,
            StatusText = task.StatusText,
            PickupCode = task.PickupCode,
            CustomerPhoneMasked = task.CustomerPhoneMasked,
            EstimatedMinutes = task.EstimatedMinutes,
            PickupLocation = new Coordinates { Latitude = (double)task.PickupLatitude, Longitude = (double)task.PickupLongitude },
            DropoffLocation = new Coordinates { Latitude = (double)task.DropoffLatitude, Longitude = (double)task.DropoffLongitude },
            CurrentLocation = task.CurrentLatitude.HasValue && task.CurrentLongitude.HasValue
                ? new Coordinates { Latitude = (double)task.CurrentLatitude.Value, Longitude = (double)task.CurrentLongitude.Value }
                : null,
        };
    }

    private static MerchantApplication MapMerchantApplication(MerchantApplicationEntity application)
    {
        return new MerchantApplication
        {
            Id = application.Id,
            StoreName = application.StoreName,
            ApplicantName = application.ApplicantName,
            Category = application.Category,
            Address = application.Address,
            SubmittedHoursAgo = (int)Math.Max(1, (DateTimeOffset.UtcNow - application.SubmittedAtUtc).TotalHours),
            Status = application.Status,
        };
    }

    private static PlatformOrder MapPlatformOrder(PlatformOrderEntity order)
    {
        return new PlatformOrder
        {
            Id = order.Id,
            StoreName = order.StoreName,
            CustomerName = order.CustomerName,
            RiderName = order.RiderName,
            Status = order.Status,
            TotalAmount = order.TotalAmount,
            RiskLevel = order.RiskLevel,
        };
    }

    private static AccountRecord MapAccountRecord(AccountEntity account)
    {
        return new AccountRecord
        {
            Id = account.Id,
            Name = account.Name,
            Role = account.Role,
            Status = account.Status,
        };
    }

    private static DeliveryArea MapDeliveryArea(DeliveryAreaEntity area)
    {
        return new DeliveryArea
        {
            Id = area.Id,
            Name = area.Name,
            RadiusKm = area.RadiusKm,
            BaseFee = area.BaseFee,
            IsEnabled = area.IsEnabled,
        };
    }

    private static AdminTask MapAdminTask(AdminTaskEntity task)
    {
        return new AdminTask
        {
            Id = task.Id,
            Title = task.Title,
            Owner = task.Owner,
            Status = task.Status,
            Severity = task.Severity,
        };
    }

    private static string ResolvePaymentStatus(string status)
    {
        return status switch
        {
            "PendingPayment" => "Pending",
            "Canceled" => "Canceled",
            "Refunded" => "Refunded",
            _ => "Paid",
        };
    }

    private static string ResolveMerchantStatusFromCustomerStatus(string status)
    {
        return status switch
        {
            "PendingPayment" => "PendingAccept",
            "Paid" => "PendingAccept",
            "PendingMerchantAccept" => "PendingAccept",
            "MerchantAccepted" => "Preparing",
            "Preparing" => "Preparing",
            "ReadyForPickup" => "ReadyForPickup",
            "WaitingForRider" => "ReadyForPickup",
            "RiderAccepted" => "ReadyForPickup",
            "RiderArrivedStore" => "ReadyForPickup",
            "RiderPickedUp" => "PickedUp",
            "Delivering" => "PickedUp",
            "Completed" => "PickedUp",
            "Rejected" => "Rejected",
            "Refunded" => "Rejected",
            "Canceled" => "Rejected",
            _ => "PendingAccept",
        };
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

    private static int GetNextSequenceNumber(IEnumerable<string> ids, string prefix, int defaultValue)
    {
        var maxValue = defaultValue - 1;

        foreach (var id in ids)
        {
            if (!id.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var suffix = id[prefix.Length..];
            if (int.TryParse(suffix, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value))
            {
                maxValue = Math.Max(maxValue, value);
            }
        }

        return maxValue + 1;
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
                    new MenuItem { Id = "coffee-latte", CategoryId = "coffee", Name = "鐕曢害鎷块搧", Description = "Double concentrate, oat milk, low sugar", Price = 6.9m, MonthlySales = 260, Tag = "Coffee", Stock = 40, IsAvailable = true, ImageTone = "tea" },
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
