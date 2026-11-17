'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { oralcheckFetch } from '@/lib/oralcheck-client';

type Assessment = 'correct' | 'partial' | 'incorrect' | 'missing';

interface ClassStats {
  overview: {
    student_count: number;
    assignment_count: number;
    submitted_count: number;
    submission_rate: number | null;
    average_score10: number | null;
    pending_review: number;
    thin_answer_count: number;
    at_risk_count: number;
  };
  distribution: Array<{ from: number; to: number; count: number }>;
  assessment_counts: Record<Assessment, number>;
  assignments: Array<{
    id: string; title: string; status: string; ends_at: string | null; overdue: boolean; results_published: boolean;
    submitted_count: number; submission_rate: number; average_score10: number | null;
    pending_review: number; ungraded: number; teacher_ai_delta: number | null; reviewed_answers: number;
  }>;
  hardest_questions: Array<{ id: string; assignment_id: string; assignment_title: string; position: number; content: string; graded_count: number; average_ratio: number | null }>;
  students: Array<{ id: string; full_name: string; student_code: string | null; submitted_count: number; missed_count: number; average_score10: number | null; thin_answers: number; at_risk: boolean }>;
  thin_answers: Array<{ answer_id: string; assignment_id: string | null; student_name: string; question_position: number | null; word_count: number; coverage: number | null; warnings: string[] }>;
}

// Màu biểu đồ: một chuỗi dùng series-1; phân loại rubric dùng màu trạng thái, luôn kèm nhãn chữ.
const SERIES_1 = '#2a78d6';
const ASSESSMENTS: Array<{ key: Assessment; label: string; color: string }> = [
  { key: 'correct', label: 'Đúng', color: '#0f8a4b' },
  { key: 'partial', label: 'Đúng một phần', color: '#e0a000' },
  { key: 'incorrect', label: 'Sai', color: '#d83b3b' },
  { key: 'missing', label: 'Còn thiếu', color: '#9a9893' },
];

const percent = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}%`;
const score = (value: number | null) => value === null ? '—' : value.toFixed(2);

function StatTile({ label, value, hint, tone = 'default' }: { label: string; value: string | number; hint?: string; tone?: 'default' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === 'warn' ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Biểu đồ cột phân bố điểm (một chuỗi), có tooltip theo cột và nhãn số trên đỉnh cột. */
function DistributionChart({ bins }: { bins: ClassStats['distribution'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((bin) => bin.count));
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (total === 0) return <p className="text-xs text-gray-500">Chưa có lượt làm nào được chấm.</p>;
  return (
    <div>
      <div className="relative flex h-44 items-end gap-3 border-b border-gray-200 px-1" role="img" aria-label={`Phân bố điểm: ${bins.map((bin) => `${bin.from}–${bin.to}: ${bin.count}`).join(', ')}`}>
        {bins.map((bin, index) => (
          <div key={bin.from} className="relative flex h-full flex-1 flex-col items-center justify-end" onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
            {hover === index && (
              <div className="pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-800 shadow">
                Điểm {bin.from}–{bin.to}{bin.to === 10 ? '' : ' (không gồm ' + bin.to + ')'}: <strong>{bin.count}</strong> lượt ({Math.round((bin.count / total) * 100)}%)
              </div>
            )}
            {bin.count > 0 && <span className="mb-1 text-[11px] font-semibold tabular-nums text-gray-700">{bin.count}</span>}
            <div className="w-full max-w-14 rounded-t" style={{ height: `${(bin.count / max) * 85}%`, minHeight: bin.count ? 4 : 0, background: SERIES_1, opacity: hover === null || hover === index ? 1 : 0.55 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-3 px-1 text-[11px] text-gray-500">
        {bins.map((bin) => <span key={bin.from} className="flex-1 text-center tabular-nums">{bin.from}–{bin.to}</span>)}
      </div>
    </div>
  );
}

/** Thanh xếp chồng tỉ lệ đánh giá theo tiêu chí rubric, có legend + số liệu (không chỉ dựa vào màu). */
function AssessmentBar({ counts }: { counts: Record<Assessment, number> }) {
  const total = ASSESSMENTS.reduce((sum, item) => sum + counts[item.key], 0);
  if (total === 0) return <p className="text-xs text-gray-500">AI chưa chấm tiêu chí rubric nào.</p>;
  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full bg-white" role="img" aria-label={ASSESSMENTS.map((item) => `${item.label}: ${counts[item.key]}`).join(', ')}>
        {ASSESSMENTS.filter((item) => counts[item.key] > 0).map((item) => (
          <div key={item.key} title={`${item.label}: ${counts[item.key]} (${Math.round((counts[item.key] / total) * 100)}%)`} style={{ width: `${(counts[item.key] / total) * 100}%`, background: item.color }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {ASSESSMENTS.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} aria-hidden />
            <span>{item.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-gray-900">{counts[item.key]} · {Math.round((counts[item.key] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Thanh ngang đơn cho tỉ lệ (0..1), giá trị in bằng chữ bên cạnh. */
function RatioBar({ value }: { value: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
        {value !== null && <div className="h-full rounded-full" style={{ width: `${Math.min(100, value * 100)}%`, background: SERIES_1 }} />}
      </div>
      <span className="w-10 text-right tabular-nums text-gray-700">{percent(value)}</span>
    </div>
  );
}

export default function TeacherClassStats({ classId }: { classId: string }) {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: ClassStats }>(`/api/classes/${classId}/stats`)
      .then((result) => { if (active) setStats(result.data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải thống kê lớp.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId]);

  if (loading) return <p className="text-sm text-gray-500">Đang tổng hợp thống kê lớp…</p>;
  if (error) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!stats) return null;

  const { overview } = stats;
  const students = onlyAtRisk ? stats.students.filter((student) => student.at_risk) : stats.students;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sinh viên" value={overview.student_count} hint={`${overview.assignment_count} bài tập đã công bố`} />
        <StatTile label="Tỉ lệ nộp bài" value={percent(overview.submission_rate)} hint={`${overview.submitted_count} lượt đã nộp`} />
        <StatTile label="Điểm trung bình (thang 10)" value={score(overview.average_score10)} hint="Ưu tiên điểm GV, chưa duyệt dùng điểm AI" />
        <StatTile label="Chờ giảng viên duyệt" value={overview.pending_review} hint={`${overview.thin_answer_count} câu trả lời thiếu nội dung`} tone={overview.pending_review ? 'warn' : 'default'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Phân bố điểm" subtitle="Số lượt làm bài theo khoảng điểm (thang 10)">
          <DistributionChart bins={stats.distribution} />
        </Card>
        <Card title="Mức độ hiểu theo tiêu chí rubric" subtitle="Tổng hợp đánh giá của AI trên mọi tiêu chí đã chấm">
          <AssessmentBar counts={stats.assessment_counts} />
        </Card>
      </div>

      <Card title="Theo bài tập" subtitle="Δ GV−AI: chênh lệch trung bình giữa điểm giảng viên và điểm AI trên các câu đã duyệt">
        {stats.assignments.length === 0 ? <p className="text-xs text-gray-500">Chưa có bài tập nào được công bố.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead><tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-3 font-semibold">Bài tập</th>
                <th className="py-2 pr-3 font-semibold">Đã nộp</th>
                <th className="py-2 pr-3 text-right font-semibold">Điểm TB</th>
                <th className="py-2 pr-3 text-right font-semibold">Chờ duyệt</th>
                <th className="py-2 pr-3 text-right font-semibold">Δ GV−AI</th>
                <th className="py-2 font-semibold" />
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {stats.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-gray-900">{assignment.title}</p>
                      <p className="text-[11px] text-gray-500">{assignment.ends_at ? `Hạn ${new Date(assignment.ends_at).toLocaleDateString('vi-VN')}${assignment.overdue ? ' · đã quá hạn' : ''}` : 'Không hạn nộp'}{assignment.results_published ? ' · đã công bố điểm' : ''}</p>
                    </td>
                    <td className="py-2.5 pr-3"><RatioBar value={assignment.submission_rate} /><p className="text-[11px] text-gray-500">{assignment.submitted_count}/{overview.student_count} SV</p></td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{score(assignment.average_score10)}</td>
                    <td className={`py-2.5 pr-3 text-right tabular-nums ${assignment.pending_review ? 'font-semibold text-amber-700' : 'text-gray-600'}`}>{assignment.pending_review}{assignment.ungraded ? <span className="block text-[11px] font-normal text-gray-500">{assignment.ungraded} chưa có điểm AI</span> : null}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700" title={`${assignment.reviewed_answers} câu đã duyệt`}>{assignment.teacher_ai_delta === null ? '—' : `${assignment.teacher_ai_delta > 0 ? '+' : ''}${assignment.teacher_ai_delta.toFixed(2)}`}</td>
                    <td className="py-2.5 text-right"><Link href={`/teacher/evaluations/${assignment.id}`} className="whitespace-nowrap rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50">Chấm bài →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Câu hỏi khó nhất" subtitle="Tỉ lệ điểm trung bình thấp nhất so với điểm tối đa">
          {stats.hardest_questions.length === 0 ? <p className="text-xs text-gray-500">Chưa đủ dữ liệu chấm.</p> : (
            <ol className="space-y-3 text-xs">
              {stats.hardest_questions.map((question) => (
                <li key={question.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{question.assignment_title} · Câu {question.position}</p>
                      <p className="mt-0.5 line-clamp-2 text-gray-600">{question.content}</p>
                    </div>
                    <RatioBar value={question.average_ratio} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">{question.graded_count} câu trả lời đã chấm</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Bài nộp thiếu nội dung" subtitle="Transcript trống, quá ngắn, toàn từ đệm hoặc ít từ khóa đáp án">
          {stats.thin_answers.length === 0 ? <p className="text-xs text-emerald-700">Không phát hiện bài nộp thiếu nội dung.</p> : (
            <ul className="divide-y divide-gray-100 text-xs">
              {stats.thin_answers.map((item) => (
                <li key={item.answer_id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{item.student_name} · Câu {item.question_position ?? '?'}</p>
                    <p className="mt-0.5 text-amber-800">⚠ {item.warnings[0]}{item.warnings.length > 1 ? ` (+${item.warnings.length - 1})` : ''}</p>
                  </div>
                  {item.assignment_id && <Link href={`/teacher/evaluations/${item.assignment_id}/submissions/${item.answer_id}`} className="shrink-0 rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50">Mở →</Link>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Theo sinh viên" subtitle="Cần chú ý: bỏ lỡ bài đã quá hạn hoặc điểm trung bình dưới 5">
        <label className="mb-3 inline-flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={onlyAtRisk} onChange={(event) => setOnlyAtRisk(event.target.checked)} />
          Chỉ hiện sinh viên cần chú ý ({overview.at_risk_count})
        </label>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead><tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 pr-3 font-semibold">Sinh viên</th>
              <th className="py-2 pr-3 text-right font-semibold">Đã nộp</th>
              <th className="py-2 pr-3 text-right font-semibold">Bỏ lỡ</th>
              <th className="py-2 pr-3 text-right font-semibold">Điểm TB</th>
              <th className="py-2 pr-3 text-right font-semibold">Thiếu ND</th>
              <th className="py-2 font-semibold">Trạng thái</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {students.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-500">Không có sinh viên.</td></tr>}
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="py-2.5 pr-3"><p className="font-semibold text-gray-900">{student.full_name}</p>{student.student_code && <p className="font-mono text-[11px] text-gray-500">{student.student_code}</p>}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{student.submitted_count}/{overview.assignment_count}</td>
                  <td className={`py-2.5 pr-3 text-right tabular-nums ${student.missed_count ? 'font-semibold text-red-700' : 'text-gray-600'}`}>{student.missed_count}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{score(student.average_score10)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-gray-600">{student.thin_answers}</td>
                  <td className="py-2.5">{student.at_risk
                    ? <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">⚠ Cần chú ý</span>
                    : <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">✓ Ổn</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
