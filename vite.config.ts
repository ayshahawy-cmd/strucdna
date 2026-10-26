import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createAnthropicMiddleware } from './server/anthropic.mjs';

export default defineConfig(({ mode }) => {
  // Used only by Node middleware, never by the browser bundle.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const middleware = createAnthropicMiddleware(env);

  return {
    plugins: [
      react(),
      {
        name: 'strucdna-local-api',
        configureServer(server) {
          server.middlewares.use(middleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(middleware);
        },
      },
    ],
    server: { host: '127.0.0.1', port: 3000, strictPort: true },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  };
});
