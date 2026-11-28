import { Injectable } from '@nestjs/common';
import { env } from '../config/env';
import { AiServiceClient, AiServiceError } from './ai-service.client';

export type AsrResult = { transcript: string; engine: string };

/** Chuyển giọng nói thành văn bản bằng Faster-Whisper trong ai-service (POST /api/transcribe). */
@Injectable()
export class AsrService {
  constructor(private readonly ai: AiServiceClient) {}

  async transcribe(audio: Blob, fileName: string, options: { language?: string; prompt?: string } = {}): Promise<AsrResult> {
    const form = new FormData();
    form.append('audio', audio, fileName);
    form.append('language', options.language ?? 'vi');
    // Gợi ý ngữ cảnh cho Whisper bằng nội dung câu hỏi.
    if (options.prompt) form.append('prompt', options.prompt.slice(0, 500));

    const result = await this.ai.post<{ transcript?: unknown }>('/api/transcribe', form, 180_000);
    if (typeof result.transcript !== 'string') throw new AiServiceError('Dịch vụ Speech-to-Text không xử lý được audio');
    const transcript = result.transcript.trim();
    if (!transcript) {
      throw new AiServiceError('Không nghe thấy lời nói trong bản ghi. Kiểm tra micro rồi ghi lại, hoặc tự gõ nội dung.');
    }
    return { transcript, engine: `faster-whisper-${env().WHISPER_MODEL}` };
  }
}
