import { SITE_URL } from "@/lib/seo";
import { getCoursesServer } from "@/lib/serverCourses";
import { getCentersServer, slugifyBranch } from "@/lib/serverCenters";

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

export default async function sitemap() {
    const lastModified = new Date();

    const staticEntries = ROUTES.map((route) => ({
        url: `${SITE_URL}${route.path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));

    const [courses, centers] = await Promise.all([
        getCoursesServer(),
        getCentersServer(),
    ]);

    // Internal links use the course _id, and the detail page's canonical is
    // self-referencing — so the sitemap must list the _id URLs, not name slugs.
    const courseEntries = courses
        .filter((course) => course?._id)
        .map((course) => ({
            url: `${SITE_URL}/courses/${course._id}`,
            lastModified: course.updatedAt ? new Date(course.updatedAt) : lastModified,
            changeFrequency: "weekly",
            priority: 0.8,
        }));

    const centerEntries = centers
        .map((center) => slugifyBranch(center?.branchName))
        .filter(Boolean)
        .map((slug) => ({
            url: `${SITE_URL}/centers/${slug}`,
            lastModified,
            changeFrequency: "monthly",
            priority: 0.7,
        }));

    return [...staticEntries, ...courseEntries, ...centerEntries];
}
