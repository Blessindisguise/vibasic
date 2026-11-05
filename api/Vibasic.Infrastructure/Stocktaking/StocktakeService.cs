using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Issuing;

namespace Vibasic.Infrastructure.Stocktaking;

public record PlanInput(StocktakePlanType? PlanType, StocktakeScope? ScopeType, DateOnly? PlannedDate, List<int>? LotIds, string? Note);
/// <param name="CountedAt">When the lot was counted on the device; the system quantity is taken at that moment (K1).</param>
/// <param name="Serials">Counted by scanning: the item codes found on the shelf (K4). Null when the count was typed in.</param>
/// <param name="Unlabeled">Counted by scanning: items found without a readable label.</param>
public record CountInput(int? ReceiptDetailId, int? ActualQuantity, string? Reason, DateTime? CountedAt = null, List<string>? Serials = null, int? Unlabeled = null);
public record StocktakeInput(List<CountInput>? Counts);
public record StockDefectInput(int? ReceiptDetailId, int? Quantity, string? Description);

/// <summary>
/// One lot to count (UC_14 step 2). <paramref name="SystemQuantity"/> is the stock on hand; <paramref name="Picking"/> of it was
/// already scanned for an issue and sits in the staging area, so the shelf should hold <paramref name="ShelfQuantity"/>.
/// </summary>
public record SheetLot(int ReceiptDetailId, string LotCode, int ProductId, string Sku, string ProductName, string Unit,
    DateTime ReceivedDate, LotStatus Status, int SystemQuantity, int Picking, int ShelfQuantity);

/// <summary>
/// Stocktake workflow: UC_13 (kế hoạch), UC_14 (kiểm đếm, biên bản khi phát hiện lỗi), UC_15 (duyệt và điều chỉnh tồn).
/// <list type="bullet">
/// <item>Plan: Chờ thực hiện → (count submitted) Đang kiểm kê → (approved) Hoàn thành; a rejected count sends it back to Chờ thực hiện.</item>
/// <item>Counts are kept on the device until submitted; the stocktake is created then, with the system quantities of that moment.</item>
/// <item>Approval applies the difference: missing items become "Thất thoát", surplus items get new codes, QuantityOnHand moves by the same amount.</item>
/// </list>
/// </summary>
public class StocktakeService(VibasicDbContext db, CodeGenerator codes, Notifier notify, IClock clock, IssueService issues, Decision.ReplenishmentService replenish)
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
            .Select(d => new { d, Picking = d.Items.Count(i => i.Status == ItemStatus.Reserved && i.PickedAt != null) })
            .Select(x => new SheetLot(x.d.ReceiptDetailId, x.d.LotCode, x.d.ProductId, x.d.Product.SKU, x.d.Product.ProductName, x.d.Product.Unit,
                x.d.Receipt.ReceiptDate, x.d.Status, x.d.QuantityOnHand, x.Picking, x.d.QuantityOnHand - x.Picking))
            .ToListAsync();
    }

    /// <summary>
    /// K1/K2: was the item on the shelf at <paramref name="at"/>? Items in stock (free or reserved) and items issued later count,
    /// unless they had already been scanned for an issue by then (staging area or delivered). Lost and incoming items never count.
    /// </summary>
    public static bool OnShelfAt(StockItem i, DateTime at) =>
        i.Status is ItemStatus.InStock or ItemStatus.Reserved or ItemStatus.Issued && (i.PickedAt is null || i.PickedAt > at);

    /// <summary>On the shelf now, so it can still be written off: free, or reserved but not yet scanned.</summary>
    private static bool OnShelfNow(StockItem i) => i.Status == ItemStatus.InStock || i.Status == ItemStatus.Reserved && i.PickedAt is null;

    /// <summary>
    /// UC_14 steps 3–6: every lot in scope needs a count (3.2: not found → 0); a difference needs a reason (5.1).
    /// The system quantity of a lot is what its shelf held when it was counted (K1, K2). A lot counted by scanning (K4) records
    /// the items found, so approval knows exactly which ones are missing.
    /// </summary>
    public async Task<Stocktake> SubmitAsync(int planId, StocktakeInput input, int staffId)
    {
        var plan = await LoadPlanAsync(planId);
        EnsureWaiting(plan);
        var lots = await ScopeLots(plan).Include(d => d.Items).ToListAsync();
        var lotIds = lots.Select(l => l.ReceiptDetailId).ToList();
        var busy = await db.StocktakeDetails
            .Where(d => lotIds.Contains(d.ReceiptDetailId) && d.Stocktake.Status == ApprovalStatus.Pending)
            .Select(d => new { d.ReceiptDetail.LotCode, d.Stocktake.Code }).FirstOrDefaultAsync();
        if (busy is not null)
            throw new RuleException($"Lô {busy.LotCode} đang nằm trong phiếu kiểm kê {busy.Code} chờ duyệt. Chờ quản lý xử lý phiếu đó trước.");
        var counts = (input.Counts ?? []).Where(c => c.ReceiptDetailId is not null).GroupBy(c => c.ReceiptDetailId!.Value).ToDictionary(g => g.Key, g => g.Last());
        var now = clock.UtcNow;

        var v = new Validator().Check(lots.Count > 0, "counts", "Kế hoạch không còn lô nào để kiểm.");
        var rows = new List<StocktakeDetail>();
        foreach (var lot in lots)
        {
            var key = $"counts[{lot.ReceiptDetailId}]";
            counts.TryGetValue(lot.ReceiptDetailId, out var c);
            // A count from the device is trusted back to 30 days; never in the future.
            var at = c?.CountedAt is { } t && t <= now && t >= now.AddDays(-30) ? t : now;
            var system = lot.Items.Count(i => OnShelfAt(i, at));
            var found = new List<StockItem>();
            int? actual = c?.ActualQuantity;
            if (c?.Serials is { } serials)
            {
                var wanted = serials.Select(s => CatalogService.Clean(s)?.ToUpperInvariant()).OfType<string>().Distinct().ToList();
                var bySerial = lot.Items.ToDictionary(i => i.SerialCode);
                var foreign = wanted.Where(s => !bySerial.ContainsKey(s)).ToList();
                found = wanted.Where(bySerial.ContainsKey).Select(s => bySerial[s]).ToList();
                var gone = found.Where(i => !OnShelfAt(i, at) && i.Status != ItemStatus.Lost).Select(i => i.SerialCode).ToList();
                v.Check(foreign.Count == 0, key + ".serials", $"Không thuộc lô {lot.LotCode}: {string.Join(", ", foreign.Take(5))}{(foreign.Count > 5 ? "…" : "")}. Bỏ các mã này ra khỏi số đếm.")
                 .Check(gone.Count == 0, key + ".serials", $"Đã lấy cho phiếu xuất hoặc đã xuất trước lúc đếm: {string.Join(", ", gone.Take(5))}. Bỏ các mã này ra khỏi số đếm.")
                 .Check(c.Unlabeled is null or >= 0 and <= 100_000, key + ".unlabeled", "Số sản phẩm không có tem không hợp lệ.");
                actual = found.Count + (c.Unlabeled ?? 0);
            }
            var reason = CatalogService.Clean(c?.Reason);
            v.Check(actual is >= 0 and <= 100_000, key + ".actualQuantity", $"Nhập số thực tế của lô {lot.LotCode} (không tìm thấy lô thì nhập 0).")
             .Check(actual is null || actual == system || reason is { Length: >= MinReason }, key + ".reason",
                 $"Lô {lot.LotCode} có chênh lệch: nhập lý do (tối thiểu {MinReason} ký tự).")
             .Check(reason is null || reason.Length <= 255, key + ".reason", "Lý do tối đa 255 ký tự.");
            if (actual is null) continue;
            var row = new StocktakeDetail
            {
                ReceiptDetailId = lot.ReceiptDetailId, SystemQuantity = system, ActualQuantity = actual.Value, CountedAt = at,
                Reason = actual == system ? null : reason,
                Method = c!.Serials is null ? CountMethod.Manual : CountMethod.Scan, UnlabeledQuantity = c.Serials is null ? 0 : c.Unlabeled ?? 0,
            };
            foreach (var item in found) row.Items.Add(new StocktakeItem { ItemId = item.ItemId });
            rows.Add(row);
        }
        v.ThrowIfAny();

        var stocktake = new Stocktake
        {
            Code = await codes.NextDocumentAsync(CodeGenerator.Stocktake, now), PlanId = planId, StocktakeDate = now,
            CreatedBy = staffId, Status = ApprovalStatus.Pending,
        };
        stocktake.Details.AddRange(rows);
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
        await replenish.CheckLotsAsync([lot.ReceiptDetailId]);
        return report;
    }

    // ---------------- UC_15: duyệt, điều chỉnh tồn ----------------

    public async Task<Stocktake> ApproveAsync(int id, int managerId)
    {
        var stocktake = await LoadAsync(id);
        EnsurePending(stocktake);
        var now = clock.UtcNow;

        foreach (var d in stocktake.Details)
        {
            var lot = d.ReceiptDetail;
            var at = d.CountedAt ?? stocktake.StocktakeDate;
            List<StockItem> lost;
            int added;
            if (d.Method == CountMethod.Scan)
            {
                // K4: exactly the items that were on the shelf and were not scanned; scanned "Thất thoát" items are found again.
                var scanned = d.Items.Select(x => x.ItemId).ToHashSet();
                lost = lot.Items.Where(i => OnShelfAt(i, at) && OnShelfNow(i) && !scanned.Contains(i.ItemId)).ToList();
                var refound = lot.Items.Where(i => i.Status == ItemStatus.Lost && scanned.Contains(i.ItemId)).ToList();
                foreach (var item in refound) item.Status = ItemStatus.InStock;
                lot.QuantityOnHand += refound.Count;
                added = d.UnlabeledQuantity;
            }
            else
            {
                var delta = d.ActualQuantity - d.SystemQuantity;
                // Typed count: which items are missing is unknown, so free ones go first, then reserved ones not yet scanned.
                // Items already scanned for an issue were not on the shelf and are never written off (K2).
                lost = delta >= 0 ? [] : lot.Items.Where(OnShelfNow)
                    .OrderBy(i => i.Status == ItemStatus.InStock ? 0 : 1).ThenByDescending(i => i.SerialCode).Take(-delta).ToList();
                added = Math.Max(0, delta);
            }

            var reserved = lost.Where(i => i.Status == ItemStatus.Reserved).ToList();
            if (reserved.Count > 0)
                await issues.ReplaceReservedAsync(reserved.Select(i => i.ItemId).ToList(), [lot.ReceiptDetailId], null,
                    $"Sản phẩm giữ chỗ bị thất thoát khi kiểm kê lô {lot.LotCode} và không đủ hàng thay thế.");
            foreach (var item in lost) item.Status = ItemStatus.Lost;
            lot.QuantityOnHand -= lost.Count;

            if (added > 0)
            {
                // Surplus / unlabeled items: new identities (UC_15 step 7).
                var (head, first) = await codes.ReserveSerialsAsync(lot.Product.SKU, now, added);
                for (var i = 0; i < added; i++)
                    lot.Items.Add(new StockItem { SerialCode = head + (first + i).ToString("D4"), Status = ItemStatus.InStock });
                lot.QuantityOnHand += added;
            }
        }
        stocktake.Status = ApprovalStatus.Approved;
        stocktake.ApprovedBy = managerId;
        stocktake.ApprovedAt = now;
        stocktake.Plan.Status = StocktakePlanStatus.Done;
        notify.ToUser(stocktake.CreatedBy, $"Phiếu kiểm kê {stocktake.Code} đã được duyệt", "Tồn kho đã điều chỉnh theo số lượng thực tế.",
            $"/kho/kiem-ke", Notifier.Success);
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync(stocktake.Details.Select(d => d.ReceiptDetailId));
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
            .Include(s => s.Details).ThenInclude(d => d.Items)
            .SingleOrDefaultAsync(s => s.StocktakeId == id)
        ?? throw new NotFoundException("Không tìm thấy phiếu kiểm kê.");
}
