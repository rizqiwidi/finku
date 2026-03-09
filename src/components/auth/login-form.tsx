'use client';

import { useState } from 'react';
import { LayoutDashboard, Sparkles, Loader2, Eye, EyeOff, Wallet, TrendingUp, PiggyBank, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

const features = [
  { icon: Wallet, text: 'Kelola keuangan dengan mudah', color: 'text-emerald-400' },
  { icon: TrendingUp, text: 'Pantau tren pengeluaran', color: 'text-teal-400' },
  { icon: PiggyBank, text: 'Raih target tabungan', color: 'text-amber-400' },
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
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-teal-500/20 dark:bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-1/3 h-1/3 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Left side - Features */}
      <div className="hidden lg:flex flex-col justify-center items-start w-1/2 p-12 relative z-10">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Finku
              </h1>
              <p className="text-muted-foreground text-sm">Financial Management</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Kelola Keuangan<br />
            <span className="bg-gradient-to-r from-emerald-500 to-amber-500 bg-clip-text text-transparent">
              Lebih Cerdas
            </span>
          </h2>

          <p className="text-muted-foreground mb-8 text-lg">
            Platform manajemen keuangan pribadi yang membantu Anda mencapai tujuan finansial.
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3"
              >
                <div className="p-2.5 bg-muted rounded-xl border border-border">
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <span className="text-muted-foreground">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-muted border-2 border-background"
                />
              ))}
            </div>
            <div>
              <p className="text-foreground font-semibold">2,500+</p>
              <p className="text-muted-foreground text-sm">Pengguna aktif</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Finku
            </h1>
          </div>

          <div className="bg-card rounded-3xl p-8 border border-border shadow-xl">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Selamat Datang!</h2>
              <p className="text-muted-foreground mb-6">Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  {error}
                </p>
              )}

              <div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg transition-all duration-300"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Masuk
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-muted rounded-xl p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Demo credentials:
                </p>
                <div className="flex items-center gap-2 text-sm font-mono bg-background px-3 py-2 rounded-lg">
                  <span className="text-emerald-500">admin</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-amber-500">94621732</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
