import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const userId = '00000000-0000-4000-8000-000000000010';
const evidenceDirectory = path.resolve(process.cwd(), 'BaiTap-evidence');

async function mockUser(page: Page, role: 'student' | 'teacher' | 'admin') {
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

  await page.route('**/rest/v1/users*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        role: role === 'teacher' ? 'lecturer' : role,
        account_status: 'active',
        full_name: 'Nguyen Van A',
      }]),
    });
  });

  await page.route('**/rest/v1/student_profiles*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ student_code: 'SV001', department: 'CNTT' }]) });
  });
  await page.route('**/rest/v1/lecturer_profiles*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ lecturer_code: 'GV01', department: 'CNTT' }]) });
  });

  await page.route('**/api/tasks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route('**/api/classes/*/assignments', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

async function signIn(page: Page, role: 'student' | 'teacher' | 'admin') {
  await mockUser(page, role);
  await page.goto('/login');
  await page.getByLabel(/Email tài khoản/i).fill('account@example.edu');
  await page.getByLabel(/^Mật khẩu/i).fill('example-password-123');
  await page.getByRole('button', { name: /Đăng nhập ngay vào hệ thống/i }).click();
  await page.waitForURL(role === 'student' ? '**/student' : role === 'admin' ? '**/admin' : '**/teacher');
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

test('E03: chụp trang công việc cá nhân và sidebar (Auth/API mock)', async ({ page }) => {
  await signIn(page, 'student');
  await page.getByRole('link', { name: 'Việc cá nhân' }).click();
  await page.waitForURL('**/tasks');
  await expect(page.getByRole('heading', { name: 'Danh sách Bài tập & Thi Vấn đáp (Oral)' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng sinh viên' }).getByText('Việc cá nhân')).toHaveAttribute('aria-current', 'page');
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

test('E05: chụp trang lớp học giảng viên không có dữ liệu giả (Auth/API mock)', async ({ page }) => {
  await signIn(page, 'teacher');
  await page.getByRole('link', { name: 'Lớp học & Hội đồng' }).click();
  await page.waitForURL('**/teacher/classes');
  await expect(page.getByRole('heading', { name: 'Lớp học phụ trách & Cố vấn học tập' })).toBeVisible();
  await expect(page.getByText('Chưa có lớp học phù hợp. Tạo lớp mới để gửi yêu cầu phê duyệt.')).toBeVisible();
  await expect(page.getByText(/Supabase/i)).toHaveCount(0);
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: path.join(evidenceDirectory, 'E05-teacher-classes.png') });
});

test('giảng viên soạn, cập nhật bản nháp và công bố bài tập qua API', async ({ page }) => {
  const classId = '11111111-1111-4111-8111-111111111113';
  const assignmentId = '22222222-2222-4222-8222-222222222222';
  let createdPayload: Record<string, unknown> | undefined;
  let updatedPayload: Record<string, unknown> | undefined;
  let publishedStatus: string | undefined;
  await signIn(page, 'teacher');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: classId,
          class_name: 'Lớp kiểm thử',
          class_code: 'IE104-TEST',
          status: 'active',
        }],
      }),
    });
  });
  await page.route(`**/api/classes/${classId}/assignments`, async (route) => {
    createdPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: assignmentId } }),
    });
  });
  await page.route(`**/api/assignments/${assignmentId}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: assignmentId,
            class_id: classId,
            title: 'Bài tập kiểm thử giao diện',
            instructions: 'Đọc kỹ câu hỏi.',
            ends_at: null,
            status: 'draft',
            questions: [{
              content: 'Trình bày cách tham gia lớp.',
              reference_answer: 'Sinh viên dùng mã lớp.',
              max_score: 10,
              time_limit_seconds: 120,
              rubric: [],
            }],
          },
        }),
      });
      return;
    }
    if (route.request().method() === 'PUT') {
      updatedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
      return;
    }
    if (route.request().method() === 'PATCH') {
      publishedStatus = (route.request().postDataJSON() as { status: string }).status;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { status: publishedStatus } }) });
      return;
    }
    await route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method not allowed' }) });
  });

  await page.goto(`/teacher/assignments/create?classId=${classId}`);
  await expect(page.getByRole('heading', { name: 'Soạn bài tập mới' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng giảng viên' }).getByRole('link', { name: 'Soạn bài tập' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('OralEval IE104', { exact: true })).toHaveCount(0);
  await page.getByLabel('Lớp học').selectOption(classId);
  await page.getByLabel('Tên bài tập').fill('Bài tập kiểm thử giao diện');
  await page.getByLabel('Hướng dẫn chung (không bắt buộc)').fill('Đọc kỹ câu hỏi.');
  await page.getByLabel('Nội dung câu hỏi *').fill('Trình bày cách tham gia lớp.');
  await page.getByLabel('Đáp án tham khảo (không bắt buộc, chỉ giảng viên xem)').fill('Sinh viên dùng mã lớp.');
  await page.getByRole('button', { name: 'Lưu nháp' }).click();

  await expect(page.getByText('Đã lưu bản nháp. Bạn có thể tiếp tục chỉnh sửa trước khi công bố.')).toBeVisible();
  expect(createdPayload).toMatchObject({
    title: 'Bài tập kiểm thử giao diện',
    instructions: 'Đọc kỹ câu hỏi.',
    questions: [{ content: 'Trình bày cách tham gia lớp.', reference_answer: 'Sinh viên dùng mã lớp.' }],
  });

  await page.goto(`/teacher/assignments/create?classId=${classId}&assignmentId=${assignmentId}`);
  await expect(page.getByLabel('Tên bài tập')).toHaveValue('Bài tập kiểm thử giao diện');
  await expect(page.getByLabel('Đáp án tham khảo (không bắt buộc, chỉ giảng viên xem)')).toHaveValue('Sinh viên dùng mã lớp.');
  await page.getByLabel('Tên bài tập').fill('Bài tập đã chỉnh sửa');
  await page.getByRole('button', { name: 'Cập nhật bản nháp' }).click();
  await expect(page.getByText('Đã cập nhật bản nháp.')).toBeVisible();
  expect(updatedPayload).toMatchObject({ title: 'Bài tập đã chỉnh sửa' });

  await page.getByRole('button', { name: 'Công bố bài tập' }).click();
  await expect(page.getByRole('heading', { name: 'Đã công bố bài tập' })).toBeVisible();
  expect(publishedStatus).toBe('published');
});

test('sinh viên xem đề bài đã công bố mà không nhận đáp án tham khảo', async ({ page }) => {
  const assignmentId = '11111111-1111-4111-8111-111111111112';
  await signIn(page, 'student');
  await page.route(`**/api/assignments/${assignmentId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: assignmentId,
          class_id: '11111111-1111-4111-8111-111111111113',
          title: 'Bài tập kiểm thử',
          instructions: 'Đọc kỹ câu hỏi.',
          starts_at: null,
          ends_at: '2026-12-01T10:00:00.000Z',
          status: 'published',
          questions: [{
            id: '11111111-1111-4111-8111-111111111114',
            content: 'Giải thích nguyên tắc phân quyền.',
            position: 1,
            max_score: 10,
            time_limit_seconds: 120,
          }],
        },
      }),
    });
  });

  await page.goto(`/student/assignments/${assignmentId}`);
  await expect(page.getByRole('heading', { name: 'Bài tập kiểm thử' })).toBeVisible();
  await expect(page.getByText('Giải thích nguyên tắc phân quyền.')).toBeVisible();
  await expect(page.getByText('Ghi âm, camera, giọng nói và AI chưa được bật.')).toBeVisible();
});

test('trang lớp sinh viên chỉ có một nút nhập mã lớp', async ({ page }) => {
  await signIn(page, 'student');
  await page.goto('/student/classes');

  const joinButton = page.getByRole('button', { name: 'Tham gia lớp bằng mã' });
  await expect(joinButton).toHaveCount(1);
  await joinButton.click();
  await expect(page.getByLabel('Mã lớp học (Class Code) *')).toHaveCount(1);
  await expect(page.getByText(/Supabase|QR/i)).toHaveCount(0);
});

test('hồ sơ giảng viên không hiển thị màn hình tải riêng hoặc nhắc tên hệ thống', async ({ page }) => {
  await signIn(page, 'teacher');
  await page.goto('/teacher/profile');
  await expect(page.getByRole('heading', { name: 'Nguyen Van A' })).toBeVisible();
  await expect(page.getByText('Đang tải hồ sơ giảng viên...')).toHaveCount(0);
  await expect(page.getByText(/Supabase/i)).toHaveCount(0);
});

test('giảng viên xóa bài tập và gửi yêu cầu hủy lớp', async ({ page }) => {
  const classId = '11111111-1111-4111-8111-111111111113';
  const assignmentId = '22222222-2222-4222-8222-222222222222';
  let deletedAssignment = false;
  let requestedCancellation = false;

  await signIn(page, 'teacher');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: classId,
          class_name: 'Lớp quản lý',
          class_code: 'IE104ABC',
          description: null,
          status: 'active',
        }],
      }),
    });
  });
  await page.route(`**/api/classes/${classId}/members`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.unroute('**/api/classes/*/assignments');
  await page.route(`**/api/classes/${classId}/assignments`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: assignmentId,
          title: 'Bài cần xóa',
          starts_at: null,
          ends_at: null,
          status: 'published',
        }],
      }),
    });
  });
  await page.route(`**/api/classes/${classId}/cancel`, async (route) => {
    if (route.request().method() === 'POST') requestedCancellation = true;
    await route.fulfill({
      status: route.request().method() === 'POST' ? 201 : 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: route.request().method() === 'POST' ? {} : null }),
    });
  });
  await page.route(`**/api/assignments/${assignmentId}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      deletedAssignment = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: assignmentId, archived: false } }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) });
  });
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto(`/teacher/classes/${classId}`);
  await page.getByRole('button', { name: 'Yêu cầu hủy lớp' }).click();
  await expect(page.getByRole('status')).toContainText('Đã gửi yêu cầu hủy lớp');
  expect(requestedCancellation).toBe(true);

  await page.getByRole('button', { name: /^Bài tập \(1\)$/ }).click();
  await page.getByRole('button', { name: 'Xóa bài tập' }).click();
  await expect(page.getByRole('status')).toContainText('Đã xóa bài tập');
  expect(deletedAssignment).toBe(true);
});

test('quản trị viên xóa lớp và lưu trữ lớp đã có dữ liệu', async ({ page }) => {
  const classId = '11111111-1111-4111-8111-111111111113';
  let deletedClass = false;

  await signIn(page, 'admin');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: classId,
          class_name: 'Lớp cần xóa',
          class_code: 'IE104ABC',
          description: null,
          status: 'active',
          created_at: '2026-01-01T00:00:00.000Z',
          lecturer_name: 'Nguyen Van A',
        }],
      }),
    });
  });
  await page.route(`**/api/classes/${classId}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      deletedClass = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: classId, archived: true } }),
      });
      return;
    }
    await route.continue();
  });
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/admin/classes');
  await expect(page.getByRole('heading', { name: 'Quản lý lớp học' })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa lớp' }).click();
  await expect(page.getByRole('status')).toContainText('được lưu trữ');
  expect(deletedClass).toBe(true);
  await expect(page.getByText('Lớp cần xóa')).toHaveCount(0);
});

test('quản trị viên duyệt yêu cầu hủy lớp của giảng viên', async ({ page }) => {
  const requestId = '33333333-3333-4333-8333-333333333333';
  let approved = false;

  await signIn(page, 'admin');
  await page.route('**/api/admin/approval-requests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: requestId,
          requester_id: userId,
          requester_name: 'Nguyen Van A',
          request_type: 'class_cancellation',
          request_data: { class_name: 'Lớp cần hủy', class_code: 'IE104ABC', reason: 'Không còn mở lớp.' },
          status: 'pending',
          reject_reason: null,
          created_at: '2026-01-01T00:00:00.000Z',
        }],
      }),
    });
  });
  await page.route(`**/api/admin/approval-requests/${requestId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      approved = (route.request().postDataJSON() as { decision: string }).decision === 'approved';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
      return;
    }
    await route.continue();
  });

  await page.goto('/admin');
  await page.getByRole('link', { name: /Duyệt lớp & Học vị GV/ }).click();
  await expect(page).toHaveURL(/\/admin\/approvals#approval-requests$/);
  await expect(page.getByRole('link', { name: /Duyệt lớp & Học vị GV/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#approval-requests')).toBeInViewport();
  await expect(page.getByText('YÊU CẦU HỦY LỚP', { exact: true })).toBeVisible();
  await expect(page.getByText('Giảng viên gửi:')).toContainText('Nguyen Van A');
  await expect(page.getByText('Không còn mở lớp.')).toBeVisible();
  await page.getByRole('button', { name: /Phê duyệt/ }).click();
  await expect(page.locator('article').getByText(/Đã phê duyệt/)).toBeVisible();
  expect(approved).toBe(true);
});

test('từ chối yêu cầu mở lớp sẽ ẩn khỏi danh sách duyệt', async ({ page }) => {
  const requestId = '44444444-4444-4444-8444-444444444444';
  let rejectionSent = false;

  await signIn(page, 'admin');
  await page.route('**/api/admin/approval-requests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: requestId,
          requester_id: userId,
          requester_name: 'Nguyen Van A',
          request_type: 'class_creation',
          request_data: { class_name: 'Lớp cần từ chối', class_code: 'REJ123' },
          status: 'pending',
          reject_reason: null,
          created_at: '2026-01-01T00:00:00.000Z',
        }],
      }),
    });
  });
  await page.route(`**/api/admin/approval-requests/${requestId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { decision: string; reject_reason: string };
      rejectionSent = body.decision === 'rejected' && Boolean(body.reject_reason);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
      return;
    }
    await route.continue();
  });

  await page.goto('/admin');
  await page.getByRole('link', { name: /Duyệt lớp & Học vị GV/ }).click();
  await expect(page.getByText('Lớp cần từ chối')).toBeVisible();
  await page.getByRole('button', { name: '✕ Từ chối (Reject)' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận Từ chối' }).click();
  await expect(page.getByText('Lớp cần từ chối')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('lịch sử và thông báo lý do đã được lưu');
  expect(rejectionSent).toBe(true);
});
