const DEFAULT_IMAGE = "https://i.pravatar.cc/150?u=dunamis-default";

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

  return `${import.meta.env.VITE_IMAGE}${value}`;
};

export const DEFAULT_AVATAR = DEFAULT_IMAGE;
