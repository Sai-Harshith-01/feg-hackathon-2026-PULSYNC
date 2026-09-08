import { getDb } from "@/lib/server/store"
import { requireUser, ok } from "@/lib/server/api"
import { userHasPermission } from "@/lib/server/session"
import { NextResponse } from "next/server"

export async function GET() {
  const res = await requireUser()
  if (res instanceof NextResponse) return res
  // analytics.read OR admin gets full; otherwise still allow read of high-level for staff dashboards
  if (!userHasPermission(res.user, "analytics.read")) return ok({ restricted: true, ...topline() })
  return ok({ restricted: false, ...topline() })
}

function topline() {
  const db = getDb()
  const customers = db.users.filter((u) => u.roles.includes("CUSTOMER"))
  const openBets = db.bets.filter((b) => b.status === "SUBMITTED" || b.status === "OPEN")
  const settledBets = db.bets.filter((b) => ["WON", "LOST", "VOID"].includes(b.status))
  const turnover = db.bets.reduce((s, b) => s + b.stake, 0)
  const payout = db.bets.filter((b) => b.status === "WON").reduce((s, b) => s + b.potentialPayout, 0)

  // bets by day (last 7 days)
  const now = Date.now()
  const byDay: { day: string; bets: number; turnover: number }[] = []
  for (let d = 6; d >= 0; d--) {
    const start = now - d * 864e5
    const label = new Date(start).toLocaleDateString("en", { weekday: "short" })
    const dayBets = db.bets.filter((b) => {
      const t = new Date(b.createdAt).getTime()
      return t >= start - 12 * 36e5 && t < start + 12 * 36e5
    })
    byDay.push({ day: label, bets: dayBets.length, turnover: Math.round(dayBets.reduce((s, b) => s + b.stake, 0)) })
  }

  const betsBySport: Record<string, number> = {}
  for (const b of db.bets) {
    const ev = db.events.find((e) => e.id === b.selections[0]?.eventId)
    const comp = ev ? db.competitions.find((c) => c.id === ev.competitionId) : undefined
    const sport = comp ? db.sports.find((s) => s.id === comp.sportId) : undefined
    const name = sport?.name ?? "Other"
    betsBySport[name] = (betsBySport[name] ?? 0) + 1
  }

  return {
    kpis: {
      customers: customers.length,
      activeCustomers: customers.filter((c) => c.status === "ACTIVE").length,
      totalBets: db.bets.length,
      openBets: openBets.length,
      settledBets: settledBets.length,
      turnover: Math.round(turnover),
      payout: Math.round(payout),
      openTickets: db.tickets.filter((t) => !["RESOLVED", "CLOSED"].includes(t.status)).length,
      openRisk: db.risk.filter((a) => a.status !== "RESOLVED").length,
      liveEvents: db.events.filter((e) => e.status === "LIVE").length,
      casinoGames: db.casino.length,
    },
    byDay,
    betsBySport: Object.entries(betsBySport)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
  }
}
