'use client';

import { useState } from 'react';
import { LayoutDashboard, Loader2, Eye, EyeOff, Wallet, TrendingUp, PiggyBank, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

const features = [
  { icon: Wallet, text: 'Kelola keuangan dengan mudah', color: 'text-emerald-500' },
  { icon: TrendingUp, text: 'Pantau tren pengeluaran', color: 'text-teal-500' },
  { icon: PiggyBank, text: 'Raih target tabungan', color: 'text-amber-500' },
];

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (!result.success) {
      setError(result.error || 'Username atau password salah');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="h-screen flex relative overflow-hidden bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-1/4 h-1/4 bg-amber-500/5 dark:bg-amber-500/3 rounded-full blur-3xl" />
      </div>

      {/* Left side - Features */}
      <div className="hidden lg:flex flex-col justify-center items-start w-1/2 p-10 xl:p-14 relative z-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Finku
              </h1>
              <p className="text-muted-foreground text-xs">Financial Management</p>
            </div>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-foreground mb-3 leading-tight">
            Kelola Keuangan<br />
            <span className="bg-gradient-to-r from-emerald-500 to-amber-500 bg-clip-text text-transparent">
              Lebih Cerdas
            </span>
          </h2>

          <p className="text-muted-foreground mb-6 text-base">
            Platform manajemen keuangan pribadi yang membantu Anda mencapai tujuan finansial.
          </p>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3"
              >
                <div className="p-2 bg-muted/80 rounded-lg border border-border">
                  <feature.icon className={`w-4 h-4 ${feature.color}`} />
                </div>
                <span className="text-muted-foreground text-sm">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-6 lg:hidden">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Finku
            </h1>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border shadow-xl">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-foreground mb-1">Selamat Datang!</h2>
              <p className="text-muted-foreground text-sm">Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0.5 top-0.5 h-9 w-9"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 text-center bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-lg shadow-emerald-500/25 transition-all duration-300"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
