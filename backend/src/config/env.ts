import { z } from 'zod';

const optionalSecret = z.string().trim().min(1).optional();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  SUPABASE_SECRET_KEY: optionalSecret,
  DATABASE_URL: z.string().trim().min(1),
  AI_SERVICE_URL: z.string().url().default('http://127.0.0.1:8001'),
  AI_SERVICE_TOKEN: optionalSecret,
  WHISPER_MODEL: z.string().trim().min(1).default('small'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Đọc và kiểm tra biến môi trường một lần. Chỉ báo TÊN biến bị thiếu/sai, không bao giờ in giá trị.
 */
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].join(', ');
    throw new Error(`Thiếu hoặc sai biến môi trường trong backend/.env: ${names}`);
  }
  cached = parsed.data;
  return cached;
}
