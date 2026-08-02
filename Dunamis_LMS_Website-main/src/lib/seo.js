// Centralized SEO configuration and per-page metadata builder.
// Used by the root layout and per-route layout.js files.

export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://dunamisindia.co.in"
).replace(/\/$/, "");

export const SITE_NAME = "Dunamis School of Music";

export const DEFAULT_TITLE =
    "Dunamis School of Music — Online & Offline Classes for Music, Dance, Chess & More";

export const DEFAULT_DESCRIPTION =
    "Learn music, singing, dance, chess, languages and wellness with expert instructors at Dunamis. Book a free demo, choose online or offline classes, and enroll in flexible 3, 6 or 12-month plans.";

export const DEFAULT_KEYWORDS = [
    "Dunamis School of Music",
    "online music classes",
    "offline music classes",
    "learn music",
    "singing classes",
    "dance classes",
    "chess coaching",
    "language classes",
    "music school Hyderabad",
    "book free demo",
];

// Default social-share image (replace with a dedicated 1200x630 asset later).
const DEFAULT_OG_IMAGE = "/Dunamis.png";

/**
 * Build a Next.js Metadata object for a page.
 * @param {object} opts
 * @param {string} opts.title    - page title (without the brand suffix)
 * @param {string} opts.description
 * @param {string} opts.path     - canonical path, e.g. "/courses"
 * @param {string[]} [opts.keywords]
 * @param {string} [opts.image]
 */
export function buildMetadata({
    title,
    description = DEFAULT_DESCRIPTION,
    path = "/",
    keywords = DEFAULT_KEYWORDS,
    image = DEFAULT_OG_IMAGE,
} = {}) {
    const url = `${SITE_URL}${path}`;
    // Self-contained: the root layout does NOT define title.template, because
    // Next only propagates a template one segment deep — it doesn't reach
    // routes nested under a layout that resolves its own plain-string title
    // (e.g. /courses/[courseName] under courses/layout.js). Appending the
    // site name here once is the only approach that's correct at every depth.
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;

    return {
        title: fullTitle,
        description,
        keywords,
        alternates: { canonical: url },
        openGraph: {
            title: fullTitle,
            description,
            url,
            siteName: SITE_NAME,
            images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
            locale: "en_IN",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            images: [image],
        },
    };
}
