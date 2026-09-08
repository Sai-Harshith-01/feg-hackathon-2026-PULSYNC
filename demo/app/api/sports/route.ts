import { getDb } from "@/lib/server/store"
import { tickSimulation } from "@/lib/server/simulation"
import { ok } from "@/lib/server/api"

export async function GET() {
  tickSimulation()
  const db = getDb()
  const sports = [...db.sports]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const compIds = new Set(db.competitions.filter((c) => c.sportId === s.id).map((c) => c.id))
      const events = db.events.filter((e) => compIds.has(e.competitionId))
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        eventCount: events.length,
        liveCount: events.filter((e) => e.status === "LIVE").length,
      }
    })
  return ok({ sports })
}
