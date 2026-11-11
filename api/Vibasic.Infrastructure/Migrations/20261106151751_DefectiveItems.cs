using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DefectiveItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DefectiveAt",
                table: "StockItem",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "AbnormalReport",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                // Reports filed before this change covered the whole lot.
                defaultValue: "Cả lô");

            migrationBuilder.CreateTable(
                name: "AbnormalReportItem",
                columns: table => new
                {
                    ReportItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbnormalReportItem", x => x.ReportItemId);
                    table.ForeignKey(
                        name: "FK_AbnormalReportItem_AbnormalReport_ReportId",
                        column: x => x.ReportId,
                        principalTable: "AbnormalReport",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AbnormalReportItem_StockItem_ItemId",
                        column: x => x.ItemId,
                        principalTable: "StockItem",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReportItem_ItemId",
                table: "AbnormalReportItem",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReportItem_ReportId_ItemId",
                table: "AbnormalReportItem",
                columns: new[] { "ReportId", "ItemId" },
                unique: true);

            // A report raised at receiving covers its failed lot: list every item of that lot.
            migrationBuilder.Sql(@"
INSERT INTO AbnormalReportItem (ReportId, ItemId)
SELECT a.ReportId, i.ItemId FROM AbnormalReport a JOIN StockItem i ON i.ReceiptDetailId = a.ReceiptDetailId
WHERE a.SourceType = N'Nhập kho';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Items set aside as defective go back into stock on hand.
            migrationBuilder.Sql(@"
UPDATE d SET QuantityOnHand = d.QuantityOnHand + x.n
FROM GoodsReceiptDetail d JOIN (SELECT ReceiptDetailId, COUNT(*) AS n FROM StockItem WHERE Status = N'Lỗi' GROUP BY ReceiptDetailId) x
  ON x.ReceiptDetailId = d.ReceiptDetailId;
UPDATE StockItem SET Status = N'Trong kho' WHERE Status = N'Lỗi';");

            migrationBuilder.DropTable(
                name: "AbnormalReportItem");

            migrationBuilder.DropColumn(
                name: "DefectiveAt",
                table: "StockItem");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "AbnormalReport");
        }
    }
}
