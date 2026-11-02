'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import TeacherPageShell from '@/components/TeacherPageShell';

interface Student {
  id: string;
  name: string;
  email: string;
  initials: string;
  voiceprint: string;
  score: number;
  fluency: number;
  wordsPerMinute: number;
  note: string;
  status: 'Đã thẩm định' | 'Chờ GV duyệt' | 'Cần hỗ trợ';
  risk: boolean;
}

type StudentFilter = 'all' | 'excellent' | 'pending' | 'voiceprint' | 'risk';

const demoStudents: Student[] = [
  { id: '2021601889', name: 'Trần Quốc Bảo', email: 'bao.tq@sv.edu.vn', initials: 'QB', voiceprint: '98%', score: 8.8, fluency: 89, wordsPerMinute: 128, note: 'Luận điểm mạch lạc, âm cuối rõ', status: 'Đã thẩm định', risk: false },
  { id: '2021602102', name: 'Lê Minh Cường', email: 'cuong.lm@sv.edu.vn', initials: 'LC', voiceprint: '96%', score: 7.2, fluency: 74, wordsPerMinute: 112, note: 'Cần chú ý ngữ điệu và ngắt nghỉ', status: 'Chờ GV duyệt', risk: false },
  { id: '2021602456', name: 'Phạm Thùy Dung', email: 'dung.pt@sv.edu.vn', initials: 'PD', voiceprint: '100%', score: 9.6, fluency: 96, wordsPerMinute: 142, note: 'Phát âm thuật ngữ chuyên ngành chính xác', status: 'Đã thẩm định', risk: false },
  { id: '2021603011', name: 'Nguyễn Đức Hải', email: 'hai.nd@sv.edu.vn', initials: 'NH', voiceprint: '94%', score: 6.5, fluency: 61, wordsPerMinute: 92, note: 'Nhiều filler words, thiếu từ khóa chuyên môn', status: 'Cần hỗ trợ', risk: true },
  { id: '2021603120', name: 'Vũ Thị Lan', email: 'lan.vt@sv.edu.vn', initials: 'VL', voiceprint: '99%', score: 8.5, fluency: 87, wordsPerMinute: 130, note: 'Giải thích mạch lạc, giọng đọc rõ ràng', status: 'Đã thẩm định', risk: false },
  { id: '2021603308', name: 'Đỗ Hoàng Nam', email: 'nam.dh@sv.edu.vn', initials: 'HN', voiceprint: 'Chưa xác thực', score: 7.8, fluency: 79, wordsPerMinute: 118, note: 'Cần hoàn tất xác thực mẫu giọng nói', status: 'Chờ GV duyệt', risk: false },
];

const filterOptions: { id: StudentFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'excellent', label: 'Điểm xuất sắc ≥ 9.0' },
  { id: 'pending', label: 'Chờ thẩm định giảng viên' },
  { id: 'voiceprint', label: 'Voiceprint hoàn tất' },
  { id: 'risk', label: 'Cảnh báo rủi ro' },
];

function DetailIcon({ name }: { name: 'users' | 'voice' | 'chart' | 'alert' | 'search' | 'calendar' | 'download' | 'settings' | 'add' | 'check' }) {
  const paths = {
    users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87',
    voice: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
    chart: 'M3 3v18h18 M8 15l4-4 4 3 5-7',
    alert: 'M10.3 3.9 1.8 18.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
    search: 'm21 21-4.34-4.34 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z',
    calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
    add: 'M12 5v14 M5 12h14',
    check: 'M20 6 9 17l-5-5',
  };
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

function SummaryCard({ title, value, suffix, footer, icon, tone = 'default' }: {
  title: string;
  value: string;
  suffix?: string;
  footer: string;
  icon: 'users' | 'voice' | 'chart' | 'alert';
  tone?: 'default' | 'green' | 'indigo' | 'red';
}) {
  const style = {
    default: { icon: 'bg-gray-100 text-gray-700', value: 'text-gray-950' },
    green: { icon: 'bg-emerald-50 text-emerald-700', value: 'text-emerald-800' },
    indigo: { icon: 'bg-indigo-50 text-indigo-700', value: 'text-indigo-900' },
    red: { icon: 'bg-red-50 text-red-700', value: 'text-red-700' },
  }[tone];
  return (
    <article className="rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase leading-relaxed tracking-wide text-gray-500">{title}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.icon}`}><DetailIcon name={icon} /></span>
      </div>
      <div className="mt-1 flex items-baseline gap-2"><strong className={`text-[30px] leading-none ${style.value}`}>{value}</strong>{suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}</div>
      <p className="mt-2 text-[9px] text-gray-600">{footer}</p>
    </article>
  );
}

function StudentStatus({ student }: { student: Student }) {
  const tone = student.status === 'Đã thẩm định'
    ? 'border-gray-200 bg-gray-100 text-gray-700'
    : student.status === 'Chờ GV duyệt'
      ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
      : 'border-red-200 bg-red-50 text-red-700';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold ${tone}`}>{student.risk && <span aria-hidden="true" className="mr-1">●</span>}{student.status}</span>;
}

export default function TeacherClassDetail({ classCode }: { classCode: string }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [sortDescending, setSortDescending] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  const classInfo = {
    'AIO-8892': { title: 'KTPM-K20: Kiến trúc Phần mềm', secondary: 'IT4409', students: 48, capacity: 50, instructor: 'Kiến trúc Phần mềm', schedule: 'Thứ 3 (Tiết 1-4) • Phòng Lab A3.04', rubric: 'SE-ARCH-V2', submission: '93.3%', average: '8.35', voiceprint: '100%' },
    'AIO-3419': { title: 'OOP-K21: Lập trình Hướng đối tượng C++', secondary: 'CS102', students: 53, capacity: 60, instructor: 'Lập trình Hướng đối tượng C++', schedule: 'Thứ 5 (Tiết 5-8) • Phòng Lab B1.02', rubric: 'CPP-OOP-V1', submission: '88.3%', average: '9.10', voiceprint: '98%' },
    'AIO-5510': { title: 'HDH-K21: Hệ điều hành & Mạng máy tính', secondary: 'IT3080', students: 45, capacity: 45, instructor: 'Hệ điều hành & Mạng máy tính', schedule: 'Thứ 2 (Tiết 7-10) • Phòng Lab A2.01', rubric: 'OS-NET-V2', submission: '100%', average: '8.50', voiceprint: '100%' },
    'AIO-9012': { title: 'KTMT-K19: Thiết kế Hệ thống Nhúng & IoT', secondary: 'IT4100', students: 42, capacity: 45, instructor: 'Thiết kế Hệ thống Nhúng & IoT', schedule: 'Thứ 6 (Tiết 1-4) • Phòng Lab C3.08', rubric: 'EMBED-IOT-V1', submission: '100%', average: '8.80', voiceprint: '100%' },
  }[classCode];

  const visibleStudents = useMemo(() => demoStudents
    .filter((student) => `${student.name} ${student.id} ${student.email}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .filter((student) => {
      if (filter === 'excellent') return student.score >= 9;
      if (filter === 'pending') return student.status === 'Chờ GV duyệt';
      if (filter === 'voiceprint') return student.voiceprint !== 'Chưa xác thực';
      if (filter === 'risk') return student.risk;
      return true;
    })
    .sort((a, b) => sortDescending ? b.score - a.score : a.score - b.score), [filter, query, sortDescending]);

  function toggleStudent(studentId: string) {
    setSelectedStudents((selected) => selected.includes(studentId)
      ? selected.filter((id) => id !== studentId)
      : [...selected, studentId]);
  }

  function toggleVisibleStudents() {
    const visibleIds = visibleStudents.map((student) => student.id);
    const allVisibleSelected = visibleIds.every((id) => selectedStudents.includes(id));
    setSelectedStudents((selected) => allVisibleSelected
      ? selected.filter((id) => !visibleIds.includes(id))
      : [...new Set([...selected, ...visibleIds])]);
  }

  function exportRoster() {
    const rows = [
      ['MSSV', 'Họ và tên', 'Email', 'Voiceprint', 'Điểm AI Oral', 'Trôi chảy', 'WPM', 'Trạng thái'],
      ...visibleStudents.map((student) => [student.id, student.name, student.email, student.voiceprint, student.score.toString(), `${student.fluency}%`, student.wordsPerMinute.toString(), student.status]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${classCode}-danh-sach-sinh-vien-demo.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Đã tải danh sách minh họa đang hiển thị. Đây không phải dữ liệu sinh viên thật.');
  }

  if (!classInfo) return null;

  const selectAllChecked = visibleStudents.length > 0 && visibleStudents.every((student) => selectedStudents.includes(student.id));
  return (
    <TeacherPageShell currentPage="classes" breadcrumb={`${classCode} / Chi tiết lớp học`}>
      {(profile) => (
        <>
          <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-bold text-indigo-800">HK I 2026-2027</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-800">{classInfo.students}/{classInfo.capacity} sinh viên</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] text-gray-700">Rubric Oral: {classInfo.rubric}</span>
                </div>
                <h1 className="mt-3 text-[23px] font-bold leading-tight sm:text-[28px]">{classInfo.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-600">
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1">MÃ LỚP: <b className="ml-1 text-gray-900">{classCode}</b></span>
                  <span className="flex items-center gap-1"><DetailIcon name="calendar" />{classInfo.schedule}</span>
                  <span>Giảng viên: {profile.fullName || 'Giảng viên'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportRoster} className="flex h-9 items-center gap-2 rounded-full border border-gray-300 px-3 text-[10px] hover:bg-gray-50"><DetailIcon name="download" />Xuất bảng điểm (CSV)</button>
                <button type="button" onClick={() => setNotice('Cài đặt lớp chưa kết nối hệ thống lưu trữ.')} className="flex h-9 items-center gap-2 rounded-full border border-gray-300 px-3 text-[10px] hover:bg-gray-50"><DetailIcon name="settings" />Cài đặt lớp</button>
                <button type="button" onClick={() => setNotice('Chức năng thêm sinh viên chưa kết nối hệ thống ghi danh.')} className="flex h-9 items-center gap-2 rounded-full bg-black px-3 text-[10px] font-semibold text-white hover:bg-gray-800"><DetailIcon name="add" />Thêm sinh viên</button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-gray-200 pt-4 text-[11px]">
              <span className="border-b-2 border-black pb-2 font-semibold">Danh sách sinh viên <b className="ml-1 rounded-full bg-black px-2 py-0.5 text-[9px] text-white">{classInfo.students}</b></span>
              <a href="#student-roster" className="pb-2 text-gray-600 hover:text-gray-900">Nội dung câu hỏi <span className="ml-1 rounded-full bg-gray-100 px-1.5">6</span></a>
              <a href="#student-roster" className="flex items-center gap-1 pb-2 text-gray-600 hover:text-gray-900"><DetailIcon name="voice" />Phổ âm thanh &amp; Biểu đồ lớp</a>
              <a href="#student-roster" className="flex items-center gap-1 pb-2 text-gray-600 hover:text-gray-900"><DetailIcon name="settings" />Cài đặt Rubric riêng</a>
              <span className="ml-auto pb-2 text-[9px] text-gray-500">Dữ liệu đồng bộ dạng minh họa</span>
            </div>
          </section>

          <span className="mt-3 inline-flex rounded-full border border-[#eadcae] bg-[#fff9e9] px-2 py-0.5 text-[8px] font-semibold text-[#81621c]">DỮ LIỆU SINH VIÊN MINH HỌA · KHÔNG ĐỒNG BỘ HỒ SƠ THẬT</span>
          <section aria-label="Thống kê lớp học" className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <SummaryCard title="Quy mô & Định danh" value={String(classInfo.students)} suffix={`/ ${classInfo.capacity} sinh viên`} footer={`${classInfo.voiceprint} mẫu giọng đã xác thực (demo)`} icon="users" />
            <SummaryCard title="Tỷ lệ nộp bài Oral TB" value={classInfo.submission} footer="Đợt khảo thí gần nhất · dữ liệu demo" icon="voice" tone="green" />
            <SummaryCard title="Điểm trung bình AI Oral" value={classInfo.average} suffix="/ 10" footer="Phân phối điểm minh họa" icon="chart" tone="indigo" />
            <SummaryCard title="Hỗ trợ phát âm & Lặp" value="4" suffix="sinh viên (demo)" footer="Cần theo dõi các chỉ số luyện nói" icon="alert" tone="red" />
          </section>

          <section id="student-roster" className="mt-5 rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-gray-500">
                <DetailIcon name="search" />
                <input aria-label="Tìm sinh viên" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo họ tên, MSSV, email sinh viên..." className="w-full bg-transparent text-[11px] outline-none" />
              </label>
              <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-[10px]">
                <span className="sr-only">Sắp xếp điểm AI</span>
                <select aria-label="Sắp xếp điểm AI" value={sortDescending ? 'desc' : 'asc'} onChange={(event) => setSortDescending(event.target.value === 'desc')} className="bg-white outline-none"><option value="desc">Điểm AI: Cao đến thấp</option><option value="asc">Điểm AI: Thấp đến cao</option></select>
              </label>
              <button type="button" onClick={exportRoster} className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-[10px] hover:bg-gray-50"><DetailIcon name="download" />Xuất danh sách</button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
              <span className="mr-1 text-[9px] font-semibold uppercase text-gray-500">Bộ lọc nhanh:</span>
              {filterOptions.map((option) => (
                <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)} className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${filter === option.id ? 'bg-black text-white' : option.id === 'risk' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {option.label}{option.id === 'all' ? ` (${classInfo.students})` : ''}
                </button>
              ))}
            </div>
            {selectedStudents.length > 0 && <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-[10px] text-indigo-900"><span>Đã chọn {selectedStudents.length} sinh viên trong danh sách minh họa.</span><button type="button" onClick={() => setSelectedStudents([])} className="font-semibold underline">Bỏ chọn</button></div>}
            {notice && <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">{notice}</p>}
          </section>

          <section aria-label="Danh sách sinh viên lớp học" className="mt-4 overflow-hidden rounded-2xl border border-[#e1e1e1] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead className="bg-[#f7f7f7] text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="w-10 px-4 py-4"><input aria-label="Chọn tất cả sinh viên đang hiển thị" type="checkbox" checked={selectAllChecked} onChange={toggleVisibleStudents} className="accent-black" /></th>
                    <th className="px-3 py-4">Sinh viên &amp; MSSV</th>
                    <th className="px-3 py-4">Xác thực giọng nói</th>
                    <th className="px-3 py-4">Điểm TB AI Oral</th>
                    <th className="px-3 py-4">Chỉ số âm phổ &amp; lưu loát</th>
                    <th className="px-3 py-4">Trạng thái học</th>
                    <th className="px-3 py-4">Trạng thái gần nhất</th>
                    <th className="px-3 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleStudents.map((student) => (
                    <tr key={student.id} className={student.risk ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-4"><input aria-label={`Chọn ${student.name}`} type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} className="accent-black" /></td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${student.risk ? 'border-red-200 bg-red-100 text-red-700' : 'border-gray-200 bg-gray-100 text-gray-700'}`}>{student.initials}</span><span><b className="block text-[11px]">{student.name}</b><span className="mt-1 block text-[9px] text-gray-500">{student.id} · {student.email}</span></span></div>
                      </td>
                      <td className="px-3 py-4"><span className={`rounded-full border px-2.5 py-1.5 text-[9px] font-semibold ${student.voiceprint === 'Chưa xác thực' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>◉ {student.voiceprint}</span></td>
                      <td className="px-3 py-4"><span className={`text-[15px] font-bold ${student.risk ? 'text-red-700' : 'text-gray-900'}`}>{student.score.toFixed(1)}</span><span className="ml-1 rounded-full bg-gray-100 px-2 py-1 text-[8px] text-gray-600">{student.score >= 9 ? 'Xuất sắc' : student.score >= 8 ? 'Giỏi' : 'Khá'}</span></td>
                      <td className="max-w-[200px] px-3 py-4 text-[9px]"><p>Fluency: <b className={student.risk ? 'text-red-700' : ''}>{student.fluency}%</b><span className="mx-2 text-gray-400">•</span>{student.wordsPerMinute} WPM</p><p className={`mt-1 leading-relaxed ${student.risk ? 'text-red-700' : 'text-gray-500'}`}>{student.note}</p></td>
                      <td className="px-3 py-4"><span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[9px] text-gray-700">● Chưa xác định</span></td>
                      <td className="px-3 py-4"><StudentStatus student={student} /></td>
                      <td className="px-3 py-4"><button type="button" onClick={() => setNotice(`Hồ sơ chi tiết của ${student.name} chưa được kết nối.`)} aria-label={`Xem hồ sơ ${student.name}`} className="rounded-lg px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-100">•••</button></td>
                    </tr>
                  ))}
                  {visibleStudents.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-gray-500">Không tìm thấy sinh viên phù hợp với bộ lọc.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-[9px] text-gray-500">
              <p>Hiển thị {visibleStudents.length ? '1' : '0'} - {visibleStudents.length} trong {classInfo.students} sinh viên · Trang demo hiển thị tối đa 6 hồ sơ</p>
              <div className="flex items-center gap-2"><span>Số hàng:</span><select aria-label="Số sinh viên mỗi trang" className="rounded border border-gray-200 bg-white px-2 py-1"><option>6 / trang</option></select><button type="button" disabled className="rounded border border-gray-200 px-3 py-1 opacity-50">‹ Trước</button><button type="button" aria-current="page" className="rounded bg-black px-3 py-1 font-semibold text-white">1</button><button type="button" disabled className="rounded border border-gray-200 px-3 py-1 opacity-50">Sau ›</button></div>
            </div>
          </section>
          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4 text-[9px] text-gray-500"><span>AIOralCheck Studio v2.4.2 • Dữ liệu sinh viên được minh họa</span><Link href="/teacher/classes" className="font-medium text-indigo-800 hover:underline">← Quay lại danh sách lớp</Link></footer>
        </>
      )}
    </TeacherPageShell>
  );
}
