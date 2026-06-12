namespace KoalaEats.Api;

public sealed partial class BusinessStateStore
{
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

            PersistSnapshot();
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

            PersistSnapshot();
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

            PersistSnapshot();
            return new { };
        }
    }

}