'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import StudentPageShell from '@/components/StudentPageShell';

const courses = [
  { code: 'IT4409', title: 'Kiến trúc Phần mềm', faculty: 'Khoa Công nghệ Thông tin', instructor: 'TS. Nguyễn Văn A', enrolled: 48, capacity: 50, room: 'AIO-8892' },
  { code: 'CS102', title: 'Lập trình Hướng đối tượng C++', faculty: 'Khoa Khoa học Máy tính', instructor: 'ThS. Lê Hoàng C', enrolled: 53, capacity: 60, room: 'AIO-3419' },
  { code: 'FL2110', title: 'Tiếng Anh Chuyên ngành IT', faculty: 'Khoa Ngoại ngữ Chuyên nghiệp', instructor: 'ThS. Đỗ Phương Thảo', enrolled: 42, capacity: 45, room: 'AIO-7721' },
  { code: 'IT3080', title: 'Hệ điều hành & Mạng máy tính', faculty: 'Khoa Kỹ thuật Máy tính', instructor: 'PGS.TS. Trần Quốc V', enrolled: 45, capacity: 45, room: 'AIO-5510' },
];

const assignments: {
  course: string;
  title: string;
  due: string;
  duration: string;
  status: string;
  tone: 'red' | 'gray' | 'purple' | 'green';
  action: string;
}[] = [
  { course: 'CS102', title: 'Bài tập Oral 2 - Cấu trúc Heap & QuickSort', due: 'Hôm nay 23:59', duration: 'Tối đa: 120s', status: 'Đang mở · Cần nộp', tone: 'red', action: 'Thu âm ngay' },
  { course: 'CS102', title: 'Vấn đáp OOP: Singleton & Factory Pattern', due: '28/05 23:59', duration: 'Tối đa: 180s', status: 'Còn 2 ngày', tone: 'gray', action: 'Thu âm ngay' },
  { course: 'IT4409', title: 'Phân tích Microservices Architecture', due: 'Đã nộp: 24/05', duration: '105s / 120s', status: 'Đã nộp · Chờ chấm', tone: 'purple', action: 'Nghe lại' },
  { course: 'FL2110', title: 'English Tech Pitch: Cloud Distributed Storage', due: 'Hoàn thành: 20/05', duration: 'Thời lượng: 90s', status: 'Đã chấm · 9.2/10', tone: 'green', action: 'Xem kết quả' },
];

const assignmentTone = {
  red: 'border-red-200 bg-red-50 text-red-700',
  gray: 'border-gray-200 bg-gray-100 text-gray-700',
  purple: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

function ClassIcon({ name }: { name: 'book' | 'key' | 'person' | 'calendar' }) {
  const paths = {
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z',
    key: 'M21 2l-2 2m-7.5 7.5a5 5 0 1 1-7.07 7.07 5 5 0 0 1 7.07-7.07z M14.5 9.5 21 3m-3 3 2 2',
    person: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
  };
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

export default function StudentClasses() {
  const [search, setSearch] = useState('');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinNotice, setJoinNotice] = useState('');
  const visibleCourses = useMemo(() => courses.filter((course) =>
    `${course.code} ${course.title} ${course.faculty} ${course.instructor}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  ), [search]);

  function handleJoinClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinNotice('Bản xem trước chưa kết nối hệ thống ghi danh; mã lớp chưa được gửi hoặc lưu.');
  }

  return (
    <StudentPageShell currentPage="classes" breadcrumb="Lớp học của tôi">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-[24px] font-bold leading-tight sm:text-[28px]">Lớp học của tôi &amp; Kế hoạch học tập</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-gray-600">Quản lý 4 lớp học phần đang tham gia, tiến độ nộp bài vấn đáp oral và lịch nhắc hạn nộp theo thời gian thực.</p>
          <span className="mt-2 inline-flex rounded-full border border-[#eadcae] bg-[#fff9e9] px-2 py-0.5 text-[8px] font-semibold text-[#81621c]">DỮ LIỆU LỚP HỌC MINH HỌA</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Học kỳ" className="h-10 rounded-full border border-gray-300 bg-white px-3 text-[11px]">
            <option>Học kỳ: HK II (2024 - 2025)</option>
          </select>
          <button type="button" onClick={() => { setJoinDialogOpen(true); setJoinNotice(''); }} className="flex h-10 items-center gap-2 rounded-full bg-[#111] px-4 text-[11px] font-semibold text-white hover:bg-gray-800">
            <span aria-hidden="true" className="text-base leading-none">+</span> Tham gia lớp bằng mã
          </button>
        </div>
      </section>

      <div className="mt-5 grid items-start gap-5 min-[1180px]:grid-cols-[minmax(0,1.8fr)_minmax(290px,0.82fr)]">
        <div className="min-w-0">
          <section aria-labelledby="student-courses-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="student-courses-heading" className="flex items-center gap-2 text-[17px] font-bold"><ClassIcon name="book" />Các lớp mình học ({visibleCourses.length} học phần)</h2>
              <span className="text-[10px] text-gray-500"><span className="mr-1 text-emerald-700">●</span>Đồng bộ dữ liệu tín chỉ Cổng Đào Tạo</span>
            </div>
            <label className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-gray-500">
              <span aria-hidden="true">⌕</span>
              <input aria-label="Tìm lớp học" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã lớp, tên môn học hoặc giảng viên..." className="w-full bg-transparent text-xs outline-none" />
            </label>
            {visibleCourses.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleCourses.map((course) => (
                  <article key={course.code} className="rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[9px] font-semibold">{course.code}</span>
                      <span className="flex items-center gap-1 text-[9px] text-gray-500"><ClassIcon name="key" />Mã: {course.room}</span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-bold leading-snug">{course.title}</h3>
                    <p className="mt-1 text-[11px] text-gray-600">{course.faculty}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-600">
                      <span className="flex items-center gap-1"><ClassIcon name="person" />{course.instructor}</span>
                      <span>{course.enrolled}/{course.capacity} sinh viên</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
                      <Link href="/tasks" className="text-[10px] text-gray-500 hover:text-gray-900">Xem bài tập →</Link>
                      <Link href="/tasks" className="rounded-full bg-[#111] px-4 py-2 text-[10px] font-medium text-white hover:bg-gray-800">Vào lớp học</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">Không tìm thấy lớp học phù hợp.</p>
            )}
          </section>

          <section aria-labelledby="student-assignments-heading" className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="student-assignments-heading" className="text-[17px] font-bold">Bảng danh sách các bài tập oral</h2>
              <Link href="/tasks" className="text-[10px] font-medium text-indigo-800 hover:underline">Tất cả bài tập →</Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#e1e1e1] bg-white shadow-sm">
              <div className="hidden grid-cols-[minmax(0,1.7fr)_minmax(115px,0.85fr)_minmax(110px,0.8fr)_minmax(90px,0.55fr)] gap-3 bg-[#f1f1f1] px-5 py-4 text-[9px] font-bold uppercase text-gray-600 md:grid">
                <span>Tên bài tập &amp; môn học</span><span>Hạn nộp &amp; thời lượng</span><span>Trạng thái</span><span>Thao tác</span>
              </div>
              {assignments.map((assignment) => (
                <article key={assignment.title} className="grid gap-3 border-t border-gray-200 px-4 py-4 first:border-t-0 sm:px-5 md:grid-cols-[minmax(0,1.7fr)_minmax(115px,0.85fr)_minmax(110px,0.8fr)_minmax(90px,0.55fr)] md:items-center">
                  <div className="min-w-0">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[9px] font-semibold">{assignment.course}</span>
                    <h3 className="mt-1 text-[12px] font-semibold leading-snug">{assignment.title}</h3>
                    {assignment.tone === 'red' && <p className="mt-1 text-[10px] text-red-600">Hết hạn trong 8 giờ 15 phút</p>}
                  </div>
                  <div className="text-[10px] leading-5 text-gray-600"><p>{assignment.due}</p><p>{assignment.duration}</p></div>
                  <span className={`w-fit rounded-full border px-3 py-1.5 text-[9px] font-semibold ${assignmentTone[assignment.tone]}`}>{assignment.status}</span>
                  <Link href={assignment.tone === 'red' || assignment.tone === 'gray' ? '/student/recorder' : '/tasks'} className="w-fit rounded-full border border-gray-200 px-3 py-2 text-[10px] font-medium hover:bg-gray-50">{assignment.action}</Link>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="flex items-center gap-2 text-[15px] font-bold"><ClassIcon name="calendar" />Deadline</h2>
              <span className="text-[11px] font-semibold">Tháng 5/2025 <span className="ml-1 text-gray-400">‹ ›</span></span>
            </div>
            <div aria-label="Lịch tháng 5 năm 2025" className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[10px]">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day} className="py-2 text-gray-500">{day}</span>)}
              {Array.from({ length: 35 }, (_, index) => {
                const day = index - 2;
                const inMonth = day >= 1 && day <= 31;
                return <span key={index} className={`flex h-8 items-center justify-center ${!inMonth ? 'text-gray-300' : day === 26 ? 'mx-auto h-7 w-7 rounded-full bg-[#111] font-semibold text-white' : day === 20 || day === 24 || day === 28 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{inMonth ? day : day < 1 ? 28 + day : day - 31}</span>;
              })}
            </div>
            <div className="mt-3 rounded-xl border border-red-100 bg-[#fff5f5] p-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-red-700">◷ Deadline gần nhất · Hôm nay</p>
              <h3 className="mt-2 text-[12px] font-bold">Bài tập Oral 2 - Cấu trúc Heap &amp; QuickSort</h3>
              <div className="mt-2 flex justify-between gap-2 border-t border-red-100 pt-2 text-[10px]"><span className="text-gray-600">Đếm ngược đóng cổng:</span><b className="text-red-700">Còn 08 giờ 15 phút</b></div>
            </div>
            <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-600">Timeline sắp tới</h3>
            <div className="mt-3 space-y-3">
              <div className="border-l-2 border-red-500 pl-3"><p className="text-[10px] font-semibold text-red-700">Hôm nay 23:59 · CS102</p><p className="mt-1 text-[11px] font-semibold">Bài tập Oral 2 - Cấu trúc Heap &amp; QuickSort</p><p className="mt-1 text-[10px] text-gray-500">Thu âm phần tích độ phức tạp thuật toán (90s)</p></div>
              <div className="border-l-2 border-indigo-400 pl-3"><p className="text-[10px] font-semibold text-gray-700">2 ngày nữa (28/05) · CS102</p><p className="mt-1 text-[11px] font-semibold">Vấn đáp OOP: Singleton &amp; Factory Pattern</p><p className="mt-1 text-[10px] text-gray-500">Hỏi ngẫu nhiên 3 câu hỏi mẫu thiết kế hướng đối tượng</p></div>
              <div className="border-l-2 border-emerald-400 pl-3"><p className="text-[10px] font-semibold text-gray-500">Tuần tới (03/06) · FL2110</p><p className="mt-1 text-[11px] font-semibold">Oral Presentation Tiếng Anh IT</p><p className="mt-1 text-[10px] text-gray-500">Thuyết trình đề tài Cloud Migration Strategy (3 phút)</p></div>
            </div>
          </section>
          <section className="rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm">
            <h2 className="text-[12px] font-bold">Mẹo thi vấn đáp AI đạt điểm cao</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">Nói với tốc độ đều đặn 130 - 150 từ/phút. Tránh ngắt quãng đột ngột để mô hình Acoustic AI nhận diện tối ưu độ lưu loát (Fluency score).</p>
          </section>
        </aside>
      </div>

      {joinDialogOpen && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setJoinDialogOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="join-class-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-800">LỚP HỌC</span><h2 id="join-class-title" className="mt-2 text-lg font-bold">Tham gia lớp bằng mã</h2></div>
              <button type="button" onClick={() => setJoinDialogOpen(false)} aria-label="Đóng" className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100">✕</button>
            </div>
            <form onSubmit={handleJoinClass} className="mt-4">
              <label htmlFor="class-code" className="text-xs font-medium">Mã lớp học</label>
              <input id="class-code" required minLength={4} maxLength={16} value={classCode} onChange={(event) => setClassCode(event.target.value)} placeholder="Ví dụ: AIO-1234" className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-indigo-500" />
              <p className="mt-2 text-[11px] text-gray-500">Đây là bản xem trước. Mã lớp sẽ không được gửi hoặc lưu.</p>
              {joinNotice && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{joinNotice}</p>}
              <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setJoinDialogOpen(false)} className="rounded-full border border-gray-300 px-4 py-2 text-xs">Đóng</button><button type="submit" className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">Kiểm tra mã</button></div>
            </form>
          </section>
        </div>
      )}
    </StudentPageShell>
  );
}
