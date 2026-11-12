export const maxVideoBytes = 100 * 1024 * 1024;
export const maxVideoSeconds = 40;

const platformHosts = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
  "vimeo.com",
  "x.com",
  "twitter.com",
];

const tooLarge = () =>
  new Error("Videoen er større enn 100 MB. Velg et kortere klipp.");

export function parseVideoUrl(input: string): { url: URL } | { error: string } {
  const text = input.trim();
  if (!text) return { error: "Lim inn en lenke først." };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { error: "Dette ser ikke ut som en gyldig lenke." };
  }
  if (url.protocol !== "https:")
    return { error: "Lenken må starte med https://." };
  if (url.username || url.password)
    return { error: "Lenker med innlogging støttes ikke." };
  const host = url.hostname.toLowerCase();
  if (platformHosts.some((name) => host === name || host.endsWith(`.${name}`)))
    return {
      error:
        "YouTube, TikTok, Instagram og lignende tjenester lar ikke andre apper lese videoene sine. Bruk en direkte lenke til en videofil, eller last opp filen.",
    };
  return { url };
}

export function fileNameFromUrl(url: URL): string {
  const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(last) || url.hostname;
  } catch {
    return last || url.hostname;
  }
}

// Reads the video in the browser; the host must allow cross-origin reads (CORS).
export async function fetchVideo(
  url: URL,
  signal: AbortSignal,
  progress: (received: number, total: number) => void,
  limit = maxVideoBytes,
): Promise<File> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "Kunne ikke hente videoen. Lenken virker ikke, eller nettstedet tillater ikke at andre apper leser den.",
    );
  }
  if (!response.ok)
    throw new Error(`Nettstedet svarte med feil (${response.status}).`);
  const type =
    response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ??
    "";
  if (!type.startsWith("video/") && type !== "application/octet-stream")
    throw new Error("Lenken peker ikke direkte til en videofil.");
  const total = Number(response.headers.get("content-length")) || 0;
  if (total > limit) throw tooLarge();
  if (!response.body)
    throw new Error("Nettleseren kunne ikke lese videoen fra lenken.");

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > limit) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(new Uint8Array(value));
    progress(received, total);
  }
  if (!received) throw new Error("Lenken ga en tom fil.");
  return new File(chunks, fileNameFromUrl(url), {
    type: type.startsWith("video/") ? type : "video/mp4",
  });
}
