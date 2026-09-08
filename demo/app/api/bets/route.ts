import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, requireUser, ok, err, audit } from "@/lib/server/api"
import { placeBet, walletFor } from "@/lib/server/services"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter") // open | settled
  let bets = db.bets.filter((b) => b.userId === res.user.id)
  if (filter === "open") bets = bets.filter((b) => b.status === "SUBMITTED" || b.status === "OPEN")
  else if (filter === "settled") bets = bets.filter((b) => ["WON", "LOST", "VOID", "CANCELLED"].includes(b.status))
  return ok({ bets })
}

export async function POST(req: NextRequest) {
  const res = await requirePermission("bets.create_mock")
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid request body")
  const result = placeBet(res.user, { selectionIds: body.selectionIds, stake: Number(body.stake) })
  if ("error" in result) return err(result.error)
  const wallet = walletFor(res.user.id)
  audit(res.user, "bets.create_mock", "bet", result.bet.id, `Placed mock bet ${result.bet.ticketCode}`)
  return ok({ bet: result.bet, wallet: { available: wallet.available, bonus: wallet.bonus, currency: "DEMO" } })
}
