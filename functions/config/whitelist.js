// Whitelist configuration for FileMaker resources

const ALLOWED_LAYOUTS = [
    'Employees',
    'Sales',
    'Products',
    'Warehouses',
    'InventoryLogs',
    'Centers',
    'Modules',
    'Inventory',
    'AuditLogs',
    'PAC',
    'BusinessPartners',
    'Addresses',
    'Partners',
    'SalesOrders',
    'ProductCategories'
];

const ALLOWED_SCRIPTS = [
    'ProcessInvoice',
    'AdjustInventory',
    'PSOS_UpdateInventory',
    'GenerateInvoice',
    'CreateWarehouseTransfer'
];

module.exports = {
    ALLOWED_LAYOUTS,
    ALLOWED_SCRIPTS
};
