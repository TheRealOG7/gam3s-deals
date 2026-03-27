export const dynamic = "force-dynamic";

import { DealsClient } from "@/components/DealsClient";
import { fetchDeals, fetchEgsGames } from "@/lib/deals";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "";
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY ?? "";

export default async function DealsPage() {
  const [deals, egs] = await Promise.all([
    fetchDeals(DASHBOARD_URL, DASHBOARD_API_KEY),
    fetchEgsGames(DASHBOARD_URL, DASHBOARD_API_KEY),
  ]);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 16px 40px" }}>
      <DealsClient deals={deals} egs={egs} />
    </main>
  );
}
