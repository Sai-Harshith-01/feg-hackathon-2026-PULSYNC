"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Button, Badge } from "@/components/ui/kit"
import { apiPost } from "@/lib/client/api"
import { useToasts } from "@/lib/client/stores"
import type { FeatureFlag, SystemSetting } from "@/lib/domain/types"
import { RotateCcw } from "lucide-react"

export default function SystemPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { data, isLoading } = useSWR<{ flags: FeatureFlag[]; settings: SystemSetting[] }>("/api/admin/flags")
  const push = useToasts((s) => s.push)
  const [resetting, setResetting] = useState(false)

  async function toggle(key: string, enabled: boolean) {
    try {
      await apiPost("/api/admin/flags", { key, enabled })
      mutate("/api/admin/flags")
      push(`${key} ${enabled ? "enabled" : "disabled"}`, "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  async function reset() {
    if (!confirm("Reload the deterministic seed? This resets all mock data (bets, wallets, tickets).")) return
    setResetting(true)
    try {
      await apiPost("/api/admin/reset")
      push("Deterministic seed reloaded", "success")
      mutate(() => true) // revalidate everything
    } catch (e) {
      push((e as Error).message, "error")
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">System Controls</h1>

      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold">Seed / Reset</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Rebuild the in-memory mock database from the deterministic seed. Active sessions are preserved.
        </p>
        <Button variant="danger" onClick={reset} disabled={resetting}>
          <RotateCcw className="size-4" /> {resetting ? "Resetting…" : "Reset mock data"}
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-secondary/40 px-3 py-2 text-sm font-semibold">Feature flags</div>
        {isLoading ? (
          <div className="p-3">
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data?.flags.map((f) => (
              <div key={f.key} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{f.key}</p>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={f.enabled ? "success" : "muted"}>{f.enabled ? "ON" : "OFF"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggle(f.key, !f.enabled)}>
                    Toggle
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
