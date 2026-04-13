import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard, Wallet } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart } from 'recharts';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = React.useState<number | 'all'>(new Date().getFullYear());
  const [summary, setSummary] = React.useState({ globalBalance: 0, income: 0, expense: 0, profit: 0 });
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadRealData = async () => {
    try {
      setLoading(true);
      const yearParam = selectedYear !== 'all' ? `year=${selectedYear}` : '';
      
      const summaryData = await apiFetch('/api/summary');
      const txData = await apiFetch(`/api/transactions?${yearParam}`);

      const mDataMap: Record<string, { receita: number, despesa: number }> = {};
      MONTHS.forEach(m => mDataMap[m] = { receita: 0, despesa: 0 });

      let periodPaidRec = 0;
      let periodPaidDesp = 0;

      txData.forEach((r: any) => {
        const isPaid = !!r.paymentDate;
        if (!isPaid) return;

        const val = Number(r.amount);
        const refDate = new Date(r.paymentDate);
        const dMonthIdx = refDate.getMonth();

        if (r.type === 'income') {
          periodPaidRec += val;
          mDataMap[MONTHS[dMonthIdx]].receita += val;
        } else {
          periodPaidDesp += val;
          mDataMap[MONTHS[dMonthIdx]].despesa += val;
        }
      });

      const mData = MONTHS.map(name => ({
        name,
        ...mDataMap[name]
      }));

      setChartData(mData);
      setSummary({
        globalBalance: summaryData.balance,
        income: periodPaidRec,
        expense: periodPaidDesp,
        profit: periodPaidRec - periodPaidDesp
      });
    } catch (e) {
      console.error('Error loading dashboard data', e);
    }
  };

  React.useEffect(() => {
    loadRealData();
  }, [selectedYear]);

  const stats = [
    { label: 'Saldo em Caixa', value: summary.globalBalance, icon: Wallet, gradient: 'gradient-purple', percentage: 'Geral', sub: 'Dinheiro em conta hoje' },
    { label: 'Total de Receitas', value: summary.income, icon: TrendingUp, gradient: 'gradient-emerald', percentage: 'Realizado', sub: 'Período selecionado' },
    { label: 'Total de Despesas', value: summary.expense, icon: TrendingDown, gradient: 'gradient-rose', percentage: 'Realizado', sub: 'Período selecionado' },
    { label: 'Lucro Líquido', value: summary.profit, icon: DollarSign, gradient: 'gradient-orange', percentage: 'Realizado', sub: 'Receita - Despesa' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Painel Financeiro</h2>
          <p className="text-slate-500 mt-1">Análise de Fluxo de Caixa (Lançamentos Realizados).</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#16161a] border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Período</span>
            <select 
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === 'all' ? 'all' : parseInt(val));
              }}
              className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer text-sm"
            >
              <option value="all" className="bg-[#16161a]">Ver Todos</option>
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="bg-[#16161a]">{y}</option>)}
            </select>
          </div>
          
          <Button variant="outline" className="bg-[#16161a] border-white/5 text-slate-300 hover:bg-white/5 h-11 px-6 rounded-xl hidden sm:flex">
            Exportar Dados
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className={cn("border-none shadow-2xl overflow-hidden relative group transition-transform hover:scale-[1.02]", stat.gradient)}>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-white mt-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.value)}
                  </h3>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full">{stat.percentage}</span>
                <span className="text-white/60 text-xs">{stat.sub}</span>
              </div>
            </CardContent>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#16161a] border-white/5 shadow-2xl rounded-[2rem]">
          <CardHeader className="px-8 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Fluxo por Mês (Realizado)</CardTitle>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Apenas entradas e saídas efetivadas</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Despesas</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[400px] px-4 pb-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10}} 
                  tickFormatter={v => `R$ ${(v/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f1f23', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase' }}
                  formatter={(v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)}
                />
                <Area type="monotone" dataKey="receita" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorReceita)" strokeWidth={3} />
                <Area type="monotone" dataKey="despesa" stroke="#f43f5e" fillOpacity={1} fill="url(#colorDespesa)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#16161a] border-white/5 shadow-2xl rounded-[2rem] flex flex-col overflow-hidden">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="text-lg font-bold">Resumo Analítico</CardTitle>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Performance acumulada no período</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-8">
            <div className="space-y-6">
              {[
                { label: 'Lucratividade (Real)', val: summary.income > 0 ? (summary.profit / summary.income * 100).toFixed(1) : 0, sufix: '%', color: 'text-indigo-400' },
                { label: 'Índice de Despesa', val: summary.income > 0 ? (summary.expense / summary.income * 100).toFixed(1) : 0, sufix: '%', color: 'text-rose-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">{item.label}</p>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-3xl font-black", item.color)}>{item.val}</span>
                    <span className="text-sm font-bold text-slate-600 mb-1">{item.sufix}</span>
                  </div>
                </div>
              ))}
              
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 mt-4">
                 <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-2">Nota Informativa</p>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium">
                   Esta visão reflete apenas o **Fluxo de Caixa Realizado** (entradas e saídas pagas). O Saldo em Caixa é fixo e não sofre alteração pelos filtros de ano.
                 </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
