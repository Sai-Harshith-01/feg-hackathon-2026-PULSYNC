import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok } from "@/lib/server/api"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const res = await requirePermission("risk.read")
  if (res instanceof NextResponse) return res
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  let alerts = [...db.risk]
  if (status && status !== "all") alerts = alerts.filter((a) => a.status === status)
  alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return ok({ alerts })
}
