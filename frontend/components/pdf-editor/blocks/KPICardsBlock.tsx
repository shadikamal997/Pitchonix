'use client';

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Target, Activity, Award } from 'lucide-react';

export interface KPIItem {
  id: string;
  label: string;
  value: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export interface KPICardsBlockProps {
  items?: KPIItem[];
  title?: string;
  columns?: 2 | 3 | 4;
  onChange?: (items: KPIItem[]) => void;
}

const defaultItems: KPIItem[] = [
  {
    id: '1',
    label: 'Total Revenue',
    value: '$2.4M',
    change: 12.5,
    trend: 'up',
    icon: 'dollar',
  },
  {
    id: '2',
    label: 'Active Users',
    value: '18,500',
    change: 8.2,
    trend: 'up',
    icon: 'users',
  },
  {
    id: '3',
    label: 'Conversion Rate',
    value: '24.8%',
    change: -2.1,
    trend: 'down',
    icon: 'target',
  },
  {
    id: '4',
    label: 'Customer Satisfaction',
    value: '94%',
    change: 5.3,
    trend: 'up',
    icon: 'award',
  },
];

const iconMap: Record<string, any> = {
  dollar: DollarSign,
  users: Users,
  cart: ShoppingCart,
  target: Target,
  activity: Activity,
  award: Award,
};

export function KPICardsBlock({
  items = defaultItems,
  title = 'Key Performance Indicators',
  columns = 4,
  onChange,
}: KPICardsBlockProps) {
  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full py-8">
      {title && (
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
        </div>
      )}

      <div className={`grid grid-cols-${columns} gap-6`}>
        {items.map((item) => {
          const IconComponent = item.icon ? iconMap[item.icon] : Activity;

          return (
            <div
              key={item.id}
              className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-green-300 hover:shadow-lg transition-all"
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center mb-4">
                {IconComponent && <IconComponent className="h-6 w-6 text-green-600" />}
              </div>

              {/* Label */}
              <p className="text-sm font-semibold text-slate-600 mb-2">{item.label}</p>

              {/* Value */}
              <div className="flex items-end justify-between">
                <h4 className="text-3xl font-bold text-slate-900">{item.value}</h4>

                {/* Change Badge */}
                {item.change !== undefined && (
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getTrendColor(item.trend)}`}>
                    {getTrendIcon(item.trend)}
                    <span>{item.change > 0 ? '+' : ''}{item.change}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KPICardsBlock;
