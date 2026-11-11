using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProposalReceiving : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CloseReason",
                table: "ReplenishmentProposal",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReceivedQuantity",
                table: "ReplenishmentProposal",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Under the old rule any approved receipt fulfilled a proposal, so a received one is taken as fully received.
            migrationBuilder.Sql(@"UPDATE ReplenishmentProposal SET ReceivedQuantity = ProposedQuantity WHERE Status = N'Đã nhập hàng';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CloseReason",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "ReceivedQuantity",
                table: "ReplenishmentProposal");
        }
    }
}
