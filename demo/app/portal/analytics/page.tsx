"use client"

import useSWR from "swr"
import { PortalShell } from "@/components/portal/portal-shell"
import { Card, Skeleton } from "@/components/ui/kit"
import { fmtCredits } from "@/lib/client/api"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface AnalyticsData {
  kpis: Record<string, number>
  byDay: { day: string; bets: number; turnover: number }[]
  betsBySport: { name: string; value: number }[]
}

const PIE = ["#4f6ef7", "#3fbf7f", "#e0b341", "#e0654f", "#a24fe0", "#4fc3e0"]

export default function PortalAnalyticsPage() {
  return (
    <PortalShell>
      <Inner />
    </PortalShell>
  )
}

function Inner() {
  const { data, isLoading } = useSWR<AnalyticsData>("/api/analytics")

  if (isLoading || !data)
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Analytics</h1>
      <p className="text-sm text-muted-foreground">Derived live from mock records — placing bets changes these numbers.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="DEMO turnover" value={fmtCredits(data.kpis.turnover)} />
        <Kpi label="Total bets" value={String(data.kpis.totalBets)} />
        <Kpi label="Active customers" value={String(data.kpis.activeCustomers)} />
        <Kpi label="Live events" value={String(data.kpis.liveEvents)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold">Bets & turnover (last 7 days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis dataKey="day" stroke="#8891a5" fontSize={12} />
                <YAxis stroke="#8891a5" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#1c2230", border: "1px solid #2b3243", borderRadius: 6, fontSize: 12 }}
                />
                <Bar dataKey="turnover" fill="#4f6ef7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold">Bets by sport</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.betsBySport} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {data.betsBySport.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1c2230", border: "1px solid #2b3243", borderRadius: 6, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.betsBySport.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-black tabular-nums">{value}</p>
    </Card>
  )
}
