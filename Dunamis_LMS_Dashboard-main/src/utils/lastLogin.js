import dayjs from "dayjs";

export const formatLastLogin = (value) => {
    if (!value) return "Never";

    const at = dayjs(value);
    const now = dayjs();
    const minutes = now.diff(at, "minute");

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (at.isSame(now, "day")) return `Today, ${at.format("h:mm A")}`;
    if (at.isSame(now.subtract(1, "day"), "day")) return `Yesterday, ${at.format("h:mm A")}`;

    const days = now.startOf("day").diff(at.startOf("day"), "day");
    if (days < 7) return `${days} days ago`;

    return at.format("DD MMM YYYY");
};

export const lastLoginTitle = (value) =>
    value ? dayjs(value).format("DD MMM YYYY, h:mm A") : "Never logged in";
