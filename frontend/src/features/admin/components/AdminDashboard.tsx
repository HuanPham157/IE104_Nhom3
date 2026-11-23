'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { Icon, type IconName } from '@/components/ui/Brand';
import { oralcheckFetch } from '@/lib/oralcheck-client';

type ApprovalType = 'class' | 'class_cancellation' | 'academic_rank';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface AcademicRequestData {
  academic_title?: string;
  academic_degree?: string | null;
  major?: string;
  institution?: string;
  graduation_year?: string;
  decision_number?: string;
}

interface ApprovalRecord {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_department?: string | null;
  requester_current_title?: string | null;
  request_type: string;
  request_data: ({ class_name?: string; class_code?: string; reason?: string; description?: string | null } & AcademicRequestData) | null;
  status: ApprovalStatus;
  reject_reason: string | null;
  created_at: string;
}

interface ApprovalItem {
  id: string;
  requesterId: string;
  type: ApprovalType;
  title: string;
  requestedBy: string;
  department: string;
  date: string;
  details: string;
  fields: Array<[string, string]>;
  status: ApprovalStatus;
  rejectionReason?: string;
}

interface UserAccount {
  id: string;
  full_name: string;
  role: 'student' | 'lecturer' | 'admin';
  account_status: 'active' | 'pending' | 'suspended';
  created_at: string;
  email: string | null;
  identifier: string | null;
  department: string | null;
  academic_title: string | null;
}

interface ClassSummary {
  id: string;
  status: 'pending' | 'active' | 'rejected' | 'archived';
}

const TYPE_META: Record<ApprovalType, { label: string; className: string; icon: IconName }> = {
  class: { label: 'MỞ LỚP MỚI', className: 'bg-brand-50 text-brand-700 ring-brand-200', icon: 'classes' },
  class_cancellation: { label: 'YÊU CẦU HỦY LỚP', className: 'bg-rose-50 text-rose-700 ring-rose-200', icon: 'logout' },
  academic_rank: { label: 'HỌC HÀM / HỌC VỊ', className: 'bg-amber-50 text-amber-800 ring-amber-200', icon: 'profile' },
};

const ACADEMIC_TITLES = ['', 'CN.', 'KS.', 'Th.S', 'TS.', 'PGS. TS.', 'GS. TS.'];

function toApprovalItem(item: ApprovalRecord): ApprovalItem {
  const data = item.request_data ?? {};
  const type: ApprovalType = item.request_type === 'class_cancellation'
    ? 'class_cancellation'
    : item.request_type === 'academic_info_update' ? 'academic_rank' : 'class';

  if (type === 'academic_rank') {
    return {
      id: item.id,
      requesterId: item.requester_id,
      type,
      title: `Cập nhật thành ${data.academic_title ?? '—'}`,
      requestedBy: item.requester_name,
      department: item.requester_department ?? '—',
      date: new Date(item.created_at).toLocaleString('vi-VN'),
      details: [data.major, data.institution, data.graduation_year].filter(Boolean).join(' • '),
      fields: [
        ['Học hàm / học vị hiện tại', item.requester_current_title ?? 'Chưa cập nhật'],
        ['Đề nghị cập nhật', data.academic_title ?? '—'],
        ['Văn bằng', data.academic_degree ?? '—'],
        ['Chuyên ngành', data.major ?? '—'],
        ['Cơ sở cấp bằng', data.institution ?? '—'],
        ['Năm tốt nghiệp', data.graduation_year ?? '—'],
        ['Số quyết định', data.decision_number ?? '—'],
      ],
      status: item.status,
      rejectionReason: item.reject_reason ?? undefined,
    };
  }

  return {
    id: item.id,
    requesterId: item.requester_id,
    type,
    title: type === 'class_cancellation' ? `Yêu cầu hủy lớp: ${data.class_name ?? 'Lớp học'}` : data.class_name ?? 'Yêu cầu mở lớp',
    requestedBy: item.requester_name,
    department: item.requester_department ?? '—',
    date: new Date(item.created_at).toLocaleString('vi-VN'),
    details: [data.class_code ? `Mã lớp: ${data.class_code}` : '', data.reason ?? ''].filter(Boolean).join(' • '),
    fields: [
      ['Tên lớp', data.class_name ?? '—'],
      ['Mã lớp', data.class_code ?? '—'],
      ...(data.description ? [['Mô tả', data.description] as [string, string]] : []),
      ...(data.reason ? [['Lý do', data.reason] as [string, string]] : []),
    ],
    status: item.status,
    rejectionReason: item.reject_reason ?? undefined,
  };
}

function StatCard({ label, value, hint, icon, tone }: { label: string; value: string | number; hint: string; icon: IconName; tone: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="font-display mt-2 text-3xl font-bold text-gray-900">{value}</div>
      <p className="mt-2 text-[12px] text-gray-500">{hint}</p>
    </div>
  );
}

export default function AdminDashboard({ currentPage = 'overview' }: { currentPage?: 'overview' | 'approvals' }) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [usersError, setUsersError] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | ApprovalType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'lecturer' | 'student'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<UserAccount | null>(null);
  const [editingTitleUser, setEditingTitleUser] = useState<UserAccount | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const [rejectingItem, setRejectingItem] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: ApprovalRecord[] }>('/api/admin/approval-requests')
      .then(({ data }) => { if (active) setApprovals(data.map(toApprovalItem)); })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải yêu cầu phê duyệt.');
      })
      .finally(() => { if (active) setLoading(false); });

    oralcheckFetch<{ data: UserAccount[] }>('/api/admin/users')
      .then(({ data }) => { if (active) setUsers(data); })
      .catch((error: unknown) => {
        if (active) setUsersError(error instanceof Error ? error.message : 'Không thể tải danh sách tài khoản.');
      })
      .finally(() => { if (active) setUsersLoading(false); });

    oralcheckFetch<{ data: ClassSummary[] }>('/api/classes')
      .then(({ data }) => { if (active) setClasses(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (currentPage !== 'approvals') return;
    document.getElementById('approval-requests')?.scrollIntoView();
  }, [currentPage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2800);
  };

  const handleApprove = async (item: ApprovalItem) => {
    try {
      await oralcheckFetch(`/api/admin/approval-requests/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision: 'approved' }),
      });
      setApprovals((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, status: 'approved' } : entry));
      if (item.type === 'academic_rank') {
        const newTitle = item.fields.find(([label]) => label === 'Đề nghị cập nhật')?.[1] ?? null;
        setUsers((prev) => prev.map((user) => user.id === item.requesterId ? { ...user, academic_title: newTitle } : user));
      }
      showToast('Đã phê duyệt yêu cầu thành công.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể phê duyệt yêu cầu.');
    }
  };

  const openRejectModal = (item: ApprovalItem) => {
    setRejectingItem(item);
    setRejectReason(
      item.type === 'class'
        ? 'Vui lòng bổ sung thông tin cần thiết cho yêu cầu mở lớp.'
        : item.type === 'class_cancellation'
          ? 'Yêu cầu hủy lớp chưa được chấp thuận. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.'
          : 'Minh chứng văn bằng chưa đầy đủ. Vui lòng bổ sung số quyết định công nhận và nộp lại.',
    );
  };

  const confirmReject = async () => {
    if (!rejectingItem || !rejectReason.trim()) return;
    try {
      await oralcheckFetch(`/api/admin/approval-requests/${rejectingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision: 'rejected', reject_reason: rejectReason.trim() }),
      });
      setApprovals((prev) => rejectingItem.type === 'class'
        ? prev.filter((item) => item.id !== rejectingItem.id)
        : prev.map((item) => item.id === rejectingItem.id ? { ...item, status: 'rejected', rejectionReason: rejectReason.trim() } : item));
      setRejectingItem(null);
      showToast(rejectingItem.type === 'class'
        ? 'Lớp đã bị từ chối; lịch sử và thông báo lý do đã được lưu.'
        : 'Đã từ chối yêu cầu và gửi thông báo lý do cho giảng viên.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể từ chối yêu cầu.');
    }
  };

  async function updateUser(user: UserAccount, body: { account_status?: 'active' | 'suspended'; academic_title?: string | null }, message: string) {
    setBusyUserId(user.id);
    try {
      await oralcheckFetch(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setUsers((prev) => prev.map((item) => item.id === user.id ? {
        ...item,
        ...(body.account_status ? { account_status: body.account_status } : {}),
        ...(body.academic_title !== undefined ? { academic_title: body.academic_title || null } : {}),
      } : item));
      showToast(message);
      return true;
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Không thể cập nhật tài khoản.');
      return false;
    } finally {
      setBusyUserId(null);
    }
  }

  const pendingApprovals = approvals.filter((item) => item.status === 'pending');
  const visibleApprovals = approvals.filter((item) => approvalFilter === 'all' || item.type === approvalFilter);
  const students = users.filter((user) => user.role === 'student');
  const lecturers = users.filter((user) => user.role === 'lecturer');
  const lockedOrPending = users.filter((user) => user.account_status !== 'active').length;
  const activeClasses = classes?.filter((item) => item.status === 'active').length ?? 0;

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLocaleLowerCase('vi');
    return users.filter((user) => {
      if (user.role === 'admin') return false;
      if (userRoleFilter !== 'all' && user.role !== userRoleFilter) return false;
      if (userStatusFilter !== 'all' && user.account_status !== userStatusFilter) return false;
      if (!keyword) return true;
      return [user.full_name, user.email, user.identifier, user.department]
        .some((value) => value?.toLocaleLowerCase('vi').includes(keyword));
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  const countByType = (type: ApprovalType) => pendingApprovals.filter((item) => item.type === type).length;

  return (
    <div className="flex min-h-screen text-gray-900">
      <AdminSidebar currentPage={currentPage} />

      <div className="min-w-0 flex-1 md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between gap-3 border-b border-gray-200 bg-white/75 px-5 backdrop-blur-xl backdrop-saturate-150 sm:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-600">Quản trị viên</p>
            <p className="font-display truncate text-[15px] font-semibold text-gray-900">
              {currentPage === 'approvals' ? 'Duyệt yêu cầu' : 'Tổng quan hệ thống'}
            </p>
          </div>
          <Link
            href="/admin/approvals#approval-requests"
            className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <Icon name="shield" className="h-4 w-4" />
            {pendingApprovals.length} yêu cầu chờ duyệt
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-6 sm:px-8">
          {errorMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
          )}

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {currentPage === 'approvals' ? 'Duyệt yêu cầu lớp học' : 'Tổng quan quản trị'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">Quản lý yêu cầu chờ duyệt, lớp học, tài khoản và học hàm / học vị giảng viên.</p>
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Người dùng" value={usersLoading ? '…' : students.length + lecturers.length} hint={`${students.length} sinh viên · ${lecturers.length} giảng viên`} icon="users" tone="bg-brand-50 text-brand-700" />
            <StatCard label="Tổng số lớp" value={classes ? classes.length : '—'} hint={`${activeClasses} lớp đang hoạt động`} icon="classes" tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Yêu cầu chờ duyệt" value={loading ? '…' : pendingApprovals.length} hint={`${countByType('class')} mở lớp · ${countByType('class_cancellation')} hủy lớp · ${countByType('academic_rank')} học vị`} icon="shield" tone="bg-amber-50 text-amber-700" />
            <StatCard label="Khóa / chờ kích hoạt" value={usersLoading ? '…' : lockedOrPending} hint="Tài khoản không ở trạng thái hoạt động" icon="lock" tone="bg-rose-50 text-rose-700" />
          </section>

          {/* Danh sách chờ duyệt */}
          <section id="approval-requests" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Danh sách chờ duyệt</h2>
                <p className="mt-0.5 text-[12px] text-gray-500">Yêu cầu mở lớp, hủy lớp và cập nhật học hàm / học vị do giảng viên gửi.</p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 text-[12px]" role="tablist" aria-label="Lọc loại yêu cầu">
                {([['all', 'Tất cả'], ['class', 'Mở lớp'], ['class_cancellation', 'Hủy lớp'], ['academic_rank', 'Học hàm / Học vị']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={approvalFilter === key}
                    onClick={() => setApprovalFilter(key)}
                    className={`rounded-lg px-3 py-1.5 font-medium transition ${approvalFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loading && <p className="p-4 text-sm text-gray-500">Đang tải yêu cầu phê duyệt...</p>}
              {!loading && visibleApprovals.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">Hiện chưa có yêu cầu nào cần phê duyệt.</p>
              )}
              {visibleApprovals.map((item) => {
                const meta = TYPE_META[item.type];
                const expanded = expandedId === item.id;
                return (
                  <article
                    key={item.id}
                    className={`rounded-xl border p-4 transition ${item.status === 'approved' ? 'border-emerald-200 bg-emerald-50/40' : item.status === 'rejected' ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'}`}
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.className}`}>
                          <Icon name={meta.icon} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.className}`}>{meta.label}</span>
                            <strong className="text-[13px] font-semibold text-gray-900">{item.title}</strong>
                            <span className="font-mono text-[11px] text-gray-400">• {item.date}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-600">
                            <span>Giảng viên gửi: <strong className="text-gray-900">{item.requestedBy}</strong></span>
                            <span>•</span>
                            <span>Đơn vị: {item.department}</span>
                          </div>
                          {item.details && <p className="text-[12px] leading-relaxed text-gray-700">{item.details}</p>}
                          <button type="button" onClick={() => setExpandedId(expanded ? null : item.id)} aria-expanded={expanded} className="text-[12px] font-semibold text-brand-700 hover:underline">
                            {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết yêu cầu'}
                          </button>
                          {expanded && (
                            <dl className="mt-2 grid gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white p-4 text-[12px] sm:grid-cols-2">
                              {item.fields.map(([label, value]) => (
                                <div key={label}>
                                  <dt className="text-gray-500">{label}</dt>
                                  <dd className="whitespace-pre-line font-medium text-gray-900">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          {item.status === 'rejected' && item.rejectionReason && (
                            <div className="rounded-lg border border-red-200 bg-red-100/70 p-2.5 text-[12px] text-red-800">
                              <strong>Lý do từ chối đã gửi giảng viên:</strong> {item.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {item.status === 'pending' ? (
                          <>
                            <button type="button" onClick={() => void handleApprove(item)} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95">
                              <span>✓</span> Phê duyệt (Approve)
                            </button>
                            <button type="button" onClick={() => openRejectModal(item)} className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 active:scale-95">
                              <span>✕</span> Từ chối (Reject)
                            </button>
                          </>
                        ) : item.status === 'approved' ? (
                          <span className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-[12px] font-semibold text-emerald-800"><span>✓</span> Đã phê duyệt</span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-xl border border-red-300 bg-red-100 px-3 py-1.5 text-[12px] font-semibold text-red-800"><span>✕</span> Đã từ chối</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Quản lý người dùng */}
          <section id="user-management-section" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Quản lý người dùng</h2>
                <p className="mt-0.5 text-[12px] text-gray-500">Danh sách sinh viên, giảng viên; khóa / mở khóa tài khoản và quản lý học hàm / học vị.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <span className="sr-only">Tìm người dùng</span>
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tìm theo tên, email, MSSV / MGV..."
                    className="h-9 w-60 rounded-xl border border-gray-200 bg-gray-50 px-3 text-[13px] outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                  />
                </label>
                <div className="flex rounded-xl bg-gray-100 p-1 text-[12px]">
                  {([['all', 'Tất cả'], ['student', `Sinh viên (${students.length})`], ['lecturer', `Giảng viên (${lecturers.length})`]] as const).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setUserRoleFilter(key)} aria-pressed={userRoleFilter === key} className={`rounded-lg px-3 py-1 font-medium transition ${userRoleFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value as typeof userStatusFilter)} aria-label="Lọc trạng thái" className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-[13px]">
                  <option value="all">Mọi trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="pending">Chờ kích hoạt</option>
                  <option value="suspended">Tạm khóa</option>
                </select>
              </div>
            </div>

            {usersError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{usersError}</p>}

            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Họ tên &amp; Email</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">MSSV / MGV</th>
                    <th className="px-4 py-3">Khoa</th>
                    <th className="px-4 py-3">Học hàm / Học vị</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersLoading && (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-500">Đang tải danh sách tài khoản…</td></tr>
                  )}
                  {!usersLoading && filteredUsers.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-500">Không có tài khoản phù hợp.</td></tr>
                  )}
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setViewingUser(user)} className="text-left">
                          <strong className="block font-semibold text-gray-900 hover:text-brand-700">{user.full_name}</strong>
                          <span className="font-mono text-[11px] text-gray-400">{user.email ?? 'Email ẩn'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${user.role === 'lecturer' ? 'bg-brand-50 text-brand-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {user.role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-800">{user.identifier ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{user.department ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {user.role === 'lecturer' ? (
                          <button type="button" onClick={() => { setEditingTitleUser(user); setTitleDraft(user.academic_title ?? ''); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium hover:bg-gray-100">
                            {user.academic_title ?? 'Chưa cập nhật'} <Icon name="edit" className="h-3 w-3 text-gray-400" />
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${user.account_status === 'active' ? 'bg-emerald-50 text-emerald-800' : user.account_status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${user.account_status === 'active' ? 'bg-emerald-500' : user.account_status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
                          {user.account_status === 'active' ? 'Đang hoạt động' : user.account_status === 'pending' ? 'Chờ kích hoạt' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={busyUserId === user.id}
                          onClick={() => void updateUser(
                            user,
                            { account_status: user.account_status === 'active' ? 'suspended' : 'active' },
                            user.account_status === 'active' ? 'Đã tạm khóa tài khoản.' : user.account_status === 'pending' ? 'Đã kích hoạt tài khoản.' : 'Đã mở khóa tài khoản.',
                          )}
                          className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50 ${user.account_status === 'active' ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                          {user.account_status === 'active' ? 'Khóa tài khoản' : user.account_status === 'pending' ? 'Kích hoạt' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Popup từ chối kèm lý do */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="reject-approval-title" className="w-full max-w-lg animate-fade-up space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 id="reject-approval-title" className="text-base font-semibold text-red-600">Từ chối yêu cầu phê duyệt</h2>
              <button type="button" onClick={() => setRejectingItem(null)} aria-label="Đóng" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900">✕</button>
            </div>
            <p className="text-[13px] text-gray-700">
              Bạn đang từ chối yêu cầu: <strong>{rejectingItem.title}</strong> của <strong>{rejectingItem.requestedBy}</strong>.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="rejection-reason-input" className="block text-[12px] font-semibold text-gray-800">
                Lý do từ chối (bắt buộc) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason-input"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-[13px] outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                placeholder="Nhập lý do để thông báo lại cho giảng viên..."
              />
            </div>
            <p className="text-[12px] text-gray-500">Giảng viên sẽ nhận thông báo trong hệ thống kèm lý do từ chối.</p>
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button type="button" onClick={() => setRejectingItem(null)} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-semibold hover:bg-gray-100">Hủy bỏ</button>
              <button type="button" onClick={() => void confirmReject()} disabled={!rejectReason.trim()} className="rounded-xl bg-red-600 px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50">Xác nhận Từ chối</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup thông tin tài khoản */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setViewingUser(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="user-detail-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md animate-fade-up rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">{viewingUser.role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'}</p>
                <h2 id="user-detail-title" className="mt-1 text-lg font-semibold text-gray-900">
                  {[viewingUser.role === 'lecturer' ? viewingUser.academic_title : null, viewingUser.full_name].filter(Boolean).join(' ')}
                </h2>
              </div>
              <button type="button" onClick={() => setViewingUser(null)} aria-label="Đóng" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900">✕</button>
            </div>
            <dl className="mt-5 space-y-3 text-[13px]">
              {([
                ['Email', viewingUser.email ?? 'Không hiển thị (máy chủ chưa cấu hình secret key)'],
                [viewingUser.role === 'lecturer' ? 'Mã giảng viên' : 'MSSV', viewingUser.identifier ?? '—'],
                ['Khoa / đơn vị', viewingUser.department ?? '—'],
                ['Trạng thái', viewingUser.account_status === 'active' ? 'Đang hoạt động' : viewingUser.account_status === 'pending' ? 'Chờ kích hoạt' : 'Tạm khóa'],
                ['Ngày tạo', new Date(viewingUser.created_at).toLocaleString('vi-VN')],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-right font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Popup chỉnh học hàm / học vị */}
      {editingTitleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-title-heading"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await updateUser(editingTitleUser, { academic_title: titleDraft || null }, 'Đã cập nhật học hàm / học vị.');
              if (ok) setEditingTitleUser(null);
            }}
            className="w-full max-w-md animate-fade-up space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="academic-title-heading" className="text-base font-semibold text-gray-900">Học hàm / học vị của {editingTitleUser.full_name}</h2>
            <label className="block text-[12px] font-semibold text-gray-700">
              Học hàm / học vị
              <select value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-[13px]">
                {ACADEMIC_TITLES.concat(titleDraft && !ACADEMIC_TITLES.includes(titleDraft) ? [titleDraft] : []).map((title) => (
                  <option key={title} value={title}>{title || 'Chưa cập nhật'}</option>
                ))}
              </select>
            </label>
            <p className="rounded-xl bg-gray-50 p-3 text-[13px] text-gray-600">
              Hiển thị: <strong className="text-gray-900">{[titleDraft, editingTitleUser.full_name].filter(Boolean).join(' ')}</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingTitleUser(null)} className="rounded-xl border border-gray-300 px-4 py-2 text-[13px] font-semibold hover:bg-gray-100">Hủy</button>
              <button type="submit" disabled={busyUserId === editingTitleUser.id} className="rounded-xl bg-black px-5 py-2 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50">Lưu</button>
            </div>
          </form>
        </div>
      )}

      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-xl md:bottom-6">
          <Icon name="check" className="h-4 w-4 text-emerald-300" /> {toastMessage}
        </div>
      )}
    </div>
  );
}
