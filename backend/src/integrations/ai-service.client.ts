import { Injectable } from '@nestjs/common';
import { env } from '../config/env';

/** Lỗi khi gọi ai-service; thông điệp tiếng Việt được lưu vào submissions.error_message để người dùng đọc. */
export class AiServiceError extends Error {}

/** HTTP client tới ai-service nội bộ (FastAPI). Chỉ worker dùng — API không gọi AI trực tiếp. */
@Injectable()
export class AiServiceClient {
  async post<T>(path: string, body: FormData | Record<string, unknown>, timeoutMs: number): Promise<T> {
    const token = env().AI_SERVICE_TOKEN;
    if (!token) throw new AiServiceError('Thiếu AI_SERVICE_TOKEN trong backend/.env');

    const isForm = body instanceof FormData;
    let response: Response;
    try {
      response = await fetch(`${env().AI_SERVICE_URL.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: isForm
          ? { 'X-AI-Service-Token': token }
          : { 'X-AI-Service-Token': token, 'Content-Type': 'application/json' },
        body: isForm ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') throw new AiServiceError('AI service xử lý quá lâu, vui lòng thử lại.');
      throw new AiServiceError('Không kết nối được AI service. Kiểm tra AI_SERVICE_URL và bảo đảm dịch vụ đang chạy.');
    }

    const result = await response.json().catch(() => null) as (T & { detail?: unknown }) | null;
    if (!response.ok || !result) {
      const detail = typeof result?.detail === 'string' ? result.detail : `AI service trả lỗi ${response.status}`;
      throw new AiServiceError(detail);
    }
    return result;
  }
}
