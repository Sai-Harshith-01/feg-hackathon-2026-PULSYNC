import { destroySession } from "@/lib/server/session"
import { ok } from "@/lib/server/api"

export async function POST() {
  await destroySession()
  return ok({ ok: true })
}
