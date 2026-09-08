import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok } from "@/lib/server/api"
import { serializeEventDetail } from "@/lib/server/serialize"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requirePermission("sports.read")
  if (res instanceof NextResponse) return res
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  let events = [...db.events]
  if (status && status !== "all") events = events.filter((e) => e.status === status)
  events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  return ok({ events: events.slice(0, 40).map((e) => serializeEventDetail(db, e)) })
}
