import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// Helper for parsing BRL to float
function parseBRL(val: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

// Helper for formatting float to BRL
function fmtBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CashFlow() {
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  
  // Data matrix [12 months]
  const [flow, setFlow] = React.useState<any[]>([]);
  const [totalRow, setTotalRow] = React.useState<any>({});
  
  // Pending data
  const [pendingReceivable, setPendingReceivable] = React.useState(0);
  const [pendingPayable, setPendingPayable] = React.useState(0);

  // Dialog state for details
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsData, setDetailsData] = React.useState<{title: string, transactions: any[]}>({ title: '', transactions: [] });

  const loadData = async () => {
    try {
      // 1. Fetch data from API
      // We fetch all transactions from the selected year and the January initial balance
      const [txDataRaw, janBalanceData] = await Promise.all([
        apiFetch(`/api/transactions?year=${selectedYear}`),
        apiFetch(`/api/initial-balance?year=${selectedYear}&month=0`)
      ]);
      
      const janInitial = janBalanceData.amount || 0;
      let currentInitialBalance = janInitial;
      
      const yearlyFlow = [];
      let totReceita = 0;
      let totDespesa = 0;
      let totLucro = 0;
      let globPendingRec = 0;
      let globPendingPay = 0;

      // Ensure data is array
      const allTxs = Array.isArray(txDataRaw) ? txDataRaw : [];

      // 2. Iterate each month and process the transactions
      for (let m = 0; m < 12; m++) {
        // REALIZED (Top Table): Only items with payment_date in this month
        const paidRows = allTxs.filter((r: any) => {
          const pDate = r.payment_date || r.paymentDate;
          if (!pDate) return false;
          const d = new Date(pDate + 'T12:00:00');
          return d.getFullYear() === selectedYear && d.getMonth() === m;
        });

        const incomeRows = paidRows.filter((r: any) => r.type === 'income');
        const rawExpenseRows = paidRows.filter((r: any) => r.type === 'expense');
        
        const lucroRows = rawExpenseRows.filter((r: any) => (r.costCenter || r.classification || '')?.toUpperCase().includes('DIVISÃO DE LUCRO'));
        const expenseRows = rawExpenseRows.filter((r: any) => !(r.costCenter || r.classification || '')?.toUpperCase().includes('DIVISÃO DE LUCRO'));
        
        // PENDING (Bottom Table): Items without payment_date, grouped by launch month
        const pendingRows = allTxs.filter((r: any) => {
          const pDate = r.payment_date || r.paymentDate;
          if (pDate) return false; // Already paid
          const d = new Date(r.date + 'T12:00:00');
          return d.getFullYear() === selectedYear && d.getMonth() === m;
        });

        const pendingIncRows = pendingRows.filter((r: any) => r.type === 'income');
        const pendingExpRows = pendingRows.filter((r: any) => r.type === 'expense');

        const receita = incomeRows.reduce((acc: number, r: any) => acc + parseBRL(r.amount), 0);
        const despesa = expenseRows.reduce((acc: number, r: any) => acc + parseBRL(r.amount), 0);
        const lucro = lucroRows.reduce((acc: number, r: any) => acc + parseBRL(r.amount), 0);
        
        const pRec = pendingIncRows.reduce((acc: number, r: any) => acc + parseBRL(r.amount), 0);
        const pPay = pendingExpRows.reduce((acc: number, r: any) => acc + parseBRL(r.amount), 0);

        globPendingRec += pRec;
        globPendingPay += pPay;

        const resultadoMes = receita - despesa - lucro;
        const acumulado = currentInitialBalance + resultadoMes;
        const lucratividade = receita > 0 ? ((receita - despesa) / receita) * 100 : 0;

        yearlyFlow.push({
          month: MONTHS[m],
          saldoInicial: currentInitialBalance,
          receita,
          despesa,
          divisaoLucro: lucro,
          acumulado,
          lucratividade,
          pendingRec: pRec,
          pendingPay: pPay,
          necessidadeCaixa: pRec - pPay,
          rawIncome: incomeRows,
          rawExpense: expenseRows,
          rawLucro: lucroRows,
          rawPendingRec: pendingIncRows,
          rawPendingPay: pendingExpRows
        });

        // Carry over balance to next month
        currentInitialBalance = acumulado;
        totReceita += receita;
        totDespesa += despesa;
        totLucro += lucro;
      }

      setFlow(yearlyFlow);
      setPendingReceivable(globPendingRec);
      setPendingPayable(globPendingPay);
      
      const firstInitial = janInitial;
      const finalAcumulado = currentInitialBalance; 
      const totMargin = totReceita > 0 ? ((totReceita - totDespesa) / totReceita) * 100 : 0;
      
      setTotalRow({
        saldoInicial: firstInitial,
        receita: totReceita,
        despesa: totDespesa,
        divisaoLucro: totLucro,
        acumulado: finalAcumulado,
        lucratividade: totMargin,
        pendingRec: globPendingRec,
        pendingPay: globPendingPay,
        necessidadeCaixa: globPendingRec - globPendingPay
      });
    } catch (error) {
      console.error('Error loading cash flow data:', error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [selectedYear]);

  const openDetails = (title: string, transactions: any[]) => {
    if (transactions.length === 0) return;
    setDetailsData({ title, transactions });
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h2>
          <p className="text-slate-500 mt-1">Visão consolidada anual (Realizado vs Pendências).</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear(y => y - 1)}
            className="shrink-0 bg-white/10 hover:bg-white/20 px-3 py-2 text-sm font-bold rounded transition-colors"
          >◀</button>
          <div className="shrink-0 bg-primary/20 text-primary border border-primary/30 px-5 py-2 font-bold text-sm rounded">
            {selectedYear}
          </div>
          <button
            onClick={() => setSelectedYear(y => y + 1)}
            className="shrink-0 bg-white/10 hover:bg-white/20 px-3 py-2 text-sm font-bold rounded transition-colors"
          >▶</button>
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-[#16161a] border border-white/5 shadow-2xl rounded-3xl overflow-x-auto pb-4">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-[10px] uppercase text-slate-400 bg-black/40">
            <tr>
              <th className="px-4 py-4 font-bold border-b border-white/10 w-[15%]">Indicador</th>
              {MONTHS.map(m => (
                <th key={m} className="px-2 py-4 font-bold border-b border-white/10 text-right w-[6.5%]">{m}</th>
              ))}
              <th className="px-4 py-4 font-bold border-b border-white/10 text-right text-white w-[7%]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            
            {/* Saldo Inicial */}
            <tr className="border-b border-white/5 hover:bg-white/5">
              <td className="px-4 py-3 font-semibold text-slate-300">Saldo Inicial</td>
              {flow.map((col, i) => (
                <td key={i} className="px-2 py-3 text-right text-indigo-300 font-medium">
                  {fmtBRL(col.saldoInicial)}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-indigo-300 font-bold bg-white/[0.02]">
                {fmtBRL(totalRow.saldoInicial || 0)}
              </td>
            </tr>

            {/* Receita */}
            <tr className="border-b border-white/5 hover:bg-white/5">
              <td className="px-4 py-3 font-semibold text-slate-300">Receitas (+)</td>
              {flow.map((col, i) => (
                <td 
                  key={i} 
                  className={cn("px-2 py-3 text-right font-medium cursor-pointer hover:underline decoration-emerald-500/50", col.receita > 0 ? "text-emerald-400" : "text-slate-600")}
                  onClick={() => openDetails(`Receitas - ${col.month}`, col.rawIncome)}
                >
                  {fmtBRL(col.receita)}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-emerald-400 font-bold bg-white/[0.02]">
                {fmtBRL(totalRow.receita || 0)}
              </td>
            </tr>

            {/* Despesas */}
            <tr className="border-b border-white/5 hover:bg-white/5">
              <td className="px-4 py-3 font-semibold text-slate-300">Despesas (-)</td>
              {flow.map((col, i) => (
                <td 
                  key={i} 
                  className={cn("px-2 py-3 text-right font-medium cursor-pointer hover:underline decoration-rose-500/50", col.despesa > 0 ? "text-rose-400" : "text-slate-600")}
                  onClick={() => openDetails(`Despesas - ${col.month}`, col.rawExpense)}
                >
                  {col.despesa > 0 ? '-' : ''}{fmtBRL(col.despesa)}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-rose-400 font-bold bg-white/[0.02]">
                {totalRow.despesa > 0 ? '-' : ''}{fmtBRL(totalRow.despesa || 0)}
              </td>
            </tr>

            {/* Divisão de Lucro */}
            <tr className="border-b border-white/5 hover:bg-white/5">
              <td className="px-4 py-3 font-semibold text-slate-300">Divisão de Lucro (-)</td>
              {flow.map((col, i) => (
                <td 
                  key={i} 
                  className={cn("px-2 py-3 text-right font-medium cursor-pointer hover:underline decoration-orange-500/50", col.divisaoLucro > 0 ? "text-orange-400" : "text-slate-600")}
                  onClick={() => openDetails(`Divisão de Lucro - ${col.month}`, col.rawLucro)}
                >
                  {col.divisaoLucro > 0 ? '-' : ''}{fmtBRL(col.divisaoLucro)}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-orange-400 font-bold bg-white/[0.02]">
                {totalRow.divisaoLucro > 0 ? '-' : ''}{fmtBRL(totalRow.divisaoLucro || 0)}
              </td>
            </tr>

            {/* Acumulado */}
            <tr className="border-b border-white/10 hover:bg-white/5 bg-black/20">
              <td className="px-4 py-4 font-bold text-white tracking-wide">Acumulado</td>
              {flow.map((col, i) => (
                <td 
                  key={i} 
                  className={cn("px-2 py-4 text-right font-bold", col.acumulado >= 0 ? "text-emerald-400" : "text-rose-400")}
                >
                  {fmtBRL(col.acumulado)}
                </td>
              ))}
              <td className={cn("px-4 py-4 text-right font-bold bg-white/[0.03]", totalRow.acumulado >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {fmtBRL(totalRow.acumulado || 0)}
              </td>
            </tr>
            
            {/* Lucratividade */}
            <tr className="hover:bg-white/5">
              <td className="px-4 py-3 font-semibold text-cyan-500">Lucratividade (%)</td>
              {flow.map((col, i) => (
                <td key={i} className={cn("px-2 py-3 text-right font-medium", col.lucratividade > 0 ? "text-cyan-400" : "text-slate-600")}>
                  {col.lucratividade ? col.lucratividade.toFixed(1) + '%' : '-'}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-cyan-400 font-bold bg-white/[0.02]">
                {totalRow.lucratividade ? totalRow.lucratividade.toFixed(1) + '%' : '-'}
              </td>
            </tr>

          </tbody>
        </table>
      </div>

      {/* BLOCO PENDENTES */}
      <h3 className="text-xl font-bold tracking-tight mt-8 mb-4">Visão de Pendências ({selectedYear})</h3>
      <div className="bg-[#16161a] border border-white/5 shadow-2xl rounded-3xl overflow-x-auto pb-4 mb-8">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-[10px] uppercase text-slate-400 bg-black/40">
            <tr>
              <th className="px-4 py-4 font-bold border-b border-white/10 w-[15%]">Indicador</th>
              {MONTHS.map(m => (
                <th key={m} className="px-2 py-4 font-bold border-b border-white/10 text-right w-[6.5%]">{m}</th>
              ))}
              <th className="px-4 py-4 font-bold border-b border-white/10 text-right text-white w-[7%]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            
            {/* Contas a Receber */}
            <tr className="border-b border-emerald-900/20">
              <td className="px-4 py-3 font-semibold text-emerald-400 bg-emerald-950/20">Contas a Receber</td>
              {flow.map((col, i) => (
                <td 
                  key={i} 
                  className={cn("px-2 py-3 text-right font-medium cursor-pointer border-r border-white/5 box-border", 
                    col.pendingRec > 0 ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40" : "text-slate-600"
                  )}
                  onClick={() => openDetails(`Contas a Receber - ${col.month}`, col.rawPendingRec)}
                >
                  {col.pendingRec > 0 ? fmtBRL(col.pendingRec) : '-'}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-emerald-400 font-bold bg-emerald-950/30">
                {fmtBRL(totalRow.pendingRec || 0)}
              </td>
            </tr>

            {/* Contas a Pagar */}
            <tr className="border-b border-rose-900/20">
              <td className="px-4 py-3 font-semibold text-rose-400 bg-rose-950/20">Contas a Pagar</td>
              {flow.map((col, i) => (
                <td 
                  key={i} 
                  className={cn("px-2 py-3 text-right font-medium cursor-pointer border-r border-white/5 box-border", 
                    col.pendingPay > 0 ? "bg-rose-500/30 text-rose-300 hover:bg-rose-500/50" : "text-slate-600"
                  )}
                  onClick={() => openDetails(`Contas a Pagar - ${col.month}`, col.rawPendingPay)}
                >
                  {col.pendingPay > 0 ? fmtBRL(col.pendingPay) : '-'}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-rose-400 font-bold bg-rose-950/30">
                {fmtBRL(totalRow.pendingPay || 0)}
              </td>
            </tr>

            {/* Necessidade de Caixa */}
            <tr>
              <td className="px-4 py-4 font-bold text-white tracking-wide bg-black/40">Necessidade de Caixa</td>
              {flow.map((col, i) => {
                const isPos = col.necessidadeCaixa > 0;
                const isZero = col.necessidadeCaixa === 0 && col.pendingRec === 0 && col.pendingPay === 0;
                return (
                  <td 
                    key={i} 
                    className={cn("px-2 py-4 text-right font-bold border-r border-white/5 box-border", 
                      isZero ? "text-slate-600 bg-black/20" : 
                      isPos ? "bg-indigo-500/20 text-indigo-300" : "bg-rose-600/30 text-rose-300"
                    )}
                  >
                    {!isZero ? fmtBRL(col.necessidadeCaixa) : '-'}
                  </td>
                );
              })}
              <td className={cn("px-4 py-4 text-right font-bold", 
                  totalRow.necessidadeCaixa >= 0 ? "bg-indigo-900/40 text-indigo-300" : "bg-rose-900/40 text-rose-300"
                )}>
                {fmtBRL(totalRow.necessidadeCaixa || 0)}
              </td>
            </tr>

          </tbody>
        </table>
      </div>

      {/* MODAL DETALHAMENTO */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl bg-[#16161a] border-white/10 text-white rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{detailsData.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[50vh] overflow-y-auto pr-2 rounded-xl border border-white/5 bg-black/20">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent text-slate-400">
                  <TableHead className="font-bold">DATA PAG.</TableHead>
                  <TableHead className="font-bold">CLASSIFICAÇÃO</TableHead>
                  <TableHead className="font-bold text-right">VALOR</TableHead>
                  <TableHead className="font-bold">DESCRIÇÃO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailsData.transactions.map((tr: any) => (
                  <TableRow key={tr.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-slate-300">{tr.date || '-'}</TableCell>
                    <TableCell>
                      <span className="bg-slate-800 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">{tr.costCenter || tr.classification || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {fmtBRL(parseBRL(tr.amount))}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{tr.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
