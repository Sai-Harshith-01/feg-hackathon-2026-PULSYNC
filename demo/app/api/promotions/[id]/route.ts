import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import type { PromotionStatus } from "@/lib/domain/types"
import { NextResponse } from "next/server"

const TRANSITIONS: Record<PromotionStatus, PromotionStatus[]> = {
  DRAFT: ["REVIEW", "ARCHIVED"],
  REVIEW: ["PUBLISHED", "DRAFT", "ARCHIVED"],
  PUBLISHED: ["EXPIRED", "ARCHIVED"],
  EXPIRED: ["ARCHIVED"],
  ARCHIVED: [],
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const target = body?.status as PromotionStatus
  const perm = target === "PUBLISHED" ? "promotions.publish" : "promotions.create"
  const res = await requirePermission(perm)
  if (res instanceof NextResponse) return res
  const db = getDb()
  const promo = db.promotions.find((p) => p.id === id)
  if (!promo) return err("Promotion not found", 404)
  if (!TRANSITIONS[promo.status].includes(target)) return err(`Invalid transition ${promo.status} → ${target}`)
  promo.status = target
  promo.publishedAt = target === "PUBLISHED" ? new Date().toISOString() : promo.publishedAt
  audit(res.user, "promotions.transition", "promotion", promo.id, `${promo.title}: → ${target}`)
  return ok({ promotion: promo })
}
