import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { createSession } from "@/lib/server/session"
import { audit, err, ok } from "@/lib/server/api"
import { safeUser } from "@/lib/server/services"
import { permissionsForRoles, portalForRoles } from "@/lib/domain/permissions"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.password) return err("Email and password are required")
  const db = getDb()
  const email = String(body.email).trim().toLowerCase()
  const user = db.users.find((u) => u.email.toLowerCase() === email)
  if (!user || user.password !== body.password) return err("Invalid credentials", 401)
  if (user.status === "LOCKED") return err("Account is locked", 403)
  await createSession(user.id)
  audit(user, "login", "user", user.id, "Successful login")
  return ok({
    user: safeUser(user),
    permissions: permissionsForRoles(user.roles),
    portal: portalForRoles(user.roles),
  })
}
