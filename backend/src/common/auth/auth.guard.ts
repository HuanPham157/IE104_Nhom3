import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import type { AppRole } from './auth.types';
import { PUBLIC_KEY, ROLES_KEY } from './roles.decorator';

const APP_ROLES: readonly AppRole[] = ['student', 'lecturer', 'admin'];

/**
 * Guard toàn cục: xác minh access token Supabase, rồi lấy vai trò từ public.users (không tin user_metadata).
 * Tương đương authenticateRole() phía Next.js cũ.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '')?.[1]?.trim();
    if (!token) throw new UnauthorizedException('Chưa đăng nhập');

    const db = this.supabase.forUser(token);
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData.user) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');

    const { data: profile, error } = await db
      .from('users')
      .select('role,account_status')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error) {
      this.logger.error(`Không tải được hồ sơ người dùng (code ${error.code ?? 'unknown'})`);
      throw new InternalServerErrorException('Không thể xác minh hồ sơ người dùng');
    }
    if (!profile || profile.account_status !== 'active' || !APP_ROLES.includes(profile.role as AppRole)) {
      throw new ForbiddenException('Tài khoản chưa có hồ sơ hoặc đã bị vô hiệu hóa');
    }

    const role = profile.role as AppRole;
    const allowed = this.reflector.getAllAndOverride<AppRole[] | undefined>(ROLES_KEY, targets);
    if (allowed && !allowed.includes(role)) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

    request.auth = { userId: userData.user.id, email: userData.user.email ?? null, role, db };
    return true;
  }
}
