import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import { ledgerAdjust, walletFor } from "@/lib/server/services"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requirePermission("ledger.read")
  if (res instanceof NextResponse) return res
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").toLowerCase()
  const transactions = [...db.transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100)
    .map((t) => ({ ...t, userName: db.users.find((u) => u.id === t.userId)?.displayName ?? "Unknown" }))
  const filtered = q
    ? transactions.filter((t) => t.userName.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q))
    : transactions
  const totals = {
    bets: db.transactions.filter((t) => t.type === "MOCK_BET").reduce((s, t) => s + t.amount, 0),
    payouts: db.transactions.filter((t) => t.type === "MOCK_PAYOUT").reduce((s, t) => s + t.amount, 0),
    adjustments: db.transactions.filter((t) => t.type === "MOCK_ADJUSTMENT").reduce((s, t) => s + t.amount, 0),
  }
  return ok({ transactions: filtered, totals })
}

export async function POST(req: NextRequest) {
  const res = await requirePermission("ledger.adjust_mock")
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  if (!body?.userId) return err("userId required")
  const result = ledgerAdjust(res.user, body.userId, Number(body.amount), String(body.note ?? ""))
  if ("error" in result) return err(result.error)
  audit(res.user, "ledger.adjust_mock", "user", body.userId, `Adjusted ${body.amount} DEMO credits`)
  return ok({ ok: true, wallet: walletFor(body.userId) })
}
