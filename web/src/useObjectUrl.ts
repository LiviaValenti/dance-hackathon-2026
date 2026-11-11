import { useEffect, useState } from 'react'

/** Object-URL for en fil, frigjort når filen byttes eller komponenten fjernes. */
export function useObjectUrl(file: File | null): string | null {
  const [source, setSource] = useState<{ file: File; url: string } | null>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // URL-en er en ekstern ressurs som må lages og frigjøres i samme effekt (StrictMode kjører den to ganger).
    // oxlint-disable-next-line react/set-state-in-effect
    setSource({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])

  return source && source.file === file ? source.url : null
}
