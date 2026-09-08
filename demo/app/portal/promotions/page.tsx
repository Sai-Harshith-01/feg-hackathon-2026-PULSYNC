"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Button, Input, Select } from "@/components/ui/kit"
import { apiPost } from "@/lib/client/api"
import { useAuth } from "@/lib/client/auth"
import { useToasts } from "@/lib/client/stores"
import type { Promotion, PromotionStatus } from "@/lib/domain/types"

const NEXT: Record<PromotionStatus, PromotionStatus[]> = {
  DRAFT: ["REVIEW", "ARCHIVED"],
  REVIEW: ["PUBLISHED", "DRAFT", "ARCHIVED"],
  PUBLISHED: ["EXPIRED", "ARCHIVED"],
  EXPIRED: ["ARCHIVED"],
  ARCHIVED: [],
}

export default function PortalPromotionsPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { can } = useAuth()
  const push = useToasts((s) => s.push)
  const { data, isLoading } = useSWR<{ promotions: Promotion[] }>("/api/promotions")
  const [title, setTitle] = useState("")
  const [theme, setTheme] = useState("sports")

  async function create() {
    if (!title.trim()) return
    try {
      await apiPost("/api/promotions", { title, theme })
      setTitle("")
      mutate("/api/promotions")
      push("Draft created", "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  async function transition(id: string, status: string) {
    try {
      await apiPost(`/api/promotions/${id}`, { status })
      mutate("/api/promotions")
      push(`Promotion → ${status}`, "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Promotion Management</h1>
      {can("promotions.create") && (
        <Card className="flex flex-col gap-2 p-3 sm:flex-row">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New promotion title…" />
          <Select value={theme} onChange={(e) => setTheme(e.target.value)} className="sm:w-40">
            <option value="sports">Sports</option>
            <option value="casino">Casino</option>
          </Select>
          <Button onClick={create} className="shrink-0">
            Create draft
          </Button>
        </Card>
      )}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {data?.promotions.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold">{p.title}</span>
                <Badge variant={p.status === "PUBLISHED" ? "success" : p.status === "DRAFT" ? "muted" : "default"}>
                  {p.status}
                </Badge>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{p.body}</p>
              <div className="flex flex-wrap gap-1">
                {NEXT[p.status].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    disabled={s === "PUBLISHED" && !can("promotions.publish")}
                    onClick={() => transition(p.id, s)}
                  >
                    → {s}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
