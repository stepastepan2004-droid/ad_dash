interface Filters {
  promotionType: 'product' | 'media'
  periodFrom: string
  periodTo: string
}

interface Summary {
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  avgCtr: number | null
  avgCpc: number | null
  totalLeads: number | null
  totalRevenue: number | null
  totalReach: number | null
  avgCpm: number | null
  avgDrr: number | null
  campaignCount: number
}

interface ByPeriod {
  period: string
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalReach: number
  totalLeads: number
  totalRevenue: number
}

function buildQuery(filters: Filters, extra?: Record<string, string | number>) {
  const params = new URLSearchParams()
  params.set('promotionType', filters.promotionType)
  if (filters.periodFrom) params.set('periodFrom', filters.periodFrom)
  if (filters.periodTo) params.set('periodTo', filters.periodTo)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      params.set(k, String(v))
    }
  }
  return `?${params.toString()}`
}

export function useCampaigns() {
  const filters = reactive<Filters>({
    promotionType: 'product',
    periodFrom: '',
    periodTo: '',
  })

  const query = computed(() => buildQuery(filters))

  const { data: summary, refresh: refreshSummary, status: summaryStatus } = useFetch<Summary>(
    () => `/api/campaigns/summary${query.value}`,
  )

  const { data: byPeriod, refresh: refreshByPeriod } = useFetch<ByPeriod[]>(
    () => `/api/campaigns/by-period-granular${query.value}`,
  )

  const isLoading = computed(() => summaryStatus.value === 'pending')

  watch(() => filters.promotionType, () => {
    filters.periodFrom = ''
    filters.periodTo = ''
  })

  async function refreshAll() {
    await Promise.all([
      refreshSummary(),
      refreshByPeriod(),
    ])
  }

  return {
    filters,
    summary,
    byPeriod,
    isLoading,
    refreshAll,
  }
}
