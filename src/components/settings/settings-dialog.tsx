'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Settings, User, LogOut, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

export function SettingsDialog() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [saving, setSaving] = React.useState(false);

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
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      
      if (response.ok) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-muted">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] bg-card border-border text-white">
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
              <DialogTitle className="text-lg font-bold">Pengaturan</DialogTitle>
              <DialogDescription className="text-slate-400">
                Kelola pengaturan akun Anda
              </DialogDescription>
            </div>
          </motion.div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Profile Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <User className="w-4 h-4" />
              Profil
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs text-slate-300">Username</Label>
              <Input
                id="username"
                value={user?.username || ''}
                disabled
                className="bg-muted border-border h-9 text-sm text-slate-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-slate-300">Nama Lengkap</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="h-9 bg-muted border-border text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email"
                className="h-9 bg-muted border-border text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>
            
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 h-9 shadow-lg shadow-emerald-500/25"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>

          {/* Logout Button */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full h-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
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
