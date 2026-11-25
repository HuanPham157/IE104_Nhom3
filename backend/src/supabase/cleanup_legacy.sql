-- =====================================================================
-- cleanup_legacy.sql — DỌN ĐỐI TƯỢNG CŨ (CHỈ cho database đã chạy bộ migration cũ 000 → 012)
--
-- Database mới dựng từ 01 → 11 KHÔNG cần file này.
-- Xóa những thứ không còn được code nào dùng:
--   • public.profiles + trigger/hàm handle_new_user: bảng hồ sơ đời đầu. Vai trò chuẩn nằm ở public.users,
--     hồ sơ ở student_profiles / lecturer_profiles (trigger on_oralcheck_app_profile_signup tạo).
--   • Các RPC nhận dạng / chấm AI đồng bộ cũ: frontend gọi Whisper và chấm trực tiếp trong request.
--     Nay backend đưa job vào hàng đợi, worker dùng worker_* và save_ai_evaluation (09_grading.sql).
-- XÓA BẢNG LÀ KHÔNG HOÀN TÁC: kiểm tra public.profiles không còn dữ liệu cần giữ trước khi chạy
-- (mọi dòng của nó đã được chép sang public.users / *_profiles từ migration 003 cũ).
-- =====================================================================

begin;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles;

drop function if exists public.claim_submission_for_ai(uuid);
drop function if exists public.fail_submission_ai_processing(uuid, text);
drop function if exists public.save_submission_transcription(uuid, text, text, text, boolean);
drop function if exists public.claim_submission_for_lecturer_ai(uuid);
drop function if exists public.fail_lecturer_ai_processing(uuid, text);

commit;
