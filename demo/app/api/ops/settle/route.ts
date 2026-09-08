import { type NextRequest } from "next/server"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import { settleBet } from "@/lib/server/services"
import { NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const res = await requirePermission("bets.settle_mock")
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  const outcome = body?.outcome
  if (!body?.betId || !["WON", "LOST", "VOID"].includes(outcome)) return err("betId and WON/LOST/VOID outcome required")
  const result = settleBet(res.user, body.betId, outcome)
  if ("error" in result) return err(result.error)
  audit(res.user, "bets.settle_mock", "bet", result.bet.id, `Settled ${result.bet.ticketCode} → ${outcome}`)
  return ok({ bet: result.bet })
}
