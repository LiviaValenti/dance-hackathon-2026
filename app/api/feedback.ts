// Vercel serverless function for the Coach. Video never reaches it, only the compact summary (ADR 0001).
import { handleFeedback } from '../server/src/handler.ts'

export async function POST(request: Request): Promise<Response> {
  const { status, body } = await handleFeedback(await request.text())
  return Response.json(body, { status })
}
