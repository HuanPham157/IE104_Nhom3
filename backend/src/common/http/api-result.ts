import type { Response } from 'express';

/**
 * Kết quả của một handler: mã HTTP + body JSON. Dùng khi route cần trả body đặc biệt
 * (lỗi kèm `code` / `details` / `data`, thành công kèm `warning`) hoặc mã trạng thái khác mặc định.
 */
export class ApiResult {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {}
}

/** Tạo kết quả trả về: thành công `{ data }`, lỗi `{ error }` — đúng định dạng frontend (oralcheckFetch) đọc. */
export const apiJson = (body: unknown, status = 200) => new ApiResult(status, body);

/** Gửi ApiResult ra response (controller dùng cùng @Res()). */
export function reply(res: Response, result: ApiResult) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(result.status).json(result.body);
}
