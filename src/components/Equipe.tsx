import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Mail, Shield, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'member';
  status: 'pending' | 'approved';
  created_at: string;
}

export default function Equipe() {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [inviteData, setInviteData] = React.useState({ name: '', email: '' });
  const [searchTerm, setSearchTerm] = React.useState('');

  const user = JSON.parse(localStorage.getItem('erp-session') || '{}');
  const company_id = user.company_id;

  const fetchMembers = async () => {
    try {
      const data = await apiFetch(`/api/team/members?company_id=${company_id}`);
      setMembers(data);
    } catch (error) {
      toast.error('Erro ao buscar membros da equipe.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/team/invite', {
        method: 'POST',
        body: JSON.stringify({
          ...inviteData,
          company_id,
          company_name: user.company_name || 'Minha Empresa'
        })
      });
      toast.success('Convite enviado com sucesso!');
      setIsInviteModalOpen(false);
      setInviteData({ name: '', email: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await apiFetch('/api/team/approve', {
        method: 'POST',
        body: JSON.stringify({ profile_id: id, status })
      });
      toast.success(status === 'approved' ? 'Acesso aprovado!' : 'Acesso recusado.');
      fetchMembers();
    } catch (error) {
      toast.error('Erro ao processar aprovação.');
    }
  };

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingMembers = filteredMembers.filter(m => m.status === 'pending');
  const activeMembers = filteredMembers.filter(m => m.status === 'approved');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Equipe</h2>
          <p className="text-slate-500 mt-1 font-medium">Gerencie o acesso dos membros à sua empresa.</p>
        </div>
        <Button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <UserPlus size={20} />
          Convidar Usuário
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <Input 
          className="bg-[#111114] border-white/5 pl-10 h-12 rounded-xl focus:ring-primary/50"
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {pendingMembers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
            <Clock size={16} />
            Aprovações Pendentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingMembers.map((member) => (
              <Card key={member.id} className="bg-[#111114] border-white/5 shadow-2xl rounded-[2rem] overflow-hidden border-l-4 border-l-amber-500">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold border border-amber-500/20">
                      {member.name ? member.name[0].toUpperCase() : m[0].toUpperCase()}
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 rounded-lg">Pendente</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{member.name}</h4>
                  <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
                    <Mail size={14} />
                    {member.email}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(member.id, 'approved')}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-10 gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Aprovar
                    </Button>
                    <Button 
                      onClick={() => handleApprove(member.id, 'rejected')}
                      variant="ghost" 
                      className="flex-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 font-bold rounded-xl h-10 gap-2"
                    >
                      <XCircle size={16} />
                      Recusar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
          <Shield size={16} />
          Equipe Ativa
        </h3>
        <div className="bg-[#111114] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Nome</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">E-mail</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Nível</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member) => (
                  <tr key={member.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                          {member.name?.[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-white group-hover:text-primary transition-colors">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-400 font-medium">{member.email}</td>
                    <td className="px-8 py-6">
                      <Badge variant="outline" className={cn(
                        "rounded-lg px-3 py-1",
                        member.role === 'master' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        {member.role === 'master' ? 'Master' : 'Membro'}
                      </Badge>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold">Ativo</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 mt-0">
          <Card className="w-full max-w-md bg-[#111114] border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in duration-300">
            <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-black text-white tracking-tight">Convidar Membro</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsInviteModalOpen(false)} className="text-slate-500 hover:text-white hover:bg-white/5 rounded-full">
                <XCircle size={24} />
              </Button>
            </CardHeader>
            <CardContent className="p-10 pt-6">
              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Nome do Convidado</label>
                  <Input 
                    required
                    className="bg-[#16161a] border-white/5 h-12 rounded-xl focus:ring-primary/50"
                    placeholder="Ex: João Silva"
                    value={inviteData.name}
                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">E-mail</label>
                  <Input 
                    required
                    type="email"
                    className="bg-[#16161a] border-white/5 h-12 rounded-xl focus:ring-primary/50"
                    placeholder="joao@exemplo.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95 mt-4">
                  Enviar Convite
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
