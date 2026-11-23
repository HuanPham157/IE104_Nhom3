import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Body JSON của request, hoặc `null` khi không có body / body không phải JSON
 * (giống readJson() của các Route Handler cũ) — để schema zod từ chối body rỗng thay vì coi là `{}`.
 * JSON sai cú pháp đã bị bộ đọc JSON của Express trả lỗi 400 trước khi tới đây.
 */
export const JsonBody = createParamDecorator((_: unknown, context: ExecutionContext): unknown => {
  const request = context.switchToHttp().getRequest<Request>();
  const isJson = (request.headers['content-type'] ?? '').toLowerCase().includes('application/json');
  const hasContent = Number(request.headers['content-length'] ?? 0) > 0 || Boolean(request.headers['transfer-encoding']);
  if (!isJson || !hasContent || request.body === undefined) return null;
  return request.body as unknown;
});
