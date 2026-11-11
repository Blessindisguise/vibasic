using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProposalBasis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AvailableQuantity",
                table: "ReplenishmentProposal",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "ROPValue",
                table: "ReplenishmentProposal",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // Existing proposals: take the basis from the alert of their low-stock episode.
            migrationBuilder.Sql("""
                UPDATE r SET r.AvailableQuantity = a.CurrentQuantity, r.ROPValue = a.ROPValue
                FROM ReplenishmentProposal r
                CROSS APPLY (SELECT TOP 1 x.CurrentQuantity, x.ROPValue FROM StockAlert x
                             WHERE x.ProductId = r.ProductId AND x.AlertDate <= r.ProposalDate ORDER BY x.AlertDate DESC) a
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvailableQuantity",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "ROPValue",
                table: "ReplenishmentProposal");
        }
    }
}
