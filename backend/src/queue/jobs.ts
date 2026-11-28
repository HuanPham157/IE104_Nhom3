/** Tên queue và dữ liệu job dùng chung giữa API (gửi job) và worker (xử lý job). */
export const ANSWER_PROCESSING_QUEUE = 'answer-processing';

export type AnswerJob = {
  submissionId: string;
  /**
   * false: chỉ chạy ASR (sinh viên vừa ghi âm xong, cần transcript để kiểm tra).
   * true: bảo đảm có transcript rồi chấm điểm (sau khi nộp bài / giảng viên yêu cầu chấm lại).
   */
  grade: boolean;
  requestedBy: 'student' | 'lecturer' | 'admin';
};
