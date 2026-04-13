import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, Target, Wallet, Landmark } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6', '#f97316', '#6366f1'];

const CLASSIFICACOES = [
  'RECEITA COM SERVIÇOS', 'RECEITA COM PRODUTOS', 'DESPESAS COM PRODUTOS', 
  'DESPESAS COM SERVIÇOS', 'DESPESAS NÃO OPERACIONAIS', 'DESPESAS ADMINISTRATIVAS', 
  'DESPESAS OPERACIONAIS', 'DESPESAS COM MARKETING', 'IMPOSTOS', 'INVESTIMENTOS', 
  'DIVISÃO DE LUCRO'
];

function parseBRL(val: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function fmtBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Reports() {
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number | 'all'>('all');
  
  const [clients, setClients] = React.useState<any[]>([]);
  const [selectedContract, setSelectedContract] = React.useState<string>('all');
  const [selectedGroup, setSelectedGroup] = React.useState<string>('all');

  const [kpis, setKpis] = React.useState({
    receita: 0,
    despesa: 0,
    lucro: 0,
    lucratividade: 0,
    operacional: 0,
    pRec: 0,
    pPay: 0
  });

  const [monthlyData, setMonthlyData] = React.useState<any[]>([]);
  const [incomeByCat, setIncomeByCat] = React.useState<any[]>([]);
  const [expenseByCat, setExpenseByCat] = React.useState<any[]>([]);
  const [supplierRank, setSupplierRank] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await apiFetch('/api/clients');
        setClients(data);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    loadClients();
  }, []);

  const loadAnalytics = async () => {
    try {
      // 1. Fetch all transactions for the selected year
      const txData = await apiFetch(`/api/transactions?year=${selectedYear}`);
      
      let totRec = 0;
      let totDesp = 0;
      let totLucroShare = 0;
      let pendingR = 0;
      let pendingP = 0;

      const mData = Array.from({ length: 12 }, (_, i) => ({
        name: MONTHS[i],
        Receitas: 0,
        Despesas: 0
      }));

      const inCatMap: Record<string, number> = {};
      const exCatMap: Record<string, number> = {};
      const suppMap: Record<string, number> = {};

      const targetMonths = selectedMonth === 'all' ? [0,1,2,3,4,5,6,7,8,9,10,11] : [selectedMonth];

      txData.forEach((r: any) => {
        // Lógica baseada na API: status 'completed' = pago, 'pending' = pendente
        const isPaid = r.status === 'completed';
        const refDate = r.date;
        if (!refDate) return;

        const d = new Date(refDate + 'T12:00:00');
        const m = d.getMonth();
        const y = d.getFullYear();

        if (y !== selectedYear) return;

        const val = parseBRL(r.amount);
        const isIncome = r.type === 'income';
        const cat = r.costCenter || r.classification || '';
        const isDivisao = cat.toUpperCase().includes('DIVISÃO DE LUCRO');

        // Apply contract filter
        if (selectedContract !== 'all' && r.costCenter !== selectedContract) return;
        
        // Apply Group (Classification) Filter
        if (selectedGroup !== 'all' && cat !== selectedGroup) return;

        if (targetMonths.includes(m)) {
          if (isIncome) {
            if (isPaid) {
              mData[m].Receitas += val;
              totRec += val;
              inCatMap[cat] = (inCatMap[cat] || 0) + val;
            } else {
              pendingR += val;
            }
          } else {
            if (isPaid) {
              if (isDivisao) {
                totLucroShare += val;
              } else {
                mData[m].Despesas += val;
                totDesp += val;
                exCatMap[cat] = (exCatMap[cat] || 0) + val;
                const fornecedor = r.costCenter || (r.notes?.split(' ')[0] || 'Gerais');
                suppMap[fornecedor] = (suppMap[fornecedor] || 0) + val;
              }
            } else {
              pendingP += val;
            }
          }
        }
      });

      setMonthlyData(mData);
      
      const incomeList = Object.entries(inCatMap).map(([name, value]) => ({ name, value, type: 'income' as const }));
      const expenseList = Object.entries(exCatMap).map(([name, value]) => ({ name, value, type: 'expense' as const }));
      const compData = [...incomeList, ...expenseList].sort((a,b) => b.value - a.value);
      setIncomeByCat(compData);
      
      const totalExp = Object.values(exCatMap).reduce((a, b) => a + b, 0);
      const sortedExpenses = Object.entries(exCatMap)
        .map(([name, value]) => ({ 
          name, 
          value, 
          percentage: totalExp > 0 ? (value / totalExp) * 100 : 0 
        }))
        .sort((a, b) => b.value - a.value);
      
      setExpenseByCat(sortedExpenses);
      setSupplierRank(Object.entries(suppMap).map(([name, value]) => ({ name, value })).sort((a,b)=> b.value - a.value).slice(0, 10));

      const lucroBruto = totRec - totDesp;
      setKpis({
        receita: totRec,
        despesa: totDesp,
        lucro: lucroBruto,
        lucratividade: totRec > 0 ? (lucroBruto / totRec) * 100 : 0,
        operacional: totRec - (exCatMap['DESPESAS OPERACIONAIS'] || 0) - (exCatMap['DESPESAS ADMINISTRATIVAS'] || 0),
        pRec: pendingR,
        pPay: pendingP
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  React.useEffect(() => {
    loadAnalytics();
  }, [selectedYear, selectedMonth, selectedContract, selectedGroup, clients]);

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Relatórios Financeiros</h2>
          <p className="text-slate-500 mt-1 font-medium">Dashboard de Inteligência Financeira e BI.</p>
        </div>
        
        {/* BARRA DE FILTROS HORIZONTAL */}
        <div className="flex flex-wrap items-center gap-6 bg-[#16161a] border border-white/5 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col gap-1.5 min-w-[100px]">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ano Fiscal</label>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="bg-black/20 border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary cursor-pointer hover:bg-black/40 transition-colors"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="bg-[#16161a]">{y}</option>)}
            </select>
          </div>
          
          <div className="h-10 w-px bg-white/5 hidden md:block" />

          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Período de Análise</label>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-black/20 border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary cursor-pointer hover:bg-black/40 transition-colors"
            >
              <option value="all" className="bg-[#16161a]">Ano Completo</option>
              {MONTHS.map((m, i) => <option key={i} value={i} className="bg-[#16161a]">{m}</option>)}
            </select>
          </div>

          <div className="h-10 w-px bg-white/5 hidden md:block" />

          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Filtrar por Contrato / Cliente</label>
            <select 
              value={selectedContract} 
              onChange={e => setSelectedContract(e.target.value)}
              className="bg-black/20 border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary cursor-pointer hover:bg-black/40 transition-colors"
            >
              <option value="all" className="bg-[#16161a]">Todos os Contratos</option>
              {clients.map(c => <option key={c.contrato} value={c.contrato} className="bg-[#16161a]">{c.contrato} - {c.nome}</option>)}
            </select>
          </div>

          <div className="h-10 w-px bg-white/5 hidden md:block" />

          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Grupo de Centro de Custo</label>
            <select 
              value={selectedGroup} 
              onChange={e => setSelectedGroup(e.target.value)}
              className="bg-black/20 border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary cursor-pointer hover:bg-black/40 transition-colors"
            >
              <option value="all" className="bg-[#16161a]">Todos os Grupos</option>
              {CLASSIFICACOES.map(g => <option key={g} value={g} className="bg-[#16161a]">{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPIS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { title: 'Receita Total', val: fmtBRL(kpis.receita), icon: <TrendingUp className="text-emerald-500"/>, color: 'text-emerald-400' },
          { title: 'Despesas Totais', val: fmtBRL(kpis.despesa), icon: <TrendingDown className="text-rose-500"/>, color: 'text-rose-400' },
          { title: 'Resultado Líquido', val: fmtBRL(kpis.lucro), icon: <Landmark className="text-indigo-500"/>, color: kpis.lucro >= 0 ? 'text-indigo-400' : 'text-rose-500' },
          { title: 'Margem de Lucro', val: `${kpis.lucratividade.toFixed(1)}%`, icon: <Target className="text-cyan-500"/>, color: 'text-cyan-400' },
          { title: 'EBITDA Operacional', val: fmtBRL(kpis.operacional), icon: <Wallet className="text-primary"/>, color: 'text-white' }
        ].map((item, i) => (
          <Card key={i} className="bg-[#16161a] border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-default">
            <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150">{item.icon}</div>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">{item.title}</p>
            <h3 className={cn("text-2xl font-black", item.color)}>{item.val}</h3>
          </Card>
        ))}
      </div>

      {/* DASHBOARD GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico Temporal (Ocupa 2 colunas) */}
        <Card className="bg-[#16161a] border-white/5 rounded-2xl p-6 lg:col-span-2 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo Temporal: Realizado vs Planejado</CardTitle>
              <p className="text-[10px] text-slate-600 font-bold mt-1">Comparativo mensal de entradas e saídas.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-[10px] text-slate-400 font-bold uppercase">Entradas</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"/> <span className="text-[10px] text-slate-400 font-bold uppercase">Saídas</span></div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `R$ ${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip 
                  cursor={{fill: '#ffffff02'}}
                  contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', backdropFilter: 'blur(10px)', color: '#fff' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value: any) => fmtBRL(Number(value))}
                />
                <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Composição Global (BI Donut) */}
        <Card className="bg-[#16161a] border-white/5 rounded-2xl p-6 shadow-2xl">
          <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Composição do Fluxo</CardTitle>
          <p className="text-[10px] text-slate-600 font-bold mb-6 italic">Peso por categoria no resultado global.</p>
          <div className="h-72 w-full">
            {incomeByCat.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={incomeByCat} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                    {incomeByCat.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.type === 'income' ? '#10b981' : COLORS[index % COLORS.length]} 
                        stroke="rgba(0,0,0,0.2)"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }} 
                    formatter={(v: any, name: string) => [fmtBRL(v), name]} 
                  />
                  <Legend 
                     verticalAlign="bottom" 
                     align="center" 
                     iconType="circle"
                     wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '20px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-widest">Sem movimentação</div>
            )}
          </div>
        </Card>

        {/* Maiores Gastos (Ranking Horizontal BI) */}
        <Card className="bg-[#16161a] border-white/5 rounded-2xl p-6 lg:col-span-3 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <div>
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Ranking de Maiores Gastos (Pareto)</CardTitle>
              <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">Identificação de focos de desembolso por categoria.</p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
              <span className="text-[10px] text-rose-400 font-bold uppercase italic">Total Despesas: {fmtBRL(kpis.despesa)}</span>
            </div>
          </div>
          <div className="h-80 w-full">
            {expenseByCat.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={expenseByCat.slice(0, 8)} margin={{ top: 0, right: 80, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff02" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={160} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }} 
                    formatter={(v: any) => fmtBRL(v)} 
                  />
                  <Bar dataKey="value" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={24} label={{ position: 'right', fill: '#94a3b8', fontSize: 11, fontWeight: 'bold', formatter: (v: number) => {
                    const item = expenseByCat.find(x => x.value === v);
                    return item ? `${fmtBRL(v)} (${item.percentage.toFixed(1)}%)` : fmtBRL(v);
                  }}}>
                    {expenseByCat.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-widest">Sem despesas registradas</div>
            )}
          </div>
        </Card>

      </div>

      {/* ANÁLISES INFERIORES E LISTAGENS */}
      <div className="grid grid-cols-1 gap-8">
        <Card className="bg-[#16161a] border-white/5 rounded-2xl p-6 shadow-2xl">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Top Centros de Custo / Fornecedores (Desembolso Real)</CardTitle>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {supplierRank.length > 0 ? supplierRank.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <span className="text-sm text-slate-300 font-bold">{i+1}. {s.name}</span>
                <span className="text-sm text-rose-400 font-bold">{fmtBRL(s.value)}</span>
              </div>
            )) : <p className="text-center text-slate-600 text-sm">Nenhum dado encontrado.</p>}
          </div>
        </Card>
      </div>

    </div>
  );
}
