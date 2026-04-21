import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LogIn, Lock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase-browser';

interface AuthProps {
  onLogin: (user: any) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', authData.user.id)
        .single();

      if (profError) throw profError;

      const sessionUser = {
        id: authData.user.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        company_id: profile.company_id,
        company_name: profile.companies?.name
      };

      localStorage.setItem('erp-session', JSON.stringify(sessionUser));
      toast.success(`Bem-vindo, ${profile.name}!`);
      onLogin(sessionUser);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 mb-4 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <LogIn className="text-indigo-500" size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Bem-vindo ao Zaas
          </h1>
          <p className="text-slate-400 mt-2 font-medium">
            Área de acesso restrito
          </p>
        </div>

        <Card className="bg-[#111114] border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <Input 
                    required
                    type="email"
                    className="bg-[#16161a] border-white/5 pl-10 h-12 rounded-xl focus:ring-primary/50 text-white"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 flex justify-between">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <Input 
                    required
                    type="password"
                    className="bg-[#16161a] border-white/5 pl-10 h-12 rounded-xl focus:ring-primary/50 text-white"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className={cn(
                  "w-full h-12 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 mt-4",
                  "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                )}
              >
                {loading ? 'Processando...' : 'Entrar no Sistema'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">
                Zaas App - Engenharia & ERP
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
