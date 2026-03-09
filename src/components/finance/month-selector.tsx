'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const handlePrevMonth = () => {
    const prevMonth = new Date(selectedMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    onMonthChange(nextMonth);
  };

  const handleCurrentMonth = () => {
    onMonthChange(new Date());
  };

  const monthName = selectedMonth.toLocaleDateString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  const isCurrentMonth = 
    selectedMonth.getMonth() === new Date().getMonth() && 
    selectedMonth.getFullYear() === new Date().getFullYear();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-muted/50 rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleCurrentMonth}
          className="h-8 px-4 font-medium gap-2"
        >
          <Calendar className="w-4 h-4" />
          {monthName}
          {!isCurrentMonth && (
            <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
              Klik untuk bulan ini
            </span>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
          disabled={
            selectedMonth.getMonth() === new Date().getMonth() && 
            selectedMonth.getFullYear() === new Date().getFullYear()
          }
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
