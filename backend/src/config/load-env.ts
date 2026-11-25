/** Nạp backend/.env nếu có (Node ≥ 20.12). Không có file thì dùng biến môi trường sẵn có của hệ thống. */
export function loadEnvFile() {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Không có .env: bỏ qua, env() sẽ báo tên biến còn thiếu.
  }
}
