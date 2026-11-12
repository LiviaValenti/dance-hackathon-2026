import { describe, expect, it } from 'vitest'
import { handleFeedback } from './handler.ts'

describe('handleFeedback', () => {
  it('rejects bad JSON and invalid requests without calling the model', async () => {
    expect(await handleFeedback('{')).toEqual({ status: 400, body: { error: 'invalid_json' } })
    expect(await handleFeedback('{"overall": 140}')).toEqual({ status: 400, body: { error: 'invalid_request' } })
    expect((await handleFeedback('x'.repeat(70_000))).status).toBe(413)
  })
})
