import { resetDb } from "@/lib/server/store"
import { requirePermission, ok } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function POST() {
  const res = await requirePermission("system.settings")
  if (res instanceof NextResponse) return res
  resetDb()
  return ok({ ok: true, message: "Deterministic seed reloaded" })
}
