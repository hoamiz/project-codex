import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { api, type Lead, type Page } from '../lib/api';
import { Badge, Button, Field, Modal, Pagination, State, statuses } from '../components/ui';
const date = (s?: string) =>
  s
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(s))
    : '—';
/** Version ngăn ghi đè; tải lại chỉ cập nhật version và hiển thị trạng thái server, giữ lựa chọn để admin xem xét. */
function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [status, setStatus] = useState(lead.status);
  const [version, setVersion] = useState(lead.version);
  const [notice, setNotice] = useState('');
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: () =>
      api(`/admin/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, version }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-leads'] });
      void client.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
  });
  const reload = async () => {
    const latest = await api<{ data: Lead }>(`/admin/leads/${lead.id}`);
    setVersion(latest.data.version);
    setNotice(
      `Bản server: ${statuses[latest.data.status]}. Lựa chọn của bạn được giữ; kiểm tra trước khi lưu.`,
    );
  };
  return (
    <Modal title="Chi tiết yêu cầu" onClose={onClose}>
      <dl>
        {[
          ['Khách hàng', lead.name],
          ['Điện thoại', lead.phone],
          ['Email', lead.email || '—'],
          ['Xe', lead.carTitle],
          ['Loại', lead.type === 'test_drive' ? 'Lái thử' : 'Tư vấn'],
          ['Lịch lái thử (UTC+7)', date(lead.preferredAt)],
          ['Ngày gửi (UTC+7)', date(lead.createdAt)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {lead.message && <p>{lead.message}</p>}
      <Field label="Trạng thái yêu cầu">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {['new', 'in_progress', 'completed', 'cancelled'].map((s) => (
            <option value={s} key={s}>
              {statuses[s]}
            </option>
          ))}
        </select>
      </Field>
      {notice && <p className="notice">{notice}</p>}
      {update.error && (
        <div className="notice error-notice" role="alert">
          {update.error.message}
          <Button
            variant="outline"
            onClick={() =>
              void reload().catch(() => setNotice('Không tải được bản mới. Vui lòng thử lại.'))
            }
          >
            Tải bản mới
          </Button>
        </div>
      )}
      <div className="form-actions">
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
        <Button disabled={update.isPending} onClick={() => update.mutate()}>
          Lưu trạng thái
        </Button>
      </div>
    </Modal>
  );
}
export function AdminLeads() {
  const [params, setParams] = useSearchParams();
  const [detail, setDetail] = useState<Lead | null>(null);
  const leads = useQuery({
    queryKey: ['admin-leads', params.toString()],
    queryFn: () => api<Page<Lead>>(`/admin/leads?${params}`),
  });
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  return (
    <>
      <div className="admin-heading">
        <div>
          <div className="eyebrow">AUTOHUB / CUSTOMERS</div>
          <h1>Yêu cầu khách hàng.</h1>
          <p className="muted small">Theo dõi từng cuộc hẹn, chăm sóc từng hành trình.</p>
        </div>
        <Badge>{leads.data?.pagination.total ?? 0} yêu cầu</Badge>
      </div>
      <div className="filters">
        <input
          aria-label="Tìm khách hàng"
          placeholder="Tên hoặc số điện thoại…"
          value={params.get('search') || ''}
          onChange={(e) => change('search', e.target.value)}
        />
        <select
          aria-label="Lọc trạng thái yêu cầu"
          value={params.get('status') || 'all'}
          onChange={(e) => change('status', e.target.value)}
        >
          <option value="all">Mọi trạng thái</option>
          {['new', 'in_progress', 'completed', 'cancelled'].map((s) => (
            <option key={s} value={s}>
              {statuses[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Loại yêu cầu"
          value={params.get('type') || 'all'}
          onChange={(e) => change('type', e.target.value)}
        >
          <option value="all">Mọi loại yêu cầu</option>
          <option value="test_drive">Lái thử</option>
          <option value="consultation">Tư vấn</option>
        </select>
      </div>
      {leads.isPending || leads.isError ? (
        <State loading={leads.isPending} error={leads.error} onRetry={() => void leads.refetch()} />
      ) : leads.data?.data.length ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Xe</th>
                  <th>Loại yêu cầu</th>
                  <th>Trạng thái</th>
                  <th>Ngày gửi</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {leads.data.data.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.name}</strong>
                      <small>{l.phone}</small>
                    </td>
                    <td>{l.carTitle}</td>
                    <td>{l.type === 'test_drive' ? 'Lái thử' : 'Tư vấn'}</td>
                    <td>
                      <Badge>{statuses[l.status]}</Badge>
                    </td>
                    <td>{date(l.createdAt)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        aria-label={`Xem ${l.name}`}
                        onClick={() => setDetail(l)}
                      >
                        <Eye size={17} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...leads.data.pagination} onChange={(p) => change('page', String(p))} />
        </>
      ) : (
        <State empty />
      )}
      {detail && <LeadDetail lead={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
