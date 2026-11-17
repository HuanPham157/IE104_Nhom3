/** Nhãn hiển thị cho kết quả đánh giá từng tiêu chí rubric (AI trả về), dùng chung cho mọi màn hình. */
export const ASSESSMENT_LABEL: Record<string, { text: string; className: string }> = {
  correct: { text: 'Đúng', className: 'bg-emerald-50 text-emerald-800' },
  partial: { text: 'Đúng một phần', className: 'bg-amber-50 text-amber-800' },
  incorrect: { text: 'Sai', className: 'bg-red-50 text-red-700' },
  missing: { text: 'Còn thiếu', className: 'bg-gray-100 text-gray-700' },
};

export const assessmentLabel = (assessment: string) =>
  ASSESSMENT_LABEL[assessment] ?? { text: assessment, className: 'bg-gray-100 text-gray-700' };
