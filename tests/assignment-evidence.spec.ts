import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const userId = '00000000-0000-4000-8000-000000000010';
const evidenceDirectory = path.resolve(process.cwd(), 'BaiTap-evidence');

async function mockUser(page: Page, role: 'student' | 'teacher') {
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'test-refresh-token',
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'account@example.edu',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          identities: [],
          created_at: '2026-01-01T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        role,
        full_name: 'Nguyen Van A',
        faculty: 'CNTT',
        institutional_id: role === 'teacher' ? 'GV01' : 'SV001',
      }]),
    });
  });

  await page.route('**/api/tasks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

async function signIn(page: Page, role: 'student' | 'teacher') {
  await mockUser(page, role);
  await page.goto('/login');
  await page.getByLabel(/Email tài khoản/i).fill('account@example.edu');
  await page.getByLabel(/^Mật khẩu/i).fill('example-password-123');
  await page.getByRole('button', { name: /Đăng nhập ngay vào hệ thống/i }).click();
  await page.waitForURL(role === 'student' ? '**/student' : '**/teacher');
}

test.beforeAll(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('E01: chụp giao diện đăng ký sau khi gửi thành công (Auth mock)', async ({ page }) => {
  await page.route('**/auth/v1/signup*', async (route) => {
    const body = route.request().postDataJSON() as { email?: string; data?: Record<string, unknown> };
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
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: path.join(evidenceDirectory, 'E01-signup-confirmation.png') });
});

test('E02: chụp dashboard sinh viên sau khi xác thực (Auth mock)', async ({ page }) => {
  await signIn(page, 'student');
  await expect(page.getByRole('heading', { name: /Chào buổi sáng, Nguyen Van A!/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng sinh viên' })).toBeVisible();
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: path.join(evidenceDirectory, 'E02-student-dashboard.png') });
});

test('E03: chụp trang Bài tập oral và sidebar (Auth/API mock)', async ({ page }) => {
  await signIn(page, 'student');
  await page.getByRole('link', { name: 'Bài tập oral' }).click();
  await page.waitForURL('**/tasks');
  await expect(page.getByRole('heading', { name: 'Danh sách Bài tập & Thi Vấn đáp (Oral)' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng sinh viên' }).getByText('Bài tập oral')).toHaveAttribute('aria-current', 'page');
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: path.join(evidenceDirectory, 'E03-student-oral-tasks.png') });
});

test('E04: chụp dashboard giảng viên sau khi xác thực (Auth mock)', async ({ page }) => {
  await signIn(page, 'teacher');
  await expect(page.getByRole('heading', { name: /Xin chào, Nguyen Van A!/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng giảng viên' })).toBeVisible();
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: path.join(evidenceDirectory, 'E04-teacher-dashboard.png') });
});

test('E05: chụp trang lớp học giảng viên (Auth mock)', async ({ page }) => {
  await signIn(page, 'teacher');
  await page.getByRole('link', { name: 'Lớp học & Hội đồng' }).click();
  await page.waitForURL('**/teacher/classes');
  await expect(page.getByRole('heading', { name: 'Lớp học phụ trách & Cố vấn học tập' })).toBeVisible();
  await expect(page.getByTestId('teacher-course-AIO-8892')).toBeVisible();
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: path.join(evidenceDirectory, 'E05-teacher-classes.png') });
});
