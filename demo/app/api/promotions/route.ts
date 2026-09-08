import { type NextRequest } from "next/server"
import { getDb, nextId } from "@/lib/server/store"
import { getCurrentUser } from "@/lib/server/session"
import { requirePermission, ok, err, audit } from "@/lib/server/api"
import { userHasPermission } from "@/lib/server/session"
import { NextResponse } from "next/server"

export async function GET() {
  const db = getDb()
  const user = await getCurrentUser()
  const canManage = user ? userHasPermission(user, "promotions.create") : false
  const promotions = canManage ? db.promotions : db.promotions.filter((p) => p.status === "PUBLISHED")
  return ok({
    promotions: [...promotions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    banners: [...db.banners].sort((a, b) => a.sortOrder - b.sortOrder),
    canManage,
  })
}

export async function POST(req: NextRequest) {
  const res = await requirePermission("promotions.create")
  if (res instanceof NextResponse) return res
  const body = await req.json().catch(() => null)
  if (!body?.title) return err("Title is required")
  const db = getDb()
  const promo = {
    id: nextId("pro"),
    title: String(body.title),
    body: String(body.body ?? "Fictional promotional credit offer. DEMO CREDITS only."),
    theme: body.theme === "casino" ? "casino" : "sports",
    status: "DRAFT" as const,
    publishedAt: null,
    createdAt: new Date().toISOString(),
  }
  db.promotions.unshift(promo)
  audit(res.user, "promotions.create", "promotion", promo.id, `Created promotion ${promo.title}`)
  return ok({ promotion: promo })
}
