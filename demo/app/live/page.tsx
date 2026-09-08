import { CustomerShell } from "@/components/shell/customer-shell"
import { SportFeed } from "@/components/sports/sport-feed"

export default function LivePage() {
  return (
    <CustomerShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 animate-pulse rounded-full bg-[var(--live)]" />
          <h1 className="text-lg font-bold">Live Now</h1>
        </div>
        <SportFeed live />
      </div>
    </CustomerShell>
  )
}
