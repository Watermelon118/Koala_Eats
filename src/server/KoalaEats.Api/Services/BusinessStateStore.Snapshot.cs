namespace KoalaEats.Api;

public sealed partial class BusinessStateStore
{
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
            RefreshPrimaryStoreSeed();
            PersistSnapshot();
        }
    }

}