import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Chuẩn hóa mọi lỗi thành { error: string } — đúng định dạng frontend (oralcheckFetch) đang đọc.
 * Lỗi không lường trước chỉ ghi tên lỗi vào log, không lộ chi tiết ra client.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === 'string'
        ? body
        : Array.isArray((body as { message?: unknown }).message)
          ? ((body as { message: string[] }).message).join('; ')
          : String((body as { message?: unknown }).message ?? exception.message);
      response.status(status).json({ error: message });
      return;
    }

    this.logger.error(`Lỗi không xử lý: ${exception instanceof Error ? exception.name : 'unknown'}`);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Máy chủ gặp lỗi, vui lòng thử lại.' });
  }
}
