-- Chạy trong Supabase SQL editor để test gửi push từ action thật trong app
-- Ví dụ: chèn notification cho một user đã subscribe

-- Thay USER_ID bằng uuid thật
insert into public.notifications (user_id, message, link, read)
values (
  'USER_ID_HERE',
  'Thông báo test từ action thật trong app',
  '/#/settings/push',
  false
);
