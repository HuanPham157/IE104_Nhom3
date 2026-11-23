'use client';

import { useCallback, useEffect, useRef } from 'react';
import { waitForAnswer, type AnswerStatus } from '@/lib/answer-status';

/**
 * Theo dõi câu trả lời đang được worker xử lý (nhận dạng / chấm điểm) và tự dừng hỏi lại khi
 * component rời màn hình. Dùng ở trang làm bài (exam) và trang chấm bài (grading).
 */
export function useAnswerWatcher() {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /** Component còn hiển thị không — kiểm tra trước khi cập nhật state sau một thao tác bất đồng bộ. */
  const isMounted = useCallback(() => mountedRef.current, []);

  /** Chờ tới khi `isDone` đúng; ném lỗi nếu quá lâu hoặc component đã rời màn hình. */
  const watch = useCallback(
    (submissionId: string, isDone: (status: AnswerStatus) => boolean) =>
      waitForAnswer(submissionId, isDone, { shouldStop: () => !mountedRef.current }),
    [],
  );

  return { watch, isMounted };
}
