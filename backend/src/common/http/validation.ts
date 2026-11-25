import { BadRequestException, Logger, ParseUUIDPipe } from '@nestjs/common';
import type { z } from 'zod';

const dbLogger = new Logger('Database');

/** Kiểm tra body bằng zod; lỗi trả 400 với thông điệp tiếng Việt do route chỉ định. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown, message: string): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequestException(message);
  return parsed.data;
}

/** Pipe kiểm tra tham số :id là UUID, báo lỗi bằng thông điệp riêng. */
export const uuidParam = (message: string) =>
  new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException(message) });

/** Ghi lỗi Supabase vào log (chỉ code + message, không có dữ liệu người dùng). */
export function reportDatabaseError(context: string, error: { code?: string; message?: string }) {
  dbLogger.error(`${context} (code ${error.code ?? 'unknown'}): ${error.message ?? ''}`);
}

/** RPC chưa tồn tại — thường do chưa chạy migration tương ứng. */
export const isMissingFunction = (error: { code?: string } | null | undefined) => error?.code === 'PGRST202';
