import { Suspense } from "react"
import { CustomerShell } from "@/components/shell/customer-shell"
import { SportFeed } from "@/components/sports/sport-feed"

export default async function SportPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const { sport } = await searchParams
  return (
    <CustomerShell>
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-bold capitalize">{sport && sport !== "all" ? sport.replace("-", " ") : "All Sports"}</h1>
        <Suspense fallback={null}>
          <SportFeed sport={sport ?? "all"} />
        </Suspense>
      </div>
    </CustomerShell>
  )
}
