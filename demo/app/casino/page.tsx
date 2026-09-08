"use client"

import useSWR from "swr"
import { useState } from "react"
import { CustomerShell } from "@/components/shell/customer-shell"
import { Card, Skeleton, Badge, Button } from "@/components/ui/kit"
import { useToasts } from "@/lib/client/stores"
import { cn } from "@/lib/utils"
import { Gamepad2 } from "lucide-react"
import type { CasinoGame } from "@/lib/domain/types"

export default function CasinoPage() {
  const [category, setCategory] = useState("Lobby")
  const push = useToasts((s) => s.push)
  const { data, isLoading } = useSWR<{ games: CasinoGame[]; categories: string[]; featured: CasinoGame[] }>(
    `/api/casino?category=${encodeURIComponent(category)}`,
  )

  function play(g: CasinoGame) {
    // deterministic mock spin outcome
    const seed = [...g.id].reduce((a, c) => a + c.charCodeAt(0), 0) + Date.now()
    const win = seed % 3 === 0
    push(win ? `${g.name}: mock win! (simulated, DEMO)` : `${g.name}: no win this spin (simulated)`, win ? "success" : "info")
  }

  return (
    <CustomerShell showRail={false} showSlip={false}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="size-5 text-primary" />
          <h1 className="text-lg font-bold">Casino</h1>
          <Badge variant="warn">Simulated outcomes</Badge>
        </div>

        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
          {(data?.categories ?? []).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-semibold transition-colors",
                category === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data?.games.map((g) => (
              <Card key={g.id} className="group overflow-hidden">
                <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[var(--chart-5)]/30 to-primary/30">
                  <span className="text-center text-sm font-bold text-foreground/90">{g.name}</span>
                  <div className="absolute left-1.5 top-1.5 flex gap-1">
                    {g.isNew && <Badge variant="success">New</Badge>}
                    {g.isFeatured && <Badge>Hot</Badge>}
                  </div>
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-muted-foreground">RTP {g.mockRtp}% · {g.category}</p>
                  <Button size="sm" className="mt-1.5 w-full" onClick={() => play(g)}>
                    Play (Demo)
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  )
}
