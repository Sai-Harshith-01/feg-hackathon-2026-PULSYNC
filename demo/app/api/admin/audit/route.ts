import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requirePermission("audit.read")
  if (res instanceof NextResponse) return res
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").toLowerCase()
  let logs = [...db.audit]
  if (q) logs = logs.filter((l) => l.action.toLowerCase().includes(q) || l.resourceType.toLowerCase().includes(q))
  return ok({ logs: logs.slice(0, 100), total: logs.length })
}
