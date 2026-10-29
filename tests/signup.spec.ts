import { expect, test } from '@playwright/test';

test.describe('Đăng ký Supabase Auth', () => {
  test('gửi thông tin hồ sơ và hiển thị hướng dẫn xác nhận email', async ({ page }) => {
    let submitted: {
      email?: unknown;
      data?: Record<string, unknown>;
    } = {};

    await page.route('**/auth/v1/signup*', async (route) => {
      const body = route.request().postDataJSON() as {
        email?: unknown;
        data?: Record<string, unknown>;
      };
      submitted = body;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '00000000-0000-4000-8000-000000000001',
            aud: 'authenticated',
            role: 'authenticated',
            email: body.email,
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: body.data,
            identities: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          session: null,
        }),
      });
    });

    await page.goto('/signup');
    await page.getByLabel(/Mã số Sinh viên/).fill('SV001');
    await page.getByLabel('Email', { exact: true }).fill('student@example.edu');
    await page.getByLabel('Họ tên').fill('Nguyen Van A');
    await page.getByLabel(/Khoa/).selectOption('Khoa Công nghệ Thông tin');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('example-password-123');
    await page.getByLabel('Xác nhận lại mật khẩu').fill('example-password-123');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Đăng ký tài khoản Sinh viên/ }).click();

    await expect(page.getByRole('status')).toContainText('xác nhận');
    expect(submitted.email).toBe('student@example.edu');
    expect(submitted.data).toMatchObject({
      role: 'student',
      institutional_id: 'SV001',
      full_name: 'Nguyen Van A',
      faculty: 'Khoa Công nghệ Thông tin',
    });
  });

  test('gửi vai trò giảng viên và mã số giảng viên', async ({ page }) => {
    let submitted: {
      data?: Record<string, unknown>;
    } = {};

    await page.route('**/auth/v1/signup*', async (route) => {
      const body = route.request().postDataJSON() as {
        email?: unknown;
        data?: Record<string, unknown>;
      };
      submitted = body;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '00000000-0000-4000-8000-000000000002',
            aud: 'authenticated',
            role: 'authenticated',
            email: body.email,
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: body.data,
            identities: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
          session: null,
        }),
      });
    });

    await page.goto('/signup');
    await page.getByRole('button', { name: /Giảng viên/ }).click();
    await page.getByLabel(/Mã số Giảng viên/).fill('GV001');
    await page.getByLabel('Email', { exact: true }).fill('teacher@example.edu');
    await page.getByLabel('Họ tên').fill('Nguyen Van B');
    await page.getByLabel(/Khoa/).selectOption('Khoa Công nghệ Thông tin');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('example-password-123');
    await page.getByLabel('Xác nhận lại mật khẩu').fill('example-password-123');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Đăng ký tài khoản Giảng viên/ }).click();

    await expect(page.getByRole('status')).toContainText('xác nhận');
    expect(submitted.data).toMatchObject({
      role: 'teacher',
      institutional_id: 'GV001',
      full_name: 'Nguyen Van B',
      faculty: 'Khoa Công nghệ Thông tin',
    });
  });

  test('không gọi Supabase nếu mật khẩu xác nhận không khớp', async ({ page }) => {
    let signupRequestCount = 0;
    await page.route('**/auth/v1/signup*', async (route) => {
      signupRequestCount += 1;
      await route.fulfill({ status: 500, body: '' });
    });

    await page.goto('/signup');
    await page.getByLabel(/Mã số Sinh viên/).fill('SV001');
    await page.getByLabel('Email', { exact: true }).fill('student@example.edu');
    await page.getByLabel('Họ tên').fill('Nguyen Van A');
    await page.getByLabel(/Khoa/).selectOption('Khoa Công nghệ Thông tin');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('example-password-123');
    await page.getByLabel('Xác nhận lại mật khẩu').fill('different-password-123');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Đăng ký tài khoản Sinh viên/ }).click();

    await expect(page.locator('p[role="alert"]')).toHaveText('Mật khẩu xác nhận không khớp.');
    expect(signupRequestCount).toBe(0);
  });
});
