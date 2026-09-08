"use client"

import useSWR from "swr"
import Link from "next/link"
import { CustomerShell } from "@/components/shell/customer-shell"
import { RequireAuth } from "@/components/auth/require-auth"
import { useAuth } from "@/lib/client/auth"
import { Card, Badge, Skeleton } from "@/components/ui/kit"
import { fmtCredits } from "@/lib/client/api"
import type { Notification } from "@/lib/domain/types"
import { Bell, Receipt, Wallet } from "lucide-react"

export default function ProfilePage() {
  return (
    <CustomerShell showRail={false} showSlip={false}>
      <RequireAuth>
        <Inner />
      </RequireAuth>
    </CustomerShell>
  )
}

function Inner() {
  const { user, wallet } = useAuth()
  const { data } = useSWR<{ notifications: Notification[]; unread: number }>("/api/notifications")

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">My Profile</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm font-bold">{user?.displayName}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {user?.roles.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
            <Badge variant={user?.status === "ACTIVE" ? "success" : "danger"}>{user?.status}</Badge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Fictional city: {user?.city}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-4" /> Balance (DEMO)
          </div>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-[var(--up)]">{fmtCredits(wallet?.available)}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/wallet" className="text-xs font-semibold text-primary hover:underline">
              Wallet & ledger →
            </Link>
            <Link href="/my-bets" className="text-xs font-semibold text-primary hover:underline">
              My bets →
            </Link>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Receipt className="size-4" /> FEG Dataset Profile
          </div>
          <ProfileIntelligenceCard />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2 text-sm font-semibold">
          <Bell className="size-4" /> Notifications {data?.unread ? <Badge variant="danger">{data.unread}</Badge> : null}
        </div>
        {!data ? (
          <div className="p-3">
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.notifications.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-start justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function ProfileIntelligenceCard() {
  const { data } = useSWR<{
    preferred_sport?: string
    activity_level?: string
    historical_activity?: { total_actions: number; unique_sports_explored: number }
  }>("/api/users/usr_demo/profile")

  if (!data) return <Skeleton className="mt-2 h-16" />

  return (
    <div className="mt-2 flex flex-col gap-1 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Preferred Sport:</span>
        <span className="font-bold">{data.preferred_sport ?? "Football"}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Activity Level:</span>
        <Badge variant="success">{data.activity_level ?? "HIGH"}</Badge>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Dataset Actions:</span>
        <span className="font-mono font-semibold">{data.historical_activity?.total_actions ?? 2540}</span>
      </div>
    </div>
  )
}
