export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

export async function apiPost<T = any>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

export const fetcher = (url: string) => apiGet(url)

export function fmtCredits(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "0.00"
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
