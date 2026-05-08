# VSAPS 2026

Ứng dụng quản lý sự kiện VSAPS 2026.

## Chạy local

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
```

## Deploy trên Dokploy

### Cách khuyến nghị
- Deploy bằng Dockerfile có sẵn trong repo
- Port: `80`
- Build command: không cần nếu Dokploy dùng Dockerfile trực tiếp

### Biến môi trường frontend
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ONESIGNAL_APP_ID`
- `GEMINI_API_KEY` nếu dùng tính năng AI

### Biến môi trường backend / Supabase Edge Functions
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`

## Checklist deploy cuối cùng

1. Tạo app mới trên Dokploy
2. Chọn source repository này
3. Chọn deploy bằng Dockerfile
4. Đặt port nội bộ là `80`
5. Khai báo các biến môi trường frontend cần thiết
6. Nếu có dùng email/edge functions, khai báo đủ secret backend
7. Bấm deploy
8. Mở trang và kiểm tra:
   - landing page
   - đăng nhập
   - dashboard theo vai trò
   - gửi email test SMTP

## Lưu ý
- File `docker-compose.yml` chỉ dùng nếu bạn muốn chạy local theo compose hoặc mở rộng thêm backend riêng.
- SPA đã được cấu hình fallback bằng `nginx.conf`.
