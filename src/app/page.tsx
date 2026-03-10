'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut,
  Menu,
  X,
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import type { Transaction } from '@/types';

type View = 'dashboard' | 'transactions' | 'admin';

export default function Home() {
  const { user, isLoading, logout } = useAuth();
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [selectedMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 gap-4">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
          <LayoutDashboard className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2">
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
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Kelola User', icon: Users }] : []),
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/50 dark:from-emerald-950/10 dark:via-background dark:to-teal-950/10">
      {/* Sidebar - Fixed position */}
      <AnimatePresence mode="wait">
        {(sidebarOpen || mobileMenuOpen) && (
          <>
            {/* Mobile overlay */}
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border flex flex-col",
                "lg:sticky lg:top-0",
                mobileMenuOpen ? "block" : sidebarOpen ? "block" : "hidden lg:block"
              )}
            >
              {/* Logo */}
              <div className="p-4 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <LayoutDashboard className="w-5 h-5 text-white" />
                  </motion.div>
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

              {/* Navigation */}
              <nav className="flex-1 p-3 space-y-1">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
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

              {/* Bottom Actions */}
              <div className="p-3 border-t border-sidebar-border space-y-2">
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-muted-foreground hover:text-foreground"
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
                {/* Dashboard Menu Button */}
                <Button
                  variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('dashboard')}
                  className={cn(
                    "gap-2 hidden sm:flex",
                    activeView === 'dashboard' 
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
                
                {isAdmin && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Admin
                  </span>
                )}
                {(!sidebarOpen || !sidebarOpen) && (
                  <div className="hidden lg:flex items-center gap-2">
                    <ThemeToggle />
                    <SettingsDialog />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 container mx-auto px-4 py-4 max-w-6xl">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Summary Cards */}
                <SummaryCards month={month} year={year} />

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-wrap justify-end gap-2"
                >
                  <ExcelUpload />
                  <AddTransactionDialog 
                    editTransaction={editTransaction} 
                    onClose={handleCloseEdit} 
                  />
                </motion.div>

                {/* Budget Progress */}
                <BudgetProgress month={month} year={year} />

                {/* Charts Row - Same Height */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <MonthlyChart />
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
