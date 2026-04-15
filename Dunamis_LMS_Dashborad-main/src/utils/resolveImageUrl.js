const DEFAULT_IMAGE = "/profile-photo.png";

const normalizeBaseUrl = (value) => {
  const trimmed = typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/api\/v\d+$/, "");
};

export const resolveImageUrl = (path, fallback = DEFAULT_IMAGE) => {
  const value =
    typeof path === "string" ? path.trim().replace(/\\/g, "/") : "";

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

  const imageBase = normalizeBaseUrl(import.meta.env.VITE_IMAGE);
  const apiBase = normalizeBaseUrl(import.meta.env.VITE_BASE_URL);
  const baseUrl = imageBase || apiBase;

  if (!baseUrl) {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl}${normalizedPath}`;
};

export const DEFAULT_AVATAR = DEFAULT_IMAGE;
