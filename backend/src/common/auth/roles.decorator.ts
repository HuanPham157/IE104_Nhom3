import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AppRole, AuthContext } from './auth.types';

export const ROLES_KEY = 'oralcheck:roles';
export const PUBLIC_KEY = 'oralcheck:public';

/** Giới hạn route cho các vai trò. Route không gắn @Roles vẫn yêu cầu đăng nhập với tài khoản active. */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

/** Bỏ qua xác thực (health check). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/** Lấy thông tin người gọi đã được AuthGuard gắn vào request. */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthContext => {
  const request = context.switchToHttp().getRequest<Request>();
  if (!request.auth) throw new Error('AuthGuard chưa chạy cho route này');
  return request.auth;
});
