'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Settings, User, LogOut, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { invalidateFinanceQueries } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';

export function SettingsDialog() {
  const { user, logout, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [saving, setSaving] = React.useState(false);
  const [verificationPassword, setVerificationPassword] = React.useState('');
  const [resettingTarget, setResettingTarget] = React.useState<
    'transactions' | 'allocations' | null
  >(null);

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      
      if (response.ok) {
        const data = await response.json();
        updateUser(data.user);
        toast({
          title: 'Berhasil',
          description: 'Profil berhasil diperbarui',
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal memperbarui profil',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  const handleResetData = async (target: 'transactions' | 'allocations') => {
    if (!verificationPassword) {
      toast({
        title: 'Password diperlukan',
        description: 'Masukkan password login Anda untuk verifikasi.',
        variant: 'destructive',
      });
      return;
    }

    setResettingTarget(target);
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: verificationPassword,
          target,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus data');
      }

      await invalidateFinanceQueries(queryClient);
      setVerificationPassword('');

      toast({
        title: 'Berhasil',
        description:
          target === 'transactions'
            ? 'Semua data transaksi Anda berhasil dihapus.'
            : 'Semua data alokasi anggaran bulan berjalan berhasil direset.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Gagal memproses penghapusan data',
        variant: 'destructive',
      });
    } finally {
      setResettingTarget(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] bg-background border-border">
        <DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Pengaturan</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Kelola pengaturan akun Anda
              </DialogDescription>
            </div>
          </motion.div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Profile Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="w-4 h-4" />
              Profil
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs text-muted-foreground">Username</Label>
              <Input
                id="username"
                value={user?.username || ''}
                disabled
                className="bg-muted border-border h-9 text-sm text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Nama Lengkap</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="h-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email"
                className="h-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
              />
            </div>
            
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 h-9 shadow-lg shadow-emerald-500/25 text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-rose-500">
              <ShieldAlert className="w-4 h-4" />
              Zona Berisiko
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Untuk menghapus data, masukkan password login yang sama sebagai verifikasi keputusan.
              Tindakan ini hanya berlaku untuk data akun Anda sendiri.
            </p>

            <div className="space-y-2">
              <Label htmlFor="verification-password" className="text-xs text-muted-foreground">
                Password Verifikasi
              </Label>
              <Input
                id="verification-password"
                type="password"
                value={verificationPassword}
                onChange={(event) => setVerificationPassword(event.target.value)}
                placeholder="Masukkan password login"
                className="h-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                disabled={resettingTarget !== null}
                onClick={() => handleResetData('transactions')}
                className="h-10 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
              >
                {resettingTarget === 'transactions' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Hapus Semua Transaksi
              </Button>

              <Button
                variant="outline"
                disabled={resettingTarget !== null}
                onClick={() => handleResetData('allocations')}
                className="h-10 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 dark:text-amber-400"
              >
                {resettingTarget === 'allocations' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Reset Alokasi Anggaran
              </Button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar dari Akun
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
