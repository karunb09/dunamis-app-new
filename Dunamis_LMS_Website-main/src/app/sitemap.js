import { SITE_URL } from "@/lib/seo";

// Static, high-value public routes. Course detail pages are excluded here
// because they require an authenticated/data fetch; add a dynamic source later
// if you want every course indexed.
const ROUTES = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/courses", priority: 0.9, changeFrequency: "daily" },
    { path: "/centers", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about-us", priority: 0.6, changeFrequency: "monthly" },
    { path: "/success-stories", priority: 0.6, changeFrequency: "weekly" },
    { path: "/testimonials", priority: 0.6, changeFrequency: "weekly" },
    { path: "/become-teacher", priority: 0.6, changeFrequency: "monthly" },
    { path: "/faqs", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact-us", priority: 0.6, changeFrequency: "monthly" },
    { path: "/terms-and-conditions", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap() {
    const lastModified = new Date();
    return ROUTES.map((route) => ({
        url: `${SITE_URL}${route.path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));
}
