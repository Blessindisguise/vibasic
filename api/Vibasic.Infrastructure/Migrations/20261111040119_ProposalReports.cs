using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vibasic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProposalReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReplenishmentProposal_GoodsReceipt_ReceiptId",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "CloseReason",
                table: "ReplenishmentProposal");

            migrationBuilder.DropColumn(
                name: "ReceivedQuantity",
                table: "ReplenishmentProposal");

            migrationBuilder.RenameColumn(
                name: "ReceiptId",
                table: "ReplenishmentProposal",
                newName: "ReportId");

            migrationBuilder.RenameIndex(
                name: "IX_ReplenishmentProposal_ReceiptId",
                table: "ReplenishmentProposal",
                newName: "IX_ReplenishmentProposal_ReportId");

            migrationBuilder.CreateTable(
                name: "ReplenishmentReport",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ProposalCount = table.Column<int>(type: "int", nullable: false),
                    SupplierCount = table.Column<int>(type: "int", nullable: false),
                    TotalQuantity = table.Column<int>(type: "int", nullable: false),
                    Snapshot = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReplenishmentReport", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_ReplenishmentReport_User_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReplenishmentReport_Code",
                table: "ReplenishmentReport",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReplenishmentReport_CreatedBy",
                table: "ReplenishmentReport",
                column: "CreatedBy");

            // The renamed column held receipt ids. Proposals decided before reports existed have no report.
            // A proposal is only a suggestion now: approved and received ones count as reported; the labels change.
            migrationBuilder.Sql(@"UPDATE ReplenishmentProposal SET ReportId = NULL;
UPDATE ReplenishmentProposal SET Status = N'Đã lập báo cáo' WHERE Status IN (N'Đã duyệt', N'Đã nhập hàng');
UPDATE ReplenishmentProposal SET Status = N'Chờ xem xét' WHERE Status = N'Chờ duyệt';
UPDATE ReplenishmentProposal SET Status = N'Không đề xuất' WHERE Status = N'Từ chối';");

            migrationBuilder.AddForeignKey(
                name: "FK_ReplenishmentProposal_ReplenishmentReport_ReportId",
                table: "ReplenishmentProposal",
                column: "ReportId",
                principalTable: "ReplenishmentReport",
                principalColumn: "ReportId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReplenishmentProposal_ReplenishmentReport_ReportId",
                table: "ReplenishmentProposal");

            migrationBuilder.DropTable(
                name: "ReplenishmentReport");

            migrationBuilder.RenameColumn(
                name: "ReportId",
                table: "ReplenishmentProposal",
                newName: "ReceiptId");

            migrationBuilder.RenameIndex(
                name: "IX_ReplenishmentProposal_ReportId",
                table: "ReplenishmentProposal",
                newName: "IX_ReplenishmentProposal_ReceiptId");

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

            migrationBuilder.Sql(@"UPDATE ReplenishmentProposal SET ReceiptId = NULL;
UPDATE ReplenishmentProposal SET Status = N'Đã duyệt' WHERE Status = N'Đã lập báo cáo';
UPDATE ReplenishmentProposal SET Status = N'Chờ duyệt' WHERE Status = N'Chờ xem xét';
UPDATE ReplenishmentProposal SET Status = N'Từ chối' WHERE Status = N'Không đề xuất';");

            migrationBuilder.AddForeignKey(
                name: "FK_ReplenishmentProposal_GoodsReceipt_ReceiptId",
                table: "ReplenishmentProposal",
                column: "ReceiptId",
                principalTable: "GoodsReceipt",
                principalColumn: "ReceiptId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
