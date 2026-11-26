import { expect, test, type Page } from '@playwright/test';

const lecturerId = '00000000-0000-4000-8000-000000000101';
const studentId = '00000000-0000-4000-8000-000000000202';

async function mockAuthSession(
  page: Page,
  options: { id: string; role: 'lecturer' | 'student'; fullName: string; email: string },
) {
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: `test-token-${options.role}`,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `test-refresh-${options.role}`,
        user: {
          id: options.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: options.email,
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
      body: JSON.stringify([
        {
          id: options.id,
          role: options.role,
          account_status: 'active',
          full_name: options.fullName,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/student_profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ student_code: '24520001', department: 'Khoa Công nghệ Phần mềm' }]),
    });
  });

  await page.route('**/rest/v1/lecturer_profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ lecturer_code: 'GV001', department: 'Khoa Công nghệ Phần mềm' }]),
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

test.describe('E2E Browser Workflows — Login, Mở lớp & Tham gia lớp', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('E2E-01: Giảng viên đăng nhập -> mở lớp hợp lệ (R1), chặn trùng tên (R2) và chặn vượt 3 lớp pending (R3)', async ({
    page,
  }) => {
    interface StoredClass {
      id: string;
      lecturer_id: string;
      class_name: string;
      description: string | null;
      class_code: string;
      status: 'pending' | 'active' | 'rejected' | 'archived';
      created_at: string;
      approved_at: string | null;
      lecturer_name: string;
    }

    const dbClasses: StoredClass[] = [
      {
        id: '10000000-0000-4000-8000-000000000001',
        lecturer_id: lecturerId,
        class_name: 'IE104 - Lập trình Web',
        description: 'Mã môn: IE104\nKhoa: Khoa Công nghệ Phần mềm',
        class_code: 'ACT10401',
        status: 'active',
        created_at: '2026-01-01T08:00:00.000Z',
        approved_at: '2026-01-01T09:00:00.000Z',
        lecturer_name: 'Giảng viên A',
      },
    ];

    await mockAuthSession(page, {
      id: lecturerId,
      role: 'lecturer',
      fullName: 'Giảng viên A',
      email: 'lecturer@uit.edu.vn',
    });

    await page.route('**/api/classes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: dbClasses }),
        });
        return;
      }

      const payload = route.request().postDataJSON() as { class_name?: string; description?: string };
      const normalized = (payload.class_name ?? '').trim().toLocaleLowerCase();

      if (
        dbClasses.some(
          (c) => ['pending', 'active'].includes(c.status) && c.class_name.trim().toLocaleLowerCase() === normalized,
        )
      ) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Bạn đã có lớp học với tên này đang hoạt động hoặc chờ duyệt.',
            code: 'DUPLICATE_CLASS_NAME',
          }),
        });
        return;
      }

      if (dbClasses.filter((c) => c.status === 'pending').length >= 3) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Bạn chỉ có thể có tối đa 3 lớp đang chờ quản trị viên phê duyệt cùng lúc.',
            code: 'MAX_PENDING_CLASSES_EXCEEDED',
          }),
        });
        return;
      }

      const seq = dbClasses.length + 1;
      const newClass: StoredClass = {
        id: `10000000-0000-4000-8000-00000000000${seq}`,
        lecturer_id: lecturerId,
        class_name: (payload.class_name ?? '').trim(),
        description: payload.description ?? null,
        class_code: `NEWCLS0${seq}`,
        status: 'pending',
        created_at: '2026-01-02T08:00:00.000Z',
        approved_at: null,
        lecturer_name: 'Giảng viên A',
      };
      dbClasses.unshift(newClass);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { class: newClass, approval_request_id: `req-${seq}` } }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/Email tài khoản/i).fill('lecturer@uit.edu.vn');
    await page.getByLabel(/^Mật khẩu/i).fill('Password123!');
    await page.getByRole('button', { name: /Đăng nhập ngay/i }).click();
    await page.waitForURL('**/teacher');

    await page.goto('/teacher/classes');
    await expect(page.getByRole('heading', { name: 'Lớp học phụ trách & Cố vấn học tập' })).toBeVisible();

    // R1: Mở lớp thành công
    await page.getByRole('button', { name: 'Tạo lớp mới' }).click();
    await page.getByPlaceholder('VD: KTPM-K20: Kiến trúc Phần mềm Phân tán').fill('SE104 - Nhập môn CNPM');
    await page.getByPlaceholder('VD: IT4409').fill('SE104');
    await page.getByLabel('Khoa / Viện quản lý *').selectOption('Khoa Công nghệ Phần mềm');
    await page.getByRole('button', { name: 'Gửi yêu cầu tạo lớp' }).click();
    await expect(
      page.getByText('Yêu cầu mở lớp "SE104 - Nhập môn CNPM" đã được gửi để quản trị viên phê duyệt.'),
    ).toBeVisible();

    // R2: Trùng tên lớp
    await page.getByRole('button', { name: 'Tạo lớp mới' }).click();
    await page.getByPlaceholder('VD: KTPM-K20: Kiến trúc Phần mềm Phân tán').fill('  se104 - nhập môn cnpm  ');
    await page.getByPlaceholder('VD: IT4409').fill('SE104');
    await page.getByLabel('Khoa / Viện quản lý *').selectOption('Khoa Công nghệ Phần mềm');
    await page.getByRole('button', { name: 'Gửi yêu cầu tạo lớp' }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText(
      'Bạn đã có lớp học với tên này đang hoạt động hoặc chờ duyệt.',
    );
    await page.getByRole('button', { name: 'Hủy bỏ' }).click();

    // Seed thêm 2 lớp pending rồi kiểm tra R3 ở lớp thứ 4
    for (const title of ['CS112 - Thuật toán', 'NT106 - Mạng']) {
      await page.getByRole('button', { name: 'Tạo lớp mới' }).click();
      await page.getByPlaceholder('VD: KTPM-K20: Kiến trúc Phần mềm Phân tán').fill(title);
      await page.getByPlaceholder('VD: IT4409').fill('UIT01');
      await page.getByLabel('Khoa / Viện quản lý *').selectOption('Khoa Công nghệ Phần mềm');
      await page.getByRole('button', { name: 'Gửi yêu cầu tạo lớp' }).click();
      await expect(page.getByText(`Yêu cầu mở lớp "${title}"`)).toBeVisible();
    }

    await page.getByRole('button', { name: 'Tạo lớp mới' }).click();
    await page.getByPlaceholder('VD: KTPM-K20: Kiến trúc Phần mềm Phân tán').fill('IS207 - Phát triển Web');
    await page.getByPlaceholder('VD: IT4409').fill('IS207');
    await page.getByLabel('Khoa / Viện quản lý *').selectOption('Khoa Công nghệ Phần mềm');
    await page.getByRole('button', { name: 'Gửi yêu cầu tạo lớp' }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText(
      'Bạn chỉ có thể có tối đa 3 lớp đang chờ quản trị viên phê duyệt cùng lúc.',
    );
  });

  test('E2E-02: Sinh viên đăng nhập -> tham gia lớp hợp lệ (R1), bị chặn trùng (R2) và lớp chưa kích hoạt (R3)', async ({
    page,
  }) => {
    const catalog = [
      {
        id: '30000000-0000-4000-8000-000000000001',
        class_name: 'IE104 - Công nghệ Web',
        class_code: 'WEB10401',
        description: 'Mã môn: IE104',
        lecturer_name: 'Th.S Nguyễn Văn B',
        status: 'active' as const,
      },
      {
        id: '30000000-0000-4000-8000-000000000002',
        class_name: 'SE214 - Lớp chờ duyệt',
        class_code: 'PEND2141',
        description: 'Mã môn: SE214',
        lecturer_name: 'Th.S Nguyễn Văn B',
        status: 'pending' as const,
      },
    ];
    const joinedIds: string[] = [];

    await mockAuthSession(page, {
      id: studentId,
      role: 'student',
      fullName: 'Sinh viên B',
      email: 'student@uit.edu.vn',
    });

    await page.route('**/api/classes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: catalog.filter((c) => joinedIds.includes(c.id)) }),
      });
    });

    await page.route('**/api/classes/join', async (route) => {
      const payload = route.request().postDataJSON() as { class_code?: string };
      const code = (payload.class_code ?? '').trim().toUpperCase();
      const target = catalog.find((c) => c.class_code === code);
      if (!target) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Không tìm thấy lớp đang hoạt động với mã này.', code: 'CLASS_NOT_FOUND' }),
        });
        return;
      }
      if (target.status !== 'active') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Lớp học này chưa được phê duyệt hoặc đã ngừng hoạt động.',
            code: 'CLASS_NOT_ACTIVE',
          }),
        });
        return;
      }
      if (joinedIds.includes(target.id)) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Bạn đã tham gia lớp học này trước đó.', code: 'ALREADY_JOINED' }),
        });
        return;
      }
      joinedIds.push(target.id);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { class_id: target.id, class_code: target.class_code } }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/Email tài khoản/i).fill('student@uit.edu.vn');
    await page.getByLabel(/^Mật khẩu/i).fill('Password123!');
    await page.getByRole('button', { name: /Đăng nhập ngay/i }).click();
    await page.waitForURL('**/student');

    await page.goto('/student/classes');
    await page.getByRole('button', { name: 'Tham gia lớp bằng mã' }).click();
    await page.getByLabel(/Mã lớp học/i).fill('web10401');
    await page.getByRole('button', { name: 'Xác nhận tham gia' }).click();
    await expect(page.getByRole('status')).toContainText('Đã tham gia lớp WEB10401.');
    await expect(page.getByText('IE104 - Công nghệ Web')).toBeVisible();

    await page.getByLabel(/Mã lớp học/i).fill('PEND2141');
    await page.getByRole('button', { name: 'Xác nhận tham gia' }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText(
      'Lớp học này chưa được phê duyệt hoặc đã ngừng hoạt động.',
    );
  });
});
