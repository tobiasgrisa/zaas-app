import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Mail, Shield, Clock, CheckCircle2, XCircle, Search, Trash2, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'member';
  status: 'pending' | 'approved';
  modules: string[];
  created_at: string;
}

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'obras', label: 'Obras' },
  { id: 'equipe', label: 'Equipe' }
];

export default function Equipe() {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [inviteData, setInviteData] = React.useState({ name: '', email: '', modules: [] as string[] });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [openSelectId, setOpenSelectId] = React.useState<string | null>(null);

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
    if (inviteData.modules.length === 0) {
      toast.error('Selecione pelo menos um módulo.');
      return;
    }
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
      setInviteData({ name: '', email: '', modules: [] });
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

  const handleRemove = async (id: string) => {
    if (!confirm('Deseja realmente excluir este membro? Esta ação é irreversível.')) return;
    try {
      await apiFetch('/api/team/remove', {
        method: 'POST',
        body: JSON.stringify({ profile_id: id })
      });
      toast.success('Membro removido com sucesso.');
      fetchMembers();
    } catch (error) {
      toast.error('Erro ao remover membro.');
    }
  };

  const toggleModule = async (memberId: string, moduleId: string, currentModules: string[]) => {
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(m => m !== moduleId)
      : [...currentModules, moduleId];
    
    try {
      await apiFetch('/api/team/update-modules', {
        method: 'POST',
        body: JSON.stringify({ profile_id: memberId, modules: newModules })
      });
      setMembers(members.map(m => m.id === memberId ? { ...m, modules: newModules } : m));
    } catch (error) {
      toast.error('Erro ao atualizar permissões.');
    }
  };

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingMembers = filteredMembers.filter(m => m.status === 'pending');
  // Hide Master user (the current user) from the list as requested
  const activeMembers = filteredMembers.filter(m => m.status === 'approved' && m.id !== user.id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Equipe</h2>
          <p className="text-slate-500 mt-1 font-medium">Gerencie o acesso dos membros à sua empresa.</p>
        </div>
        <Button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 border-none"
        >
          <UserPlus size={20} />
          Convidar Usuário
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <Input 
          className="bg-[#111114] border-white/5 pl-10 h-12 rounded-xl focus:ring-indigo-500/50 text-white"
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
                      {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 rounded-lg">Pendente</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{member.name || 'Sem nome'}</h4>
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
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Nível / Módulos</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-slate-500 italic">Nenhum membro convidado ainda.</td>
                  </tr>
                ) : (
                  activeMembers.map((member) => (
                    <tr key={member.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold border border-indigo-500/20">
                            {member.name?.[0].toUpperCase() || member.email[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">{member.name || 'Sem nome'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-400 font-medium">{member.email}</td>
                      <td className="px-8 py-6 relative">
                        <div 
                          onClick={() => setOpenSelectId(openSelectId === member.id ? null : member.id)}
                          className="flex items-center justify-between gap-2 bg-[#16161a] border border-white/5 px-4 py-2 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-all min-w-[200px]"
                        >
                          <div className="flex flex-wrap gap-1">
                            {member.modules?.length > 0 ? (
                              member.modules.map(modId => (
                                <span key={modId} className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-bold uppercase">
                                  {AVAILABLE_MODULES.find(m => m.id === modId)?.label}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-xs italic">Nenhum acesso</span>
                            )}
                          </div>
                          <ChevronDown size={16} className="text-slate-500" />
                        </div>

                        {openSelectId === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenSelectId(null)} />
                            <div className="absolute left-8 top-[80%] z-20 w-[240px] bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in duration-200">
                              {AVAILABLE_MODULES.map((mod) => (
                                <div 
                                  key={mod.id}
                                  onClick={() => toggleModule(member.id, mod.id, member.modules || [])}
                                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                  <span className="text-sm font-bold text-slate-300">{mod.label}</span>
                                  {member.modules?.includes(mod.id) && <Check size={16} className="text-indigo-500" />}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-bold">Ativo</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <Button 
                          onClick={() => handleRemove(member.id)}
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
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
                    className="bg-[#16161a] border-white/5 h-12 rounded-xl focus:ring-indigo-500/50 text-white"
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
                    className="bg-[#16161a] border-white/5 h-12 rounded-xl focus:ring-indigo-500/50 text-white"
                    placeholder="joao@exemplo.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Módulos de Acesso</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_MODULES.map(mod => (
                      <div 
                        key={mod.id}
                        onClick={() => {
                          const newModules = inviteData.modules.includes(mod.id)
                            ? inviteData.modules.filter(m => m !== mod.id)
                            : [...inviteData.modules, mod.id];
                          setInviteData({ ...inviteData, modules: newModules });
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                          inviteData.modules.includes(mod.id) 
                            ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400" 
                            : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                        }`}
                      >
                        <span className="text-xs font-bold uppercase">{mod.label}</span>
                        {inviteData.modules.includes(mod.id) && <Check size={14} />}
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mt-4 border-none">
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
