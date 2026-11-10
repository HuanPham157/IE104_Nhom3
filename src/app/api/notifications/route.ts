import {
  apiJson,
  authenticateRole,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

export async function GET(request: Request) {
  const auth = await authenticateRole(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.value.db
    .from('notifications')
    .select('id,title,message,notification_type,related_entity_type,related_entity_id,is_read,created_at,read_at')
    .eq('user_id', auth.value.user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    reportDatabaseError('Unable to load notifications', error);
    return apiJson({ error: 'Không thể tải thông báo' }, 500);
  }
  return apiJson({ data });
}
