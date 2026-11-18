using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class IssueDropReturnSerials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReturnSerials",
                table: "GoodsIssue");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReturnSerials",
                table: "GoodsIssue",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
