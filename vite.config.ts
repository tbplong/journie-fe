import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Connect } from 'vite'
import { placePhotoResponse } from './server/placePhoto'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  // BACKEND_URL has no VITE_ prefix on purpose: only this config reads it, the browser never sees it.
  const backend = env.BACKEND_URL || 'http://127.0.0.1:8000'
  // With VITE_API_URL=/api the browser calls this server and it forwards to the backend, so local work needs no CORS setup.
  const proxy = { '/api': { target: backend, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api/, '') } }
  // Place photos through ZioMap, same route as the Vercel function (api/place-photo.ts); ZIOMAP_API_KEY stays on this server.
  // Registered before the proxy, so this one path is answered here and not forwarded to the backend.
  const placePhoto: Connect.NextHandleFunction = (req, res) => {
    const { url } = req as { url?: string } // the app's tsconfig has no Node types
    const id = new URL(url ?? '', 'http://localhost').searchParams.get('id')
    void placePhotoResponse(id, env.ZIOMAP_API_KEY).then(({ status, body }) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(body))
    })
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'place-photo',
        configureServer: (server) => void server.middlewares.use('/api/place-photo', placePhoto),
        configurePreviewServer: (server) => void server.middlewares.use('/api/place-photo', placePhoto),
      },
    ],
    server: { proxy },
    preview: { proxy },
  }
})
