<template>
  <div v-if="recommendations.length > 0" class="rounded-lg border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-card to-slate-900/60 p-4 shadow-lg">
    <div class="flex items-center justify-between border-b border-blue-500/20 pb-2.5">
      <div class="flex items-center gap-2">
        <Sparkles class="size-4 text-blue-400 animate-pulse" />
        <span class="text-xs font-bold uppercase tracking-wider text-blue-400">PULSYNC AI Contextual Guidance</span>
        <span class="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">Non-Gambling Mode</span>
      </div>
      <span class="text-[11px] font-mono text-slate-400">Session ID: {{ sessionId.slice(0, 12) }}</span>
    </div>

    <div class="mt-3 grid gap-3 md:grid-cols-2">
      <div 
        v-for="rec in recommendations.slice(0, 2)" 
        :key="rec.id"
        class="flex flex-col justify-between rounded-md border border-border/80 bg-accent/40 p-3 transition-all hover:border-blue-500/40"
      >
        <div>
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-100">{{ rec.title }}</h4>
            <span class="text-[10px] font-mono text-amber-400 font-semibold">{{ rec.score }}% Relevance</span>
          </div>
          <p class="mt-1 text-xs text-slate-300 leading-relaxed">{{ rec.description }}</p>
          <div class="mt-2 flex items-center gap-1.5 text-[11px] text-blue-400">
            <Info class="size-3 shrink-0" />
            <span>{{ rec.reason }}</span>
          </div>
        </div>

        <button 
          @click="clickGuidance(rec)"
          class="mt-3 flex items-center justify-center gap-1.5 rounded bg-blue-600/20 border border-blue-500/40 px-3 py-1.5 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-600 hover:text-white"
        >
          <span>{{ rec.action_label || 'View Head-to-Head Stats' }}</span>
          <ChevronRight class="size-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Sparkles, Info, ChevronRight } from 'lucide-vue-next'
import { createSession, fetchRecommendations, trackSessionEvent, type RecommendationItem } from '@/services/api'

const sessionId = ref('')
const recommendations = ref<RecommendationItem[]>([])

onMounted(async () => {
  const anonId = localStorage.getItem('pulsync_anon_id') || crypto.randomUUID()
  localStorage.setItem('pulsync_anon_id', anonId)

  sessionId.value = await createSession(anonId)
  await trackSessionEvent(sessionId.value, 'page_view', '/sport', 'browse')
  recommendations.value = await fetchRecommendations(sessionId.value)
})

async function clickGuidance(rec: RecommendationItem) {
  if (sessionId.value) {
    await trackSessionEvent(sessionId.value, 'recommendation_click', '/sport', rec.title)
  }
}
</script>
