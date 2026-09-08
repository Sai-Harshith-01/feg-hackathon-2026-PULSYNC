"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton, Badge, Button, Input, Select } from "@/components/ui/kit"
import { apiPost, fmtCredits } from "@/lib/client/api"
import { useAuth } from "@/lib/client/auth"
import { useToasts } from "@/lib/client/stores"
import { ROLES } from "@/lib/domain/permissions"

interface Row {
  id: string
  email: string
  displayName: string
  roles: string[]
  status: string
  wallet: number
  betCount: number
}

export default function UsersPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { can } = useAuth()
  const push = useToasts((s) => s.push)
  const [q, setQ] = useState("")
  const [role, setRole] = useState("all")
  const key = `/api/admin/users?q=${encodeURIComponent(q)}&role=${role}`
  const { data, isLoading } = useSWR<{ users: Row[]; total: number }>(key)

  async function act(id: string, action: string) {
    try {
      await apiPost(`/api/admin/users/${id}`, { action })
      mutate(key)
      push(`User ${action}d`, "success")
    } catch (e) {
      push((e as Error).message, "error")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">User Administration</h1>
      <Card className="flex flex-col gap-2 p-3 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" />
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-48">
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border bg-secondary/40 px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground sm:grid-cols-[1fr_120px_100px_80px_140px]">
          <span>User</span>
          <span className="hidden sm:block">Role</span>
          <span className="text-right">Wallet</span>
          <span className="text-right">Bets</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-10" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data?.users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2 text-sm sm:grid-cols-[1fr_120px_100px_80px_140px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="hidden sm:block">
                  <Badge>{u.roles[0]}</Badge>
                </div>
                <span className="text-right font-mono tabular-nums">{fmtCredits(u.wallet)}</span>
                <span className="text-right font-mono tabular-nums">{u.betCount}</span>
                <div className="flex justify-end gap-1">
                  {u.status === "ACTIVE" ? (
                    can("users.suspend") && (
                      <Button size="sm" variant="danger" onClick={() => act(u.id, "suspend")}>
                        Suspend
                      </Button>
                    )
                  ) : (
                    <>
                      <Badge variant="danger">{u.status}</Badge>
                      {(can("users.unlock") || can("users.update")) && (
                        <Button size="sm" variant="success" onClick={() => act(u.id, "activate")}>
                          Activate
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
