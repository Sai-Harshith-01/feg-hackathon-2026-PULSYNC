import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function GET() {
  const res = await requirePermission("system.settings")
  if (res instanceof NextResponse) return res
  const db = getDb()
  return ok({ flags: db.flags, settings: db.settings })
}

export async function POST(req: NextRequest) {
  const res = await requirePermission("system.settings")
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  const db = getDb()
  const flag = db.flags.find((f) => f.key === body?.key)
  if (!flag) return err("Flag not found", 404)
  flag.enabled = Boolean(body.enabled)
  audit(res.user, "system.settings", "flag", flag.key, `${flag.key} → ${flag.enabled}`)
  return ok({ flag })
}
