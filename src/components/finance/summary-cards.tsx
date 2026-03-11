'use client';

import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSummary } from '@/hooks/use-api';
import { cn, formatCurrency } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface SummaryCardsProps {
  month: number;
  year: number;
}

export function SummaryCards({ month, year }: SummaryCardsProps) {
  const { data: summary, isLoading } = useSummary(month, year);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-border/70 bg-card/90 shadow-lg backdrop-blur">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-center h-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  const cards = [
    {
      title: 'Saldo Bulan Ini',
      value: summary?.balance ?? 0,
      icon: Wallet,
      color: (summary?.balance ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500',
      tone: (summary?.balance ?? 0) >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20',
      glow: (summary?.balance ?? 0) >= 0 ? 'bg-emerald-500/12 dark:bg-emerald-400/10' : 'bg-rose-500/12 dark:bg-rose-400/10',
      accentBar: (summary?.balance ?? 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500',
      iconBg: (summary?.balance ?? 0) >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50',
      trend: (summary?.balance ?? 0) >= 0 ? 'positive' : 'negative',
      description: monthName,
    },
    {
      title: 'Pemasukan',
      value: summary?.income ?? 0,
      icon: TrendingUp,
      color: 'text-emerald-500',
      tone: 'border-emerald-500/20',
      glow: 'bg-emerald-500/12 dark:bg-emerald-400/10',
      accentBar: 'bg-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      trend: 'positive',
      description: 'Total pemasukan bulan ini',
    },
    {
      title: 'Pengeluaran',
      value: summary?.expenses ?? 0,
      icon: TrendingDown,
      color: 'text-rose-500',
      tone: 'border-rose-500/20',
      glow: 'bg-rose-500/12 dark:bg-rose-400/10',
      accentBar: 'bg-rose-500',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      trend: 'negative',
      description: 'Total pengeluaran bulan ini',
    },
    {
      title: 'Tabungan Bulan Ini',
      value: summary?.savings ?? summary?.totalSavings ?? 0,
      icon: PiggyBank,
      color: 'text-amber-500',
      tone: 'border-amber-500/20',
      glow: 'bg-amber-500/12 dark:bg-amber-400/10',
      accentBar: 'bg-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      trend: 'neutral',
      description: monthName,
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4"
    >
      {cards.map((card, index) => (
        <motion.div 
          key={index} 
          variants={item}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-full"
        >
          <Card className={cn(
            'relative h-full overflow-hidden border bg-card/92 shadow-xl shadow-black/5 backdrop-blur dark:shadow-black/25',
            card.tone
          )}>
            <div className={cn('absolute inset-x-0 top-0 h-1', card.accentBar)} />
            <div className={cn('absolute -right-10 top-4 h-24 w-24 rounded-full blur-3xl', card.glow)} />
            
            <CardContent className="relative p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">{card.title}</p>
                  <div className="flex items-start gap-1.5">
                    <span className={cn(
                      'text-[clamp(1.15rem,5vw,1.8rem)] font-bold leading-tight whitespace-normal break-words',
                      card.color
                    )}>
                      {formatCurrency(card.value)}
                    </span>
                    {card.trend === 'positive' && (
                      <motion.div
                        initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                        <ArrowUpRight className="mt-1 h-3 w-3 shrink-0 text-emerald-500 sm:h-4 sm:w-4" />
                      </motion.div>
                    )}
                    {card.trend === 'negative' && (
                      <motion.div
                        initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                        <ArrowDownRight className="mt-1 h-3 w-3 shrink-0 text-rose-500 sm:h-4 sm:w-4" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{card.description}</p>
                </div>
                <motion.div 
                  className={`rounded-xl p-2 sm:p-2.5 ${card.iconBg} shrink-0 backdrop-blur-sm`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color}`} />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
