namespace KoalaEats.Api;

public sealed partial class BusinessStateStore
{
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
            PersistSnapshot();
            return new { id = applicationId, status = request.Status };
        }
    }

    public object DismissPlatformOrder(string orderId)
    {
        lock (_gate)
        {
            var order = _platformOrders.FirstOrDefault(item => item.Id == orderId);
            if (order is null)
            {
                throw new KeyNotFoundException("Platform order not found");
            }

            AddOrUpdatePlatformOrder(orderId, order with
            {
                Status = "Handled",
                RiskLevel = "normal",
            });

            PersistSnapshot();
            return new
            {
                id = orderId,
                status = "Handled",
                riskLevel = "normal",
            };
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

            PersistSnapshot();
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
            PersistSnapshot();
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

            PersistSnapshot();
            return new { id = deliveryAreaId, isEnabled = _deliveryAreas[index].IsEnabled };
        }
    }

}