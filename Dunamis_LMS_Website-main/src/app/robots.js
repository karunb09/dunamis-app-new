import { SITE_URL } from "@/lib/seo";

export default function robots() {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                // Keep authenticated / transactional areas out of the index.
                disallow: [
                    "/student/",
                    "/login",
                    "/signup",
                    "/payment-confirmation",
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
