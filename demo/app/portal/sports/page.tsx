"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Button, Input } from "@/components/ui/kit"
import { apiPost } from "@/lib/client/api"
import { useAuth } from "@/lib/client/auth"
import { useToasts } from "@/lib/client/stores"

interface Market {
  id: string
  name: string
  status: string
  selections: { id: string; name: string; odds: number }[]
}
interface EventDetail {
  id: string
  home: string
  away: string
  status: string
  competition: { name: string } | null
  markets: Market[]
}

export default function SportsOpsPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { can } = useAuth()
  const push = useToasts((s) => s.push)
  const key = "/api/ops/events?status=all"
  const { data, isLoading } = useSWR<{ events: EventDetail[] }>(key)
  const [openId, setOpenId] = useState<string | null>(null)

  async function suspendMarket(marketId: string, status: string) {
    try {
      await apiPost("/api/ops/market", { marketId, status })
      mutate(key)
      push(`Market ${status}`, "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  async function updateOdds(selectionId: string, odds: number) {
    try {
      await apiPost("/api/ops/odds", { selectionId, odds })
      mutate(key)
      push("Odds updated", "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Sports Operations</h1>
      <p className="text-sm text-muted-foreground">Adjust mock odds and suspend markets. All changes are audited.</p>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-2">
          {data?.events.map((ev) => (
            <Card key={ev.id} className="overflow-hidden">
              <button
                onClick={() => setOpenId(openId === ev.id ? null : ev.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">
                    {ev.home} v {ev.away}
                  </p>
                  <p className="text-xs text-muted-foreground">{ev.competition?.name}</p>
                </div>
                <Badge variant={ev.status === "LIVE" ? "live" : "outline"}>{ev.status}</Badge>
              </button>
              {openId === ev.id && (
                <div className="border-t border-border p-2">
                  {ev.markets.map((m) => (
                    <div key={m.id} className="mb-2 rounded border border-border p-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold">{m.name}</span>
                        {can("sports.suspend_market") && (
                          <Button
                            size="sm"
                            variant={m.status === "OPEN" ? "danger" : "success"}
                            onClick={() => suspendMarket(m.id, m.status === "OPEN" ? "SUSPENDED" : "OPEN")}
                          >
                            {m.status === "OPEN" ? "Suspend" : "Reopen"}
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                        {m.selections.map((s) => (
                          <OddsEditor key={s.id} name={s.name} odds={s.odds} canEdit={can("odds.update")} onSave={(v) => updateOdds(s.id, v)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function OddsEditor({ name, odds, canEdit, onSave }: { name: string; odds: number; canEdit: boolean; onSave: (v: number) => void }) {
  const [val, setVal] = useState(odds.toFixed(2))
  return (
    <div className="flex items-center gap-1 rounded border border-border bg-secondary/40 px-2 py-1">
      <span className="min-w-0 flex-1 truncate text-xs">{name}</span>
      <Input
        className="h-7 w-16 font-mono text-xs"
        value={val}
        disabled={!canEdit}
        onChange={(e) => setVal(e.target.value)}
      />
      {canEdit && (
        <Button size="sm" variant="outline" className="h-7" onClick={() => onSave(Number(val))}>
          Set
        </Button>
      )}
    </div>
  )
}
