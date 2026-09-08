import { CustomerShell } from "@/components/shell/customer-shell"
import { EventDetail } from "@/components/sports/event-detail"

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <CustomerShell>
      <EventDetail id={id} />
    </CustomerShell>
  )
}
