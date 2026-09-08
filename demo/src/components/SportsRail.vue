<template>
  <aside class="flex w-full flex-col gap-4">
    <!-- Quick Links -->
    <nav class="rounded-lg border border-border bg-card">
      <div class="border-b border-border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Recommended
      </div>
      <div class="flex flex-col p-1.5 gap-0.5">
        <router-link
          to="/sport"
          class="flex items-center gap-2.5 rounded px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-accent"
          :class="!$route.query.sport || $route.query.sport === 'all' ? 'bg-accent text-white font-bold' : 'text-slate-300'"
        >
          <Star class="size-4 text-amber-400" />
          <span>Top offer</span>
        </router-link>

        <router-link
          to="/live"
          class="flex items-center gap-2.5 rounded px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-accent text-slate-300"
        >
          <Zap class="size-4 text-amber-500" />
          <span>Live now</span>
        </router-link>

        <router-link
          to="/promotions"
          class="flex items-center gap-2.5 rounded px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-accent text-slate-300"
        >
          <Gift class="size-4 text-blue-400" />
          <span>Promotions</span>
        </router-link>
      </div>
    </nav>

    <!-- Sports List -->
    <nav class="rounded-lg border border-border bg-card">
      <div class="flex items-center justify-between border-b border-border px-3.5 py-2">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sports</span>
        <span class="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
          {{ sports.length }} Available
        </span>
      </div>

      <div class="flex max-h-[560px] flex-col overflow-y-auto p-1.5 gap-0.5">
        <div v-if="loading" class="flex flex-col gap-2 p-2">
          <div v-for="i in 8" :key="i" class="h-7 w-full animate-pulse rounded bg-accent/50"></div>
        </div>

        <router-link
          v-for="sport in sports"
          :key="sport.id"
          :to="{ path: '/sport', query: { sport: sport.slug } }"
          class="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
          :class="$route.query.sport === sport.slug ? 'bg-blue-600/20 font-bold text-blue-400 border border-blue-500/30' : 'text-slate-300'"
        >
          <Trophy class="size-3.5 shrink-0 text-slate-400" />
          <span class="flex-1 truncate">{{ sport.name }}</span>

          <span v-if="sport.liveCount > 0" class="rounded bg-red-500/20 px-1.5 py-0.2 text-[10px] font-bold text-red-400">
            {{ sport.liveCount }}
          </span>

          <span class="text-[11px] font-mono text-slate-500">{{ sport.eventCount }}</span>
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Trophy, Star, Zap, Gift } from 'lucide-vue-next'
import { fetchSports, type SportItem } from '@/services/api'

const sports = ref<SportItem[]>([])
const loading = ref(true)

onMounted(async () => {
  sports.value = await fetchSports()
  loading.value = false
})
</script>
