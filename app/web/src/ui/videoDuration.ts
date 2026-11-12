/** Reports the duration. MediaRecorder WebM has an unknown duration until the video is seeked to the end. */
export function reportDuration(video: HTMLVideoElement, onDuration: (seconds: number) => void) {
  if (Number.isFinite(video.duration)) {
    onDuration(video.duration)
    return
  }
  const onChange = () => {
    if (!Number.isFinite(video.duration)) return
    video.removeEventListener('durationchange', onChange)
    video.currentTime = 0
    onDuration(video.duration)
  }
  video.addEventListener('durationchange', onChange)
  video.currentTime = 1e101
}
