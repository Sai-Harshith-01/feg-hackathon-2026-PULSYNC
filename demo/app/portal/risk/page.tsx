"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Button, Select, EmptyState } from "@/components/ui/kit"
import { apiPost } from "@/lib/client/api"
import { useAuth } from "@/lib/client/auth"
import { useToasts } from "@/lib/client/stores"
import type { RiskAlert, RiskStatus } from "@/lib/domain/types"

const NEXT: Record<RiskStatus, RiskStatus[]> = {
  OPEN: ["UNDER_REVIEW", "RESOLVED"],
  UNDER_REVIEW: ["ACTION_REQUIRED", "RESOLVED"],
  ACTION_REQUIRED: ["RESOLVED", "UNDER_REVIEW"],
  RESOLVED: [],
}

export default function PortalRiskPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { can } = useAuth()
  const push = useToasts((s) => s.push)
  const [status, setStatus] = useState("all")
  const key = `/api/risk?status=${status}`
  const { data, isLoading } = useSWR<{ alerts: RiskAlert[] }>(key)

  async function transition(id: string, s: string) {
    try {
      await apiPost(`/api/risk/${id}`, { status: s })
      mutate(key)
      push(`Alert → ${s}`, "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  const sevVariant = { HIGH: "danger", MEDIUM: "warn", LOW: "muted" } as const

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Risk Alerts</h1>
      <Card className="p-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-56">
          <option value="all">All statuses</option>
          {["OPEN", "UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Card>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (data?.alerts.length ?? 0) === 0 ? (
        <EmptyState title="No alerts" />
      ) : (
        <div className="flex flex-col gap-2">
          {data?.alerts.map((a) => (
            <Card key={a.id} className="p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={sevVariant[a.severity]}>{a.severity}</Badge>
                  <span className="text-sm font-semibold">{a.alertType}</span>
                  <Badge>{a.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{a.userName}</span>
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{a.details}</p>
              {can("risk.resolve") && (
                <div className="flex flex-wrap gap-1">
                  {NEXT[a.status].map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => transition(a.id, s)}>
                      → {s}
                    </Button>
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
