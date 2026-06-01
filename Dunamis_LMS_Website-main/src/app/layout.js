import { Suspense } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navigation from "@/compoents/Navigation";
import MobileBottomNav from "@/compoents/MobileBottomNav";
import RouteProgress from "@/compoents/RouteProgress";
import Footer from "@/compoents/Footer";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
} from "@/lib/seo";

// Load Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: "en_IN",
    images: [{ url: "/Dunamis.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/Dunamis.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/Dunamis.png", apple: "/Dunamis.png" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/Dunamis.png`,
  description: DEFAULT_DESCRIPTION,
  email: "contact@dunamisindia.co.in",
  telephone: "+91-9398246083",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Plot 249, 4th Floor, Kushaiguda",
    addressLocality: "Hyderabad",
    addressRegion: "Telangana",
    postalCode: "500062",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.youtube.com/@dunamisschoolofmusic4481",
    "https://www.instagram.com/dunamis_schoolofmusic/",
    "https://www.facebook.com/dunamismusic2021/",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/courses?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${poppins.className} flex min-h-screen flex-col bg-[#fffaf4] text-slate-900`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Toaster />
        <Providers>
          <Navigation />
          {/* pb-16 on mobile keeps content clear of the bottom nav bar */}
          <main className="flex-grow pb-16 md:pb-0">{children}</main>
          <MobileBottomNav />
        </Providers>

        <Footer />
      </body>
    </html>
  );
}
