'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMonthlyChartData, useCategorySpending } from '@/hooks/use-api';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn, formatCurrency } from '@/lib/utils';

// Custom tooltip for pie chart
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      category: string;
      amount: number;
      color: string;
      percentage: number;
    };
  }>;
}

interface CustomAreaTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

const CustomAreaTooltip = ({ active, label, payload }: CustomAreaTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-w-[180px] rounded-xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur"
    >
      <p className="mb-3 text-sm font-semibold text-foreground">{label}</p>
      <div className="space-y-2">
        {payload.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-6 rounded-lg bg-muted/80 px-3 py-1.5"
          >
            <span
              className="text-xs font-medium"
              style={{ color: item.color }}
            >
              {item.name}
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const CustomPieTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl p-4 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-4 h-4 rounded-full shadow-lg"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-foreground">{data.category}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-6 bg-muted rounded-lg px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Jumlah:</span>
            <span className="text-sm font-bold text-emerald-500">{formatCurrency(data.amount)}</span>
          </div>
          <div className="flex items-center justify-between gap-6 bg-muted rounded-lg px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Persentase:</span>
            <span className="text-sm font-bold text-amber-500">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

// Custom label renderer for pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < 0.05) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-[11px] font-bold drop-shadow-lg"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function MonthlyChart({ month, year }: { month: number; year: number }) {
  const [trendMode, setTrendMode] = useState<'hour' | 'day' | 'month'>('month');
  const { data, isLoading } = useMonthlyChartData(month, year, trendMode);
  const totalIncome = (data ?? []).reduce((sum, item) => sum + item.income, 0);
  const totalExpenses = (data ?? []).reduce((sum, item) => sum + item.expenses, 0);
  const selectedLabel = new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
  const trendDescription =
    trendMode === 'hour'
      ? 'Per jam pada hari dengan transaksi terbaru di periode terpilih'
      : trendMode === 'day'
        ? `Per hari selama ${selectedLabel}`
        : `Per bulan selama ${year}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="h-full"
    >
      <Card className="flex h-full min-h-[410px] flex-col overflow-hidden border-0 bg-card shadow-lg sm:min-h-[440px]">
        <CardHeader className="flex-shrink-0 gap-4 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-foreground">
                Tren Keuangan
              </CardTitle>
              <p className="text-sm text-muted-foreground">{trendDescription}</p>
            </div>
            <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
              <ToggleGroup
                type="single"
                value={trendMode}
                onValueChange={(value) => {
                  if (value === 'hour' || value === 'day' || value === 'month') {
                    setTrendMode(value);
                  }
                }}
                className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/60 p-1 xl:w-[260px]"
              >
                <ToggleGroupItem
                  value="hour"
                  className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=on]:bg-emerald-500 data-[state=on]:text-white"
                >
                  Jam
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="day"
                  className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=on]:bg-teal-500 data-[state=on]:text-white"
                >
                  Hari
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="month"
                  className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=on]:bg-sky-500 data-[state=on]:text-white"
                >
                  Bulan
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="grid w-full grid-cols-2 gap-2 xl:w-[260px]">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/6 px-3 py-2">
                  <p className="text-xs font-medium text-emerald-600">Pemasukan</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/6 px-3 py-2">
                  <p className="text-xs font-medium text-rose-500">Pengeluaran</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          {isLoading ? (
            <div className="flex h-[250px] items-center justify-center sm:h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[260px] sm:h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 6 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis 
                    dataKey="label" 
                    className="text-xs"
                    tick={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={{ stroke: 'var(--border)' }}
                    interval={trendMode === 'hour' ? 3 : trendMode === 'day' ? 4 : 0}
                    minTickGap={trendMode === 'month' ? 12 : 8}
                    tickMargin={8}
                    height={40}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={{ stroke: 'var(--border)' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`}
                    width={58}
                  />
                  <Tooltip 
                    content={<CustomAreaTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Pemasukan"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Pengeluaran"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function CategoryChart({ month, year }: { month: number; year: number }) {
  const [activeType, setActiveType] = useState<'income' | 'expense'>('expense');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const activeLabel = activeType === 'income' ? 'Pemasukan' : 'Pengeluaran';
  const { data, isLoading } = useCategorySpending(month, year, activeType);
  const selectedLabel = new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="h-full"
    >
      <Card className="flex h-full min-h-[410px] flex-col overflow-hidden border-0 bg-card shadow-lg sm:min-h-[440px]">
        <CardHeader className="flex-shrink-0 gap-4 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-foreground">
                {activeLabel} per Kategori
              </CardTitle>
              <p className="text-sm text-muted-foreground">{selectedLabel}</p>
            </div>
            <ToggleGroup
              type="single"
              value={activeType}
              onValueChange={(value) => {
                if (value === 'income' || value === 'expense') {
                  setActiveCategoryIndex(null);
                  setActiveType(value);
                }
              }}
              className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/60 p-1 xl:w-[280px]"
            >
              <ToggleGroupItem
                value="expense"
                className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=on]:bg-rose-500 data-[state=on]:text-white"
              >
                Pengeluaran
              </ToggleGroupItem>
              <ToggleGroupItem
                value="income"
                className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=on]:bg-emerald-500 data-[state=on]:text-white"
              >
                Pemasukan
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex h-[250px] items-center justify-center sm:h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.length > 0 ? (
            <>
              <div className="h-[220px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="category"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      animationBegin={0}
                      animationDuration={800}
                      onMouseEnter={(_, index) => setActiveCategoryIndex(index)}
                      onMouseLeave={() => setActiveCategoryIndex(null)}
                    >
                      {data?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                          fillOpacity={activeCategoryIndex === null || activeCategoryIndex === index ? 1 : 0.35}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-2 max-h-[120px] overflow-y-auto pr-1 sm:max-h-[136px]">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {data?.slice(0, 8).map((item, index) => (
                    <motion.button 
                      key={index} 
                      type="button"
                      onMouseEnter={() => setActiveCategoryIndex(index)}
                      onMouseLeave={() => setActiveCategoryIndex(null)}
                      onFocus={() => setActiveCategoryIndex(index)}
                      onBlur={() => setActiveCategoryIndex(null)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all',
                        activeCategoryIndex === index
                          ? 'border-primary/30 bg-primary/8 shadow-sm'
                          : 'border-transparent bg-muted/50 hover:border-border hover:bg-muted'
                      )}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div 
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 truncate text-sm text-muted-foreground">{item.category}</span>
                      <span className="text-xs font-bold text-amber-500">{item.percentage?.toFixed(0)}%</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-[250px] flex-col items-center justify-center gap-2 text-muted-foreground sm:h-[300px]">
              <p className="text-center text-sm">Belum ada data {activeLabel.toLowerCase()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
