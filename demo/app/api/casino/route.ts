import { type NextRequest } from "next/server"
import { getDb } from "@/lib/server/store"
import { ok } from "@/lib/server/api"

export async function GET(req: NextRequest) {
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  let games = [...db.casino]
  if (category && category !== "Lobby" && category !== "All Games") {
    if (category === "New Games") games = games.filter((g) => g.isNew)
    else if (category === "Popular") games = games.filter((g) => g.isPopular)
    else games = games.filter((g) => g.category === category)
  }
  const categories = ["Lobby", "Jackpots", "New Games", "Popular", "Game Shows", "Table Games", "Big Wins", "All Games"]
  return ok({ games, categories, featured: db.casino.filter((g) => g.isFeatured).slice(0, 6) })
}
