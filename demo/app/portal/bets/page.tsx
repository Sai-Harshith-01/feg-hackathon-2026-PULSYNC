"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Button } from "@/components/ui/kit"
import { apiPost, fmtCredits } from "@/lib/client/api"
import { useAuth } from "@/lib/client/auth"
import { useToasts } from "@/lib/client/stores"
import { cn } from "@/lib/utils"
import type { Bet } from "@/lib/domain/types"

const TABS = [
  { key: "open", label: "Open" },
  { key: "settled", label: "Settled" },
]

export default function PortalBetsPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { can } = useAuth()
  const push = useToasts((s) => s.push)
  const [tab, setTab] = useState("open")
  const key = `/api/ops/bets?filter=${tab}`
  const { data, isLoading } = useSWR<{ bets: (Bet & { userName: string })[] }>(key)

  async function settle(betId: string, outcome: string) {
    try {
      await apiPost("/api/ops/settle", { betId, outcome })
      mutate(key)
      push(`Bet settled: ${outcome}`, "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Bet Management</h1>
      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-semibold",
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-2">
          {data?.bets.map((b) => (
            <Card key={b.id} className="p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{b.ticketCode}</span>
                  <Badge variant="outline">{b.userName}</Badge>
                  <Badge>{b.status}</Badge>
                </div>
                <span className="text-sm">
                  {fmtCredits(b.stake)} @ {b.combinedOdds.toFixed(2)} →{" "}
                  <span className="font-semibold text-[var(--up)]">{fmtCredits(b.potentialPayout)}</span>
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {b.selections.map((s) => `${s.selectionName} (${s.marketName})`).join(", ")}
              </p>
              {can("bets.settle_mock") && (b.status === "SUBMITTED" || b.status === "OPEN") && (
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="success" onClick={() => settle(b.id, "WON")}>
                    Won
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => settle(b.id, "LOST")}>
                    Lost
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => settle(b.id, "VOID")}>
                    Void
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
