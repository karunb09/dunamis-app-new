import { describe, it, expect, afterEach, vi } from "vitest";
import { resolveImageUrl, DEFAULT_AVATAR } from "./resolveImageUrl";

describe("resolveImageUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the fallback for empty / non-string input", () => {
    expect(resolveImageUrl("")).toBe(DEFAULT_AVATAR);
    expect(resolveImageUrl(null)).toBe(DEFAULT_AVATAR);
    expect(resolveImageUrl(undefined, "fallback.png")).toBe("fallback.png");
  });

  it("passes through absolute / data / blob URLs unchanged", () => {
    expect(resolveImageUrl("https://x.com/a.png")).toBe("https://x.com/a.png");
    expect(resolveImageUrl("http://x.com/a.png")).toBe("http://x.com/a.png");
    expect(resolveImageUrl("//cdn/a.png")).toBe("//cdn/a.png");
    expect(resolveImageUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  it("prefixes a relative path with the API base, stripping the /api/vN suffix", () => {
    vi.stubEnv("VITE_IMAGE", ""); // ensure apiBase (not a configured image base) is used
    vi.stubEnv("VITE_BASE_URL", "https://api.dunamis.test/api/v1");
    expect(resolveImageUrl("uploads/pic.png")).toBe("https://api.dunamis.test/uploads/pic.png");
    expect(resolveImageUrl("/uploads/pic.png")).toBe("https://api.dunamis.test/uploads/pic.png");
  });

  it("prefers VITE_IMAGE over VITE_BASE_URL when both are set", () => {
    vi.stubEnv("VITE_IMAGE", "https://cdn.dunamis.test");
    vi.stubEnv("VITE_BASE_URL", "https://api.dunamis.test/api/v1");
    expect(resolveImageUrl("a.png")).toBe("https://cdn.dunamis.test/a.png");
  });

  it("returns the bare path when no base URL is configured", () => {
    vi.stubEnv("VITE_IMAGE", "");
    vi.stubEnv("VITE_BASE_URL", "");
    expect(resolveImageUrl("local/a.png")).toBe("local/a.png");
  });
});
