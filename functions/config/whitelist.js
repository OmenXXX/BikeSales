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
    'PAC'
];

const ALLOWED_SCRIPTS = [
    'ProcessInvoice',
    'AdjustInventory',
    'GenerateInvoice',
    'CreateWarehouseTransfer'
];

module.exports = {
    ALLOWED_LAYOUTS,
    ALLOWED_SCRIPTS
};
