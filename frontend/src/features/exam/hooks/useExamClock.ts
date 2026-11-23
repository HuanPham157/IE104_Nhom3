'use client';

import { useCallback, useEffect, useState } from 'react';

type ExamClockOptions = {
  /** Chỉ chạy đồng hồ khi đang làm bài. */
  running: boolean;
  deadlineAt: string | null | undefined;
  startedAt: string | null | undefined;
};

/**
 * Đồng hồ của lượt làm bài: mỗi giây cập nhật `now`, tính số giây còn lại tới hạn giờ
 * (null khi bài không giới hạn thời gian) và số giây đã làm.
 */
export function useExamClock({ running, deadlineAt, startedAt }: ExamClockOptions) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  /** Đồng bộ lại ngay (ví dụ vừa bắt đầu lượt mới) thay vì chờ nhịp tiếp theo. */
  const sync = useCallback(() => setNow(Date.now()), []);

  const secondsLeft = running && deadlineAt
    ? Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000))
    : null;
  const elapsedSeconds = running && startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;

  return { now, secondsLeft, elapsedSeconds, sync };
}
