import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok } from "@/lib/server/api"
import { walletFor, safeUser } from "@/lib/server/services"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requirePermission("users.read")
  if (res instanceof NextResponse) return res
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").toLowerCase()
  const role = searchParams.get("role")
  let users = [...db.users]
  if (q) users = users.filter((u) => u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q))
  if (role && role !== "all") users = users.filter((u) => u.roles.includes(role as never))
  const rows = users.slice(0, 100).map((u) => ({
    ...safeUser(u),
    wallet: walletFor(u.id).available,
    betCount: db.bets.filter((b) => b.userId === u.id).length,
  }))
  return ok({ users: rows, total: users.length })
}
