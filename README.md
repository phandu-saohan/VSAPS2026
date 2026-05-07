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

- Build command: `npm run build`
- Start command: phục vụ bằng Dockerfile đã có sẵn
- Port: `80`

## Biến môi trường cần thiết

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` nếu dùng các tính năng AI
- Các secret Supabase cho Edge Functions nếu triển khai cùng backend:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASSWORD`
  - `SMTP_SECURE`
