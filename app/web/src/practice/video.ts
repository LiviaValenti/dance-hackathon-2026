import { reportDuration } from '../ui/videoDuration'

export type LoadedVideo = { video: HTMLVideoElement; duration: number; dispose: () => void }

/**
 * Loads a video into a hidden element in the page (some mobile browsers only decode frames for
 * elements in the document) and resolves once its duration is known.
 */
export function loadVideo(src: string): Promise<LoadedVideo> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.className = 'offscreen'
  video.setAttribute('aria-hidden', 'true')
  document.body.appendChild(video)
  const dispose = () => {
    video.removeAttribute('src')
    video.load()
    video.remove()
  }
  return new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => reportDuration(video, (duration) => resolve({ video, duration, dispose })), { once: true })
    video.addEventListener('error', () => { dispose(); reject(new Error(`Could not load ${src}`)) }, { once: true })
    video.src = src
  })
}
