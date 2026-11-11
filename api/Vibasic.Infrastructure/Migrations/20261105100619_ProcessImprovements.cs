using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProcessImprovements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CountedAt",
                table: "StocktakeDetail",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Method",
                table: "StocktakeDetail",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Nhập số");

            migrationBuilder.AddColumn<int>(
                name: "UnlabeledQuantity",
                table: "StocktakeDetail",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ReceiptId",
                table: "ReplenishmentProposal",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryNoteNo",
                table: "GoodsReceipt",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StocktakeItem",
                columns: table => new
                {
                    StocktakeItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DetailId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StocktakeItem", x => x.StocktakeItemId);
                    table.ForeignKey(
                        name: "FK_StocktakeItem_StockItem_ItemId",
                        column: x => x.ItemId,
                        principalTable: "StockItem",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StocktakeItem_StocktakeDetail_DetailId",
                        column: x => x.DetailId,
                        principalTable: "StocktakeDetail",
                        principalColumn: "DetailId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReplenishmentProposal_ReceiptId",
                table: "ReplenishmentProposal",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_StocktakeItem_DetailId_ItemId",
                table: "StocktakeItem",
                columns: new[] { "DetailId", "ItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StocktakeItem_ItemId",
                table: "StocktakeItem",
                column: "ItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReplenishmentProposal_GoodsReceipt_ReceiptId",
                table: "ReplenishmentProposal",
                column: "ReceiptId",
                principalTable: "GoodsReceipt",
                principalColumn: "ReceiptId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReplenishmentProposal_GoodsReceipt_ReceiptId",
                table: "ReplenishmentProposal");

            migrationBuilder.DropTable(
                name: "StocktakeItem");

            migrationBuilder.DropIndex(
                name: "IX_ReplenishmentProposal_ReceiptId",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "CountedAt",
                table: "StocktakeDetail");

            migrationBuilder.DropColumn(
                name: "Method",
                table: "StocktakeDetail");

            migrationBuilder.DropColumn(
                name: "UnlabeledQuantity",
                table: "StocktakeDetail");

            migrationBuilder.DropColumn(
                name: "ReceiptId",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "DeliveryNoteNo",
                table: "GoodsReceipt");
        }
    }
}
