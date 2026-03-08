const DEFAULT_IMAGE = "https://placehold.co/640x360?text=Course";

const normalizeBaseUrl = (value) => {
  const trimmed =
    typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/api\/v\d+$/, "");
};

export const resolveImageUrl = (path, fallback = DEFAULT_IMAGE) => {
  const value = typeof path === "string" ? path.trim() : "";

  if (!value) {
    return fallback;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("//") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const imageBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_IMAGE_URL);
  const apiBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
  const baseUrl = imageBase || apiBase;

  if (!baseUrl) {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl}${normalizedPath}`;
};

export const DEFAULT_COURSE_IMAGE = DEFAULT_IMAGE;
