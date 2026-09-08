import { getDb } from "@/lib/server/store"
import { requireUser, ok } from "@/lib/server/api"
import { walletFor } from "@/lib/server/services"
import { NextResponse } from "next/server"

export async function GET() {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const db = getDb()
  const wallet = walletFor(res.user.id)
  const transactions = db.transactions
    .filter((t) => t.userId === res.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50)
  const ledger = db.ledger
    .filter((l) => l.userId === res.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50)
  return ok({ wallet: { available: wallet.available, bonus: wallet.bonus, currency: "DEMO" }, transactions, ledger })
}
