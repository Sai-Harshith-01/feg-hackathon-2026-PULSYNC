import { getDb } from "@/lib/server/store"
import { requireUser, ok } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function GET() {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const db = getDb()
  const notifications = db.notifications
    .filter((n) => n.userId === res.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30)
  return ok({ notifications, unread: notifications.filter((n) => !n.read).length })
}
