import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface SportItem {
  id: string
  slug: string
  name: string
  eventCount: number
  liveCount: number
}

export interface SelectionItem {
  id: string
  name: string
  odds: number
}

export interface EventItem {
  id: string
  match_id: string
  home: string
  away: string
  startsAt: string
  status: string
  homeScore?: number
  awayScore?: number
  clockSeconds?: number
  sport: { name: string; slug: string }
  competition: { name: string }
  marketCount: number
  primaryMarket: { id: string; name: string; status: string }
  primarySelections: SelectionItem[]
}

export interface DatasetSummary {
  dataset_name: string
  total_records: number
  date_range: { from: string; to: string }
  unique_players: number
  unique_sports: number
  unique_events: number
  data_quality: {
    duplicate_rows: number
    missing_player_id: number
    data_quality_score: number
  }
}

export interface PlayerProfileData {
  user_id: string
  profile_source: string
  preferred_sport: string
  activity_level: string
  historical_activity: {
    total_actions: number
    unique_sports_explored: number
    sports_breakdown: Record<string, number>
  }
  sports_interest: Record<string, number>
}

export interface RecommendationItem {
  id: string
  title: string
  description: string
  score: number
  reason: string
  action_label: string
}

export interface SessionIntel {
  intent: { label: string; confidence: number; reason: string }
  friction_level: string
  abandonment_probability: number
  session_quality_score: number
}

export async function fetchSports(): Promise<SportItem[]> {
  try {
    const res = await api.get<{ sports: SportItem[] }>('/api/sports')
    return res.data.sports || []
  } catch (e) {
    console.error('Failed to fetch sports from API', e)
    return []
  }
}

export async function fetchEvents(sport = 'all', day = 'all', status = ''): Promise<EventItem[]> {
  try {
    const params: Record<string, string> = { sport, day }
    if (status) params.status = status
    const res = await api.get<{ events: EventItem[] }>('/api/events', { params })
    return res.data.events || []
  } catch (e) {
    console.error('Failed to fetch events from API', e)
    return []
  }
}

export async function fetchDatasetSummary(): Promise<DatasetSummary | null> {
  try {
    const res = await api.get<DatasetSummary>('/api/dashboard/dataset-summary')
    return res.data
  } catch (e) {
    console.error('Failed to fetch dataset summary', e)
    return null
  }
}

export async function fetchUserProfile(userId = 'usr_demo'): Promise<PlayerProfileData | null> {
  try {
    const res = await api.get<PlayerProfileData>(`/api/users/${userId}/profile`)
    return res.data
  } catch (e) {
    console.error('Failed to fetch user profile', e)
    return null
  }
}

export async function fetchAnalytics(): Promise<any> {
  try {
    const res = await api.get('/api/analytics')
    return res.data
  } catch (e) {
    console.error('Failed to fetch analytics', e)
    return null
  }
}

export async function createSession(anonymousId: string): Promise<string> {
  try {
    const res = await api.post('/api/sessions', { anonymous_user_id: anonymousId })
    return res.data.session_id || `ses_${Date.now()}`
  } catch (e) {
    return `ses_${Date.now()}`
  }
}

export async function trackSessionEvent(sessionId: string, eventType: string, page: string, action: string) {
  try {
    const res = await api.post(`/api/sessions/${sessionId}/events`, {
      event_type: eventType,
      page,
      action,
      timestamp: new Date().toISOString()
    })
    return res.data
  } catch (e) {
    return null
  }
}

export async function fetchRecommendations(sessionId: string): Promise<RecommendationItem[]> {
  try {
    const res = await api.get<{ recommendations: RecommendationItem[] }>(`/api/recommendations/${sessionId}`)
    return res.data.recommendations || []
  } catch (e) {
    return []
  }
}
