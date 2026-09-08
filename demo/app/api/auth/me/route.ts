import { getCurrentUser } from "@/lib/server/session"
import { ok } from "@/lib/server/api"
import { safeUser, walletFor } from "@/lib/server/services"
import { permissionsForRoles, portalForRoles } from "@/lib/domain/permissions"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return ok({ user: null })
  const wallet = walletFor(user.id)
  return ok({
    user: safeUser(user),
    permissions: permissionsForRoles(user.roles),
    portal: portalForRoles(user.roles),
    wallet: { available: wallet.available, bonus: wallet.bonus, currency: "DEMO" },
  })
}
