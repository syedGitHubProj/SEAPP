namespace SellEase.Api.Auth;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Salesman = "Salesman";

    public static readonly string[] All = [Admin, Manager, Salesman];
}

/// <summary>
/// What each role may do. Mirrors the "Who can do what" table in docs/PLAN.md.
/// Every endpoint requires one of these permissions (checked as an authorization policy).
/// </summary>
public static class Permissions
{
    public const string CatalogView = "catalog.view";
    public const string CatalogEdit = "catalog.edit";
    public const string CustomersEdit = "customers.edit";
    public const string SaleOrdersEdit = "saleOrders.edit";
    public const string PurchaseOrdersCreate = "purchaseOrders.create";
    public const string FactoriesEdit = "factories.edit";
    public const string OperationsManage = "operations.manage";
    public const string UsersManage = "users.manage";
    public const string SettingsManage = "settings.manage";
    public const string AuditView = "audit.view";

    public static readonly string[] All =
    [
        CatalogView, CatalogEdit, CustomersEdit, SaleOrdersEdit, PurchaseOrdersCreate,
        FactoriesEdit, OperationsManage, UsersManage, SettingsManage, AuditView,
    ];

    private static readonly string[] SalesmanPermissions =
        [CatalogView, CustomersEdit, SaleOrdersEdit, PurchaseOrdersCreate];

    private static readonly string[] ManagerPermissions =
        [.. SalesmanPermissions, CatalogEdit, FactoriesEdit, OperationsManage];

    public static readonly IReadOnlyDictionary<string, string[]> ByRole = new Dictionary<string, string[]>
    {
        [Roles.Admin] = All, // Admin has full access.
        [Roles.Manager] = ManagerPermissions,
        [Roles.Salesman] = SalesmanPermissions,
    };

    public static string[] RolesWith(string permission) =>
        ByRole.Where(r => r.Value.Contains(permission)).Select(r => r.Key).ToArray();

    public static string[] For(IEnumerable<string> roles) =>
        roles.SelectMany(r => ByRole.TryGetValue(r, out var p) ? p : []).Distinct().Order().ToArray();
}
