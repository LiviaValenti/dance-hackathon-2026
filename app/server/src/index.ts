import { createServer, type IncomingMessage } from 'node:http'
import { handleFeedback, MAX_BODY_BYTES } from './handler.ts'

const PORT = Number(process.env.PORT ?? 8787)

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) { reject(new Error('too_large')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  if (req.method !== 'POST' || req.url !== '/api/feedback') return send(404, { error: 'not_found' })
  let raw: string
  try {
    raw = await readBody(req)
  } catch {
    return send(413, { error: 'too_large' })
  }
  const { status, body } = await handleFeedback(raw)
  send(status, body)
})

server.listen(PORT, () => console.log(`Feedback server on http://localhost:${PORT}`))
