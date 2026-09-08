"use client"

import useSWR from "swr"
import { CustomerShell } from "@/components/shell/customer-shell"
import { Card, Skeleton, Badge } from "@/components/ui/kit"
import type { Promotion } from "@/lib/domain/types"
import { Gift } from "lucide-react"

export default function PromotionsPage() {
  const { data, isLoading } = useSWR<{ promotions: Promotion[] }>("/api/promotions")
  const published = (data?.promotions ?? []).filter((p) => p.status === "PUBLISHED")

  return (
    <CustomerShell showRail={false} showSlip={false}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-primary" />
          <h1 className="text-lg font-bold">Promotions</h1>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div
                  className={`flex h-24 items-end bg-gradient-to-br p-3 ${
                    p.theme === "casino" ? "from-[var(--chart-5)] to-primary" : "from-[var(--nav)] to-primary"
                  }`}
                >
                  <h2 className="text-sm font-bold text-white">{p.title}</h2>
                </div>
                <div className="p-3">
                  <Badge variant="warn">{p.theme}</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  )
}
