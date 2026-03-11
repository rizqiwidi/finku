'use client';

import { useEffect, useEffectEvent, useState, type FormEvent } from 'react';
import { Loader2, Eye, EyeOff, Wallet, TrendingUp, PiggyBank, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

const features = [
  { icon: Wallet, text: 'Kelola keuangan dengan mudah', color: 'text-emerald-500' },
  { icon: TrendingUp, text: 'Pantau tren pengeluaran', color: 'text-teal-500' },
  { icon: PiggyBank, text: 'Raih target tabungan', color: 'text-amber-500' },
];

const REMEMBER_LOGIN_KEY = 'finku:remember-login';
const REMEMBER_USERNAME_KEY = 'finku:remember-username';
const LEGACY_REMEMBER_PASSWORD_KEY = 'finku:remember-password';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const restoreRememberedLogin = useEffectEvent((savedUsername: string) => {
    setRememberLogin(true);
    setUsername(savedUsername);
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(LEGACY_REMEMBER_PASSWORD_KEY);

    const shouldRemember = window.localStorage.getItem(REMEMBER_LOGIN_KEY) === 'true';
    if (!shouldRemember) {
      return;
    }

    restoreRememberedLogin(window.localStorage.getItem(REMEMBER_USERNAME_KEY) ?? '');
  }, [restoreRememberedLogin]);

  const persistRememberedLogin = () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (rememberLogin) {
      window.localStorage.setItem(REMEMBER_LOGIN_KEY, 'true');
      window.localStorage.setItem(REMEMBER_USERNAME_KEY, username);
      window.localStorage.removeItem(LEGACY_REMEMBER_PASSWORD_KEY);
      return;
    }

    window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
    window.localStorage.removeItem(REMEMBER_USERNAME_KEY);
    window.localStorage.removeItem(LEGACY_REMEMBER_PASSWORD_KEY);
  };

  const handleRememberLoginChange = (checked: boolean) => {
    setRememberLogin(checked);

    if (checked || typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
    window.localStorage.removeItem(REMEMBER_USERNAME_KEY);
    window.localStorage.removeItem(LEGACY_REMEMBER_PASSWORD_KEY);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (!result.success) {
      setError(result.error || 'Username atau password salah');
      setIsLoading(false);
      return;
    }

    persistRememberedLogin();
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
        <div className="max-w-xl">
          <div className="mb-8 flex items-center gap-5">
            <BrandLogo
              className="h-20 w-20 xl:h-24 xl:w-24"
              imageClassName="drop-shadow-[0_18px_35px_rgba(15,23,42,0.08)] dark:drop-shadow-[0_18px_35px_rgba(15,23,42,0.28)]"
              priority
              sizes="(max-width: 1279px) 80px, 96px"
            />
            <div className="space-y-2">
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-foreground">
                Finku
              </h1>
              <p className="text-sm xl:text-base font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                Financial Management
              </p>
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
          <div className="mb-8 flex items-center justify-center gap-4 lg:hidden">
            <BrandLogo
              className="h-14 w-14 sm:h-16 sm:w-16"
              imageClassName="drop-shadow-[0_12px_24px_rgba(15,23,42,0.08)] dark:drop-shadow-[0_12px_24px_rgba(15,23,42,0.24)]"
              priority
              sizes="(max-width: 639px) 56px, 64px"
            />
            <div className="space-y-1 text-left">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Finku
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Financial Management
              </p>
            </div>
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

              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                <Checkbox
                  id="remember-login"
                  checked={rememberLogin}
                  onCheckedChange={(checked) => handleRememberLoginChange(checked === true)}
                  className="mt-0.5 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
                <div className="space-y-1">
                  <Label htmlFor="remember-login" className="cursor-pointer text-sm font-medium">
                    Simpan username
                  </Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Password tetap memakai pengelola sandi browser jika Anda ingin autofill yang lebih aman.
                  </p>
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
