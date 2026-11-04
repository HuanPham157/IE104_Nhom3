'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface QuestionItem {
  id: number;
  title: string;
  prompt: string;
  recordingCap: number; // 60, 90, 120, or custom
  points: number;
  keywords: string[];
  strictness: 'forgiving' | 'standard' | 'strict';
  rubricText: string;
  isExpanded: boolean;
}

const sampleRubrics = [
  {
    title: 'Kiến trúc Web & Security',
    badge: '3 tiêu chí',
    desc: 'Đánh giá cơ chế cookie, token authentication, XSS mitigation...',
    keywords: ['Cơ chế lưu trữ', 'Lifespan', 'HttpOnly Cookie', 'XSS Prevention'],
    sampleRubric: '1. Tiêu chí So sánh (2.0đ): Nêu rõ Cookie ~4KB vs LocalStorage ~5MB.\n2. XSS Mitigation (1.5đ): Cấu hình cờ HttpOnly, Secure, SameSite=Strict.',
  },
  {
    title: 'React & Virtual DOM Lifecycle',
    badge: '4 tiêu chí',
    desc: 'Fiber reconciler, memoization, batching updates, Diffing heuristic...',
    keywords: ['Virtual DOM', 'Reconciliation', 'Fiber Engine', 'useMemo/useCallback'],
    sampleRubric: '1. Diffing Algorithm (2.0đ): Heuristic O(N) theo element type và keys.\n2. Tối ưu Re-render (1.5đ): Sử dụng React.memo và useCallback đúng cách.',
  },
  {
    title: 'REST API & Microservices',
    badge: '3 tiêu chí',
    desc: 'Idempotency, HTTP status codes, stateless authentication, locks...',
    keywords: ['Idempotency Key', 'Stateless', 'HTTP 409 Conflict', 'Distributed Lock'],
    sampleRubric: '1. Tính chất Idempotent (1.5đ): Phân biệt POST vs PUT/DELETE.\n2. Idempotency Key (1.5đ): Chống duplicate transaction bằng Redis cache header.',
  },
];

export default function TeacherQuestionBuilder() {
  const router = useRouter();

  // Thông tin chung bài tập
  const [assignmentTitle, setAssignmentTitle] = useState(
    'Kiểm tra Vấn đáp Giữa kỳ: Kiến trúc Web Frontend hiện đại'
  );
  const [deadline, setDeadline] = useState('2024-11-25T23:59');
  const [maxRetakes, setMaxRetakes] = useState('3');

  // Danh sách câu hỏi
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 1,
      title: 'So sánh cơ chế lưu trữ trình duyệt & XSS',
      prompt:
        'Hãy phân tích sự khác nhau giữa Cookie, LocalStorage và SessionStorage. Nêu kịch bản tấn công XSS khi lưu trữ token.',
      recordingCap: 90,
      points: 3.5,
      keywords: [
        'Cơ chế lưu trữ',
        'Thời gian sống (Lifespan)',
        'Dung lượng ~4KB vs 5MB',
        'Bảo mật HttpOnly, XSS',
      ],
      strictness: 'standard',
      rubricText: `1. Tiêu chí So sánh (Tối đa 2.0 điểm):
- Nêu rõ Cookie gửi tự động kèm request HTTP, giới hạn ~4KB. Có thể gắn flag HttpOnly, Secure.
- LocalStorage lưu trữ vĩnh viễn cho đến khi bị xóa, dung lượng ~5-10MB, cùng origin.
- SessionStorage tự hủy khi đóng tab trình duyệt, dung lượng ~5MB.

2. Kịch bản XSS Token (Tối đa 1.5 điểm):
- Phân tích rủi ro khi lưu JWT token trong LocalStorage: Hacker tiêm script đọc document.cookie hoặc localStorage.getItem('token').
- Khuyến nghị: Dùng HttpOnly Cookie để ngăn chặn JavaScript truy cập trực tiếp.`,
      isExpanded: true,
    },
    {
      id: 2,
      title: 'Giải thích nguyên lý Virtual DOM trong React và cách tối ưu re-render',
      prompt:
        'Trình bày cơ chế Diffing algorithm và Fiber Reconciler trong React. Nêu các chiến lược tối ưu hoá tránh re-render thừa (useMemo, useCallback, React.memo).',
      recordingCap: 90,
      points: 3.5,
      keywords: ['Virtual DOM', 'Reconciliation', 'Memoization'],
      strictness: 'standard',
      rubricText: `1. Cơ chế Diffing & Virtual DOM (Tối đa 2.0 điểm):
- Trình bày sự khác biệt giữa Real DOM và cây Virtual DOM đại diện trên bộ nhớ RAM.
- Thuật toán so khớp heuristic O(N) dựa trên type và key của phần tử.

2. Tối ưu Re-render (Tối đa 1.5 điểm):
- Giải thích đúng nguyên lý hoạt động của React.memo cho component.
- Phân biệt useMemo lưu trữ giá trị tính toán tốn kém và useCallback giữ nguyên tham chiếu hàm qua các lần render.`,
      isExpanded: false,
    },
  ]);

  // State nhập từ khóa mới tạm thời
  const [newKeywordInput, setNewKeywordInput] = useState<{ [qId: number]: string }>({});
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Tính toán tổng điểm & tổng thời gian
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const totalSeconds = questions.reduce((sum, q) => sum + q.recordingCap, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const isPointValid = Math.abs(totalPoints - 10.0) < 0.01;

  // Toggle thu gọn/mở rộng câu hỏi
  const toggleExpand = (id: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isExpanded: !q.isExpanded } : q))
    );
  };

  // Cập nhật trường trong câu hỏi
  const updateQuestion = (id: number, field: keyof QuestionItem, value: any) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // Thêm từ khóa
  const handleAddKeyword = (qId: number) => {
    const text = newKeywordInput[qId]?.trim();
    if (!text) return;
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId && !q.keywords.includes(text)) {
          return { ...q, keywords: [...q.keywords, text] };
        }
        return q;
      })
    );
    setNewKeywordInput((prev) => ({ ...prev, [qId]: '' }));
  };

  // Xóa từ khóa
  const handleRemoveKeyword = (qId: number, keywordToRemove: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          return { ...q, keywords: q.keywords.filter((kw) => kw !== keywordToRemove) };
        }
        return q;
      })
    );
  };

  // Thêm câu hỏi thứ 3 (tự động điền 3.0 điểm để tròn 10 điểm)
  const handleAddQuestion = () => {
    const remainingTo10 = Math.max(0, Number((10 - totalPoints).toFixed(1)));
    const newId = questions.length + 1;
    const newQ: QuestionItem = {
      id: newId,
      title: `Câu hỏi ${newId}: Thiết kế RESTful API chuẩn và xử lý Idempotency`,
      prompt:
        'Trình bày các phương thức HTTP an toàn (Safe) và bất biến (Idempotent). Giải thích cách thiết kế cơ chế chống trùng lặp giao dịch (Idempotency Key).',
      recordingCap: 60,
      points: remainingTo10 > 0 ? remainingTo10 : 3.0,
      keywords: ['Idempotency Key', 'HTTP Safe Methods', 'Status Codes'],
      strictness: 'standard',
      rubricText: `1. Phân loại HTTP Methods (Tối đa 1.5 điểm):
- GET, HEAD là safe & idempotent. PUT, DELETE là idempotent nhưng không safe. POST không safe và không idempotent.

2. Cơ chế Idempotency Key (Tối đa 1.5 điểm):
- Dùng UUID / Token gắn vào header Idempotency-Key.
- Server kiểm tra cache Redis trước khi xử lý giao dịch tài chính.`,
      isExpanded: true,
    };
    // Thu gọn các câu cũ và mở câu mới
    setQuestions((prev) => [...prev.map((q) => ({ ...q, isExpanded: false })), newQ]);
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = (id: number) => {
    if (questions.length <= 1) {
      alert('Bài kiểm tra cần có ít nhất 1 câu hỏi.');
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Áp dụng mẫu barem từ sidebar gợi ý
  const handleApplySampleRubric = (sample: typeof sampleRubrics[0]) => {
    // Thêm vào câu hỏi đang mở hoặc câu 1
    const targetQ = questions.find((q) => q.isExpanded) || questions[0];
    if (!targetQ) return;
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === targetQ.id) {
          const mergedKeywords = Array.from(new Set([...q.keywords, ...sample.keywords]));
          return {
            ...q,
            title: `${q.title.split(':')[0]}: ${sample.title}`,
            keywords: mergedKeywords,
            rubricText: `${q.rubricText}\n\n[Tham chiếu mẫu ${sample.title}]:\n${sample.sampleRubric}`,
          };
        }
        return q;
      })
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#1e2025] font-sans text-xs antialiased flex flex-col">
      {/* ========================================================= */}
      {/* 1. TOP HEADER (NAV CHÍNH TOÀN CỤC THEO FIGMA)              */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          {/* Logo Brand */}
          <Link href="/teacher" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🎙️
            </span>
            <div>
              <span className="font-extrabold text-sm text-[#111827] tracking-tight block leading-tight">
                OralEval IE104
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Higher Ed Assessment</span>
            </div>
          </Link>

          {/* Sub-nav tabs */}
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-gray-600">
            <Link href="/teacher/classes" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-black transition">
              Cohorts
            </Link>
            <Link href="/teacher" className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold transition">
              Assessments
            </Link>
            <button type="button" onClick={() => alert('Phân hệ Thống kê Analytics đang kết nối dữ liệu.')} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
              Analytics
            </button>
            <button type="button" onClick={() => alert('Kho Barem Rubrics đang đồng bộ.')} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
              Rubrics
            </button>
          </nav>
        </div>

        {/* Right Tools & Avatar */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm mẫu barem..."
              className="pl-7 pr-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-[11px] w-48 focus:w-60 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all"
            />
          </div>

          <button type="button" aria-label="Thông báo" className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
            🔔
          </button>

          <button type="button" aria-label="Trợ giúp" className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
            ❓
          </button>

          <Link
            href="/student"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-[10px] font-semibold transition"
          >
            Switch Role ⇄
          </Link>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <span className="w-8 h-8 rounded-full bg-indigo-700 text-white font-bold text-xs flex items-center justify-center">
              GV
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ========================================================= */}
        {/* 2. LEFT SIDEBAR PHÂN HỆ GIẢNG VIÊN (QUESTION BUILDER)     */}
        {/* ========================================================= */}
        <aside className="w-60 bg-white border-r border-gray-200 p-4 shrink-0 hidden lg:flex flex-col justify-between sticky top-[53px] h-[calc(100vh-53px)]">
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-2.5 px-4 rounded-xl bg-[#4f46e5] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition"
            >
              <span>+</span>
              <span>New Assessment</span>
            </button>

            <nav className="space-y-1 text-[11px] font-medium text-gray-600">
              <Link
                href="/teacher"
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-black transition"
              >
                <span>📊</span> Dashboard
              </Link>

              <Link
                href="/teacher/classes"
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-black transition"
              >
                <span>🎙️</span> Active Exams
              </Link>

              {/* Active Menu: Question Builder */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs">
                <span>📝</span> Question Builder
              </div>

              <Link
                href="/teacher/evaluations/CS102-MID-2024-03"
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-black transition"
              >
                <span>⚖️</span> Evaluation Hub
              </Link>

              <button
                type="button"
                onClick={() => alert('Sổ điểm Gradebook đang kết nối dữ liệu.')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-black transition text-left"
              >
                <span>🎓</span> Gradebook
              </button>

              <button
                type="button"
                onClick={() => alert('Theo dõi định mức API Usage LLM.')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-black transition text-left"
              >
                <span>📈</span> API Usage
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-1 text-[11px] text-gray-500">
            <button type="button" onClick={() => alert('Tài liệu hướng dẫn Module 2.4')} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-black transition text-left">
              <span>📖</span> Documentation
            </button>
            <button type="button" onClick={() => alert('Cài đặt hệ thống chấm')} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-black transition text-left">
              <span>⚙️</span> Settings
            </button>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* 3. MAIN CONTENT: KHU VỰC CẤU HÌNH ĐỀ THI & BAREM          */}
        {/* ========================================================= */}
        <main className="flex-1 p-5 lg:p-7 max-w-7xl mx-auto overflow-y-auto">
          {/* Breadcrumb & Title Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                <Link href="/teacher/classes" className="hover:underline">
                  Lớp IE104.N21
                </Link>
                <span>›</span>
                <span className="text-gray-800 font-semibold">Tạo bài kiểm tra vấn đáp mới</span>
              </div>

              <div className="flex items-center gap-3 mt-1.5">
                <h1 className="text-xl font-black text-[#111827] tracking-tight">
                  Cấu hình Đề thi &amp; Barem LLM
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[9px]">
                  • Module 2.4 - Giảng viên
                </span>
              </div>
            </div>

            {/* Action Buttons Header */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 2000);
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
              >
                <span>💾</span> Lưu nháp
              </button>

              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="px-5 py-2 rounded-xl bg-[#4f46e5] text-white hover:bg-indigo-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <span>🚀</span> Xuất bản bài tập
              </button>
            </div>
          </div>

          {/* Body 2 Columns Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
            {/* CỘT TRÁI: FORM CẤU HÌNH ĐỀ & CÂU HỎI (Chiếm 2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* -------------------------------------------------- */}
              {/* PHẦN 1: THÔNG TIN CHUNG BÀI TẬP                   */}
              {/* -------------------------------------------------- */}
              <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <span>📋</span> Phần 1: Thông tin chung bài tập
                  </h2>
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md font-medium">
                    Bắt buộc thiết lập
                  </span>
                </div>

                {/* Tên bài tập */}
                <div className="space-y-1.5">
                  <label htmlFor="assignment-title" className="block text-[11px] font-bold text-gray-700">
                    Tên bài tập vấn đáp <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="assignment-title"
                    type="text"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition"
                    placeholder="Nhập tên bài tập..."
                  />
                </div>

                {/* Grid 2 cột: Hạn nộp & Số lần ghi âm lại */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="assignment-deadline" className="block text-[11px] font-bold text-gray-700">
                      Hạn nộp (Deadline) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="assignment-deadline"
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-medium focus:border-indigo-500 focus:outline-none bg-white"
                      />
                    </div>
                    <p className="text-[9px] text-gray-500">
                      Hệ thống sẽ khóa cổng nộp tự động khi hết hạn.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="max-retakes-select" className="block text-[11px] font-bold text-gray-700">
                      Số lần sinh viên được ghi âm lại (Max retakes)
                    </label>
                    <select
                      id="max-retakes-select"
                      value={maxRetakes}
                      onChange={(e) => setMaxRetakes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:border-indigo-500 focus:outline-none bg-white"
                    >
                      <option value="1">1 lần (Chỉ thi 1 lần - Khắt khe)</option>
                      <option value="2">2 lần (Cho phép thu âm lại 1 lần)</option>
                      <option value="3">3 lần (Khuyến dùng cho thi giữa kỳ)</option>
                      <option value="5">5 lần (Dành cho bài luyện tập tự do)</option>
                      <option value="unlimited">Không giới hạn</option>
                    </select>
                    <p className="text-[9px] text-gray-500">
                      Giúp giảm áp lực thi cử và sự cố thiết bị mic.
                    </p>
                  </div>
                </div>
              </section>

              {/* -------------------------------------------------- */}
              {/* PHẦN 2: DANH SÁCH CÂU HỎI VẤN ĐÁP (QUESTION ITEMS) */}
              {/* -------------------------------------------------- */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <span>📑</span> Phần 2: Danh sách câu hỏi vấn đáp (Question Items)
                  </h2>
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                    isPointValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    Tổng điểm hiện tại: {totalPoints.toFixed(1)} / 10.0
                  </span>
                </div>

                {/* Danh sách các thẻ câu hỏi */}
                {questions.map((question, index) => (
                  <article
                    key={question.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 ${
                      question.isExpanded
                        ? 'border-indigo-300 shadow-md ring-2 ring-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 shadow-2xs'
                    }`}
                  >
                    {/* Header Thẻ Câu Hỏi */}
                    <div className="p-4 sm:p-5 flex items-center justify-between border-b border-gray-100 bg-[#fdfdfd] rounded-t-2xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-indigo-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-[#111827] truncate">
                            Câu hỏi {index + 1}: {question.title}
                          </h3>
                          {!question.isExpanded && (
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium mt-0.5">
                              <span>⏱️ {question.recordingCap}s</span>
                              <span>•</span>
                              <span>⭐ {question.points} điểm</span>
                              <span>•</span>
                              <span>🏷️ {question.keywords.length} từ khóa AI</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {question.isExpanded ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold">
                            Đang chỉnh sửa
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(question.id)}
                          aria-label="Xóa câu hỏi"
                          className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition"
                          title="Xóa câu hỏi"
                        >
                          🗑️
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(question.id)}
                          className="w-7 h-7 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 flex items-center justify-center transition font-bold"
                          title={question.isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                          {question.isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Nội dung chi tiết câu hỏi khi mở rộng */}
                    {question.isExpanded && (
                      <div className="p-5 space-y-5">
                        {/* Prompt Câu hỏi */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor={`question-prompt-${question.id}`} className="block text-[11px] font-bold text-gray-700">
                              Nội dung câu hỏi vấn đáp (Sinh viên sẽ nghe &amp; đọc) <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {question.prompt.length} ký tự
                            </span>
                          </div>
                          <textarea
                            id={`question-prompt-${question.id}`}
                            rows={3}
                            value={question.prompt}
                            onChange={(e) => updateQuestion(question.id, 'prompt', e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition leading-relaxed"
                            placeholder="Nhập nội dung đề bài vấn đáp..."
                          />
                        </div>

                        {/* Cài đặt Thời gian & Trọng số điểm */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                          {/* Thời gian nói tối đa */}
                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-gray-700">
                              Thời gian nói tối đa (Recording Cap)
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[60, 90, 120].map((cap) => (
                                <button
                                  key={cap}
                                  type="button"
                                  onClick={() => updateQuestion(question.id, 'recordingCap', cap)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    question.recordingCap === cap
                                      ? 'bg-black text-white shadow-xs'
                                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {cap} giây
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const custom = prompt('Nhập thời gian giới hạn (giây):', '150');
                                  if (custom && !isNaN(Number(custom))) {
                                    updateQuestion(question.id, 'recordingCap', Number(custom));
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                              >
                                Tùy chỉnh giây
                              </button>
                            </div>
                          </div>

                          {/* Trọng số điểm */}
                          <div className="space-y-2">
                            <label htmlFor={`question-points-${question.id}`} className="block text-[11px] font-bold text-gray-700">
                              Trọng số điểm
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                id={`question-points-${question.id}`}
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="10"
                                value={question.points}
                                onChange={(e) => updateQuestion(question.id, 'points', Number(e.target.value))}
                                className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs focus:border-indigo-500 focus:outline-none"
                              />
                              <span className="text-xs font-bold text-gray-700">/ 10 điểm</span>
                              <span className="text-[10px] text-indigo-700 font-semibold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                                {((question.points / 10) * 100).toFixed(0)}% tổng bài
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ---------------------------------------------------- */}
                        {/* HỘP CẤU HÌNH BAREM CHUẨN & TỪ KHÓA CHO AI LLM       */}
                        {/* ---------------------------------------------------- */}
                        <div className="rounded-xl border border-indigo-100 bg-[#f9faff] p-4 sm:p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-indigo-100/60 pb-2.5">
                            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                              <span className="text-indigo-600">✨</span>
                              Cấu hình Barem chuẩn &amp; Từ khóa cho AI LLM
                            </div>
                            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Mô hình OralLLM-IE104 Sẵn sàng
                            </span>
                          </div>

                          {/* 1. Từ khóa bắt buộc xuất hiện */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                              Từ khóa / Khái niệm cốt lõi bắt buộc phải xuất hiện (Speech Entity Extraction):
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              {question.keywords.map((kw) => (
                                <span
                                  key={kw}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-indigo-200 text-[11px] font-semibold text-indigo-900 shadow-2xs"
                                >
                                  <span>🏷️ {kw}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKeyword(question.id, kw)}
                                    className="text-gray-400 hover:text-red-600 transition"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}

                              {/* Ô nhập thêm tag */}
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="+ Thêm từ khóa..."
                                  value={newKeywordInput[question.id] || ''}
                                  onChange={(e) =>
                                    setNewKeywordInput((prev) => ({
                                      ...prev,
                                      [question.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddKeyword(question.id);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-dashed border-gray-300 bg-white text-[10px] focus:border-indigo-500 focus:outline-none w-32"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddKeyword(question.id)}
                                  className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[10px] hover:bg-indigo-200 transition"
                                >
                                  + Thêm
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 2. Mức độ khắt khe của AI */}
                          <div className="space-y-2 pt-2 border-t border-indigo-100/50">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                                Mức độ khắt khe của AI (AI Strictness &amp; Semantic Tolerance):
                              </label>
                              <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 capitalize">
                                {question.strictness === 'forgiving'
                                  ? 'Linh hoạt (Forgiving)'
                                  : question.strictness === 'strict'
                                  ? 'Nghiêm ngặt (Strict)'
                                  : 'Bình thường (Standard)'}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { key: 'forgiving', label: 'Linh hoạt (Forgiving)', desc: 'Chấp nhận nói vấp / đồng nghĩa rộng' },
                                { key: 'standard', label: 'Bình thường (Standard)', desc: 'Chuẩn mực đào tạo đại học' },
                                { key: 'strict', label: 'Nghiêm ngặt (Strict)', desc: 'Khắt khe thuật ngữ kỹ thuật' },
                              ].map((mode) => (
                                <button
                                  key={mode.key}
                                  type="button"
                                  onClick={() => updateQuestion(question.id, 'strictness', mode.key)}
                                  className={`p-2.5 rounded-xl border text-left transition ${
                                    question.strictness === mode.key
                                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-100 shadow-xs'
                                      : 'bg-white/60 border-gray-200 hover:bg-white text-gray-600'
                                  }`}
                                >
                                  <span className="block font-bold text-[11px] text-[#111827]">
                                    {mode.label}
                                  </span>
                                  <span className="block text-[9px] text-gray-500 mt-0.5">
                                    {mode.desc}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 3. Chi tiết Barem & Hướng dẫn chấm cho LLM */}
                          <div className="space-y-1.5 pt-2 border-t border-indigo-100/50">
                            <div className="flex items-center justify-between">
                              <label htmlFor={`rubric-text-${question.id}`} className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                                Chi tiết Barem &amp; Hướng dẫn chấm cho LLM (Master Ground-truth Rubric):
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  alert('Cấu trúc gợi ý:\n1. Tiêu chí A (Số điểm)\n- Yêu cầu kiến thức\n2. Tiêu chí B (Số điểm)\n- Yêu cầu phản xạ');
                                }}
                                className="text-[9px] text-indigo-700 font-semibold hover:underline"
                              >
                                Xem cấu trúc mẫu ↗
                              </button>
                            </div>

                            <textarea
                              id={`rubric-text-${question.id}`}
                              rows={7}
                              value={question.rubricText}
                              onChange={(e) => updateQuestion(question.id, 'rubricText', e.target.value)}
                              className="w-full p-3 rounded-xl border border-gray-200 bg-white font-mono text-[11px] leading-relaxed focus:border-indigo-500 focus:outline-none"
                              placeholder="Nhập rubric chi tiết theo từng ý để mô hình Dual-LLM trích xuất và chấm điểm..."
                            />
                            <p className="text-[9px] text-gray-400 italic">
                              * AI sẽ phân tích giọng nói từ audio transcript, tự động trích xuất các ý theo barem trên và gán điểm đề xuất cho giảng viên duyệt.
                            </p>
                          </div>
                        </div>

                        {/* Footer Thẻ Câu Hỏi */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => toggleExpand(question.id)}
                            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 font-bold text-[11px] transition"
                          >
                            Thu gọn câu hỏi
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleExpand(question.id);
                              setShowToast(true);
                              setTimeout(() => setShowToast(false), 2000);
                            }}
                            className="px-5 py-2 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-[11px] shadow-sm transition"
                          >
                            Lưu thay đổi câu hỏi {question.id}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}

                {/* NÚT THÊM CÂU HỎI MỚI */}
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-indigo-400 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-2xs"
                >
                  <span className="text-indigo-600 font-extrabold text-sm">⊞</span>
                  <span>Thêm câu hỏi vấn đáp mới</span>
                </button>
              </section>
            </div>

            {/* CỘT PHẢI: PHÂN BỔ TRỌNG SỐ & GỢI Ý BAREM (Chiếm 1/3) */}
            <aside className="space-y-5 sticky top-[75px]">
              {/* 1. THẺ PHÂN BỔ TRỌNG SỐ BÀI THI */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-xs text-[#111827] flex items-center gap-2 border-b border-gray-100 pb-3">
                  <span>⚖️</span> Phân bổ trọng số bài thi
                </h3>

                <div className="space-y-2.5 text-[11px]">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Số lượng câu hỏi:</span>
                    <strong className="text-gray-900">{questions.length} câu</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Tổng thời gian thi dự kiến:</span>
                    <strong className="text-gray-900 font-mono">
                      {totalMinutes} phút {String(remainingSeconds).padStart(2, '0')} giây
                    </strong>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 font-bold">
                    <span>Tổng điểm đã cấu hình:</span>
                    <span className={`text-sm font-mono ${isPointValid ? 'text-emerald-700' : 'text-indigo-700'}`}>
                      {totalPoints.toFixed(1)} / 10.0 điểm
                    </span>
                  </div>

                  {/* Thanh Progress điểm */}
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isPointValid ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, (totalPoints / 10) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Hộp cảnh báo thông minh */}
                {!isPointValid ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 leading-relaxed flex items-start gap-2">
                    <span className="text-amber-600 text-sm">⚠️</span>
                    <div>
                      <strong>Còn lại {(10 - totalPoints).toFixed(1)} điểm chưa gán.</strong> Hãy thêm câu hỏi thứ 3 hoặc điều chỉnh lại các câu hỏi hiện tại để tròn 10 điểm.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 leading-relaxed flex items-start gap-2">
                    <span className="text-emerald-600 text-sm">✅</span>
                    <div>
                      <strong>Đã chuẩn hóa 10.0 / 10.0 điểm!</strong> Bài thi đã sẵn sàng xuất bản cho sinh viên.
                    </div>
                  </div>
                )}
              </div>

              {/* 2. THẺ MẪU BAREM CHUẨN GỢI Ý (KHOA HTTT) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className="font-bold text-xs text-[#111827] flex items-center gap-2">
                    <span>📑</span> Mẫu Barem Chuẩn gợi ý
                  </h3>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    Khoa HTTT
                  </span>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Áp dụng nhanh các barem mẫu đã được hội đồng chuyên môn IE104 phê duyệt:
                </p>

                <div className="space-y-2">
                  {sampleRubrics.map((sample) => (
                    <div
                      key={sample.title}
                      className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-indigo-400 transition-all cursor-pointer group"
                      onClick={() => handleApplySampleRubric(sample)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[11px] text-gray-900 group-hover:text-indigo-700 transition">
                          {sample.title}
                        </h4>
                        <span className="text-[9px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.2 rounded font-mono">
                          {sample.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                        {sample.desc}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => alert('Đang mở thư viện 120 mẫu Barem chuẩn IE104...')}
                  className="w-full text-center text-[10px] font-bold text-indigo-700 hover:underline pt-1 block"
                >
                  Xem toàn bộ kho barem IE104 →
                </button>
              </div>

              {/* 3. CƠ CHẾ CHẤM ĐIỂM TỰ ĐỘNG (ORALEVAL AI) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-xs text-[#111827] flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <span>🛡️</span> Cơ chế chấm điểm tự động (OralEval AI)
                </h3>

                <ul className="space-y-2 text-[10px] text-gray-600 leading-relaxed list-disc pl-3">
                  <li>
                    Sinh viên phát âm tiếng Việt kết hợp thuật ngữ Anh chuyên ngành sẽ được nhận diện tự nhiên (Bilingual Recognition).
                  </li>
                  <li>
                    Điểm số do AI đề xuất chỉ có hiệu lực khi Giảng viên phụ trách xác nhận ở Evaluation Hub.
                  </li>
                  <li>
                    Hệ thống lưu trữ bản ghi âm tối đa 1 năm phục vụ thanh tra đào tạo.
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* POPUP THÀNH CÔNG KHI XUẤT BẢN BÀI TẬP */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-xs">
              🎉
            </div>
            <h3 className="text-lg font-black text-[#111827]">
              Xuất bản bài tập thành công!
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Bài tập <strong>&quot;{assignmentTitle}&quot;</strong> đã được kích hoạt cho lớp <strong>IE104.N21</strong>. Sinh viên có thể bắt đầu thi từ bây giờ cho đến hạn nộp.
            </p>
            <div className="p-3 bg-gray-50 rounded-xl text-[11px] font-mono text-gray-700 flex justify-around">
              <span>{questions.length} câu hỏi</span>
              <span>•</span>
              <span>Tổng: {totalPoints.toFixed(1)} điểm</span>
              <span>•</span>
              <span>Max: {maxRetakes} lần thu</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/teacher')}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 font-bold text-xs"
              >
                Về Dashboard
              </button>
              <button
                type="button"
                onClick={() => router.push('/tasks')}
                className="flex-1 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-xs"
              >
                Xem phía Sinh viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO NHANH */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span>✅</span> Đã lưu thành công thay đổi cấu hình!
        </div>
      )}
    </div>
  );
}
