import { expect, test, type Page } from '@playwright/test';

const userId = '00000000-0000-4000-8000-000000000010';

interface MockTask {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string;
}

async function mockSignIn(page: Page, role: 'student' | 'teacher', tasks: MockTask[] = []) {
  let profileRequestCount = 0;

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
    profileRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        role,
        full_name: 'Nguyen Van A',
        faculty: 'CNTT',
        institutional_id: 'GV01',
      }]),
    });
  });

  await page.route('**/api/tasks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: tasks }),
    });
  });

  return () => profileRequestCount;
}

test.describe('Điều hướng theo vai trò trong hồ sơ', () => {
  for (const role of ['student', 'teacher'] as const) {
    test(`chuyển tài khoản ${role} tới đúng dashboard`, async ({ page }) => {
      const getProfileRequestCount = await mockSignIn(page, role);
      if (role === 'teacher') {
        await page.addInitScript(() => {
          class TestAudioContext {
            state = 'running';
            createMediaStreamSource() {
              return { connect: () => undefined, disconnect: () => undefined };
            }
            createAnalyser() {
              return {
                fftSize: 0,
                getByteTimeDomainData(samples: Uint8Array) {
                  samples.fill(150);
                },
              };
            }
            resume() {
              return Promise.resolve();
            }
            close() {
              this.state = 'closed';
              return Promise.resolve();
            }
          }

          Object.defineProperty(window, 'AudioContext', { configurable: true, value: TestAudioContext });
          Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
              getUserMedia: async () => new MediaStream(),
              enumerateDevices: async () => [{
                deviceId: 'test-microphone',
                groupId: 'test-group',
                kind: 'audioinput',
                label: 'Test Microphone',
                toJSON: () => ({}),
              }],
            },
          });
        });
      }
      await page.goto('/login');
      await expect(page.getByText('Chọn vai trò người dùng (bắt buộc)')).toHaveCount(0);
      await page.getByLabel(/Email tài khoản/i).fill('account@example.edu');
      await page.getByLabel(/^Mật khẩu/i).fill('example-password-123');
      await page.getByRole('button', { name: /Đăng nhập ngay vào hệ thống/i }).click();

      await page.waitForURL(role === 'student' ? '**/student' : '**/teacher');
      await expect(page).toHaveURL(new RegExp(`/${role === 'student' ? 'student' : 'teacher'}$`));

      if (role === 'teacher') {
        await expect(page.getByRole('heading', { name: /Xin chào, Nguyen Van A!/ })).toBeVisible();
        await expect(page.getByText('DỮ LIỆU DASHBOARD MINH HỌA')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Bài thi vấn đáp cần chấm điểm' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Lớp học đang phụ trách' })).toBeVisible();
        await expect(page.getByText('97.2%', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        const mobileWidths = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(mobileWidths.content).toBeLessThanOrEqual(mobileWidths.viewport);
        await page.setViewportSize({ width: 1280, height: 900 });
        const teacherSidebarLayout = await page.getByRole('navigation', { name: 'Điều hướng giảng viên' }).evaluate((nav) => {
          const sidebar = nav.closest('aside');
          const header = sidebar?.firstElementChild;
          return {
            availableWidth: document.documentElement.clientWidth,
            sidebarWidth: sidebar?.getBoundingClientRect().width,
            headerHeight: header?.getBoundingClientRect().height,
            items: Array.from(nav.querySelectorAll('a, button')).map((item) => ({
              height: item.getBoundingClientRect().height,
              icons: Array.from(item.querySelectorAll('svg')).map((icon) => ({
                width: icon.getBoundingClientRect().width,
                height: icon.getBoundingClientRect().height,
                path: icon.querySelector('path')?.getAttribute('d'),
              })),
            })),
          };
        });
        const profileRequestsBeforeClasses = getProfileRequestCount();
        await page.getByRole('link', { name: 'Lớp học & Hội đồng' }).click();
        await page.waitForURL('**/teacher/classes');
        await expect.poll(getProfileRequestCount).toBe(profileRequestsBeforeClasses);
        const classesSidebarLayout = await page.getByRole('navigation', { name: 'Điều hướng giảng viên' }).evaluate((nav) => {
          const sidebar = nav.closest('aside');
          const header = sidebar?.firstElementChild;
          return {
            availableWidth: document.documentElement.clientWidth,
            sidebarWidth: sidebar?.getBoundingClientRect().width,
            headerHeight: header?.getBoundingClientRect().height,
            items: Array.from(nav.querySelectorAll('a, button')).map((item) => ({
              height: item.getBoundingClientRect().height,
              icons: Array.from(item.querySelectorAll('svg')).map((icon) => ({
                width: icon.getBoundingClientRect().width,
                height: icon.getBoundingClientRect().height,
                path: icon.querySelector('path')?.getAttribute('d'),
              })),
            })),
          };
        });
        expect(classesSidebarLayout).toEqual(teacherSidebarLayout);
        await expect(page.getByText('Đang xác minh tài khoản giảng viên...')).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Lớp học phụ trách & Cố vấn học tập' })).toBeVisible();
        await expect(page.getByText('DỮ LIỆU LỚP HỌC MINH HỌA')).toBeVisible();
        await expect(page.getByTestId('teacher-course-AIO-8892')).toBeVisible();
        await page.getByLabel('Tìm lớp học').fill('IoT');
        await expect(page.locator('[data-testid^="teacher-course-"]')).toHaveCount(1);
        await page.getByLabel('Tìm lớp học').fill('');
        await page.locator('a[href="/teacher/classes/AIO-8892"]').click();
        await page.waitForURL('**/teacher/classes/AIO-8892');
        await expect(page.getByRole('heading', { name: 'KTPM-K20: Kiến trúc Phần mềm' })).toBeVisible();
        await expect(page.getByText('DỮ LIỆU SINH VIÊN MINH HỌA')).toBeVisible();
        await page.getByLabel('Tìm sinh viên').fill('Dung');
        await expect(page.getByRole('row', { name: /Phạm Thùy Dung/ })).toBeVisible();
        await page.getByRole('button', { name: /Điểm xuất sắc/ }).click();
        await expect(page.getByRole('row', { name: /Phạm Thùy Dung/ })).toBeVisible();
        await expect(page.getByRole('row', { name: /Trần Quốc Bảo/ })).toHaveCount(0);
        await page.getByRole('link', { name: /Quay lại danh sách lớp/ }).click();
        await page.waitForURL('**/teacher/classes');
        await page.getByRole('button', { name: /Lớp Cố vấn học tập/ }).click();
        await expect(page.getByText('Lớp Cố vấn học tập & Chủ nhiệm (Academic Advisory)')).toBeVisible();
        await page.getByRole('link', { name: 'Hồ sơ cá nhân' }).click();
        await page.waitForURL('**/teacher/profile');
        await expect(page.getByRole('heading', { name: /Xin chào, Nguyen Van A!/ })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Thông tin Cá nhân & Nhân thân/ })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Dashboard tổng quan' })).toHaveAttribute('href', '/teacher');
        await page.setViewportSize({ width: 390, height: 844 });
        const mobileProfileWidths = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(mobileProfileWidths.content).toBeLessThanOrEqual(mobileProfileWidths.viewport);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.getByRole('link', { name: 'Dashboard tổng quan' }).click();
        await page.waitForURL('**/teacher');
        await page.getByRole('link', { name: 'Cài đặt cá nhân' }).click();
        await page.waitForURL('**/teacher/settings');
        await expect(page.getByRole('heading', { name: /Cài đặt Cá nhân & Hồ sơ Giảng viên/ })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        const mobileSettingsWidths = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(mobileSettingsWidths.content).toBeLessThanOrEqual(mobileSettingsWidths.viewport);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.getByRole('tab', { name: /Bảo mật & Mật khẩu/ }).click();
        await page.getByLabel('Mật khẩu hiện tại').fill('CurrentPassword123!');
        await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewPassword123!');
        await page.getByLabel('Xác nhận mật khẩu mới').fill('DoesNotMatch123!');
        await page.getByRole('button', { name: 'Cập nhật mật khẩu' }).click();
        await expect(page.getByText('Mật khẩu xác nhận chưa khớp.', { exact: true })).toBeVisible();
        await page.getByRole('tab', { name: /Thiết bị Âm thanh & Thông báo/ }).click();
        await page.getByRole('button', { name: 'Thử mic & Đo âm' }).click();
        await expect(page.getByLabel('Thiết bị microphone')).toContainText('Test Microphone');
        await expect(page.getByRole('button', { name: 'Dừng kiểm tra' })).toBeVisible();
        await expect(page.getByText(/Mức tín hiệu đầu vào: -15 dBFS/)).toBeVisible();
        await page.getByRole('button', { name: 'Dừng kiểm tra' }).click();
        await page.getByRole('link', { name: 'Tổng quan', exact: true }).click();
        await page.waitForURL('**/teacher');
        const profileRequestsBeforeOverview = getProfileRequestCount();
        await page.getByRole('link', { name: 'Tổng quan' }).click();
        await page.waitForURL('**/teacher');
        await expect.poll(getProfileRequestCount).toBe(profileRequestsBeforeOverview);
        await expect(page.getByText('Đang xác minh tài khoản giảng viên...')).toHaveCount(0);
        await page.goto('/tasks');
        await page.waitForURL('**/teacher');
        const sidebar = page.getByRole('navigation', { name: 'Điều hướng giảng viên' });
        await expect(sidebar.getByRole('link', { name: 'Lớp học & Hội đồng' })).toBeVisible();
        await expect(sidebar.getByRole('button', { name: 'Kho bản ghi âm' })).toBeDisabled();
        await page.getByRole('button', { name: 'Xuất báo cáo tổng hợp' }).click();
        await expect(page.getByRole('dialog')).toContainText('Chức năng xuất báo cáo chưa được kết nối');
        await page.getByRole('button', { name: 'Đã hiểu' }).click();
        await sidebar.getByRole('button', { name: 'Đăng xuất' }).click();
        await page.waitForURL('**/login');
      } else {
        await expect(page.getByRole('heading', { name: /Chào buổi sáng, Nguyen Van A!/ })).toBeVisible();
        await expect(page.getByText('DỮ LIỆU DASHBOARD MINH HỌA')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Bài tập vấn đáp cần nộp gấp (Deadlines)' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Lớp học đang ghi danh' })).toBeVisible();
        await page.setViewportSize({ width: 1280, height: 900 });
        const overviewSidebarLayout = await page.getByRole('navigation', { name: 'Điều hướng sinh viên' }).evaluate((nav) => {
          const sidebar = nav.closest('aside');
          const header = sidebar?.firstElementChild;
          return {
            availableWidth: document.documentElement.clientWidth,
            sidebarWidth: sidebar?.getBoundingClientRect().width,
            headerHeight: header?.getBoundingClientRect().height,
            items: Array.from(nav.querySelectorAll('a, button, [aria-current="page"]')).map((item) => ({
              height: item.getBoundingClientRect().height,
              icons: Array.from(item.querySelectorAll('svg')).map((icon) => ({
                width: icon.getBoundingClientRect().width,
                height: icon.getBoundingClientRect().height,
                path: icon.querySelector('path')?.getAttribute('d'),
              })),
            })),
          };
        });
        const profileRequestsBeforeNavigation = getProfileRequestCount();
        await page.getByRole('link', { name: 'Bài tập oral' }).click();
        await page.waitForURL('**/tasks');
        await expect.poll(getProfileRequestCount).toBe(profileRequestsBeforeNavigation);
        await expect(page.getByText('Đang xác minh tài khoản...')).toHaveCount(0);
        const tasksSidebarLayout = await page.getByRole('navigation', { name: 'Điều hướng sinh viên' }).evaluate((nav) => {
          const sidebar = nav.closest('aside');
          const header = sidebar?.firstElementChild;
          return {
            availableWidth: document.documentElement.clientWidth,
            sidebarWidth: sidebar?.getBoundingClientRect().width,
            headerHeight: header?.getBoundingClientRect().height,
            items: Array.from(nav.querySelectorAll('a, button, [aria-current="page"]')).map((item) => ({
              height: item.getBoundingClientRect().height,
              icons: Array.from(item.querySelectorAll('svg')).map((icon) => ({
                width: icon.getBoundingClientRect().width,
                height: icon.getBoundingClientRect().height,
                path: icon.querySelector('path')?.getAttribute('d'),
              })),
            })),
          };
        });
        expect(tasksSidebarLayout).toEqual(overviewSidebarLayout);
        await expect(page.getByRole('heading', { name: 'Danh sách Bài tập & Thi Vấn đáp (Oral)' })).toBeVisible();
        await expect(page.getByText('DỮ LIỆU DEMO', { exact: true })).toBeVisible();
        await expect(page.getByTestId('demo-assignment-cs102-heap')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Bạn chưa có công việc cá nhân nào' })).toBeVisible();
        await expect(page.getByRole('button', { name: '+ Thêm công việc' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Chạy kiểm tra độ tạp âm môi trường' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Sắp xếp danh sách' })).toBeVisible();

        const sidebar = page.getByRole('navigation', { name: 'Điều hướng sinh viên' });
        await expect(sidebar.getByRole('link', { name: 'Phòng thu âm AI' })).toHaveAttribute('href', '/student/recorder');
        await page.setViewportSize({ width: 390, height: 844 });
        const mobileWidths = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(mobileWidths.content).toBeLessThanOrEqual(mobileWidths.viewport);
        await page.setViewportSize({ width: 1280, height: 900 });
        const profileRequestsBeforeStudentOverview = getProfileRequestCount();
        await sidebar.getByRole('link', { name: 'Tổng quan' }).click();
        await page.waitForURL('**/student');
        await expect.poll(getProfileRequestCount).toBe(profileRequestsBeforeStudentOverview);
        await expect(page.getByText('Đang xác minh tài khoản sinh viên...')).toHaveCount(0);
        await page.goto('/teacher');
        await page.waitForURL('**/student');
        const studentSidebar = page.getByRole('navigation', { name: 'Điều hướng sinh viên' });
        await studentSidebar.getByRole('button', { name: 'Đăng xuất' }).click();
        await page.waitForURL('**/login');
      }
    });
  }
});

test('lọc, tìm kiếm và sắp xếp bài thi demo', async ({ page }) => {
  await mockSignIn(page, 'student');
  await page.goto('/login');
  await page.getByLabel(/Email tài khoản/i).fill('account@example.edu');
  await page.getByLabel(/^Mật khẩu/i).fill('example-password-123');
  await page.getByRole('button', { name: /Đăng nhập ngay vào hệ thống/i }).click();
  await page.waitForURL('**/student');
  await page.goto('/tasks');

  await expect(page.locator('[data-testid^="demo-assignment-"]')).toHaveCount(4);
  await page.getByRole('button', { name: /Cần nộp gấp/ }).click();
  await expect(page.locator('[data-testid^="demo-assignment-"]')).toHaveCount(2);
  await expect(page.getByTestId('demo-assignment-it4409-microservices')).toHaveCount(0);

  await page.getByLabel('Tìm kiếm bài tập').fill('Cloud Distributed');
  await expect(page.locator('[data-testid^="demo-assignment-"]')).toHaveCount(1);
  await expect(page.getByText('Oral Presentation: Cloud Distributed Storage Architecture')).toBeVisible();

  await page.getByLabel('Tìm kiếm bài tập').fill('');
  await page.getByRole('button', { name: /Tất cả bài tập/ }).click();
  await page.getByRole('combobox', { name: 'Lọc theo môn học' }).selectOption('IT4409');
  await expect(page.locator('[data-testid^="demo-assignment-"]')).toHaveCount(1);
  await expect(page.getByTestId('demo-assignment-it4409-microservices')).toBeVisible();
  await page.getByRole('combobox', { name: 'Lọc theo môn học' }).selectOption('all');
  await page.getByRole('combobox', { name: 'Sắp xếp danh sách' }).selectOption('title');
  const taskTitles = await page.locator('[data-testid^="demo-assignment-"] h2').allTextContents();
  expect(taskTitles[0]).toBe('Bài tập Oral 2 - Cấu trúc dữ liệu Heap & QuickSort');
});

test('điều hướng lớp học và kiểm tra điều kiện vào phòng thi sinh viên', async ({ page }) => {
  await page.addInitScript(() => {
    class TestAudioContext {
      createMediaStreamSource() {
        return { connect: () => undefined, disconnect: () => undefined };
      }

      createAnalyser() {
        return {
          fftSize: 0,
          frequencyBinCount: 32,
          getByteTimeDomainData(samples: Uint8Array) {
            samples.fill(128);
          },
        };
      }

      resume() {
        return Promise.resolve();
      }

      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, 'AudioContext', { configurable: true, value: TestAudioContext });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => new MediaStream() },
    });
  });
  await mockSignIn(page, 'student');
  await page.goto('/login');
  await page.getByLabel(/Email tài khoản/i).fill('account@example.edu');
  await page.getByLabel(/^Mật khẩu/i).fill('example-password-123');
  await page.getByRole('button', { name: /Đăng nhập ngay vào hệ thống/i }).click();
  await page.waitForURL('**/student');

  await page.getByRole('link', { name: 'Lớp học của tôi' }).click();
  await page.waitForURL('**/student/classes');
  await expect(page.getByRole('heading', { name: 'Lớp học của tôi & Kế hoạch học tập' })).toBeVisible();
  await expect(page.getByText('DỮ LIỆU LỚP HỌC MINH HỌA')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Các lớp mình học \(4 học phần\)/ })).toBeVisible();
  await page.getByLabel('Tìm lớp học').fill('CS102');
  await expect(page.getByText('53/60 sinh viên')).toBeVisible();
  await expect(page.getByText('48/50 sinh viên')).toHaveCount(0);

  await page.getByRole('button', { name: 'Tham gia lớp bằng mã' }).click();
  await page.getByLabel('Mã lớp học').fill('AIO-1234');
  await page.getByRole('button', { name: 'Kiểm tra mã' }).click();
  await expect(page.getByRole('status')).toContainText('mã lớp chưa được gửi hoặc lưu');
  await page.getByRole('dialog').getByText('Đóng', { exact: true }).click();

  await page.getByRole('link', { name: 'Phòng thu âm AI' }).click();
  await page.waitForURL('**/student/recorder');
  await expect(page.getByRole('heading', { name: /Kiểm tra Thiết bị & Xác thực Quy chế Phòng thi/ })).toBeVisible();
  const enterExamButton = page.getByRole('button', { name: /Xác nhận thiết bị & Vào làm bài thi ngay/ });
  await expect(enterExamButton).toBeDisabled();
  await page.getByRole('checkbox').check();
  await expect(enterExamButton).toBeDisabled();
  await page.getByRole('button', { name: 'Kết nối webcam & microphone' }).click();
  await expect(page.getByText('● ĐÃ KẾT NỐI')).toBeVisible();
  await expect(enterExamButton).toBeEnabled();
  await enterExamButton.click();
  await expect(page.getByRole('status')).toContainText('chưa thể bắt đầu ca thi thật');

  await page.getByRole('checkbox').uncheck();
  await expect(enterExamButton).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(mobileWidths.content).toBeLessThanOrEqual(mobileWidths.viewport);
});
