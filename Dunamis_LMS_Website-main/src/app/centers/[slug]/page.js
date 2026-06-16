// Server component for a single centre: per-centre SEO metadata + ISR, with a
// real 404 for unknown slugs, then hands the data to the client island.
import CenterDetailClient from "./CenterDetailClient";
import { getCentersServer, findCenterBySlug } from "@/lib/serverCenters";
import { buildMetadata } from "@/lib/seo";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { notFound } from "next/navigation";

export const revalidate = 300; // ISR (seconds)

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const center = findCenterBySlug(await getCentersServer(), slug);
  const path = `/centers/${encodeURIComponent(slug)}`;

  if (!center) {
    return buildMetadata({ title: "Centre Not Found", path });
  }

  const cityName = center.city?.cityName ? `, ${center.city.cityName}` : "";
  const title = center.branchName || "Centre";
  const description = `Visit ${center.branchName}${cityName} — facilities, available courses, timings and contact details at this Dunamis offline centre.`;

  const absoluteImage = resolveImageUrl(center.branchImage, "");
  const image = /^https?:\/\//.test(absoluteImage) ? absoluteImage : undefined;

  return buildMetadata({ title, description, path, ...(image ? { image } : {}) });
}

export default async function CenterDetailsPage({ params }) {
  const { slug } = await params;
  const centers = await getCentersServer();
  if (!findCenterBySlug(centers, slug)) notFound();
  return <CenterDetailClient initialCenters={centers} />;
}
