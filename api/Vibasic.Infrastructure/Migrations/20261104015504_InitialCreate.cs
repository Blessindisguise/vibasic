using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Order",
                columns: table => new
                {
                    OrderId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExternalCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    OrderDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Order", x => x.OrderId);
                });

            migrationBuilder.CreateTable(
                name: "ProductCategory",
                columns: table => new
                {
                    CategoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CategoryName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCategory", x => x.CategoryId);
                });

            migrationBuilder.CreateTable(
                name: "Supplier",
                columns: table => new
                {
                    SupplierId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupplierName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Supplier", x => x.SupplierId);
                });

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "Product",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupplierId = table.Column<int>(type: "int", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    SKU = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ProductName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Product", x => x.ProductId);
                    table.ForeignKey(
                        name: "FK_Product_ProductCategory_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "ProductCategory",
                        principalColumn: "CategoryId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Product_Supplier_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Supplier",
                        principalColumn: "SupplierId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GoodsIssue",
                columns: table => new
                {
                    IssueId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RejectReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    HoldReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ReceiverName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeliveredBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoodsIssue", x => x.IssueId);
                    table.ForeignKey(
                        name: "FK_GoodsIssue_Order_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Order",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GoodsIssue_User_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GoodsIssue_User_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GoodsIssue_User_DeliveredBy",
                        column: x => x.DeliveredBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GoodsReceipt",
                columns: table => new
                {
                    ReceiptId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: false),
                    ReceiptDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RejectReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoodsReceipt", x => x.ReceiptId);
                    table.ForeignKey(
                        name: "FK_GoodsReceipt_Supplier_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Supplier",
                        principalColumn: "SupplierId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GoodsReceipt_User_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GoodsReceipt_User_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Notification",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Link = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Tone = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK_Notification_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StocktakePlan",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PlanType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ScopeType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PlannedDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StocktakePlan", x => x.PlanId);
                    table.ForeignKey(
                        name: "FK_StocktakePlan_User_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InventoryPolicy",
                columns: table => new
                {
                    PolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    LeadTimeDays = table.Column<int>(type: "int", nullable: false),
                    SafetyStock = table.Column<int>(type: "int", nullable: false),
                    OrderingCost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    HoldingCost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CurrentROP = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    CurrentEOQ = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    AvgDailyDemand = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    LastROPCalculatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastEOQCalculatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryPolicy", x => x.PolicyId);
                    table.ForeignKey(
                        name: "FK_InventoryPolicy_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderDetail",
                columns: table => new
                {
                    OrderDetailId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderDetail", x => x.OrderDetailId);
                    table.ForeignKey(
                        name: "FK_OrderDetail_Order_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Order",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderDetail_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReplenishmentProposal",
                columns: table => new
                {
                    ProposalId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    ProposedQuantity = table.Column<int>(type: "int", nullable: false),
                    EOQValue = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ProposalDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OriginalQuantity = table.Column<int>(type: "int", nullable: false),
                    AdjustReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    RejectReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReplenishmentProposal", x => x.ProposalId);
                    table.ForeignKey(
                        name: "FK_ReplenishmentProposal_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReplenishmentProposal_User_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockAlert",
                columns: table => new
                {
                    AlertId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    CurrentQuantity = table.Column<int>(type: "int", nullable: false),
                    ROPValue = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AlertDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockAlert", x => x.AlertId);
                    table.ForeignKey(
                        name: "FK_StockAlert_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockLot",
                columns: table => new
                {
                    LotId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LotCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QuantityOnHand = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockLot", x => x.LotId);
                    table.ForeignKey(
                        name: "FK_StockLot_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Stocktake",
                columns: table => new
                {
                    StocktakeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    StocktakeDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RejectReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stocktake", x => x.StocktakeId);
                    table.ForeignKey(
                        name: "FK_Stocktake_StocktakePlan_PlanId",
                        column: x => x.PlanId,
                        principalTable: "StocktakePlan",
                        principalColumn: "PlanId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Stocktake_User_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Stocktake_User_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AbnormalReport",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    LotId = table.Column<int>(type: "int", nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RejectReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IssueId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbnormalReport", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_AbnormalReport_GoodsIssue_IssueId",
                        column: x => x.IssueId,
                        principalTable: "GoodsIssue",
                        principalColumn: "IssueId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AbnormalReport_StockLot_LotId",
                        column: x => x.LotId,
                        principalTable: "StockLot",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AbnormalReport_User_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AbnormalReport_User_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GoodsIssueDetail",
                columns: table => new
                {
                    IssueDetailId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IssueId = table.Column<int>(type: "int", nullable: false),
                    LotId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoodsIssueDetail", x => x.IssueDetailId);
                    table.ForeignKey(
                        name: "FK_GoodsIssueDetail_GoodsIssue_IssueId",
                        column: x => x.IssueId,
                        principalTable: "GoodsIssue",
                        principalColumn: "IssueId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GoodsIssueDetail_StockLot_LotId",
                        column: x => x.LotId,
                        principalTable: "StockLot",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GoodsReceiptDetail",
                columns: table => new
                {
                    ReceiptDetailId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReceiptId = table.Column<int>(type: "int", nullable: false),
                    LotId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    QcResult = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DocumentQuantity = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoodsReceiptDetail", x => x.ReceiptDetailId);
                    table.ForeignKey(
                        name: "FK_GoodsReceiptDetail_GoodsReceipt_ReceiptId",
                        column: x => x.ReceiptId,
                        principalTable: "GoodsReceipt",
                        principalColumn: "ReceiptId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GoodsReceiptDetail_StockLot_LotId",
                        column: x => x.LotId,
                        principalTable: "StockLot",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StocktakePlanDetail",
                columns: table => new
                {
                    PlanDetailId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    LotId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StocktakePlanDetail", x => x.PlanDetailId);
                    table.ForeignKey(
                        name: "FK_StocktakePlanDetail_StockLot_LotId",
                        column: x => x.LotId,
                        principalTable: "StockLot",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StocktakePlanDetail_StocktakePlan_PlanId",
                        column: x => x.PlanId,
                        principalTable: "StocktakePlan",
                        principalColumn: "PlanId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StocktakeDetail",
                columns: table => new
                {
                    DetailId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StocktakeId = table.Column<int>(type: "int", nullable: false),
                    LotId = table.Column<int>(type: "int", nullable: false),
                    SystemQuantity = table.Column<int>(type: "int", nullable: false),
                    ActualQuantity = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StocktakeDetail", x => x.DetailId);
                    table.ForeignKey(
                        name: "FK_StocktakeDetail_StockLot_LotId",
                        column: x => x.LotId,
                        principalTable: "StockLot",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StocktakeDetail_Stocktake_StocktakeId",
                        column: x => x.StocktakeId,
                        principalTable: "Stocktake",
                        principalColumn: "StocktakeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StockItem",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LotId = table.Column<int>(type: "int", nullable: false),
                    SerialCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IssueDetailId = table.Column<int>(type: "int", nullable: true),
                    PickedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockItem", x => x.ItemId);
                    table.ForeignKey(
                        name: "FK_StockItem_GoodsIssueDetail_IssueDetailId",
                        column: x => x.IssueDetailId,
                        principalTable: "GoodsIssueDetail",
                        principalColumn: "IssueDetailId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockItem_StockLot_LotId",
                        column: x => x.LotId,
                        principalTable: "StockLot",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReport_ApprovedBy",
                table: "AbnormalReport",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReport_Code",
                table: "AbnormalReport",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReport_CreatedBy",
                table: "AbnormalReport",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReport_IssueId",
                table: "AbnormalReport",
                column: "IssueId");

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReport_LotId",
                table: "AbnormalReport",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssue_ApprovedBy",
                table: "GoodsIssue",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssue_Code",
                table: "GoodsIssue",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssue_CreatedBy",
                table: "GoodsIssue",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssue_DeliveredBy",
                table: "GoodsIssue",
                column: "DeliveredBy");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssue_OrderId",
                table: "GoodsIssue",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssueDetail_IssueId",
                table: "GoodsIssueDetail",
                column: "IssueId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssueDetail_LotId",
                table: "GoodsIssueDetail",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceipt_ApprovedBy",
                table: "GoodsReceipt",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceipt_Code",
                table: "GoodsReceipt",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceipt_CreatedBy",
                table: "GoodsReceipt",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceipt_SupplierId",
                table: "GoodsReceipt",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceiptDetail_LotId",
                table: "GoodsReceiptDetail",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceiptDetail_ReceiptId",
                table: "GoodsReceiptDetail",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryPolicy_ProductId",
                table: "InventoryPolicy",
                column: "ProductId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notification_UserId_IsRead",
                table: "Notification",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_Order_ExternalCode",
                table: "Order",
                column: "ExternalCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetail_OrderId",
                table: "OrderDetail",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetail_ProductId",
                table: "OrderDetail",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Product_CategoryId",
                table: "Product",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Product_SKU",
                table: "Product",
                column: "SKU",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Product_SupplierId",
                table: "Product",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategory_CategoryName",
                table: "ProductCategory",
                column: "CategoryName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReplenishmentProposal_ApprovedBy",
                table: "ReplenishmentProposal",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ReplenishmentProposal_ProductId_Status",
                table: "ReplenishmentProposal",
                columns: new[] { "ProductId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_StockAlert_ProductId_Status",
                table: "StockAlert",
                columns: new[] { "ProductId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_StockItem_IssueDetailId",
                table: "StockItem",
                column: "IssueDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_StockItem_LotId",
                table: "StockItem",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_StockItem_SerialCode",
                table: "StockItem",
                column: "SerialCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockLot_LotCode",
                table: "StockLot",
                column: "LotCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockLot_ProductId_ReceivedDate",
                table: "StockLot",
                columns: new[] { "ProductId", "ReceivedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Stocktake_ApprovedBy",
                table: "Stocktake",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Stocktake_Code",
                table: "Stocktake",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Stocktake_CreatedBy",
                table: "Stocktake",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Stocktake_PlanId",
                table: "Stocktake",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_StocktakeDetail_LotId",
                table: "StocktakeDetail",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_StocktakeDetail_StocktakeId",
                table: "StocktakeDetail",
                column: "StocktakeId");

            migrationBuilder.CreateIndex(
                name: "IX_StocktakePlan_Code",
                table: "StocktakePlan",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StocktakePlan_CreatedBy",
                table: "StocktakePlan",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StocktakePlanDetail_LotId",
                table: "StocktakePlanDetail",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_StocktakePlanDetail_PlanId",
                table: "StocktakePlanDetail",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_User_Username",
                table: "User",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbnormalReport");

            migrationBuilder.DropTable(
                name: "GoodsReceiptDetail");

            migrationBuilder.DropTable(
                name: "InventoryPolicy");

            migrationBuilder.DropTable(
                name: "Notification");

            migrationBuilder.DropTable(
                name: "OrderDetail");

            migrationBuilder.DropTable(
                name: "ReplenishmentProposal");

            migrationBuilder.DropTable(
                name: "StockAlert");

            migrationBuilder.DropTable(
                name: "StockItem");

            migrationBuilder.DropTable(
                name: "StocktakeDetail");

            migrationBuilder.DropTable(
                name: "StocktakePlanDetail");

            migrationBuilder.DropTable(
                name: "GoodsReceipt");

            migrationBuilder.DropTable(
                name: "GoodsIssueDetail");

            migrationBuilder.DropTable(
                name: "Stocktake");

            migrationBuilder.DropTable(
                name: "GoodsIssue");

            migrationBuilder.DropTable(
                name: "StockLot");

            migrationBuilder.DropTable(
                name: "StocktakePlan");

            migrationBuilder.DropTable(
                name: "Order");

            migrationBuilder.DropTable(
                name: "Product");

            migrationBuilder.DropTable(
                name: "User");

            migrationBuilder.DropTable(
                name: "ProductCategory");

            migrationBuilder.DropTable(
                name: "Supplier");
        }
    }
}
