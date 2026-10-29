import { test, expect } from '@playwright/test';

const emailA = process.env.TEST_EMAIL_A;
const passwordA = process.env.TEST_PASSWORD_A;

test.describe('Kiểm thử API bảo mật & xác thực', () => {
  test('API GET /api/tasks thiếu token phải trả về HTTP 401', async ({ request }) => {
    const response = await request.get('/api/tasks');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Chưa đăng nhập');
  });

  test('API POST /api/tasks với body sai hoặc rỗng phải trả về HTTP 400 hoặc 401', async ({ request }) => {
    const response = await request.post('/api/tasks', {
      data: { title: '' },
    });
    expect([400, 401]).toContain(response.status());
  });
});

test.describe('Kiểm thử E2E luồng người dùng hoàn chỉnh', () => {
  test('Đăng nhập UI, thực hiện CRUD với Supabase thật, reload trang và xóa dữ liệu test', async ({ page }) => {
    // 1. Kiểm tra tài khoản test trong .env.local
    if (!emailA || !passwordA) {
      test.skip(
        true,
        'Cần khai báo TEST_EMAIL_A và TEST_PASSWORD_A trong .env.local để chạy E2E UI Test'
      );
      return;
    }

    // 2. Mở trang login
    await page.goto('/login');

    // 3. Điền thông tin đăng nhập (dùng /^Mật khẩu/i để khớp chính xác ô mật khẩu)
    await page.getByLabel(/Email tài khoản/i).fill(emailA);
    await page.getByLabel(/^Mật khẩu/i).fill(passwordA);
    await page.getByRole('button', { name: /Đăng nhập ngay/i }).click();

    // 4. Chờ chuyển hướng tới /tasks
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