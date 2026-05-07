import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'http://localhost:54321';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/auth': {
            target: supabaseUrl,
            changeOrigin: true,
            secure: false,
          },
          '/rest': {
            target: supabaseUrl,
            changeOrigin: true,
            secure: false,
          },
          '/storage': {
            target: supabaseUrl,
            changeOrigin: true,
            secure: false,
          },
          '/realtime': {
            target: supabaseUrl,
            changeOrigin: true,
            secure: false,
            ws: true,
          },
          '/functions': {
            target: supabaseUrl,
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
