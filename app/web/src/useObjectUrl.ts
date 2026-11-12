import { useEffect, useState } from 'react'

/** Object URL for a file, released when the file changes or the component unmounts. */
export function useObjectUrl(file: File | null): string | null {
  const [source, setSource] = useState<{ file: File; url: string } | null>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // The URL is an external resource that must be created and released in the same effect (StrictMode runs it twice).
    // oxlint-disable-next-line react/set-state-in-effect
    setSource({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])

  return source && source.file === file ? source.url : null
}
