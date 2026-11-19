using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AbnormalHandling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "HandledAt",
                table: "StockItem",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HandledAt",
                table: "AbnormalReport",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HandledBy",
                table: "AbnormalReport",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandlingMethod",
                table: "AbnormalReport",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandlingPlan",
                table: "AbnormalReport",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HandlingStartedAt",
                table: "AbnormalReport",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandlingStatus",
                table: "AbnormalReport",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbnormalReport_HandledBy",
                table: "AbnormalReport",
                column: "HandledBy");

            migrationBuilder.AddForeignKey(
                name: "FK_AbnormalReport_User_HandledBy",
                table: "AbnormalReport",
                column: "HandledBy",
                principalTable: "User",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            // Reports approved before handling existed wait to be handled; the manager sets their hướng xử lý.
            migrationBuilder.Sql("UPDATE AbnormalReport SET HandlingStatus = N'Chờ xử lý' WHERE Status = N'Đã duyệt';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AbnormalReport_User_HandledBy",
                table: "AbnormalReport");

            migrationBuilder.DropIndex(
                name: "IX_AbnormalReport_HandledBy",
                table: "AbnormalReport");

            migrationBuilder.DropColumn(
                name: "HandledAt",
                table: "StockItem");

            migrationBuilder.DropColumn(
                name: "HandledAt",
                table: "AbnormalReport");

            migrationBuilder.DropColumn(
                name: "HandledBy",
                table: "AbnormalReport");

            migrationBuilder.DropColumn(
                name: "HandlingMethod",
                table: "AbnormalReport");

            migrationBuilder.DropColumn(
                name: "HandlingPlan",
                table: "AbnormalReport");

            migrationBuilder.DropColumn(
                name: "HandlingStartedAt",
                table: "AbnormalReport");

            migrationBuilder.DropColumn(
                name: "HandlingStatus",
                table: "AbnormalReport");
        }
    }
}
