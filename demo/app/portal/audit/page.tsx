"use client"

import useSWR from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Input } from "@/components/ui/kit"
import type { AuditLog } from "@/lib/domain/types"

export default function AuditPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const [q, setQ] = useState("")
  const { data, isLoading } = useSWR<{ logs: AuditLog[]; total: number }>(`/api/admin/audit?q=${encodeURIComponent(q)}`)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Audit Log</h1>
      <Card className="p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action or resource…" />
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
            {data?.logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="default">{l.action}</Badge>
                  <span className="truncate text-muted-foreground">
                    {l.resourceType}
                    {l.resourceId ? `#${l.resourceId}` : ""} — {l.reason}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold">{l.actorRole}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
