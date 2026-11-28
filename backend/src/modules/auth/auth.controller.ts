import { Controller, Get } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { CurrentUser, Public } from '../../common/auth/roles.decorator';

/**
 * Đăng nhập / đăng ký vẫn do Supabase Auth xử lý ở trình duyệt (lấy access token).
 * Backend chỉ xác minh token và cho biết vai trò chuẩn từ public.users.
 */
@Controller()
export class AuthController {
  @Get('health')
  @Public()
  health() {
    return { data: { ok: true } };
  }

  @Get('auth/me')
  me(@CurrentUser() auth: AuthContext) {
    return { data: { id: auth.userId, email: auth.email, role: auth.role } };
  }
}
