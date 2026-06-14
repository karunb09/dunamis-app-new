// Server component: fetches offline centres server-side (ISR) and hands them to
// the interactive client island. Static SEO metadata lives in ./layout.js.
import CentersClient from "./CentersClient";
import { getCentersServer } from "@/lib/serverCenters";

export const revalidate = 300; // ISR (seconds)

export default async function CentersPage() {
  const initialCenters = await getCentersServer();
  return <CentersClient initialCenters={initialCenters} />;
}
