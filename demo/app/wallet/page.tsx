"use client"

import useSWR from "swr"
import { CustomerShell } from "@/components/shell/customer-shell"
import { Card, Skeleton, EmptyState, Badge } from "@/components/ui/kit"
import { fmtCredits } from "@/lib/client/api"
import { RequireAuth } from "@/components/auth/require-auth"
import { Wallet as WalletIcon } from "lucide-react"

interface Tx {
  id: string
  type: string
  amount: number
  reference: string
  note: string
  createdAt: string
}

export default function WalletPage() {
  return (
    <CustomerShell showSlip={false}>
      <RequireAuth>
        <WalletInner />
      </RequireAuth>
    </CustomerShell>
  )
}

function WalletInner() {
  const { data, isLoading } = useSWR<{ wallet: { available: number; bonus: number }; transactions: Tx[] }>("/api/wallet")

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Wallet & Ledger</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <WalletIcon className="size-4" /> Available (DEMO)
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-[var(--up)]">
              {fmtCredits(data?.wallet.available)}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Bonus credits</div>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 font-mono text-2xl font-black tabular-nums">{fmtCredits(data?.wallet.bonus)}</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Currency</div>
          <p className="mt-1 text-2xl font-black">DEMO</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-secondary/40 px-3 py-2 text-sm font-semibold">Transaction history</div>
        {isLoading ? (
          <div className="p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-10" />
            ))}
          </div>
        ) : (data?.transactions.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title="No transactions yet" hint="Place a demo bet to see ledger activity." />
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data?.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={t.type === "MOCK_PAYOUT" ? "success" : t.type === "MOCK_BET" ? "muted" : "default"}>
                      {t.type.replace("MOCK_", "")}
                    </Badge>
                    <span className="truncate text-xs text-muted-foreground">{t.reference}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.note}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      t.type === "MOCK_PAYOUT" || t.type === "MOCK_REFUND" ? "text-[var(--up)]" : "text-foreground"
                    }`}
                  >
                    {t.type === "MOCK_BET" ? "-" : "+"}
                    {fmtCredits(t.amount)}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
