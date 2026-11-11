import { useEffect, useState, type RefObject } from 'react'

type Props = {
  label: string
  videoRef: RefObject<HTMLVideoElement | null>
  onChange: (hasVideo: boolean) => void
}

export function VideoPicker({ label, videoRef, onChange }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  return (
    <div className="picker">
      <label className="picker-label">
        {label}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            setUrl(file ? URL.createObjectURL(file) : null)
            onChange(!!file)
          }}
        />
      </label>
      {url && <video ref={videoRef} src={url} muted playsInline controls preload="auto" className="picker-video" />}
    </div>
  )
}
