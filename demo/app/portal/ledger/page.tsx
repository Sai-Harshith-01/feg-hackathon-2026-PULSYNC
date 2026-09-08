"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Input } from "@/components/ui/kit"
import { fmtCredits } from "@/lib/client/api"

interface Tx {
  id: string
  type: string
  amount: number
  reference: string
  userName: string
  createdAt: string
}

export default function PortalLedgerPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const [q, setQ] = useState("")
  const key = `/api/ledger?q=${encodeURIComponent(q)}`
  const { data, isLoading } = useSWR<{ transactions: Tx[]; totals: { bets: number; payouts: number; adjustments: number } }>(key)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Ledger Inspection</h1>
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total stakes</p>
          <p className="mt-1 font-mono text-lg font-black tabular-nums">{fmtCredits(data?.totals.bets ?? 0)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total payouts</p>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-[var(--up)]">{fmtCredits(data?.totals.payouts ?? 0)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Adjustments</p>
          <p className="mt-1 font-mono text-lg font-black tabular-nums">{fmtCredits(data?.totals.adjustments ?? 0)}</p>
        </Card>
      </div>
      <Card className="p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by customer, type, or reference…" />
      </Card>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-8" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data?.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={t.type === "MOCK_PAYOUT" ? "success" : "muted"}>{t.type.replace("MOCK_", "")}</Badge>
                  <span className="text-muted-foreground">{t.userName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.reference}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-semibold tabular-nums">{fmtCredits(t.amount)}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
