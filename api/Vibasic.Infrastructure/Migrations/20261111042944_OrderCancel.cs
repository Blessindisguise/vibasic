using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OrderCancel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "Order",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "Order",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CancelledBy",
                table: "Order",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadyNotifiedAt",
                table: "Order",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Order_CancelledBy",
                table: "Order",
                column: "CancelledBy");

            migrationBuilder.AddForeignKey(
                name: "FK_Order_User_CancelledBy",
                table: "Order",
                column: "CancelledBy",
                principalTable: "User",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            // An issue left without replacement goods was "Chờ xử lý" but had already ended (items released): now "Đã hủy".
            migrationBuilder.Sql(@"UPDATE GoodsIssue SET Status = N'Đã hủy' WHERE Status = N'Chờ xử lý';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"UPDATE GoodsIssue SET Status = N'Chờ xử lý' WHERE Status = N'Đã hủy';");

            migrationBuilder.DropForeignKey(
                name: "FK_Order_User_CancelledBy",
                table: "Order");

            migrationBuilder.DropIndex(
                name: "IX_Order_CancelledBy",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "CancelReason",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "CancelledBy",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ReadyNotifiedAt",
                table: "Order");
        }
    }
}
