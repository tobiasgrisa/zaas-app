import React from 'react';
import { LayoutDashboard, Receipt, Users, Building2, BarChart3, Settings, Menu, X, Search, ChevronDown, ChevronRight, Landmark, LogOut, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contracts', label: 'Contratos', icon: Users },
  { 
    id: 'financial-group', 
    label: 'Financeiro', 
    icon: Landmark,
    subItems: [
      { id: 'cost-center', label: 'Centro de Custo', icon: BarChart3 },
      { id: 'transactions', label: 'Lançamentos', icon: Receipt },
      { id: 'cash-flow', label: 'Fluxo de Caixa', icon: BarChart3 },
      { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    ]
  },
  { id: 'projects', label: 'Obras', icon: Building2 },
];

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: any;
  onLogout?: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isFinanceOpen, setIsFinanceOpen] = React.useState(true);
  const [companyData, setCompanyData] = React.useState({ name: 'EngERP', logo: '' });

  const loadCompany = () => {
    const saved = localStorage.getItem('erp-company-data');
    if (saved) setCompanyData(JSON.parse(saved));
  };

  React.useEffect(() => {
    loadCompany();
    window.addEventListener('company-data-updated', loadCompany);
    return () => window.removeEventListener('company-data-updated', loadCompany);
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-white">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-[#111114] border-r border-white/5 transition-all duration-300 flex flex-col",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-8 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
                {companyData.logo ? (
                  <img src={companyData.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 size={18} className="text-primary" />
                )}
              </div>
              <h1 className="font-bold text-lg tracking-tight truncate">{companyData.name}</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              if (item.subItems) {
                const isAnySubActive = item.subItems.some(s => s.id === activeTab);
                
                return (
                  <div key={item.id} className="space-y-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-12 rounded-xl transition-all duration-200",
                        isAnySubActive ? "text-white bg-white/5" : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                      onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                    >
                      <item.icon size={20} className={cn(isAnySubActive ? "text-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]" : "text-slate-400")} />
                      {isSidebarOpen && (
                        <>
                          <span className="font-medium flex-1 text-left">{item.label}</span>
                          {isFinanceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </>
                      )}
                    </Button>
                    
                    {isFinanceOpen && isSidebarOpen && (
                      <div className="pl-4 space-y-1">
                        {item.subItems.map((sub) => (
                          <Button
                            key={sub.id}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3 h-10 rounded-lg transition-all duration-200 pr-2",
                              activeTab === sub.id 
                                ? "bg-primary/20 text-white border border-primary/30" 
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                            )}
                            onClick={() => setActiveTab(sub.id)}
                          >
                            <sub.icon size={16} className={cn(activeTab === sub.id ? "text-primary shadow-[0_0_8px_rgba(139,92,246,0.3)]" : "text-slate-500")} />
                            <span className="text-sm font-medium text-left line-clamp-1">{sub.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-12 rounded-xl transition-all duration-200",
                    activeTab === item.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon size={20} className={cn(activeTab === item.id ? "text-white" : "text-slate-400")} />
                  {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-6 mt-auto border-t border-white/5">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full justify-start gap-3 h-12 rounded-xl transition-all duration-200 mb-2",
              activeTab === 'settings' 
                ? "bg-white/5 text-white" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings size={20} />
            {isSidebarOpen && <span>Configurações</span>}
          </Button>

          <Button 
            variant="ghost" 
            onClick={onLogout}
            className="w-full justify-start gap-3 h-12 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all duration-200"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center px-10 justify-between bg-[#0a0a0c]/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                className="w-full bg-[#16161a] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Buscar..."
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-white/5">
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0a0a0c]" />
              <LayoutDashboard size={20} />
            </Button>
            
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-white">{user?.name || 'Administrador'}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">
                  {user?.role === 'master' ? 'Acesso Master' : 'Acesso Equipe'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20 border border-white/5">
                {user?.name ? getInitials(user.name) : 'TG'}
              </div>
            </div>
          </div>
        </header>
        
        <ScrollArea className="flex-1">
          <div className="p-10 w-full mx-auto">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
