import { CustomerShell } from "@/components/shell/customer-shell"
import { PromoStrip } from "@/components/sports/promo-strip"
import { SportFeed } from "@/components/sports/sport-feed"

export default function HomePage() {
  return (
    <CustomerShell>
      <div className="flex flex-col gap-4">
        <PromoStrip />
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Top Offer</h1>
          <span className="text-xs text-muted-foreground">Live odds update every few seconds</span>
        </div>
        <SportFeed />
      </div>
    </CustomerShell>
  )
}
