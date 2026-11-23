import { expect, test, type Page } from '@playwright/test';

const userId = '00000000-0000-4000-8000-000000000010';

async function mockSignIn(page: Page, role: 'student' | 'lecturer' | 'admin') {
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
        id: userId,
        role,
        account_status: 'active',
        full_name: 'Nguyen Van A',
      }]),
    });
  });
  await page.route('**/rest/v1/student_profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ student_code: 'SV001', department: 'CNTT' }]),
    });
  });
  await page.route('**/rest/v1/lecturer_profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ lecturer_code: 'GV01', department: 'CNTT' }]),
    });
  });
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.route('**/api/classes/*/assignments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.route('**/api/admin/approval-requests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

async function signIn(page: Page, role: 'student' | 'lecturer' | 'admin') {
  await mockSignIn(page, role);
  await page.goto('/login');
  await page.getByLabel(/Email tài khoản/i).fill('account@example.edu');
  await page.getByLabel(/^Mật khẩu/i).fill('example-password-123');
  await page.getByRole('button', { name: /Đăng nhập ngay/i }).click();
  await page.waitForURL(role === 'student' ? '**/student' : role === 'admin' ? '**/admin' : '**/teacher');
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('định tuyến sinh viên bằng role chuẩn trong public.users', async ({ page }) => {
  await signIn(page, 'student');
  await expect(page.getByRole('heading', { name: /Chào buổi sáng, Nguyen Van A!/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lớp học đang ghi danh' })).toBeVisible();
  await expect(page.getByText('Chưa có bài tập nào được công bố.')).toBeVisible();
  await expect(page.getByText(/DỮ LIỆU DEMO|CS102-MID-2024-03/)).toHaveCount(0);
});

test('định tuyến giảng viên bằng role chuẩn và không hiển thị lớp mẫu', async ({ page }) => {
  await signIn(page, 'lecturer');
  await expect(page.getByRole('heading', { name: /Xin chào, Nguyen Van A!/ })).toBeVisible();
  await page.getByRole('link', { name: 'Lớp học & Hội đồng' }).click();
  await page.waitForURL('**/teacher/classes');
  await expect(page.getByRole('heading', { name: 'Lớp học phụ trách & Cố vấn học tập' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Đang xác minh tài khoản giảng viên...')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tạo lớp mới' })).toHaveCount(1);
  await expect(page.getByText('Chưa có lớp học phù hợp. Tạo lớp mới để gửi yêu cầu phê duyệt.')).toBeVisible();
  await expect(page.getByText(/AIO-8892|DỮ LIỆU LỚP HỌC MINH HỌA/)).toHaveCount(0);
});

test('định tuyến tài khoản admin active tới dashboard quản trị', async ({ page }) => {
  await signIn(page, 'admin');
  await expect(page.getByRole('heading', { name: 'Tổng quan quản trị' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' })).toBeVisible();
});

test('admin tạo lớp, xem lớp và xóa sinh viên khỏi lớp', async ({ page }) => {
  const classId = '11111111-1111-4111-8111-111111111117';
  const studentId = '00000000-0000-4000-8000-000000000022';
  let created = false;
  let removed = false;
  const classRecord = {
    id: classId,
    lecturer_id: userId,
    class_name: 'Lớp do admin tạo',
    class_code: 'ADMIN123',
    description: 'Mã môn: IE104\nKhoa: Khoa Công nghệ Phần mềm',
    status: 'active',
    lecturer_name: 'Nguyen Van A',
    created_at: '2026-01-01T00:00:00.000Z',
    approved_at: '2026-01-01T00:00:00.000Z',
  };

  await signIn(page, 'admin');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    if (route.request().method() === 'POST') {
      created = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { class: classRecord, approval_request_id: null } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: created ? [classRecord] : [] }),
    });
  });
  await page.route('**/api/classes/*/members', async (route) => {
    if (route.request().method() === 'DELETE') {
      removed = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: removed ? [] : [{
          student_id: studentId,
          full_name: 'Sinh Vien Test',
          student_code: 'SV002',
          department: 'CNTT',
          joined_at: '2026-01-02T00:00:00.000Z',
        }],
      }),
    });
  });
  await page.route('**/api/classes/*/cancel', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
  });

  await page.goto('/teacher/classes');
  await expect(page.getByRole('heading', { name: 'Quản lý lớp học' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo lớp mới' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Tạo lớp mới' }).click();
  await page.getByPlaceholder('VD: KTPM-K20: Kiến trúc Phần mềm Phân tán').fill('Lớp do admin tạo');
  await page.getByPlaceholder('VD: IT4409').fill('IE104');
  const facultySelect = page.getByLabel('Khoa / Viện quản lý *');
  await expect(facultySelect.locator('option')).toHaveCount(7);
  await expect(facultySelect.getByRole('option', { name: 'Khoa Công nghệ Phần mềm' })).toHaveCount(1);
  await page.getByLabel('Khoa / Viện quản lý *').selectOption('Khoa Công nghệ Phần mềm');
  await page.getByRole('button', { name: 'Tạo lớp học' }).click();
  await expect(page.getByText('Lớp "Lớp do admin tạo" đã được tạo và kích hoạt.')).toBeVisible();
  await expect(page.getByTestId('teacher-course-ADMIN123').getByText('Khoa Công nghệ Phần mềm')).toBeVisible();
  await expect(page.getByTestId('teacher-course-ADMIN123').getByText('Khoa Công nghệ Phần mềm')).toHaveCount(1);

  await page.getByRole('button', { name: 'Vào lớp & Chấm thi' }).click();
  await expect(page.getByText('Người phụ trách lớp:')).toContainText('Nguyen Van A');
  await expect(page.getByRole('link', { name: 'Tạo bài tập mới' })).toBeVisible();
  await expect(page.getByText('Sinh Vien Test')).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xóa khỏi lớp' }).click();
  await expect(page.getByText('Đã xóa Sinh Vien Test khỏi lớp.')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Sinh Vien Test' })).toHaveCount(0);
  expect(removed).toBe(true);
});

test('gửi yêu cầu tạo lớp hai lần nhanh chỉ tạo một yêu cầu', async ({ page }) => {
  let postCount = 0;
  const classRecord = {
    id: '88888888-8888-4888-8888-888888888888',
    lecturer_id: userId,
    class_name: 'Lớp gửi một lần',
    class_code: 'ONCE123',
    description: 'Mã môn: IE104\nKhoa: Khoa Công nghệ Phần mềm',
    status: 'pending',
    lecturer_name: 'Nguyen Van A',
    created_at: '2026-01-01T00:00:00.000Z',
    approved_at: null,
  };

  await signIn(page, 'lecturer');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    if (route.request().method() === 'POST') {
      postCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { class: classRecord, approval_request_id: '99999999-9999-4999-8999-999999999999' } }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/teacher/classes');
  await page.getByRole('button', { name: 'Tạo lớp mới' }).click();
  await page.getByPlaceholder('VD: KTPM-K20: Kiến trúc Phần mềm Phân tán').fill('Lớp gửi một lần');
  await page.getByPlaceholder('VD: IT4409').fill('IE104');
  await page.getByLabel('Khoa / Viện quản lý *').selectOption('Khoa Công nghệ Phần mềm');

  const submitButton = page.locator('form button[type="submit"]');
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  await page.locator('form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  await expect(page.getByText('Yêu cầu mở lớp "Lớp gửi một lần" đã được gửi để quản trị viên phê duyệt.')).toBeVisible();
  expect(postCount).toBe(1);
});

test('trang thi không truy cập microphone/camera khi chức năng đang tạm hoãn', async ({ page }) => {
  await signIn(page, 'student');
  await page.goto('/student/exam/example-assignment');
  await expect(page.getByRole('heading', { name: 'Kiểm tra thiết bị và quy chế' })).toBeVisible();
  await expect(page.getByRole('button', { name: /microphone|camera|thiết bị/i })).toHaveCount(0);
});

test('sinh viên xem được tên giảng viên phụ trách lớp', async ({ page }) => {
  const classId = '55555555-5555-4555-8555-555555555555';
  await signIn(page, 'student');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: classId,
          class_name: 'Lớp kiểm thử giảng viên',
          class_code: 'GV123',
          description: null,
          status: 'active',
          lecturer_name: 'Nguyen Van A',
        }],
      }),
    });
  });

  await page.goto(`/student/classes/${classId}`);
  await expect(page.getByText('Giảng viên phụ trách: Nguyen Van A')).toBeVisible();
});

test('giảng viên xem được thông báo từ chối lớp trong hệ thống', async ({ page }) => {
  await signIn(page, 'lecturer');
  await page.route('**/api/notifications', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: '66666666-6666-4666-8666-666666666666',
          title: 'Yêu cầu tạo lớp bị từ chối',
          message: 'Yêu cầu tạo lớp bị từ chối: Thiếu thông tin.',
          notification_type: 'class_approval',
          related_entity_type: 'class',
          related_entity_id: '77777777-7777-4777-8777-777777777777',
          is_read: false,
          created_at: '2026-01-01T00:00:00.000Z',
        }],
      }),
    });
  });

  await page.getByRole('button', { name: 'Thông báo' }).click();
  await expect(page.getByRole('dialog')).toContainText('Yêu cầu tạo lớp bị từ chối');
  await expect(page.getByRole('dialog')).toContainText('Thiếu thông tin.');
});

test('giảng viên không thể vào lớp khi yêu cầu vẫn đang chờ duyệt', async ({ page }) => {
  const classId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const pendingClass = {
    id: classId,
    lecturer_id: userId,
    class_name: 'Lớp đang chờ duyệt',
    class_code: 'PEND123',
    description: 'Mã môn: IE104\nKhoa: Khoa Công nghệ Phần mềm',
    status: 'pending',
    lecturer_name: 'Nguyen Van A',
    created_at: '2026-01-01T00:00:00.000Z',
    approved_at: null,
  };
  let detailRequests = 0;

  await signIn(page, 'lecturer');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [pendingClass] }),
    });
  });
  await page.route(`**/api/classes/${classId}/members`, async (route) => {
    detailRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route(`**/api/classes/${classId}/assignments`, async (route) => {
    detailRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/teacher/classes');
  await expect(page.getByTestId('teacher-course-PEND123')).toContainText('Đang chờ duyệt — chưa thể vào lớp');
  await expect(page.getByTestId('teacher-course-PEND123').getByRole('link', { name: 'Danh sách SV (Roster)' })).toHaveCount(0);
  await page.goto(`/teacher/classes/${classId}`);
  await expect(page.locator('section[role="alert"]')).toContainText('Lớp đang chờ quản trị viên duyệt');
  expect(detailRequests).toBe(0);
});

test('sinh viên thấy tên giảng viên trong danh sách lớp', async ({ page }) => {
  const classId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await signIn(page, 'student');
  await page.unroute('**/api/classes');
  await page.route('**/api/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: classId,
          class_name: 'Lớp có giảng viên',
          class_code: 'NAME123',
          description: null,
          status: 'active',
          lecturer_name: 'Nguyen Van A',
        }],
      }),
    });
  });

  await page.goto('/student/classes');
  await expect(page.getByText('Giảng viên: Nguyen Van A')).toBeVisible();
});
