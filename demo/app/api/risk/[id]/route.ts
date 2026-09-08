import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import type { RiskStatus } from "@/lib/domain/types"
import { NextResponse } from "next/server"

const TRANSITIONS: Record<RiskStatus, RiskStatus[]> = {
  OPEN: ["UNDER_REVIEW", "RESOLVED"],
  UNDER_REVIEW: ["ACTION_REQUIRED", "RESOLVED"],
  ACTION_REQUIRED: ["RESOLVED", "UNDER_REVIEW"],
  RESOLVED: [],
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const res = await requirePermission("risk.resolve")
  if (res instanceof NextResponse) return res
  const { id } = await params
  const db = getDb()
  const alert = db.risk.find((a) => a.id === id)
  if (!alert) return err("Alert not found", 404)
  const body = await req.json().catch(() => null)
  const target = body?.status as RiskStatus
  if (!target || !TRANSITIONS[alert.status].includes(target)) return err(`Invalid transition ${alert.status} → ${target}`)
  alert.status = target
  audit(res.user, "risk.resolve", "risk_alert", alert.id, `Status → ${target}`)
  return ok({ alert })
}
