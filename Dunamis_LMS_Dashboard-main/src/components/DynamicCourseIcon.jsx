const emojiIconMap = {
  Music: "🎵",
  Dance: "💃",
  Language: "🌐",
  Art: "🎨",
  Technology: "💻",
};

export default function DynamicCourseIcon({
  category,
  imgClassName = "w-3 h-3 object-contain",
}) {
  const iconValue = category?.icon?.trim();
  const fallbackIcon = emojiIconMap[category?.name] || "📚";

  if (!iconValue) {
    return fallbackIcon;
  }

  if (iconValue.startsWith("http") || iconValue.startsWith("/uploads")) {
    return (
      <img
        src={
          iconValue.startsWith("http")
            ? iconValue
            : `${import.meta.env.VITE_IMAGE}${iconValue}`
        }
        alt={category?.name || "icon"}
        className={imgClassName}
      />
    );
  }

  if (
    iconValue.startsWith("Fa") ||
    iconValue.startsWith("Md") ||
    iconValue.startsWith("Io")
  ) {
    return fallbackIcon;
  }

  return iconValue;
}
