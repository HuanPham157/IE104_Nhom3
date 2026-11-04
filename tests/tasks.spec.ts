import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const studentEmail = process.env.TEST_EMAIL_B;
const studentPassword = process.env.TEST_PASSWORD_B;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test.describe('Kiểm thử API bảo mật & xác thực', () => {
  test('API GET /api/tasks thiếu token phải trả về HTTP 401', async ({ request }) => {
    const response = await request.get('/api/tasks');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Chưa đăng nhập');
  });

  test('API POST /api/tasks không token phải trả về HTTP 401 dù body không hợp lệ', async ({ request }) => {
    const response = await request.post('/api/tasks', {
      data: { title: '' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Kiểm thử E2E luồng người dùng hoàn chỉnh', () => {
  test('API chấp nhận title 1/120 ký tự và từ chối 121 ký tự khi đã xác thực', async ({ request }) => {
    if (!studentEmail || !studentPassword || !supabaseUrl || !supabaseKey) {
      test.skip(
        true,
        'Cần cấu hình Supabase và tài khoản sinh viên TEST_EMAIL_B/TEST_PASSWORD_B trong .env.local'
      );
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });
    expect(error).toBeNull();
    const accessToken = data.session?.access_token;
    expect(accessToken).toBeTruthy();

    const headers = { Authorization: `Bearer ${accessToken}` };
    const createdIds: string[] = [];

    try {
      for (const title of ['x', 'x'.repeat(120)]) {
        const response = await request.post('/api/tasks', {
          headers,
          data: { title },
        });
        const body = await response.json() as {
          data?: { id?: string; title?: string };
        };
        if (response.status() === 201 && body.data?.id) {
          createdIds.push(body.data.id);
        }

        expect(response.status()).toBe(201);
        expect(body.data?.title).toBe(title);
      }

      const tooLongResponse = await request.post('/api/tasks', {
        headers,
        data: { title: 'x'.repeat(121) },
      });
      expect(tooLongResponse.status()).toBe(400);
    } finally {
      for (const id of createdIds) {
        const response = await request.delete(`/api/tasks/${id}`, { headers });
        expect(response.status()).toBe(200);
      }
      await supabase.auth.signOut();
    }
  });

  test('Đăng nhập UI, thực hiện CRUD với Supabase thật, reload trang và xóa dữ liệu test', async ({ page }) => {
    // 1. Kiểm tra tài khoản test trong .env.local
    if (!studentEmail || !studentPassword) {
      test.skip(
        true,
        'Cần khai báo TEST_EMAIL_B và TEST_PASSWORD_B cho tài khoản sinh viên trong .env.local để chạy E2E UI Test'
      );
      return;
    }

    // 2. Mở trang login
    await page.goto('/login');

    // 3. Điền thông tin đăng nhập (dùng /^Mật khẩu/i để khớp chính xác ô mật khẩu)
    await page.getByLabel(/Email tài khoản/i).fill(studentEmail);
    await page.getByLabel(/^Mật khẩu/i).fill(studentPassword);
    await page.getByRole('button', { name: /Đăng nhập ngay/i }).click();

    // 4. Mở khu vực công việc cá nhân từ dashboard sinh viên
    await page.waitForURL('**/student');
    await page.getByRole('link', { name: 'Bài tập oral' }).click();
    await page.waitForURL('**/tasks');
    await expect(page).toHaveURL(/\/tasks/);

    // 5. Thêm công việc mới duy nhất
    const uniqueTitle = `Nhiệm vụ kiểm thử E2E ${Date.now()}`;
    await page.getByPlaceholder(/Nhập tên câu hỏi hoặc việc cần làm/i).fill(uniqueTitle);
    await page.getByRole('button', { name: /\+ Thêm công việc/i }).click();

    // 6. Tìm dòng task vừa thêm qua data-testid="task-item"
    const taskRow = page.locator('[data-testid="task-item"]', { hasText: uniqueTitle });
    await expect(taskRow).toBeVisible();

    // 7. Reload trang để xác minh dữ liệu đã lưu thật trên Supabase
    await page.reload();
    const taskRowAfterReload = page.locator('[data-testid="task-item"]', { hasText: uniqueTitle });
    await expect(taskRowAfterReload).toBeVisible();

    // 8. Đánh dấu hoàn thành
    const checkbox = taskRowAfterReload.locator('input[type="checkbox"]');
    await checkbox.click(); // Dùng .click() thay vì .check()
    await expect(checkbox).toBeChecked();

    // 9. Sửa tiêu đề công việc (chỉ định chính xác ô tiêu đề)
    await taskRowAfterReload.getByRole('button', { name: /Sửa/i }).click();
    const updatedTitle = `${uniqueTitle} - Đã sửa`;
    await taskRowAfterReload.getByLabel(/Sửa tiêu đề/i).fill(updatedTitle);
    await taskRowAfterReload.getByRole('button', { name: /Lưu thay đổi/i }).click();

    const updatedRow = page.locator('[data-testid="task-item"]', { hasText: updatedTitle });
    await expect(updatedRow).toBeVisible();

    // 10. Xóa công việc vừa tạo
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await updatedRow.getByRole('button', { name: /Xóa/i }).click();

    // Xác nhận đã xóa thành công khỏi giao diện
    await expect(page.locator('[data-testid="task-item"]', { hasText: updatedTitle })).not.toBeVisible();
  });
});