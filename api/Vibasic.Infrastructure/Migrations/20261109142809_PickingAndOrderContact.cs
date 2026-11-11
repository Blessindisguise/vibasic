using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PickingAndOrderContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerPhone",
                table: "Order",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Order",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress",
                table: "Order",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PickActiveAt",
                table: "GoodsIssue",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PickStartedAt",
                table: "GoodsIssue",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PickerId",
                table: "GoodsIssue",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoodsIssue_PickerId",
                table: "GoodsIssue",
                column: "PickerId");

            migrationBuilder.AddForeignKey(
                name: "FK_GoodsIssue_User_PickerId",
                table: "GoodsIssue",
                column: "PickerId",
                principalTable: "User",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            // Orders recorded before this change: fill phone and address for the demo customers.
            static string Q(string s) => "N'" + s.Replace("'", "''") + "'";
            foreach (var (name, phone, address) in Seed.DbSeeder.Customers)
                migrationBuilder.Sql($"UPDATE [Order] SET CustomerPhone = {Q(phone)}, ShippingAddress = {Q(address)} WHERE CustomerName = {Q(name)} AND CustomerPhone IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GoodsIssue_User_PickerId",
                table: "GoodsIssue");

            migrationBuilder.DropIndex(
                name: "IX_GoodsIssue_PickerId",
                table: "GoodsIssue");

            migrationBuilder.DropColumn(
                name: "CustomerPhone",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ShippingAddress",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "PickActiveAt",
                table: "GoodsIssue");

            migrationBuilder.DropColumn(
                name: "PickStartedAt",
                table: "GoodsIssue");

            migrationBuilder.DropColumn(
                name: "PickerId",
                table: "GoodsIssue");
        }
    }
}
