import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVideo, fileNameFromUrl, parseVideoUrl } from "./remote";

const url = new URL("https://example.com/videos/hip%20hop.mp4?x=1");

function respond(body: BodyInit | null, headers: Record<string, string>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { headers })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("video links", () => {
  it("accepts plain https links", () => {
    expect(parseVideoUrl("  https://example.com/a.mp4 ")).toHaveProperty("url");
  });

  it("rejects empty, invalid, insecure and credentialed links", () => {
    for (const input of [
      "",
      "ikke en lenke",
      "http://example.com/a.mp4",
      "file:///etc/passwd",
      "https://bruker:passord@example.com/a.mp4",
    ])
      expect(parseVideoUrl(input)).toHaveProperty("error");
  });

  it("explains that video platforms are not supported", () => {
    for (const input of [
      "https://www.youtube.com/watch?v=abc",
      "https://youtu.be/abc",
      "https://vm.tiktok.com/abc",
      "https://www.instagram.com/reel/abc",
    ])
      expect(parseVideoUrl(input)).toHaveProperty("error");
    expect(parseVideoUrl("https://notyoutube.com/a.mp4")).toHaveProperty("url");
  });

  it("derives a readable file name", () => {
    expect(fileNameFromUrl(url)).toBe("hip hop.mp4");
    expect(fileNameFromUrl(new URL("https://example.com/"))).toBe(
      "example.com",
    );
    expect(fileNameFromUrl(new URL("https://example.com/%E0%A4%A"))).toBe(
      "%E0%A4%A",
    );
  });
});

describe("fetching a video", () => {
  const signal = () => new AbortController().signal;

  it("returns the video as a file and reports progress", async () => {
    respond(new Blob([new Uint8Array(1000)]), { "content-type": "video/webm" });
    const progress = vi.fn();
    const file = await fetchVideo(url, signal(), progress);
    expect(file.size).toBe(1000);
    expect(file.type).toBe("video/webm");
    expect(file.name).toBe("hip hop.mp4");
    expect(progress).toHaveBeenCalled();
  });

  it("rejects pages that are not video", async () => {
    respond("<html></html>", { "content-type": "text/html" });
    await expect(fetchVideo(url, signal(), () => {})).rejects.toThrow(
      /direkte til en videofil/,
    );
  });

  it("rejects files that are too large, before and during download", async () => {
    respond(new Blob([new Uint8Array(10)]), {
      "content-type": "video/mp4",
      "content-length": "5000",
    });
    await expect(fetchVideo(url, signal(), () => {}, 100)).rejects.toThrow(
      /100 MB/,
    );
    respond(new Blob([new Uint8Array(500)]), { "content-type": "video/mp4" });
    await expect(fetchVideo(url, signal(), () => {}, 100)).rejects.toThrow(
      /100 MB/,
    );
  });

  it("reports blocked or failing requests with a clear message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(fetchVideo(url, signal(), () => {})).rejects.toThrow(
      /tillater ikke/,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    await expect(fetchVideo(url, signal(), () => {})).rejects.toThrow(/404/);
  });

  it("passes cancellation through unchanged", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Avbrutt", "AbortError");
      }),
    );
    await expect(
      fetchVideo(url, controller.signal, () => {}),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects an empty file", async () => {
    respond(new Blob([]), { "content-type": "video/mp4" });
    await expect(fetchVideo(url, signal(), () => {})).rejects.toThrow(/tom/);
  });
});
