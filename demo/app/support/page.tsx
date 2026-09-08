"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { CustomerShell } from "@/components/shell/customer-shell"
import { RequireAuth } from "@/components/auth/require-auth"
import { Card, Skeleton, Badge, Button, Input, EmptyState } from "@/components/ui/kit"
import { TicketThread } from "@/components/support/ticket-thread"
import { apiPost } from "@/lib/client/api"
import { useToasts } from "@/lib/client/stores"
import { cn } from "@/lib/utils"
import type { SupportTicket } from "@/lib/domain/types"
import { MessageSquare } from "lucide-react"

export default function SupportPage() {
  return (
    <CustomerShell showRail={false} showSlip={false}>
      <RequireAuth>
        <Inner />
      </RequireAuth>
    </CustomerShell>
  )
}

function Inner() {
  const { data, isLoading } = useSWR<{ tickets: SupportTicket[] }>("/api/support")
  const push = useToasts((s) => s.push)
  const [active, setActive] = useState<string | null>(null)
  const [subject, setSubject] = useState("")

  async function create() {
    if (!subject.trim()) return
    try {
      const res = await apiPost("/api/support", { subject, body: "New support request (demo)." })
      setSubject("")
      mutate("/api/support")
      setActive(res.ticket.id)
      push("Ticket created", "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-primary" />
        <h1 className="text-lg font-bold">Support</h1>
      </div>
      <Card className="flex flex-col gap-2 p-3 sm:flex-row">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Describe your issue (demo)…" />
        <Button onClick={create} className="shrink-0">
          New ticket
        </Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : (data?.tickets.length ?? 0) === 0 ? (
            <EmptyState title="No tickets yet" hint="Open a ticket above." />
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
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold">{t.subject}</span>
                  <Badge variant="default">{t.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.category}</p>
              </button>
            ))
          )}
        </div>
        <div>
          {active ? (
            <TicketThread ticketId={active} />
          ) : (
            <EmptyState title="Select a ticket" hint="Choose a ticket to view the conversation." />
          )}
        </div>
      </div>
    </div>
  )
}
