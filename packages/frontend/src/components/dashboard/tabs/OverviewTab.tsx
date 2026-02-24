import React, { useEffect, useState } from 'react';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { MetricsOverviewCard, MetricItem } from '../MetricsOverviewCard';
import { ServiceAlertsCard } from '../ServiceAlertsCard';
import { TimeRangeSelector } from '../TimeRangeSelector';
import { RecentActivityChart } from '../RecentActivityChart';
import { api, Stat, UsageData, Cooldown, STAT_LABELS, TodayMetrics } from '../../../lib/api';
import { formatCost, formatNumber, formatTokens } from '../../../lib/format';
import { Activity, Database, Zap } from 'lucide-react';

type TimeRange = 'hour' | 'day' | 'week' | 'month';

interface OverviewTabProps {
  activityRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ activityRange, onRangeChange }) => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeAgo, setTimeAgo] = useState<string>('Just now');
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics>({
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    cacheWriteTokens: 0,
    kwhUsed: 0,
    totalCost: 0,
  });

  const loadData = async () => {
    const dashboardData = await api.getDashboardData(activityRange);
    setStats(
      dashboardData.stats.filter(
        (stat) => stat.label !== STAT_LABELS.PROVIDERS && stat.label !== STAT_LABELS.DURATION
      )
    );
    setUsageData(dashboardData.usageData);
    setCooldowns(dashboardData.cooldowns);
    setTodayMetrics(dashboardData.todayMetrics);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [activityRange]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

      if (diff < 5) {
        setTimeAgo('Just now');
      } else if (diff < 60) {
        setTimeAgo(`${diff} seconds ago`);
      } else if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        setTimeAgo(`${mins} minute${mins > 1 ? 's' : ''} ago`);
      } else {
        const hours = Math.floor(diff / 3600);
        setTimeAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleClearCooldowns = async () => {
    if (confirm('Are you sure you want to clear all provider cooldowns?')) {
      try {
        await api.clearCooldown();
        loadData();
      } catch (e) {
        alert('Failed to clear cooldowns');
      }
    }
  };

  const todayTokenTotal =
    todayMetrics.inputTokens +
    todayMetrics.outputTokens +
    todayMetrics.reasoningTokens +
    todayMetrics.cachedTokens +
    todayMetrics.cacheWriteTokens;

  const tokenSubtitle = [
    `In: ${formatTokens(todayMetrics.inputTokens)}`,
    `Out: ${formatTokens(todayMetrics.outputTokens)}`,
    todayMetrics.reasoningTokens > 0 ? `Reasoning: ${formatTokens(todayMetrics.reasoningTokens)}` : null,
    todayMetrics.cachedTokens > 0 ? `Cached: ${formatTokens(todayMetrics.cachedTokens)}` : null,
    todayMetrics.cacheWriteTokens > 0 ? `Cache Write: ${formatTokens(todayMetrics.cacheWriteTokens)}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const metrics: MetricItem[] = [
    ...stats.map((stat) => ({
      label: stat.label,
      value: stat.value,
      icon: stat.label === STAT_LABELS.REQUESTS ? <Activity size={20} /> : <Database size={20} />,
      trend: stat.change,
    })),
    {
      label: 'Requests Today',
      value: formatNumber(todayMetrics.requests, 0),
      icon: <Activity size={20} />,
    },
    {
      label: 'Tokens Today',
      value: formatTokens(todayTokenTotal),
      subtitle: tokenSubtitle,
      icon: <Database size={20} />,
    },
    {
      label: 'Cost Today',
      value: formatCost(todayMetrics.totalCost, 4),
      icon: <Zap size={20} />,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="header-left">
          <h1 className="font-heading text-3xl font-bold text-text m-0 mb-2">Dashboard</h1>
          {cooldowns.length > 0 ? (
            <Badge
              status="warning"
              secondaryText={`Last updated: ${timeAgo}`}
              style={{ minWidth: '190px' }}
            >
              System Degraded
            </Badge>
          ) : (
            <Badge
              status="connected"
              secondaryText={`Last updated: ${timeAgo}`}
              style={{ minWidth: '190px' }}
            >
              System Online
            </Badge>
          )}
        </div>
      </div>

      <div className="mb-6">
        <MetricsOverviewCard metrics={metrics} />
      </div>

      <div className="mb-6">
        <ServiceAlertsCard cooldowns={cooldowns} onClearAll={handleClearCooldowns} />
      </div>

      <div className="flex gap-4 mb-4 flex-col lg:flex-row">
        <Card
          className="flex-2 min-w-0"
          title="Recent Activity"
          extra={<TimeRangeSelector value={activityRange} onChange={onRangeChange} />}
        >
          <RecentActivityChart data={usageData} />
        </Card>
      </div>
    </div>
  );
};
