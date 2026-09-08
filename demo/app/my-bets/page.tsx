"use client"

import useSWR from "swr"
import { useState } from "react"
import { CustomerShell } from "@/components/shell/customer-shell"
import { RequireAuth } from "@/components/auth/require-auth"
import { Card, Skeleton, EmptyState, Badge } from "@/components/ui/kit"
import { fmtCredits } from "@/lib/client/api"
import { cn } from "@/lib/utils"
import type { Bet } from "@/lib/domain/types"
import { Ticket } from "lucide-react"

const TABS = [
  { key: "", label: "All" },
  { key: "open", label: "Open" },
  { key: "settled", label: "Settled" },
]

export default function MyBetsPage() {
  return (
    <CustomerShell showSlip={false}>
      <RequireAuth>
        <Inner />
      </RequireAuth>
    </CustomerShell>
  )
}

const STATUS_VARIANT: Record<string, "muted" | "success" | "danger" | "warn"> = {
  SUBMITTED: "muted",
  OPEN: "muted",
  WON: "success",
  LOST: "danger",
  VOID: "warn",
  CANCELLED: "warn",
}

function Inner() {
  const [tab, setTab] = useState("")
  const { data, isLoading } = useSWR<{ bets: Bet[] }>(`/api/bets${tab ? `?filter=${tab}` : ""}`)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">My Bets</h1>
      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-20" />
          ))}
        </div>
      ) : (data?.bets.length ?? 0) === 0 ? (
        <EmptyState icon={<Ticket className="size-8" />} title="No bets here" hint="Add selections and place a demo bet." />
      ) : (
        <div className="flex flex-col gap-2">
          {data?.bets.map((b) => (
            <Card key={b.id} className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{b.ticketCode}</span>
                  <Badge variant="outline">{b.betType}</Badge>
                  <Badge variant={STATUS_VARIANT[b.status] ?? "muted"}>{b.status}</Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(b.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mb-2 flex flex-col gap-1">
                {b.selections.map((s) => (
                  <div key={s.selectionId} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{s.selectionName}</span>
                      <span className="text-muted-foreground"> · {s.marketName} · {s.eventLabel}</span>
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-xs tabular-nums">{s.oddsAtPlacement.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
                <span className="text-muted-foreground">
                  Stake <span className="font-mono font-semibold text-foreground">{fmtCredits(b.stake)}</span> @{" "}
                  <span className="font-mono">{b.combinedOdds.toFixed(2)}</span>
                </span>
                <span className="text-muted-foreground">
                  {b.status === "WON" ? "Paid" : "Potential"}{" "}
                  <span className="font-mono font-bold tabular-nums text-[var(--up)]">{fmtCredits(b.potentialPayout)}</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
