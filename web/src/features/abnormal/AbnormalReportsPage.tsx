import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, EmptyState, SearchField, SelectField, type DataTableColumn } from '../../design';
import { ANY_DATE, fmt, fmtShort, inVnDateRange, type DateRange } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, DateRangeFilter, ListError, Loading, NoneInRange } from '../../app/ui';
import { matches } from '../../app/text';
import { suggestFrom } from '../../app/suggest';
import { useAuth } from '../../app/auth';
import { HANDLING_METHODS, HANDLING_METHOD_LABEL, ReportStateBadge, REPORT_STATE_LABEL, SCOPE_LABEL, SOURCE_LABEL } from '../../app/statusBadges';
import {
  REPORT_SEARCH_PLACEHOLDER, reportSearchFields, reportState, useReports,
  type AbnormalSource, type HandlingMethod, type ReportRow, type ReportState,
} from '../../app/receiving';
import { HandlingActions, ReportDecision, ReportStatusCell } from './ReportDecision';

const STATES: ReportState[] = ['pending', 'waiting', 'inProgress', 'done', 'rejected'];

/**
 * UC_11 / UC_12: every abnormal report, by status and where it was found. Managers decide and set the hướng xử lý here; staff take
 * approved reports and handle them. Search goes by codes, product, supplier and the people involved, not by the free-text description.
 */
export function AbnormalReportsPage({ role, basePath }: { role: 'manager' | 'staff'; basePath: string }) {
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';
  const nav = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<ReportState | ''>(role === 'manager' ? 'pending' : '');
  const [source, setSource] = useState<AbnormalSource | ''>('');
  const [creator, setCreator] = useState('');
  const [method, setMethod] = useState<HandlingMethod | ''>('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRange>(ANY_DATE);
  const all = useReports(undefined, source || undefined);
  const data = useMemo(() => all.data ?? [], [all.data]);
  const creators = useMemo(() => [...new Map(data.map(r => [String(r.createdBy), r.creatorName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'vi')).map(([value, label]) => ({ value, label })), [data]);
  // Filters other than the status: the status counts follow them.
  const filtered = useMemo(() => data.filter(r => (!creator || String(r.createdBy) === creator) && (!method || r.handlingMethod === method)
    && (!onlyMine || r.handlerId === user?.id) && matches(search, ...reportSearchFields(r)) && inVnDateRange(r.createdAt, range.from, range.to)),
  [data, creator, method, onlyMine, user?.id, search, range]);
  const rows = useMemo(() => filtered.filter(r => !state || reportState(r) === state), [filtered, state]);
  const count = (s: ReportState) => filtered.filter(r => reportState(r) === s).length;
  // Across every status, so a report is found even while another tab is selected.
  const suggestions = suggestFrom(data, search, reportSearchFields, r => ({
    key: String(r.id), label: r.code, hint: `${r.lotCode} · ${r.sku} ${r.productName} · lập bởi ${r.creatorName}${r.handlerName ? ` · xử lý: ${r.handlerName}` : ''}`,
    meta: <ReportStateBadge state={reportState(r)} />,
  }));

  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    {
      key: 'createdAt', header: 'Lập', width: 140,
      render: r => <span style={{ display: 'inline-flex', flexDirection: 'column' }}><span style={{ whiteSpace: 'nowrap' }}>{fmtShort(r.createdAt)}</span><span className="vb-muted" style={{ fontSize: 12 }}>{r.creatorName}</span></span>,
    },
    { key: 'source', header: 'Phát hiện khi', width: 110, render: r => SOURCE_LABEL[r.sourceType] },
    { key: 'lot', header: 'Lô · mặt hàng', render: r => <span><Code>{r.lotCode}</Code> <span className="vb-muted">{r.sku}</span> {r.productName}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => `${fmt(r.quantity)} ${r.unit}` },
    { key: 'scope', header: 'Phạm vi', width: 120, render: r => SCOPE_LABEL[r.scope] },
    {
      key: 'handling', header: 'Hướng xử lý', width: 170,
      render: r => r.handlingMethod
        ? <span title={r.handlingPlan}>{HANDLING_METHOD_LABEL[r.handlingMethod]}</span>
        : r.handlingPlan ? <span className="vb-muted" title={r.handlingPlan}>Có đề xuất</span> : <span className="vb-muted">—</span>,
    },
    { key: 'status', header: 'Trạng thái', width: 170, render: r => <ReportStatusCell report={r} /> },
    {
      key: 'actions', header: '', width: role === 'manager' ? 250 : 200, align: 'right' as const,
      render: (r: ReportRow) => role === 'manager'
        ? (r.status === 'pending' || reportState(r) === 'waiting' ? <ReportDecision report={r} /> : <HandlingActions report={r} role={role} />)
        : <HandlingActions report={r} role={role} size="md" />,
    },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row" style={{ gap: 12, justifyContent: 'space-between' }}>
        <Segmented
          label="Trạng thái" size={size} value={state} onChange={setState}
          options={[{ value: '' as const, label: 'Tất cả', count: filtered.length }, ...STATES.map(s => ({ value: s, label: REPORT_STATE_LABEL[s], count: count(s) }))]}
        />
        <Segmented
          label="Nguồn phát hiện" size={size} value={source} onChange={setSource}
          options={[{ value: '', label: 'Mọi nguồn' }, ...(['receipt', 'issue', 'stocktake'] as const).map(s => ({ value: s, label: SOURCE_LABEL[s] }))]}
        />
      </div>
      <div className="vb-row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <SearchField
          size={size} placeholder={REPORT_SEARCH_PLACEHOLDER} value={search} onChange={setSearch} style={{ width: 360, maxWidth: '100%' }} aria-label="Tìm biên bản"
          suggestions={suggestions} onPickSuggestion={s => s.value && nav(`${basePath}/${(s.value as ReportRow).id}`)}
        />
        <SelectField size={size} label="Người lập" value={creator} onChange={e => setCreator(e.target.value)} placeholder="Mọi người" options={creators} style={{ minWidth: 170 }} />
        <SelectField size={size} label="Hướng xử lý" value={method} onChange={e => setMethod(e.target.value as HandlingMethod | '')} placeholder="Mọi hướng"
          options={HANDLING_METHODS.map(m => ({ value: m.value, label: m.label }))} style={{ minWidth: 170 }} />
        <DateRangeFilter size={size} label="Ngày lập" value={range} onChange={setRange} />
        {role === 'staff' && (
          <Segmented label="Người xử lý" size={size} value={onlyMine ? 'mine' : 'all'} onChange={v => setOnlyMine(v === 'mine')}
            options={[{ value: 'all', label: 'Mọi biên bản' }, { value: 'mine', label: 'Việc của tôi' }]} />
        )}
      </div>
      {all.isPending ? <Loading /> : all.isError ? <ListError onRetry={() => all.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} density={touch ? 'default' : 'compact'} onRowClick={r => nav(`${basePath}/${r.id}`)}
          maxHeight="calc(100dvh - 280px)" caption="Biên bản bất thường"
          empty={(range.from || range.to) && !search ? <NoneInRange what="biên bản" onClear={() => setRange(ANY_DATE)} />
            : <EmptyState icon="shield-alert" title="Không có biên bản phù hợp" description="Đổi bộ lọc trạng thái, người lập, hướng xử lý hoặc nguồn phát hiện." />}
        />
      )}
    </div>
  );
}
