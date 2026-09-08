"use client"

import useSWR from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Input, Select, EmptyState } from "@/components/ui/kit"
import { TicketThread } from "@/components/support/ticket-thread"
import { cn } from "@/lib/utils"
import type { SupportTicket, TicketStatus } from "@/lib/domain/types"

const STATUSES: (TicketStatus | "all")[] = ["all", "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]

export default function PortalSupportPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const [status, setStatus] = useState("all")
  const [q, setQ] = useState("")
  const key = `/api/support?status=${status}&q=${encodeURIComponent(q)}`
  const { data, isLoading } = useSWR<{ tickets: SupportTicket[] }>(key)
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Support Queue</h1>
      <Card className="flex flex-col gap-2 p-3 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject or customer…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex max-h-[600px] flex-col gap-2 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : (data?.tickets.length ?? 0) === 0 ? (
            <EmptyState title="No tickets" />
          ) : (
            data?.tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  active === t.id ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{t.subject}</span>
                  <Badge>{t.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.customerName} · {t.category}
                </p>
              </button>
            ))
          )}
        </div>
        <div>
          {active ? <TicketThread ticketId={active} /> : <EmptyState title="Select a ticket to respond" />}
        </div>
      </div>
    </div>
  )
}
