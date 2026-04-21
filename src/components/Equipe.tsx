import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Mail, Shield, Clock, CheckCircle2, XCircle, Search, Trash2, ChevronDown, Check, Send, Edit2, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'member';
  status: 'pending' | 'approved' | 'deleted' | 'invitation_sent' | 'canceled';
  type: 'profile' | 'invitation';
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
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResendInvite = async (member: Member) => {
    try {
      await apiFetch('/api/team/resend-invite', {
        method: 'POST',
        body: JSON.stringify({
          email: member.email,
          name: member.name,
          company_name: user.company_name || 'Minha Empresa'
        })
      });
      toast.success('Convite reenviado!');
    } catch (error) {
      toast.error('Erro ao reenviar convite.');
    }
  };

  const handleRemove = async (id: string, type: 'profile' | 'invitation') => {
    const msg = type === 'profile' ? 'Deseja realmente desativar este membro?' : 'Deseja realmente cancelar este convite?';
    if (!confirm(msg)) return;
    try {
      await apiFetch('/api/team/remove', {
        method: 'POST',
        body: JSON.stringify({ id, type })
      });
      toast.success(type === 'profile' ? 'Membro desativado.' : 'Convite cancelado.');
      fetchMembers();
    } catch (error) {
      toast.error('Erro ao processar solicitação.');
    }
  };

  const toggleModule = async (memberId: string, moduleId: string, currentModules: string[], type: 'profile' | 'invitation') => {
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(m => m !== moduleId)
      : [...currentModules, moduleId];
    
    try {
      if (type === 'profile') {
        await apiFetch('/api/team/update-modules', {
          method: 'POST',
          body: JSON.stringify({ profile_id: memberId, modules: newModules })
        });
      } else {
        // Reuse invite logic to update invitation modules
        await apiFetch('/api/team/invite', {
          method: 'POST',
          body: JSON.stringify({ 
            email: members.find(m => m.id === memberId)?.email,
            name: members.find(m => m.id === memberId)?.name,
            company_id,
            modules: newModules 
          })
        });
      }
      setMembers(members.map(m => m.id === memberId ? { ...m, modules: newModules } : m));
    } catch (error) {
      toast.error('Erro ao atualizar permissões.');
    }
  };

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeMembers = filteredMembers.filter(m => m.id !== user.id);

  const getStatusBadge = (status: Member['status']) => {
    switch (status) {
      case 'approved':
        return <div className="flex items-center gap-2 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-[10px] font-black uppercase">Ativo</span></div>;
      case 'pending':
        return <div className="flex items-center gap-2 text-amber-500"><Clock size={12} /> <span className="text-[10px] font-black uppercase">Pendente</span></div>;
      case 'invitation_sent':
        return <div className="flex items-center gap-2 text-blue-500"><Send size={12} /> <span className="text-[10px] font-black uppercase">Convite Enviado</span></div>;
      case 'deleted':
      case 'canceled':
        return <div className="flex items-center gap-2 text-slate-500 transition-all group-hover:text-rose-500"><XCircle size={12} /> <span className="text-[10px] font-black uppercase">Excluído</span></div>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Equipe</h2>
          <p className="text-slate-500 mt-1 font-medium">Gerencie o acesso e permissões dos membros da sua empresa.</p>
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

      <div className="space-y-4">
        <div className="bg-[#111114] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Membro</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">E-mail</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Nível / Módulos</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-600">
                        <Shield size={48} className="opacity-20" />
                        <p className="font-medium italic">Nenhum membro ou convite encontrado.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeMembers.map((member) => (
                    <tr key={member.id} className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors group ${member.status === 'deleted' || member.status === 'canceled' ? 'opacity-50' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${
                            member.status === 'deleted' || member.status === 'canceled' 
                            ? 'bg-slate-500/5 text-slate-600 border-slate-500/10' 
                            : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                          }`}>
                            {member.name?.[0].toUpperCase() || member.email[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">{member.name || 'Sem nome'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-400 font-medium">{member.email}</td>
                      <td className="px-8 py-6 relative">
                        <div 
                          onClick={() => {
                            if (member.status !== 'deleted' && member.status !== 'canceled') {
                              setOpenSelectId(openSelectId === member.id ? null : member.id);
                            }
                          }}
                          className={`flex items-center justify-between gap-2 bg-[#16161a] border border-white/5 px-4 py-2 rounded-xl transition-all min-w-[180px] ${
                            member.status === 'deleted' || member.status === 'canceled' ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:border-indigo-500/30'
                          }`}
                        >
                          <div className="flex flex-wrap gap-1">
                            {member.modules?.length > 0 ? (
                              member.modules.map(modId => (
                                <span key={modId} className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-bold uppercase">
                                  {AVAILABLE_MODULES.find(m => m.id === modId)?.label}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[10px] uppercase font-bold">Sem Acesso</span>
                            )}
                          </div>
                          <ChevronDown size={14} className="text-slate-500" />
                        </div>

                        {openSelectId === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenSelectId(null)} />
                            <div className="absolute left-8 top-[80%] z-20 w-[240px] bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in duration-200">
                              {AVAILABLE_MODULES.map((mod) => (
                                <div 
                                  key={mod.id}
                                  onClick={() => toggleModule(member.id, mod.id, member.modules || [], member.type)}
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
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {member.status === 'invitation_sent' && (
                            <Button 
                              onClick={() => handleResendInvite(member)}
                              variant="ghost" 
                              size="icon" 
                              title="Reenviar Convite"
                              className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full h-9 w-9 transition-all"
                            >
                              <RotateCw size={16} />
                            </Button>
                          )}
                          <Button 
                            onClick={() => setOpenSelectId(openSelectId === member.id ? null : member.id)}
                            variant="ghost" 
                            size="icon" 
                            disabled={member.status === 'deleted' || member.status === 'canceled'}
                            className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full h-9 w-9 transition-all"
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            onClick={() => handleRemove(member.id, member.type)}
                            variant="ghost" 
                            size="icon" 
                            disabled={member.status === 'deleted' || member.status === 'canceled'}
                            className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-full h-9 w-9 transition-all"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
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
