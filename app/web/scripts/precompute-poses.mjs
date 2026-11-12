// Precomputes the poses of every video in public/content, so References (and the demo Attempt) are ready
// instantly instead of being analysed in the browser. Run with the dev server up:
//   npm run dev                      (in another terminal)
//   npm run poses                    (writes public/content/<name>.poses.json)
// BROWSER can point to any Chromium-based browser; Chrome or Edge are found by default.
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const URL = process.env.DEV_URL ?? 'http://localhost:5173'
const CONTENT = join(import.meta.dirname, '..', 'public', 'content')
const CANDIDATES = [
  process.env.BROWSER,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const executablePath = CANDIDATES.find((p) => existsSync(p))
if (!executablePath) throw new Error('No Chromium browser found; set BROWSER=/path/to/chrome')

const videos = readdirSync(CONTENT).filter((f) => /\.(mov|mp4|webm)$/i.test(f))
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 1_800_000 })
const page = await browser.newPage()
await page.goto(URL)
for (const file of videos) {
  const started = Date.now()
  const json = await page.evaluate(async (src) => {
    const { extractPoses } = await import('/src/pose/extractPoses.ts')
    const { loadVideo } = await import('/src/practice/video.ts')
    const { encodePoses } = await import('/src/pose/poseFile.ts')
    const { video, dispose } = await loadVideo(src)
    try {
      return JSON.stringify(encodePoses(await extractPoses(video)))
    } finally {
      dispose()
    }
  }, `/content/${file}`)
  const out = file.replace(/\.\w+$/, '.poses.json')
  writeFileSync(join(CONTENT, out), json)
  console.log(`${out}: ${(json.length / 1024).toFixed(0)} KB in ${((Date.now() - started) / 1000).toFixed(0)} s`)
}
await browser.close()
