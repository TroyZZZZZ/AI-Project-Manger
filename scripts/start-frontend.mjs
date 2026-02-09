import { createServer } from 'vite'
import path from 'node:path'
import process from 'node:process'

async function main() {
  const root = path.resolve(process.cwd())
  const server = await createServer({
    root,
    configFile: path.resolve(root, 'vite.config.ts'),
    server: {
      port: 5173,
      strictPort: true,
      host: true
    }
  })

  await server.listen()
  server.printUrls()
  console.log('✅ Vite dev server started via PM2 at http://localhost:5173')
}

main().catch((err) => {
  console.error('❌ Failed to start Vite dev server via PM2:', err)
  process.exit(1)
})