/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Layout from '@/src/components/Layout';
import Dashboard from '@/src/components/Dashboard';
import Transactions from '@/src/components/Transactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BarChart3, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import Clients from '@/src/components/Clients';
import CostCenter from '@/src/components/CostCenter';
import CashFlow from '@/src/components/CashFlow';
import Reports from '@/src/components/Reports';
import Equipe from '@/src/components/Equipe';

function Registrations() {
  return (
    <div className="space-y-8">
      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="bg-[#16161a] border border-white/5 p-1 rounded-2xl h-14">
          <TabsTrigger value="clients" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white">Clientes</TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white">Fornecedores</TabsTrigger>
          <TabsTrigger value="cost-centers" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white">Centros de Custo</TabsTrigger>
          <TabsTrigger value="bank-accounts" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white">Contas Bancárias</TabsTrigger>
        </TabsList>
        <TabsContent value="clients" className="mt-8">
          <Clients />
        </TabsContent>
        {/* Other tabs would follow similar structure */}
      </Tabs>
    </div>
  );
}

function Projects() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Projetos & Obras</h2>
        <p className="text-slate-500 mt-1">Acompanhe o progresso e as finanças de cada obra.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2].map(i => (
          <Card key={i} className="bg-[#16161a] border-white/5 shadow-2xl rounded-[2rem] overflow-hidden group">
            <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 relative">
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-6">
                <Badge className="bg-emerald-500/20 text-emerald-500 border-none mb-2">Em Andamento</Badge>
                <h3 className="text-xl font-bold text-white">Project {i === 1 ? 'Horizon' : 'Solar'}</h3>
              </div>
            </div>
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Progresso</span>
                  <span className="text-white font-bold">65%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[65%] rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                </div>
                <div className="pt-4 flex justify-between items-center">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(u => (
                      <div key={u} className="w-8 h-8 rounded-full border-2 border-[#16161a] bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        U{u}
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">Ver Detalhes</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}



import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Auth from '@/src/components/Auth';
import Settings from '@/src/components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [user, setUser] = React.useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const session = localStorage.getItem('erp-session');
    if (session) {
      setUser(JSON.parse(session));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('erp-session');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    toast.info('Sessão encerrada.');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'contracts': return <Clients />;
      case 'transactions': return <Transactions />;
      case 'cash-flow': return <CashFlow />;
      case 'registrations': return <Registrations />;
      case 'cost-center': return <CostCenter />;
      case 'projects': return <Projects />;
      case 'reports': return <Reports />;
      case 'team': return <Equipe />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <>
        <Auth onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
      {renderContent()}
      <Toaster />
    </Layout>
  );
}

