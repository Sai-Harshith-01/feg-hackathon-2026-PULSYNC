"use client"

import { SWRConfig } from "swr"
import { fetcher } from "@/lib/client/api"
import { Toaster } from "@/components/toaster"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false, dedupingInterval: 2000 }}>
      {children}
      <Toaster />
    </SWRConfig>
  )
}
