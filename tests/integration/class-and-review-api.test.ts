import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/oralcheck-api';

interface TestClassRow {
  id: string;
  lecturer_id: string;
  class_name: string;
  description: string | null;
  class_code: string;
  status: 'pending' | 'active' | 'rejected' | 'archived';
  created_at: string;
  approved_at: string | null;
}

interface TestApprovalRow {
  id: string;
  requester_id: string;
  request_type: string;
  target_id: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface TestMemberRow {
  class_id: string;
  student_id: string;
  status: 'active' | 'left' | 'removed';
}

interface TestGradeReviewRow {
  id: string;
  submission_id: string;
  lecturer_id: string;
  final_score: number;
  reviewer_feedback: string | null;
  score_modified: boolean;
}

const LECTURER_ID = '00000000-0000-4000-8000-000000000101';
const STUDENT_ID = '00000000-0000-4000-8000-000000000202';
const SUBMISSION_ID = '33333333-3333-4333-8333-333333333333';

let currentSession: { userId: string; role: AppRole } | null = null;

// Isolated In-Memory Test Database (tách biệt hoàn toàn với Supabase Dev DB)
const testDb = {
  users: new Map<string, { id: string; full_name: string; role: AppRole }>(),
  classes: [] as TestClassRow[],
  approvalRequests: [] as TestApprovalRow[],
  classMembers: [] as TestMemberRow[],
  gradeReviews: [] as TestGradeReviewRow[],
};

function createTestSupabaseAdapter(userId: string, role: AppRole) {
  return {
    from(table: string) {
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push((row) => row[col] === val);
          return builder;
        },
        neq(col: string, val: unknown) {
          filters.push((row) => row[col] !== val);
          return builder;
        },
        in(col: string, vals: unknown[]) {
          filters.push((row) => vals.includes(row[col]));
          return builder;
        },
        order() {
          return builder;
        },
        then(resolve: (res: { data: unknown[]; error: null }) => void) {
          const source =
            table === 'classes'
              ? testDb.classes
              : table === 'class_members'
                ? testDb.classMembers
                : [];
          const rows = (source as unknown as Array<Record<string, unknown>>).filter((r) =>
            filters.every((fn) => fn(r)),
          );
          resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
    async rpc(fnName: string, params: Record<string, unknown>) {
      if (fnName === 'create_class_request') {
        const className = String(params.p_class_name ?? '').trim();
        const duplicate = testDb.classes.some(
          (c) =>
            c.lecturer_id === userId &&
            (c.status === 'pending' || c.status === 'active') &&
            c.class_name.trim().toLocaleLowerCase() === className.toLocaleLowerCase(),
        );
        if (duplicate) return { data: null, error: { message: 'Duplicate class name' } };

        const pendingCount = testDb.classes.filter(
          (c) => c.lecturer_id === userId && c.status === 'pending',
        ).length;
        if (role === 'lecturer' && pendingCount >= 3) {
          return { data: null, error: { message: 'Maximum pending classes reached' } };
        }

        const seq = testDb.classes.length + 1;
        const created: TestClassRow = {
          id: `10000000-0000-4000-8000-00000000000${seq}`,
          lecturer_id: userId,
          class_name: className,
          description: (params.p_description as string | null) ?? null,
          class_code: String(params.p_class_code),
          status: role === 'admin' ? 'active' : 'pending',
          created_at: new Date().toISOString(),
          approved_at: role === 'admin' ? new Date().toISOString() : null,
        };
        testDb.classes.push(created);

        let requestId: string | null = null;
        if (role === 'lecturer') {
          requestId = `20000000-0000-4000-8000-00000000000${seq}`;
          testDb.approvalRequests.push({
            id: requestId,
            requester_id: userId,
            request_type: 'class_creation',
            target_id: created.id,
            status: 'pending',
          });
        }
        return { data: { class: created, approval_request_id: requestId }, error: null };
      }

      if (fnName === 'class_lecturer_names') {
        const ids = (params.p_class_ids as string[]) ?? [];
        const rows = ids.map((id) => {
          const cls = testDb.classes.find((c) => c.id === id);
          const owner = cls ? testDb.users.get(cls.lecturer_id) : undefined;
          return { class_id: id, lecturer_name: owner?.full_name ?? null };
        });
        return { data: rows, error: null };
      }

      if (fnName === 'join_class_by_code') {
        const code = String(params.p_class_code ?? '').trim().toUpperCase();
        const cls = testDb.classes.find((c) => c.class_code === code);
        if (!cls) return { data: null, error: { message: 'Active class code not found' } };
        if (cls.status !== 'active') return { data: null, error: { message: 'Class is not active' } };

        const existing = testDb.classMembers.find(
          (m) => m.class_id === cls.id && m.student_id === userId,
        );
        if (existing?.status === 'active') {
          return { data: null, error: { message: 'Student already joined this class' } };
        }
        if (existing) {
          existing.status = 'active';
        } else {
          testDb.classMembers.push({ class_id: cls.id, student_id: userId, status: 'active' });
        }
        return { data: cls.id, error: null };
      }

      if (fnName === 'review_submission') {
        const subId = String(params.p_submission_id);
        if (subId !== SUBMISSION_ID) {
          return { data: null, error: { message: 'Submitted answer not found or forbidden' } };
        }
        const review: TestGradeReviewRow = {
          id: `40000000-0000-4000-8000-00000000000${testDb.gradeReviews.length + 1}`,
          submission_id: subId,
          lecturer_id: userId,
          final_score: Number(params.p_final_score),
          reviewer_feedback: (params.p_reviewer_feedback as string | null) ?? null,
          score_modified: Boolean(params.p_score_modified),
        };
        testDb.gradeReviews.push(review);
        return { data: review, error: null };
      }

      return { data: null, error: { message: `Unknown RPC: ${fnName}` } };
    },
  };
}

vi.mock('@/lib/oralcheck-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/oralcheck-api')>('@/lib/oralcheck-api');
  return {
    ...actual,
    authenticateRole: async (_request: Request, allowedRoles?: readonly AppRole[]) => {
      if (!currentSession) {
        return { ok: false, response: actual.apiJson({ error: 'Chưa đăng nhập' }, 401) };
      }
      if (allowedRoles && !allowedRoles.includes(currentSession.role)) {
        return {
          ok: false,
          response: actual.apiJson({ error: 'Bạn không có quyền thực hiện thao tác này' }, 403),
        };
      }
      return {
        ok: true,
        value: {
          db: createTestSupabaseAdapter(currentSession.userId, currentSession.role),
          user: { id: currentSession.userId },
          role: currentSession.role,
        },
      };
    },
  };
});

import { POST as postClasses } from '@/app/api/classes/route';
import { POST as postJoinClass } from '@/app/api/classes/join/route';
import { POST as postReviewSubmission } from '@/app/api/submissions/[id]/review/route';

describe('Integration Tests — API Route Handlers + Isolated Test DB', () => {
  beforeEach(() => {
    currentSession = null;
    testDb.users.clear();
    testDb.users.set(LECTURER_ID, { id: LECTURER_ID, full_name: 'Giảng viên A', role: 'lecturer' });
    testDb.users.set(STUDENT_ID, { id: STUDENT_ID, full_name: 'Sinh viên B', role: 'student' });

    testDb.classes = [
      {
        id: '10000000-0000-4000-8000-000000000001',
        lecturer_id: LECTURER_ID,
        class_name: 'IE104 - Lập trình Web',
        description: 'Mã môn: IE104',
        class_code: 'ACT10401',
        status: 'active',
        created_at: '2026-11-01T08:00:00.000Z',
        approved_at: '2026-11-01T09:00:00.000Z',
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        lecturer_id: LECTURER_ID,
        class_name: 'SE101 - Lớp chờ duyệt',
        description: null,
        class_code: 'PEN10101',
        status: 'pending',
        created_at: '2026-11-02T08:00:00.000Z',
        approved_at: null,
      },
    ];
    testDb.approvalRequests = [];
    testDb.classMembers = [];
    testDb.gradeReviews = [];
  });

  it('IT-01: POST /api/classes (R1) ghi 1 dòng classes + 1 dòng approval_requests vào Test DB', async () => {
    currentSession = { userId: LECTURER_ID, role: 'lecturer' };
    const req = new Request('http://localhost:3000/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_name: 'SE104 - Nhập môn CNPM',
        description: 'Mã môn: SE104\nKhoa: Khoa Công nghệ Phần mềm',
      }),
    });

    const res = await postClasses(req);
    const body = (await res.json()) as {
      data: { class: TestClassRow & { lecturer_name: string }; approval_request_id: string };
    };

    expect(res.status).toBe(201);
    expect(body.data.class.class_name).toBe('SE104 - Nhập môn CNPM');
    expect(body.data.class.status).toBe('pending');
    expect(body.data.class.lecturer_name).toBe('Giảng viên A');
    expect(testDb.classes).toHaveLength(3);
    expect(testDb.approvalRequests).toHaveLength(1);
    expect(testDb.approvalRequests[0].target_id).toBe(body.data.class.id);
  });

  it('IT-02: POST /api/classes chặn R2 (trùng tên) và R3 (đủ 3 pending) mà không làm thay đổi DB', async () => {
    currentSession = { userId: LECTURER_ID, role: 'lecturer' };

    // R2: Trùng tên với lớp active sẵn có (khác hoa thường/khoảng trắng)
    const dupRes = await postClasses(
      new Request('http://localhost:3000/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: '  ie104 - lập trình web  ' }),
      }),
    );
    expect(dupRes.status).toBe(409);
    expect(await dupRes.json()).toMatchObject({ code: 'DUPLICATE_CLASS_NAME' });
    expect(testDb.classes).toHaveLength(2);

    // Seed thêm 2 lớp pending nữa -> tổng cộng 3 lớp pending
    for (const title of ['Pending 2', 'Pending 3']) {
      const okRes = await postClasses(
        new Request('http://localhost:3000/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class_name: title }),
        }),
      );
      expect(okRes.status).toBe(201);
    }

    // R3: Lớp thứ 4 bị từ chối, DB giữ nguyên
    const countBeforeR3 = testDb.classes.length;
    const r3Res = await postClasses(
      new Request('http://localhost:3000/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: 'IS207 - Phát triển Web' }),
      }),
    );
    expect(r3Res.status).toBe(409);
    expect(await r3Res.json()).toMatchObject({ code: 'MAX_PENDING_CLASSES_EXCEEDED' });
    expect(testDb.classes).toHaveLength(countBeforeR3);
  });

  it('IT-03: POST /api/classes từ chối request thiếu token (401) và sai vai trò student (403)', async () => {
    // Chưa đăng nhập -> 401
    currentSession = null;
    const unauthRes = await postClasses(
      new Request('http://localhost:3000/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: 'Lớp bất kỳ' }),
      }),
    );
    expect(unauthRes.status).toBe(401);

    // Đang đăng nhập với quyền student -> 403
    currentSession = { userId: STUDENT_ID, role: 'student' };
    const studentRes = await postClasses(
      new Request('http://localhost:3000/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: 'Lớp trái phép' }),
      }),
    );
    expect(studentRes.status).toBe(403);
    expect(testDb.classes).toHaveLength(2);
  });

  it('IT-04: POST /api/classes/join xử lý tham gia lớp (201), trùng lớp (409), lớp chưa duyệt (409) và mã không tồn tại (404)', async () => {
    currentSession = { userId: STUDENT_ID, role: 'student' };

    // Tham gia lớp active -> 201 và tăng +1 dòng class_members
    const joinOk = await postJoinClass(
      new Request('http://localhost:3000/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: 'act10401' }),
      }),
    );
    expect(joinOk.status).toBe(201);
    expect(await joinOk.json()).toEqual({
      data: { class_id: '10000000-0000-4000-8000-000000000001', class_code: 'ACT10401' },
    });
    expect(testDb.classMembers).toHaveLength(1);

    // Tham gia lại cùng lớp -> 409 ALREADY_JOINED, số dòng giữ nguyên
    const joinDup = await postJoinClass(
      new Request('http://localhost:3000/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: 'ACT10401' }),
      }),
    );
    expect(joinDup.status).toBe(409);
    expect(await joinDup.json()).toMatchObject({ code: 'ALREADY_JOINED' });
    expect(testDb.classMembers).toHaveLength(1);

    // Lớp đang pending -> 409 CLASS_NOT_ACTIVE
    const joinPending = await postJoinClass(
      new Request('http://localhost:3000/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: 'PEN10101' }),
      }),
    );
    expect(joinPending.status).toBe(409);
    expect(await joinPending.json()).toMatchObject({ code: 'CLASS_NOT_ACTIVE' });

    // Mã không tồn tại -> 404 CLASS_NOT_FOUND
    const joinMissing = await postJoinClass(
      new Request('http://localhost:3000/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: 'NOPE9999' }),
      }),
    );
    expect(joinMissing.status).toBe(404);
    expect(await joinMissing.json()).toMatchObject({ code: 'CLASS_NOT_FOUND' });
  });

  it('IT-05: POST /api/submissions/[id]/review lưu điểm duyệt hợp lệ (200) và chặn sửa điểm thiếu nhận xét (400)', async () => {
    currentSession = { userId: LECTURER_ID, role: 'lecturer' };

    // Thiếu nhận xét khi score_modified=true -> 400, không lưu DB
    const badRes = await postReviewSubmission(
      new Request(`http://localhost:3000/api/submissions/${SUBMISSION_ID}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_score: 9, score_modified: true, reviewer_feedback: '' }),
      }),
      { params: Promise.resolve({ id: SUBMISSION_ID }) },
    );
    expect(badRes.status).toBe(400);
    expect(testDb.gradeReviews).toHaveLength(0);

    // Đủ điểm + nhận xét -> 200, lưu đúng bản ghi
    const okRes = await postReviewSubmission(
      new Request(`http://localhost:3000/api/submissions/${SUBMISSION_ID}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_score: 9.25,
          score_modified: true,
          reviewer_feedback: 'Trình bày mạch lạc, bổ sung đúng ví dụ thực tế.',
        }),
      }),
      { params: Promise.resolve({ id: SUBMISSION_ID }) },
    );
    expect(okRes.status).toBe(200);
    expect(testDb.gradeReviews).toHaveLength(1);
    expect(testDb.gradeReviews[0]).toMatchObject({
      submission_id: SUBMISSION_ID,
      lecturer_id: LECTURER_ID,
      final_score: 9.25,
      score_modified: true,
    });
  });
});
