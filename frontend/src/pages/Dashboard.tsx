import { useSearchParams } from 'react-router-dom'
import { TimePeriod } from '@/types'
import { TimePeriodSelector } from '@/components/dashboard/TimePeriodSelector'
import { cn } from '@/lib/utils'

// Tab content components
import { OverviewTab } from '@/components/dashboard/tabs/OverviewTab'
import { FreebiesTab } from '@/components/dashboard/tabs/FreebiesTab'
import { ConversionsTab } from '@/components/dashboard/tabs/ConversionsTab'
import { FunnelTab } from '@/components/dashboard/tabs/FunnelTab'
import { OffersTab } from '@/components/dashboard/tabs/OffersTab'

type TabId = 'overview' | 'offers' | 'freebies' | 'conversions' | 'funnel'

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'offers', label: 'Offers' },
  { id: 'freebies', label: 'Freebies' },
  { id: 'conversions', label: 'Conversions' },
  { id: 'funnel', label: 'Funnel' },
]

const validTabs: TabId[] = ['overview', 'offers', 'freebies', 'conversions', 'funnel']
const validPeriods: TimePeriod[] = ['7d', '30d', '90d', 'all']

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Get tab from URL, default to 'overview'
  const tabParam = searchParams.get('tab') as TabId | null
  const activeTab: TabId = tabParam && validTabs.includes(tabParam) ? tabParam : 'overview'

  // Get period from URL, default to '30d'
  const periodParam = searchParams.get('period') as TimePeriod | null
  const period: TimePeriod = periodParam && validPeriods.includes(periodParam) ? periodParam : '30d'

  const updateParams = (newTab?: TabId, newPeriod?: TimePeriod) => {
    const params = new URLSearchParams()
    const tab = newTab ?? activeTab
    const per = newPeriod ?? period

    if (tab !== 'overview') params.set('tab', tab)
    if (per !== '30d') params.set('period', per)

    setSearchParams(params, { replace: true })
  }

  const setActiveTab = (tab: TabId) => updateParams(tab, undefined)
  const setPeriod = (newPeriod: TimePeriod) => updateParams(undefined, newPeriod)

  return (
    <div className="space-y-6">
      {/* Header with tabs and time selector */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Scrollable tabs container */}
        <div className="overflow-x-auto -mx-1 px-1 scrollbar-hide">
          <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-background-tertiary text-foreground-primary'
                    : 'text-foreground-secondary hover:text-foreground-primary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <TimePeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab period={period} />}
      {activeTab === 'offers' && <OffersTab period={period} />}
      {activeTab === 'freebies' && <FreebiesTab period={period} />}
      {activeTab === 'conversions' && <ConversionsTab />}
      {activeTab === 'funnel' && <FunnelTab period={period} />}
    </div>
  )
}
