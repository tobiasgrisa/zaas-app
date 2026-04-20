import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LogIn, UserPlus, Lock, Mail, User, Building2, ShieldCheck, ArrowLeft, CreditCard, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase-browser';

interface AuthProps {
  onLogin: (user: any) => void;
}

type AuthMode = 'login' | 'register-choice' | 'register-company' | 'register-member' | 'pending-approval';

export default function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = React.useState<AuthMode>('login');
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    cnpj: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
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

        if (profile.status === 'pending') {
          setMode('pending-approval');
          await supabase.auth.signOut();
          return;
        }

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

      } else if (mode === 'register-company') {
        if (!formData.companyName || !formData.cnpj || !formData.name || !formData.email || !formData.password) {
          throw new Error('Preencha todos os campos obrigatórios.');
        }

        const res = await fetch('/api/auth/register-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao registrar empresa.');

        toast.success('Empresa e usuário master criados com sucesso!');
        setMode('login');

      } else if (mode === 'register-member') {
        if (!formData.name || !formData.email || !formData.password || !formData.cnpj) {
          throw new Error('Preencha todos os campos, incluindo o CNPJ da empresa.');
        }

        const res = await fetch('/api/auth/register-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao realizar cadastro.');

        toast.success('Cadastro realizado! Aguarde a aprovação do administrador.');
        setMode('login');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'pending-approval') {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent">
        <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="inline-flex p-6 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <Clock className="text-amber-500" size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">Acesso Pendente</h1>
            <p className="text-slate-500 font-medium px-4">
              Seu cadastro foi realizado com sucesso, mas ainda não foi aprovado pelo administrador da empresa.
            </p>
          </div>
          <Card className="bg-[#111114] border-white/5 shadow-2xl rounded-[2rem] p-8">
            <p className="text-slate-400 text-sm mb-6">
              Você receberá um e-mail assim que seu acesso for liberado. Por favor, tente novamente mais tarde.
            </p>
            <Button onClick={() => setMode('login')} variant="outline" className="w-full border-white/10 hover:bg-white/5 text-white h-12 rounded-xl font-bold">
              Voltar para o Login
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'register-choice') {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent">
        <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white tracking-tight">Comece Agora</h1>
            <p className="text-slate-500 mt-2 font-medium">Escolha como deseja acessar o sistema EngERP</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              onClick={() => setMode('register-company')}
              className="bg-[#111114] border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group rounded-[2.5rem] p-4 flex flex-col items-center text-center shadow-2xl"
            >
              <div className="p-8 pb-4">
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform mb-6 border border-indigo-500/20">
                  <Building2 className="text-indigo-500" size={40} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Cadastrar Empresa</h3>
                <p className="text-slate-400 text-sm">Para novos proprietários ou administradores master.</p>
              </div>
              <div className="mt-4 pb-4">
                <span className="text-indigo-400 font-bold group-hover:underline">Começar →</span>
              </div>
            </Card>

            <Card 
              onClick={() => setMode('register-member')}
              className="bg-[#111114] border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group rounded-[2.5rem] p-4 flex flex-col items-center text-center shadow-2xl"
            >
              <div className="p-8 pb-4">
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform mb-6 border border-indigo-500/20">
                  <UserPlus className="text-indigo-500" size={40} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Cadastrar Usuário</h3>
                <p className="text-slate-500 text-sm">Para funcionários convidados por uma empresa existente.</p>
              </div>
              <div className="mt-4 pb-4">
                <span className="text-indigo-400 font-bold group-hover:underline">Começar →</span>
              </div>
            </Card>
          </div>
          
          <div className="mt-10 text-center">
            <button onClick={() => setMode('login')} className="text-slate-400 font-medium hover:text-white transition-colors">
              Já possui uma conta? <span className="text-primary font-bold">Faça login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 mb-4 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            {mode === 'login' ? <LogIn className="text-indigo-500" size={32} /> : mode === 'register-company' ? <Building2 className="text-indigo-500" size={32} /> : <UserPlus className="text-indigo-500" size={32} />}
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'register-company' ? 'Nova Empresa' : 'Novo Usuário'}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {mode === 'login' ? 'Acesse o sistema EngERP' : mode === 'register-company' ? 'Crie o perfil master da sua empresa' : 'Entre na sua equipe agora'}
          </p>
        </div>

        <Card className="bg-[#111114] border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {mode !== 'login' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input 
                      required
                      className="bg-[#16161a] border-white/5 pl-10 h-12 rounded-xl focus:ring-primary/50 text-white"
                      placeholder="Seu nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {mode === 'register-company' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Nome da Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input 
                      required
                      className="bg-[#16161a] border-white/5 pl-10 h-12 rounded-xl focus:ring-primary/50 text-white"
                      placeholder="Minha Engenharia LTDA"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {(mode === 'register-company' || mode === 'register-member') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">CNPJ da Empresa</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input 
                      required
                      className="bg-[#16161a] border-white/5 pl-10 h-12 rounded-xl focus:ring-primary/50 text-white"
                      placeholder="00.000.000/0001-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">E-mail</label>
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 flex justify-between">
                  Senha
                  {mode === 'login' && <button type="button" className="text-primary hover:underline text-[9px] lowercase">Esqueceu?</button>}
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
                {loading ? 'Processando...' : mode === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
              </Button>
            </form>

            <div className="mt-8 text-center flex flex-col gap-4">
              {mode !== 'login' && (
                <button 
                  onClick={() => setMode('register-choice')}
                  className="text-slate-500 hover:text-white transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} /> Voltar para Escolha
                </button>
              )}
              <button 
                onClick={() => setMode(mode === 'login' ? 'register-choice' : 'login')}
                className="text-slate-400 text-sm hover:text-white transition-colors"
              >
                {mode === 'login' ? (
                  <>Não tem conta? <span className="text-primary font-bold">Cadastre-se</span></>
                ) : (
                  <>Já possui conta? <span className="text-primary font-bold">Faça login</span></>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
