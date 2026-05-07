import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const SUPABASE_URL = 'http://vsaps2026-pre0225supabase-8e734b-72-61-123-73.traefik.me';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy all Supabase API calls to bypass CORS in development
          '/auth': {
            target: SUPABASE_URL,
            changeOrigin: true,
            secure: false,
          },
          '/rest': {
            target: SUPABASE_URL,
            changeOrigin: true,
            secure: false,
          },
          '/storage': {
            target: SUPABASE_URL,
            changeOrigin: true,
            secure: false,
          },
          '/realtime': {
            target: SUPABASE_URL,
            changeOrigin: true,
            secure: false,
            ws: true,
          },
          '/functions': {
            target: SUPABASE_URL,
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
