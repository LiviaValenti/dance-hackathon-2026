import { createServer, type IncomingMessage } from 'node:http'
import Anthropic from '@anthropic-ai/sdk'
import { FeedbackRequestSchema } from './schema.ts'
import { generateFeedback } from './feedback.ts'

const PORT = Number(process.env.PORT ?? 8787)
const MAX_BODY_BYTES = 64 * 1024

let client: Anthropic | undefined

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

  let body: unknown
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    return send(400, { error: 'invalid_json' })
  }
  const parsed = FeedbackRequestSchema.safeParse(body)
  if (!parsed.success) return send(400, { error: 'invalid_request' })

  try {
    client ??= new Anthropic()
    send(200, await generateFeedback(client, parsed.data))
  } catch (e) {
    console.error('Feedback failed:', e)
    send(502, { error: 'feedback_failed' })
  }
})

server.listen(PORT, () => console.log(`Feedback server on http://localhost:${PORT}`))
