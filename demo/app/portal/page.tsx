"use client"

import useSWR from "swr"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton } from "@/components/ui/kit"
import { useAuth } from "@/lib/client/auth"
import { fmtCredits } from "@/lib/client/api"

interface Kpis {
  customers: number
  activeCustomers: number
  totalBets: number
  openBets: number
  settledBets: number
  turnover: number
  payout: number
  openTickets: number
  openRisk: number
  liveEvents: number
  casinoGames: number
}

export default function PortalOverview() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { user } = useAuth()
  const { data, isLoading } = useSWR<{ kpis: Kpis }>("/api/analytics")
  const k = data?.kpis

  const cards: { label: string; value: string; hint?: string }[] = k
    ? [
        { label: "Customers", value: String(k.customers), hint: `${k.activeCustomers} active` },
        { label: "Total bets", value: String(k.totalBets), hint: `${k.openBets} open` },
        { label: "Settled bets", value: String(k.settledBets) },
        { label: "DEMO turnover", value: fmtCredits(k.turnover) },
        { label: "DEMO payouts", value: fmtCredits(k.payout) },
        { label: "Open tickets", value: String(k.openTickets) },
        { label: "Open risk alerts", value: String(k.openRisk) },
        { label: "Live events", value: String(k.liveEvents) },
      ]
    : []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold">Welcome, {user?.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          Role-scoped workspace. Figures below are derived live from mock application records.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          : cards.map((c) => (
              <Card key={c.label} className="p-3">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-mono text-xl font-black tabular-nums">{c.value}</p>
                {c.hint && <p className="text-[11px] text-muted-foreground">{c.hint}</p>}
              </Card>
            ))}
      </div>
    </div>
  )
}
