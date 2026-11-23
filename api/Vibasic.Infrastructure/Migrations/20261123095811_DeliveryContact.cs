using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DeliveryContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReceiverPhone",
                table: "GoodsIssue",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehiclePlate",
                table: "GoodsIssue",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReceiverPhone",
                table: "GoodsIssue");

            migrationBuilder.DropColumn(
                name: "VehiclePlate",
                table: "GoodsIssue");
        }
    }
}
