'use client';

import { TimePeriod } from '@/types';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const periods: { value: TimePeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
];

export function TimePeriodSelector({ value, onChange }: TimePeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-[10px] bg-[#2C2C2C] p-0.5">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-2 py-1 text-sm font-medium rounded-[8px] transition-colors ${
            value === period.value
              ? 'bg-[#111] text-foreground-primary'
              : 'text-foreground-tertiary hover:text-foreground-secondary'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
