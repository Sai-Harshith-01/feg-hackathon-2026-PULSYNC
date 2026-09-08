import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { tickSimulation } from "@/lib/server/simulation"
import { serializeEventDetail } from "@/lib/server/serialize"
import { err, ok } from "@/lib/server/api"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  tickSimulation()
  const { id } = await params
  const db = getDb()
  const ev = db.events.find((e) => e.id === id)
  if (!ev) return err("Event not found", 404)
  return ok({ event: serializeEventDetail(db, ev) })
}
