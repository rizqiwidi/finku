'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarRange,
  LayoutDashboard, 
  LayoutGrid,
  FileText, 
  Users, 
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { SummaryCards } from '@/components/finance/summary-cards';
import { TransactionList } from '@/components/finance/transaction-list';
import { AddTransactionDialog } from '@/components/finance/add-transaction-dialog';
import { MonthlyChart, CategoryChart } from '@/components/finance/charts';
import { BudgetProgress } from '@/components/finance/budget-progress';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { TransactionsTable } from '@/components/transactions/transactions-table';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { ExcelUpload } from '@/components/finance/excel-upload';
import { ReceiptScanDialog } from '@/components/finance/receipt-scan-dialog';
import { CategorySettingsPage } from '@/components/categories/category-settings-page';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import type { Transaction } from '@/types';

type View = 'dashboard' | 'transactions' | 'categories' | 'admin';

export default function Home() {
  const { user, isLoading, logout } = useAuth();
  const today = new Date();
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState((today.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const month = Number(selectedMonth);
  const year = Number(selectedYear);
  const monthOptions = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];
  const yearOptions = Array.from({ length: 5 }, (_, index) => (today.getFullYear() - index).toString());

  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
  };

  const handleCloseEdit = () => {
    setEditTransaction(null);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Show loading state with timeout
  if (isLoading) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_42%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_38%),linear-gradient(135deg,#f7fbf8_0%,#eef7f5_35%,#f6faf8_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.32),transparent_36%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_34%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.16),transparent_34%),linear-gradient(135deg,#081311_0%,#0f1917_45%,#111f1c_100%)] gap-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-16 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/20" />
          <div className="absolute right-[-6rem] top-10 h-64 w-64 rounded-full bg-teal-300/25 blur-3xl dark:bg-cyan-500/15" />
          <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
        </div>
        <div className="relative p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
          <LayoutDashboard className="w-8 h-8 text-white" />
        </div>
        <div className="relative flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Memuat...</span>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />;
  }

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as View, label: 'Riwayat Transaksi', icon: FileText },
    { id: 'categories' as View, label: 'Pengaturan Kategori', icon: LayoutGrid },
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Kelola User', icon: Users }] : []),
  ];

  const renderSidebarContent = () => (
    <>
      <div className="p-4 border-b border-sidebar-border shrink-0">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30"
              whileHover={{ scale: 1.05 }}
            >
              <LayoutDashboard className="w-5 h-5 text-white" />
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Finku
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {user.name || user.username}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSidebarOpen(false);
              setMobileMenuOpen(false);
            }}
            className="w-full justify-start gap-2 border-sidebar-border bg-background/70 text-foreground hover:bg-sidebar-accent"
          >
            <PanelLeftClose className="h-4 w-4" />
            Tutup Sidebar
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-1">
          {navItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Button
                variant={activeView === item.id ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "w-full justify-start gap-2 transition-all duration-200",
                  activeView === item.id 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25" 
                    : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {activeView === item.id && (
                  <ChevronRight className="w-3 h-3 ml-auto" />
                )}
              </Button>
            </motion.div>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <SettingsDialog />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Keluar
        </Button>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_42%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_38%),linear-gradient(135deg,#f7fbf8_0%,#eef7f5_35%,#f6faf8_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.34),transparent_36%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_34%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.16),transparent_34%),linear-gradient(135deg,#081311_0%,#0f1917_45%,#111f1c_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-24 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute right-[-7rem] top-20 h-72 w-72 rounded-full bg-teal-200/35 blur-3xl dark:bg-cyan-500/16" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-sky-200/25 blur-3xl dark:bg-sky-500/12" />
      </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl lg:hidden"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex"
          >
            <div className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl">
              {renderSidebarContent()}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'relative flex min-h-screen flex-col transition-[padding] duration-300',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-3 py-3 sm:px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'lg:hidden',
                    mobileMenuOpen
                      ? 'text-rose-500 hover:bg-rose-500/10 hover:text-rose-600'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>

                {/* Sidebar toggle button (desktop) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex text-muted-foreground hover:text-foreground"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>

                {/* Show logo when sidebar closed */}
                {!sidebarOpen && (
                  <motion.div 
                    className="hidden lg:flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                        Finku
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        {user.name || user.username}
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="lg:hidden flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                      Finku
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      {user.name || user.username}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Admin
                  </span>
                )}
                {!sidebarOpen && (
                  <div className="hidden lg:flex items-center gap-2">
                    <ThemeToggle />
                    <SettingsDialog />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className={cn(
                    'gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10',
                    sidebarOpen ? 'lg:hidden' : ''
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="container mx-auto flex-1 max-w-7xl px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/88 p-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <CalendarRange className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Filter Dashboard</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:flex">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-10 min-w-[160px] bg-background/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="h-10 min-w-[120px] bg-background/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Summary Cards */}
                <SummaryCards month={month} year={year} />

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end"
                >
                  <ExcelUpload />
                  <ReceiptScanDialog />
                  <AddTransactionDialog 
                    editTransaction={editTransaction} 
                    onClose={handleCloseEdit} 
                  />
                </motion.div>

                {/* Budget Progress */}
                <BudgetProgress month={month} year={year} />

                {/* Charts Row - Same Height */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <MonthlyChart month={month} year={year} />
                  <CategoryChart month={month} year={year} />
                </div>

                {/* Transaction List */}
                <TransactionList month={month} year={year} onEdit={handleEdit} />
              </motion.div>
            )}

            {activeView === 'transactions' && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <TransactionsTable />
              </motion.div>
            )}

            {activeView === 'categories' && (
              <motion.div
                key="categories"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CategorySettingsPage />
              </motion.div>
            )}

            {activeView === 'admin' && isAdmin && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AdminDashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
