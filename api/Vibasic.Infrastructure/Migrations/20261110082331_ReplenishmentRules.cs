using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReplenishmentRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdjustBasis",
                table: "ReplenishmentProposal",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AvgDailyDemand",
                table: "ReplenishmentProposal",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BaseQuantity",
                table: "ReplenishmentProposal",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "NetQuantity",
                table: "ReplenishmentProposal",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "ReplenishmentProposal",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Cần đặt");

            migrationBuilder.AddColumn<decimal>(
                name: "RecentDailyDemand",
                table: "ReplenishmentProposal",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "SafetyStock",
                table: "InventoryPolicy",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "DemandState",
                table: "InventoryPolicy",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Chưa đủ dữ liệu");

            migrationBuilder.AddColumn<decimal>(
                name: "DemandStdDev",
                table: "InventoryPolicy",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RecentDailyDemand",
                table: "InventoryPolicy",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            // Q3–Q16: SS is calculated from now on (the next weekly run fills it with ROP and EOQ); older proposals keep their basis.
            migrationBuilder.Sql("UPDATE InventoryPolicy SET SafetyStock = NULL, CurrentROP = NULL, CurrentEOQ = NULL, LastROPCalculatedAt = NULL, LastEOQCalculatedAt = NULL");
            migrationBuilder.Sql("UPDATE ReplenishmentProposal SET NetQuantity = AvailableQuantity, BaseQuantity = OriginalQuantity");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdjustBasis",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "AvgDailyDemand",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "BaseQuantity",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "NetQuantity",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "RecentDailyDemand",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "DemandState",
                table: "InventoryPolicy");

            migrationBuilder.DropColumn(
                name: "DemandStdDev",
                table: "InventoryPolicy");

            migrationBuilder.DropColumn(
                name: "RecentDailyDemand",
                table: "InventoryPolicy");

            migrationBuilder.AlterColumn<int>(
                name: "SafetyStock",
                table: "InventoryPolicy",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);
        }
    }
}
