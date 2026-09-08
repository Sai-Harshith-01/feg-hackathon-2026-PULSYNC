import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { tickSimulation } from "@/lib/server/simulation"
import { serializeEvent } from "@/lib/server/serialize"
import { ok } from "@/lib/server/api"

export async function GET(req: NextRequest) {
  tickSimulation()
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const sportSlug = searchParams.get("sport")
  const status = searchParams.get("status")
  const day = searchParams.get("day") // today | tomorrow | all
  const limit = Number(searchParams.get("limit") ?? 60)

  let events = [...db.events]
  if (sportSlug && sportSlug !== "all") {
    const sport = db.sports.find((s) => s.slug === sportSlug)
    if (sport) {
      const compIds = new Set(db.competitions.filter((c) => c.sportId === sport.id).map((c) => c.id))
      events = events.filter((e) => compIds.has(e.competitionId))
    }
  }
  if (status === "live") events = events.filter((e) => e.status === "LIVE")
  else if (status === "upcoming") events = events.filter((e) => e.status === "SCHEDULED")

  const now = Date.now()
  if (day === "today") events = events.filter((e) => new Date(e.startsAt).getTime() < now + 24 * 36e5)
  else if (day === "tomorrow")
    events = events.filter((e) => {
      const t = new Date(e.startsAt).getTime()
      return t >= now + 24 * 36e5 && t < now + 48 * 36e5
    })

  events.sort((a, b) => {
    if (a.status === "LIVE" && b.status !== "LIVE") return -1
    if (b.status === "LIVE" && a.status !== "LIVE") return 1
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  })

  return ok({ events: events.slice(0, limit).map((e) => serializeEvent(db, e)), total: events.length })
}
