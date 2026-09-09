<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <!-- Left Sidebar: Sports Rail (3 cols) -->
    <div class="lg:col-span-3">
      <SportsRail />
    </div>

    <!-- Center: Main Feed & AI Guidance (6 cols) -->
    <div class="flex flex-col gap-4 lg:col-span-6">
      <ContextualGuidanceBanner />
      
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold capitalize text-slate-100">
          {{ selectedSport === 'all' ? 'All Sports & Top Fixtures' : selectedSport.replace('-', ' ') }}
        </h2>
      </div>

      <SportFeed :sport="selectedSport" @select-odd="onSelectOdd" />
    </div>

    <!-- Right Sidebar: Bet Slip (3 cols) -->
    <div class="lg:col-span-3">
      <BetSlip 
        :selections="selections" 
        @remove-selection="removeSelection" 
        @clear-slip="selections = []" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import SportsRail from '@/components/SportsRail.vue'
import SportFeed from '@/components/SportFeed.vue'
import ContextualGuidanceBanner from '@/components/ContextualGuidanceBanner.vue'
import BetSlip from '@/components/BetSlip.vue'
import { getActiveSessionId, trackSessionEvent, type EventItem, type SelectionItem } from '@/services/api'

const route = useRoute()

const selectedSport = computed(() => {
  return (route.query.sport as string) || 'all'
})

const selections = ref<{ event: EventItem; selection: SelectionItem }[]>([])

function onSelectOdd(item: { event: EventItem; selection: SelectionItem }) {
  const existingIdx = selections.value.findIndex(s => s.event.id === item.event.id)
  if (existingIdx >= 0) {
    selections.value[existingIdx] = item
  } else {
    selections.value.push(item)
  }
  const sessionId = getActiveSessionId()
  if (sessionId) {
    void trackSessionEvent(sessionId, 'market_view', '/market', 'select_odd')
  }
}

function removeSelection(idx: number) {
  selections.value.splice(idx, 1)
}
</script>
