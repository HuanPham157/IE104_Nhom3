import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const studentEmail = process.env.TEST_EMAIL_B ?? '';
const studentPassword = process.env.TEST_PASSWORD_B ?? '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const availableClassCode = process.env.TEST_CLASS_JOIN_AVAILABLE_CODE ?? '';
const availableClassId = process.env.TEST_CLASS_JOIN_AVAILABLE_ID ?? '';
const unknownClassCode = process.env.TEST_CLASS_JOIN_UNKNOWN_CODE ?? '';

test('TC01–TC03 kiểm thử API tham gia lớp và dữ liệu trước/sau', async ({ request }) => {
  if (
    !studentEmail ||
    !studentPassword ||
    !supabaseUrl ||
    !supabaseKey ||
    !availableClassCode ||
    !availableClassId ||
    !unknownClassCode
  ) {
    test.skip(
      true,
      'Cần cấu hình tài khoản sinh viên và lớp thử TEST_CLASS_JOIN_* trong .env.local',
    );
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  });
  expect(authError).toBeNull();
  if (!authData.user || !authData.session) {
    throw new Error('Không thể đăng nhập tài khoản sinh viên kiểm thử.');
  }

  const userId = authData.user.id;
  const headers = { Authorization: `Bearer ${authData.session.access_token}` };
  const readMemberships = async () => {
    const { data, error } = await supabase
      .from('class_members')
      .select('class_id,student_id,status,joined_at,left_at')
      .eq('student_id', userId)
      .order('class_id');
    expect(error).toBeNull();
    return data ?? [];
  };

  try {
    const membershipsBeforeJoin = await readMemberships();
    expect(
      membershipsBeforeJoin.filter((membership) => membership.class_id === availableClassId),
      'Chuẩn bị TC01: sinh viên chưa tham gia lớp',
    ).toHaveLength(0);

    const successResponse = await request.post('/api/classes/join', {
      headers,
      data: { class_code: availableClassCode },
    });
    expect(successResponse.status()).toBe(201);
    const successBody = await successResponse.json() as { data?: { class_id?: string } };
    expect(successBody.data?.class_id).toBe(availableClassId);

    const membershipsAfterJoin = await readMemberships();
    expect(membershipsAfterJoin).toHaveLength(membershipsBeforeJoin.length + 1);
    expect(
      membershipsAfterJoin.filter((membership) => membership.class_id !== availableClassId),
    ).toEqual(membershipsBeforeJoin);
    expect(
      membershipsAfterJoin.filter((membership) => membership.class_id === availableClassId),
    ).toHaveLength(1);
    expect(membershipsAfterJoin).toContainEqual({
      class_id: availableClassId,
      student_id: userId,
      status: 'active',
      joined_at: expect.any(String),
      left_at: null,
    });

    const duplicateResponse = await request.post('/api/classes/join', {
      headers,
      data: { class_code: availableClassCode },
    });
    expect(duplicateResponse.status()).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({ code: 'ALREADY_JOINED' });
    expect(await readMemberships()).toEqual(membershipsAfterJoin);

    const membershipsBeforeUnknownCode = await readMemberships();
    const unknownResponse = await request.post('/api/classes/join', {
      headers,
      data: { class_code: unknownClassCode },
    });
    expect(unknownResponse.status()).toBe(404);
    expect(await unknownResponse.json()).toMatchObject({ code: 'CLASS_NOT_FOUND' });
    expect(await readMemberships()).toEqual(membershipsBeforeUnknownCode);
  } finally {
    await supabase.auth.signOut();
  }
});
