using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class IssueNoApprovalNoNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Goods issues no longer need approval: pending and approved ones are simply ready to pick. A rejected issue had already
            // released its items, so it ends as cancelled with the manager's reason.
            migrationBuilder.Sql(@"UPDATE GoodsIssue SET Status = N'Đã hủy', HoldReason = LEFT(N'Quản lý từ chối: ' + ISNULL(RejectReason, N''), 255) WHERE Status = N'Từ chối';
UPDATE GoodsIssue SET Status = N'Chờ lấy hàng' WHERE Status IN (N'Chờ duyệt', N'Đã duyệt');");

            migrationBuilder.DropForeignKey(
                name: "FK_GoodsIssue_User_ApprovedBy",
                table: "GoodsIssue");

            migrationBuilder.DropIndex(
                name: "IX_GoodsIssue_ApprovedBy",
                table: "GoodsIssue");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "GoodsIssue");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "GoodsIssue");

            migrationBuilder.DropColumn(
                name: "RejectReason",
                table: "GoodsIssue");

            migrationBuilder.RenameColumn(
                name: "HoldReason",
                table: "GoodsIssue",
                newName: "CancelReason");

            migrationBuilder.AddColumn<string>(
                name: "ReturnSerials",
                table: "GoodsIssue",
                type: "nvarchar(max)",
                nullable: true);

            // In-app notifications are dropped; every state they announced is shown on its own screen.
            migrationBuilder.DropTable(
                name: "Notification");

            migrationBuilder.DropColumn(
                name: "ReadyNotifiedAt",
                table: "Order");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReturnSerials",
                table: "GoodsIssue");

            migrationBuilder.RenameColumn(
                name: "CancelReason",
                table: "GoodsIssue",
                newName: "HoldReason");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadyNotifiedAt",
                table: "Order",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "GoodsIssue",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedBy",
                table: "GoodsIssue",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectReason",
                table: "GoodsIssue",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Notification",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    Link = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Tone = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK_Notification_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssue_ApprovedBy",
                table: "GoodsIssue",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Notification_UserId_IsRead",
                table: "Notification",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.AddForeignKey(
                name: "FK_GoodsIssue_User_ApprovedBy",
                table: "GoodsIssue",
                column: "ApprovedBy",
                principalTable: "User",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql("UPDATE GoodsIssue SET Status = N'Đã duyệt' WHERE Status = N'Chờ lấy hàng';");
        }
    }
}
