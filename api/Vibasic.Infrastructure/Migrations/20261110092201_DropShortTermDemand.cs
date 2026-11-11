using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropShortTermDemand : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RecentDailyDemand",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "RecentDailyDemand",
                table: "InventoryPolicy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RecentDailyDemand",
                table: "ReplenishmentProposal",
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
        }
    }
}
