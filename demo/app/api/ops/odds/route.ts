import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const res = await requirePermission("odds.update")
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  const odds = Number(body?.odds)
  if (!body?.selectionId || !Number.isFinite(odds) || odds < 1.01 || odds > 1000)
    return err("Valid selectionId and odds (1.01–1000) required")
  const db = getDb()
  const sel = db.selections.find((s) => s.id === body.selectionId)
  if (!sel) return err("Selection not found", 404)
  const prev = sel.odds
  sel.odds = Math.round(odds * 100) / 100
  audit(res.user, "odds.update", "selection", sel.id, `Odds ${prev} → ${sel.odds}`)
  return ok({ selection: { id: sel.id, name: sel.name, odds: sel.odds } })
}
