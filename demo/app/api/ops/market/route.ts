import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const res = await requirePermission("sports.suspend_market")
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  const status = body?.status
  if (!body?.marketId || !["OPEN", "SUSPENDED"].includes(status)) return err("marketId and OPEN/SUSPENDED status required")
  const db = getDb()
  const market = db.markets.find((m) => m.id === body.marketId)
  if (!market) return err("Market not found", 404)
  market.status = status
  audit(res.user, "sports.suspend_market", "market", market.id, `${market.name} → ${status}`)
  return ok({ market: { id: market.id, name: market.name, status: market.status } })
}
