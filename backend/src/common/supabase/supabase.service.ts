import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } } as const;

@Injectable()
export class SupabaseService {
  private serviceClient: SupabaseClient | null = null;

  /**
   * Client mang JWT của người gọi: mọi truy vấn và RPC vẫn chịu RLS + kiểm tra vai trò trong database.
   * Đây là client mặc định cho các thao tác thay mặt người dùng.
   */
  forUser(accessToken: string): SupabaseClient {
    return createClient(env().SUPABASE_URL, env().SUPABASE_PUBLISHABLE_KEY, {
      ...clientOptions,
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }

  /** Client service role (bỏ qua RLS). Chỉ dùng trong worker hoặc sau khi đã kiểm tra quyền bằng client của người dùng. */
  service(): SupabaseClient {
    if (this.serviceClient) return this.serviceClient;
    const secret = env().SUPABASE_SECRET_KEY;
    if (!secret) throw new ServiceUnavailableException('Máy chủ chưa cấu hình SUPABASE_SECRET_KEY');
    this.serviceClient = createClient(env().SUPABASE_URL, secret, clientOptions);
    return this.serviceClient;
  }
}
