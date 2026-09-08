"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiPost } from "@/lib/client/api"
import { useAuth } from "@/lib/client/auth"
import { useToasts } from "@/lib/client/stores"
import { Button, Input, Card, Spinner } from "@/components/ui/kit"
import { DemoBanner } from "@/components/shell/demo-banner"

const DEMO_LOGINS = [
  { email: "customer@example.test", role: "Customer" },
  { email: "admin@example.test", role: "Admin" },
  { email: "support@example.test", role: "Support" },
  { email: "sports@example.test", role: "Sports Operator" },
  { email: "promo@example.test", role: "Promotion Mgr" },
  { email: "risk@example.test", role: "Risk Analyst" },
  { email: "finance@example.test", role: "Finance" },
  { email: "content@example.test", role: "Content Editor" },
  { email: "casino@example.test", role: "Casino Operator" },
]
const DEMO_PASSWORD = "DemoOnly123!"

export default function LoginPage() {
  const router = useRouter()
  const { refresh } = useAuth()
  const push = useToasts((s) => s.push)
  const [email, setEmail] = useState("customer@example.test")
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await apiPost("/api/auth/login", { email, password })
      await refresh()
      push(`Welcome, ${res.user.displayName}`, "success")
      router.push(res.portal === "staff" ? "/portal" : "/")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DemoBanner />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-start lg:py-16">
        <div className="flex-1">
          <div className="mb-6 flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded bg-[var(--nav)] font-mono text-lg font-black text-white">
              PS
            </span>
            <div>
              <h1 className="text-xl font-bold">PulSync Bet</h1>
              <p className="text-xs text-muted-foreground">Fictional sportsbook demo</p>
            </div>
          </div>
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-bold">Sign in</h2>
            <p className="mb-4 text-sm text-muted-foreground">Use a seeded demo account. Backend enforces all permissions.</p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Spinner className="border-primary-foreground/40 border-t-primary-foreground" /> : "Log in"}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link href="/" className="text-primary hover:underline">
                Continue browsing as guest
              </Link>
            </p>
          </Card>
        </div>

        <div className="flex-1">
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">Demo accounts</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Password for all: <code className="rounded bg-secondary px-1 py-0.5 font-mono">{DEMO_PASSWORD}</code>
            </p>
            <div className="grid gap-1.5">
              {DEMO_LOGINS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email)
                    setPassword(DEMO_PASSWORD)
                  }}
                  className="flex items-center justify-between rounded border border-border bg-secondary/40 px-3 py-2 text-left text-sm hover:border-primary/50 hover:bg-secondary"
                >
                  <span className="font-mono text-xs">{a.email}</span>
                  <span className="text-xs font-semibold text-primary">{a.role}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
