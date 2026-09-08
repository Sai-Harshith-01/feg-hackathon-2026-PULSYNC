import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { requireUser, ok, err, audit } from "@/lib/server/api"
import { userHasPermission } from "@/lib/server/session"
import { NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  const { id } = await params
  const db = getDb()
  const user = db.users.find((u) => u.id === id)
  if (!user) return err("User not found", 404)
  const body = await req.json().catch(() => null)
  const action = body?.action as string

  if (action === "suspend") {
    if (!userHasPermission(res.user, "users.suspend")) return err("Forbidden", 403)
    user.status = "SUSPENDED"
    audit(res.user, "users.suspend", "user", user.id, `Suspended ${user.email}`)
  } else if (action === "activate" || action === "unlock") {
    if (!userHasPermission(res.user, "users.unlock") && !userHasPermission(res.user, "users.update"))
      return err("Forbidden", 403)
    user.status = "ACTIVE"
    audit(res.user, "users.unlock", "user", user.id, `Reactivated ${user.email}`)
  } else {
    return err("Unknown action")
  }
  return ok({ user: { id: user.id, status: user.status } })
}
