'use client';

import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTransactions } from '@/hooks/use-api';
import { formatCurrency } from '@/lib/utils';

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
  const { data: transactions, isLoading } = useTransactions(month, year);

  // Calculate totals from transactions
  const totalIncome = transactions?.filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalExpense = transactions?.filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalSavings = transactions?.filter((t) => t.type === 'savings')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const balance = totalIncome - totalExpense - totalSavings;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardContent className="p-4">
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
      value: balance,
      icon: Wallet,
      color: balance >= 0 ? 'text-emerald-500' : 'text-red-500',
      bgGradient: balance >= 0 
        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/30' 
        : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/30',
      iconBg: balance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50',
      trend: balance >= 0 ? 'positive' : 'negative',
      description: monthName,
    },
    {
      title: 'Pemasukan',
      value: totalIncome,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgGradient: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      trend: 'positive',
      description: 'Total pemasukan bulan ini',
    },
    {
      title: 'Pengeluaran',
      value: totalExpense,
      icon: TrendingDown,
      color: 'text-rose-500',
      bgGradient: 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/50 dark:to-red-950/30',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      trend: 'negative',
      description: 'Total pengeluaran bulan ini',
    },
    {
      title: 'Total Tabungan',
      value: totalSavings,
      icon: PiggyBank,
      color: 'text-amber-500',
      bgGradient: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      trend: 'neutral',
      description: 'Tabungan bulan ini',
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map((card, index) => (
        <motion.div 
          key={index} 
          variants={item}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-full"
        >
          <Card className={`relative overflow-hidden border-0 shadow-lg ${card.bgGradient} h-full`}>
            {/* Decorative glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-20 bg-white dark:bg-white/10" />
            
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">{card.title}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg sm:text-xl font-bold ${card.color} truncate`}>
                      {formatCurrency(card.value)}
                    </span>
                    {card.trend === 'positive' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                      </motion.div>
                    )}
                    {card.trend === 'negative' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{card.description}</p>
                </div>
                <motion.div 
                  className={`p-2 sm:p-2.5 rounded-xl ${card.iconBg} backdrop-blur-sm shrink-0`}
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
