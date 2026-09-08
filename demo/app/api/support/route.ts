import { type NextRequest } from "next/server"
import { getDb, nextId } from "@/lib/server/store"
import { getCurrentUser, userHasPermission } from "@/lib/server/session"
import { requireUser, ok, err, audit } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const db = getDb()
  const isStaff = userHasPermission(res.user, "support.read")
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const q = (searchParams.get("q") ?? "").toLowerCase()
  let tickets = isStaff ? [...db.tickets] : db.tickets.filter((t) => t.customerId === res.user.id)
  if (status && status !== "all") tickets = tickets.filter((t) => t.status === status)
  if (q) tickets = tickets.filter((t) => t.subject.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q))
  tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return ok({ tickets, isStaff })
}

export async function POST(req: NextRequest) {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  if (!body?.subject) return err("Subject is required")
  const db = getDb()
  const now = new Date().toISOString()
  const ticket = {
    id: nextId("tkt"),
    customerId: res.user.id,
    customerName: res.user.displayName,
    assigneeId: null,
    subject: String(body.subject),
    category: String(body.category ?? "general"),
    status: "OPEN" as const,
    createdAt: now,
    updatedAt: now,
  }
  db.tickets.unshift(ticket)
  db.messages.push({
    id: nextId("msg"),
    ticketId: ticket.id,
    authorId: res.user.id,
    authorName: res.user.displayName,
    body: String(body.body ?? "New support request."),
    internal: false,
    createdAt: now,
  })
  audit(res.user, "support.create", "ticket", ticket.id, `Opened ticket: ${ticket.subject}`)
  return ok({ ticket })
}
