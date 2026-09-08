import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requirePermission("bets.read")
  if (res instanceof NextResponse) return res
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter") ?? "open"
  let bets = [...db.bets]
  if (filter === "open") bets = bets.filter((b) => b.status === "SUBMITTED" || b.status === "OPEN")
  else if (filter === "settled") bets = bets.filter((b) => ["WON", "LOST", "VOID"].includes(b.status))
  bets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const withUser = bets.slice(0, 60).map((b) => ({
    ...b,
    userName: db.users.find((u) => u.id === b.userId)?.displayName ?? "Unknown",
  }))
  return ok({ bets: withUser })
}
