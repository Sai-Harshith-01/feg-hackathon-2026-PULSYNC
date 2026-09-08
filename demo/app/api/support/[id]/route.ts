import { type NextRequest } from "next/server"
import { getDb, nextId } from "@/lib/server/store"
import { requireUser, ok, err, audit } from "@/lib/server/api"
import { userHasPermission } from "@/lib/server/session"
import type { TicketStatus } from "@/lib/domain/types"
import { NextResponse } from "next/server"

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING", "CLOSED"],
  IN_PROGRESS: ["WAITING", "RESOLVED", "CLOSED"],
  WAITING: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const { id } = await params
  const db = getDb()
  const ticket = db.tickets.find((t) => t.id === id)
  if (!ticket) return err("Ticket not found", 404)
  const isStaff = userHasPermission(res.user, "support.read")
  if (!isStaff && ticket.customerId !== res.user.id) return err("Forbidden", 403)
  const messages = db.messages
    .filter((m) => m.ticketId === id && (isStaff || !m.internal))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return ok({ ticket, messages, isStaff })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const { id } = await params
  const db = getDb()
  const ticket = db.tickets.find((t) => t.id === id)
  if (!ticket) return err("Ticket not found", 404)
  const isStaff = userHasPermission(res.user, "support.respond")
  if (!isStaff && ticket.customerId !== res.user.id) return err("Forbidden", 403)
  const body = await req.json().catch(() => null)
  const now = new Date().toISOString()

  if (body?.status) {
    if (!isStaff) return err("Only support staff can change status", 403)
    const target = body.status as TicketStatus
    if (!TRANSITIONS[ticket.status].includes(target)) return err(`Invalid transition ${ticket.status} → ${target}`)
    ticket.status = target
    if (target === "ASSIGNED" || target === "IN_PROGRESS") ticket.assigneeId = res.user.id
    ticket.updatedAt = now
    audit(res.user, "support.status", "ticket", ticket.id, `Status → ${target}`)
  }
  if (body?.message) {
    db.messages.push({
      id: nextId("msg"),
      ticketId: ticket.id,
      authorId: res.user.id,
      authorName: res.user.displayName,
      body: String(body.message),
      internal: Boolean(body.internal) && isStaff,
      createdAt: now,
    })
    ticket.updatedAt = now
    if (isStaff) audit(res.user, "support.respond", "ticket", ticket.id, "Replied to ticket")
  }
  const messages = db.messages
    .filter((m) => m.ticketId === id && (isStaff || !m.internal))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return ok({ ticket, messages })
}
