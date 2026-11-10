import { expect, test } from '@playwright/test';

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const id = '11111111-1111-4111-8111-111111111111';

test('OralCheck workflow endpoints reject requests without an access token', async ({ request }) => {
  test.skip(!supabaseConfigured, 'Cần cấu hình Supabase để kiểm tra API xác thực.');

  const responses = await Promise.all([
    request.get('/api/classes'),
    request.post('/api/classes', { data: {} }),
    request.delete(`/api/classes/${id}`),
    request.post('/api/classes/join', { data: {} }),
    request.get(`/api/classes/${id}/cancel`),
    request.post(`/api/classes/${id}/cancel`, { data: {} }),
    request.get(`/api/classes/${id}/assignments`),
    request.post(`/api/classes/${id}/assignments`, { data: {} }),
    request.get(`/api/classes/${id}/members`),
    request.delete(`/api/classes/${id}/members`, { data: {} }),
    request.get(`/api/assignments/${id}`),
    request.patch(`/api/assignments/${id}`, { data: {} }),
    request.delete(`/api/assignments/${id}`),
    request.post(`/api/assignments/${id}/answers`, { data: {} }),
    request.post(`/api/assignments/${id}/submit`, { data: {} }),
    request.get(`/api/assignments/${id}/submissions`),
    request.post(`/api/assignments/${id}/publish`),
    request.get(`/api/assignments/${id}/results`),
    request.get(`/api/submissions/${id}`),
    request.post(`/api/submissions/${id}/review`, { data: {} }),
    request.get('/api/admin/approval-requests'),
    request.patch(`/api/admin/approval-requests/${id}`, { data: {} }),
    request.get('/api/notifications'),
  ]);

  expect(responses.map((response) => response.status())).toEqual(
    responses.map(() => 401),
  );
});
