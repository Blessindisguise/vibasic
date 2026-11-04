using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Issuing;

namespace Vibasic.Infrastructure.Stocktaking;

public record PlanInput(StocktakePlanType? PlanType, StocktakeScope? ScopeType, DateOnly? PlannedDate, List<int>? LotIds, string? Note);
public record CountInput(int? ReceiptDetailId, int? ActualQuantity, string? Reason);
public record StocktakeInput(List<CountInput>? Counts);
public record StockDefectInput(int? ReceiptDetailId, int? Quantity, string? Description);

/// <summary>One lot to count, with the quantity the system holds now (UC_14 step 2).</summary>
public record SheetLot(int ReceiptDetailId, string LotCode, int ProductId, string Sku, string ProductName, string Unit,
    DateTime ReceivedDate, LotStatus Status, int SystemQuantity);

/// <summary>
/// Stocktake workflow: UC_13 (kế hoạch), UC_14 (kiểm đếm, biên bản khi phát hiện lỗi), UC_15 (duyệt và điều chỉnh tồn).
/// <list type="bullet">
/// <item>Plan: Chờ thực hiện → (count submitted) Đang kiểm kê → (approved) Hoàn thành; a rejected count sends it back to Chờ thực hiện.</item>
/// <item>Counts are kept on the device until submitted; the stocktake is created then, with the system quantities of that moment.</item>
/// <item>Approval applies the difference: missing items become "Thất thoát", surplus items get new codes, QuantityOnHand moves by the same amount.</item>
/// </list>
/// </summary>
public class StocktakeService(VibasicDbContext db, CodeGenerator codes, Notifier notify, IClock clock, IssueService issues)
{
    public const int MinReason = 5;

    /// <summary>Lots that physically hold stock: lines of approved receipts with something on hand, whatever their status.</summary>
    public IQueryable<GoodsReceiptDetail> CountableLots() =>
        db.GoodsReceiptDetails.Where(d => d.Receipt.Status == ReceiptStatus.Approved && d.QuantityOnHand > 0);

    // ---------------- UC_13: lập kế hoạch ----------------

    public async Task<StocktakePlan> CreatePlanAsync(PlanInput input, int managerId)
    {
        var today = VnTime.Today(clock.UtcNow);
        var note = CatalogService.Clean(input.Note);
        var lotIds = (input.LotIds ?? []).Distinct().ToList();
        var v = new Validator()
            .Check(input.PlanType is not null, "planType", "Chọn loại kế hoạch.")
            .Check(input.ScopeType is not null, "scopeType", "Chọn phạm vi kiểm kê.")
            .Check(input.PlannedDate is not null, "plannedDate", "Chọn ngày dự kiến thực hiện.")
            .Check(input.PlannedDate is null || input.PlannedDate >= today, "plannedDate", "Ngày dự kiến không được trước hôm nay.")
            .Check(input.ScopeType != StocktakeScope.SelectedLots || lotIds.Count > 0, "lotIds", "Chọn ít nhất một lô cần kiểm kê.")
            .Check(note is null || note.Length <= 255, "note", "Ghi chú tối đa 255 ký tự.");
        if (input.ScopeType == StocktakeScope.SelectedLots && lotIds.Count > 0)
        {
            var found = await CountableLots().CountAsync(d => lotIds.Contains(d.ReceiptDetailId));
            v.Check(found == lotIds.Count, "lotIds", "Có lô không còn tồn hoặc không thuộc phiếu nhập đã duyệt. Chọn lại.");
        }
        v.ThrowIfAny();

        var now = clock.UtcNow;
        var plan = new StocktakePlan
        {
            Code = await codes.NextDocumentAsync(CodeGenerator.Plan, now), PlanType = input.PlanType!.Value, ScopeType = input.ScopeType!.Value,
            PlannedDate = input.PlannedDate!.Value, CreatedBy = managerId, Status = StocktakePlanStatus.Waiting, Note = note,
        };
        if (plan.ScopeType == StocktakeScope.SelectedLots)
            foreach (var id in lotIds) plan.Details.Add(new StocktakePlanDetail { ReceiptDetailId = id });
        db.StocktakePlans.Add(plan);
        await db.SaveChangesAsync();
        await notify.ToRoleAsync(UserRole.Staff, $"Kế hoạch kiểm kê {plan.Code} ngày {plan.PlannedDate:dd/MM/yyyy}",
            plan.ScopeType == StocktakeScope.Warehouse ? "Phạm vi: toàn bộ kho." : $"Phạm vi: {lotIds.Count} lô.", $"/kho/kiem-ke/{plan.PlanId}");
        await db.SaveChangesAsync();
        return plan;
    }

    // ---------------- UC_14: kiểm đếm ----------------

    /// <summary>UC_14 step 2: the lots in scope and their current system quantity.</summary>
    public async Task<List<SheetLot>> SheetAsync(int planId)
    {
        var plan = await LoadPlanAsync(planId);
        return await ScopeLots(plan)
            .OrderBy(d => d.Product.SKU).ThenBy(d => d.Receipt.ReceiptDate).ThenBy(d => d.ReceiptDetailId)
            .Select(d => new SheetLot(d.ReceiptDetailId, d.LotCode, d.ProductId, d.Product.SKU, d.Product.ProductName, d.Product.Unit,
                d.Receipt.ReceiptDate, d.Status, d.QuantityOnHand))
            .ToListAsync();
    }

    /// <summary>UC_14 steps 3–6: every lot in scope needs a count (3.2: not found → 0); a difference needs a reason (5.1).</summary>
    public async Task<Stocktake> SubmitAsync(int planId, StocktakeInput input, int staffId)
    {
        var plan = await LoadPlanAsync(planId);
        EnsureWaiting(plan);
        var lots = await ScopeLots(plan).Select(d => new { d.ReceiptDetailId, d.LotCode, d.QuantityOnHand }).ToListAsync();
        var counts = (input.Counts ?? []).Where(c => c.ReceiptDetailId is not null).GroupBy(c => c.ReceiptDetailId!.Value).ToDictionary(g => g.Key, g => g.Last());

        var v = new Validator().Check(lots.Count > 0, "counts", "Kế hoạch không còn lô nào để kiểm.");
        foreach (var lot in lots)
        {
            var key = $"counts[{lot.ReceiptDetailId}]";
            counts.TryGetValue(lot.ReceiptDetailId, out var c);
            var reason = CatalogService.Clean(c?.Reason);
            v.Check(c?.ActualQuantity is >= 0 and <= 100_000, key + ".actualQuantity", $"Nhập số thực tế của lô {lot.LotCode} (không tìm thấy lô thì nhập 0).")
             .Check(c?.ActualQuantity is null || c.ActualQuantity == lot.QuantityOnHand || reason is { Length: >= MinReason }, key + ".reason",
                 $"Lô {lot.LotCode} có chênh lệch: nhập lý do (tối thiểu {MinReason} ký tự).")
             .Check(reason is null || reason.Length <= 255, key + ".reason", "Lý do tối đa 255 ký tự.");
        }
        v.ThrowIfAny();

        var now = clock.UtcNow;
        var stocktake = new Stocktake
        {
            Code = await codes.NextDocumentAsync(CodeGenerator.Stocktake, now), PlanId = planId, StocktakeDate = now,
            CreatedBy = staffId, Status = ApprovalStatus.Pending,
        };
        foreach (var lot in lots)
        {
            var c = counts[lot.ReceiptDetailId];
            stocktake.Details.Add(new StocktakeDetail
            {
                ReceiptDetailId = lot.ReceiptDetailId, SystemQuantity = lot.QuantityOnHand, ActualQuantity = c.ActualQuantity!.Value,
                Reason = c.ActualQuantity == lot.QuantityOnHand ? null : CatalogService.Clean(c.Reason),
            });
        }
        plan.Status = StocktakePlanStatus.InProgress;
        db.Stocktakes.Add(stocktake);
        await db.SaveChangesAsync();
        var diffs = stocktake.Details.Count(d => d.ActualQuantity != d.SystemQuantity);
        await notify.ToRoleAsync(UserRole.Manager, $"Phiếu kiểm kê {stocktake.Code} chờ duyệt",
            $"{plan.Code}: {lots.Count} lô, {diffs} lô chênh lệch.", $"/ql/kiem-ke/phieu/{stocktake.StocktakeId}", Notifier.Warning);
        await db.SaveChangesAsync();
        return stocktake;
    }

    /// <summary>
    /// UC_14 3.1 / UC_11 (nguồn: kiểm kê): file an abnormal report for a lot in scope; the lot is quarantined and any of its
    /// items reserved on open issues are replaced by FIFO. Counting continues.
    /// </summary>
    public async Task<AbnormalReport> FileDefectAsync(int planId, StockDefectInput input, int staffId)
    {
        var plan = await LoadPlanAsync(planId);
        EnsureWaiting(plan);
        var text = CatalogService.Clean(input.Description);
        var lot = input.ReceiptDetailId is null ? null
            : await ScopeLots(plan).Include(d => d.Product).SingleOrDefaultAsync(d => d.ReceiptDetailId == input.ReceiptDetailId);
        new Validator()
            .Check(lot is not null, "receiptDetailId", "Chọn lô thuộc kế hoạch kiểm kê.")
            .Check(lot is null || input.Quantity is >= 1 && input.Quantity <= lot.QuantityOnHand, "quantity",
                $"Số lượng lỗi từ 1 đến {lot?.QuantityOnHand ?? 0}.")
            .Check(text is { Length: >= MinReason }, "description", $"Mô tả lỗi (tối thiểu {MinReason} ký tự).")
            .Check(text is null || text.Length <= 500, "description", "Mô tả lỗi tối đa 500 ký tự.")
            .ThrowIfAny();
        if (await db.AbnormalReports.AnyAsync(a => a.ReceiptDetailId == lot!.ReceiptDetailId && a.Status == ApprovalStatus.Pending))
            throw new RuleException($"Lô {lot!.LotCode} đã có biên bản bất thường chờ duyệt.");
        if (lot!.Status == LotStatus.Locked)
            throw new RuleException($"Lô {lot.LotCode} đã bị khóa; không cần lập thêm biên bản.");

        var now = clock.UtcNow;
        var report = new AbnormalReport
        {
            Code = await codes.NextDocumentAsync(CodeGenerator.Abnormal, now), ReceiptDetail = lot, SourceType = AbnormalSource.Stocktake,
            Description = text!, Quantity = input.Quantity!.Value, CreatedBy = staffId, CreatedAt = now, Status = ApprovalStatus.Pending,
        };
        db.AbnormalReports.Add(report);
        lot.Status = LotStatus.Quarantined;
        await issues.ReplaceFromLotsAsync([lot.ReceiptDetailId]);
        await notify.ToRoleAsync(UserRole.Manager, $"Biên bản {report.Code} chờ duyệt",
            $"Phát hiện khi kiểm kê {plan.Code}: {report.Quantity} {lot.Product.Unit} lô {lot.LotCode}. Lô đã tạm cách ly.",
            "/ql/cho-duyet?loai=bat-thuong", Notifier.Warning);
        await db.SaveChangesAsync();
        return report;
    }

    // ---------------- UC_15: duyệt, điều chỉnh tồn ----------------

    public async Task<Stocktake> ApproveAsync(int id, int managerId)
    {
        var stocktake = await LoadAsync(id);
        EnsurePending(stocktake);
        var now = clock.UtcNow;

        foreach (var d in stocktake.Details.Where(d => d.ActualQuantity != d.SystemQuantity))
        {
            var lot = d.ReceiptDetail;
            var delta = d.ActualQuantity - d.SystemQuantity;
            if (delta < 0)
            {
                // Missing: loose items first; reserved ones are taken off their issues and refilled by FIFO.
                var missing = -delta;
                var loose = lot.Items.Where(i => i.Status == ItemStatus.InStock).OrderByDescending(i => i.SerialCode).Take(missing).ToList();
                foreach (var item in loose) item.Status = ItemStatus.Lost;
                var reserved = lot.Items.Where(i => i.Status == ItemStatus.Reserved).OrderByDescending(i => i.SerialCode).Take(missing - loose.Count).ToList();
                if (reserved.Count > 0)
                    await issues.ReplaceReservedAsync(reserved.Select(i => i.ItemId).ToList(), [lot.ReceiptDetailId], null,
                        $"Sản phẩm giữ chỗ bị thất thoát khi kiểm kê lô {lot.LotCode} và không đủ hàng thay thế.");
                foreach (var item in reserved) item.Status = ItemStatus.Lost;
                lot.QuantityOnHand -= loose.Count + reserved.Count;
            }
            else
            {
                // Surplus: new identities for the extra items (UC_15 step 7).
                var (head, first) = await codes.ReserveSerialsAsync(lot.Product.SKU, now, delta);
                for (var i = 0; i < delta; i++)
                    lot.Items.Add(new StockItem { SerialCode = head + (first + i).ToString("D4"), Status = ItemStatus.InStock });
                lot.QuantityOnHand += delta;
            }
        }
        stocktake.Status = ApprovalStatus.Approved;
        stocktake.ApprovedBy = managerId;
        stocktake.ApprovedAt = now;
        stocktake.Plan.Status = StocktakePlanStatus.Done;
        // Phase 6 hooks the ROP check (UC_15 step 8) in here.
        notify.ToUser(stocktake.CreatedBy, $"Phiếu kiểm kê {stocktake.Code} đã được duyệt", "Tồn kho đã điều chỉnh theo số lượng thực tế.",
            $"/kho/kiem-ke", Notifier.Success);
        await db.SaveChangesAsync();
        return stocktake;
    }

    /// <summary>UC_15 4.1: stock unchanged; the plan returns to "Chờ thực hiện" so staff count again.</summary>
    public async Task<Stocktake> RejectAsync(int id, string? reason, int managerId)
    {
        var stocktake = await LoadAsync(id);
        EnsurePending(stocktake);
        var text = CatalogService.Clean(reason);
        new Validator()
            .Check(text is { Length: >= MinReason }, "reason", $"Bắt buộc nhập lý do (tối thiểu {MinReason} ký tự).")
            .Check(text is null || text.Length <= 255, "reason", "Lý do tối đa 255 ký tự.")
            .ThrowIfAny();
        stocktake.Status = ApprovalStatus.Rejected;
        stocktake.RejectReason = text;
        stocktake.ApprovedBy = managerId;
        stocktake.ApprovedAt = clock.UtcNow;
        stocktake.Plan.Status = StocktakePlanStatus.Waiting;
        notify.ToUser(stocktake.CreatedBy, $"Phiếu kiểm kê {stocktake.Code} bị từ chối", $"Lý do: {text}. Kiểm đếm lại theo kế hoạch {stocktake.Plan.Code}.",
            $"/kho/kiem-ke/{stocktake.PlanId}", Notifier.Danger);
        await db.SaveChangesAsync();
        return stocktake;
    }

    // ---------------- helpers ----------------

    private IQueryable<GoodsReceiptDetail> ScopeLots(StocktakePlan plan) => plan.ScopeType == StocktakeScope.Warehouse
        ? CountableLots()
        : db.GoodsReceiptDetails.Where(d => db.StocktakePlanDetails.Any(p => p.PlanId == plan.PlanId && p.ReceiptDetailId == d.ReceiptDetailId));

    private static void EnsureWaiting(StocktakePlan plan)
    {
        if (plan.Status != StocktakePlanStatus.Waiting)
            throw new RuleException($"Kế hoạch {plan.Code} đang “{Labels<StocktakePlanStatus>.ToLabel(plan.Status)}”, không kiểm đếm được.");
    }

    private static void EnsurePending(Stocktake s)
    {
        if (s.Status != ApprovalStatus.Pending)
            throw new RuleException($"Phiếu {s.Code} đang “{Labels<ApprovalStatus>.ToLabel(s.Status)}”, không còn chờ duyệt.");
    }

    private async Task<StocktakePlan> LoadPlanAsync(int id) =>
        await db.StocktakePlans.SingleOrDefaultAsync(p => p.PlanId == id) ?? throw new NotFoundException("Không tìm thấy kế hoạch kiểm kê.");

    private async Task<Stocktake> LoadAsync(int id) =>
        await db.Stocktakes
            .Include(s => s.Plan)
            .Include(s => s.Details).ThenInclude(d => d.ReceiptDetail).ThenInclude(l => l.Items)
            .Include(s => s.Details).ThenInclude(d => d.ReceiptDetail).ThenInclude(l => l.Product)
            .SingleOrDefaultAsync(s => s.StocktakeId == id)
        ?? throw new NotFoundException("Không tìm thấy phiếu kiểm kê.");
}
