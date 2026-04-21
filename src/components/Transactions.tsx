import React from 'react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { Plus, X, ChevronDown, Save } from 'lucide-react';
import { toast } from 'sonner';

// ─── Grupos do CostCenter com seus itens padrão ──────────────────────────────
const CLASSIFICACOES = [
  { label: 'RECEITA COM SERVIÇOS',       type: 'income',  color: '#16a34a',
    items: [] as string[] /* preenchido via contratos */ },
  { label: 'RECEITA COM PRODUTOS',       type: 'income',  color: '#15803d',
    items: ['INVESTIMENTO'] },
  { label: 'DESPESAS COM PRODUTOS',      type: 'expense', color: '#dc2626',
    items: ["Casas d'água", 'Cassol', 'Leroy Merlin', 'Balaroti', 'Acessórios', 'Google Drive'] },
  { label: 'DESPESAS COM SERVIÇOS',      type: 'expense', color: '#b91c1c',
    items: ['Mão de obra', 'Frete'] },
  { label: 'DESPESAS NÃO OPERACIONAIS',  type: 'expense', color: '#991b1b',
    items: ['Transporte', 'Alimentação', 'Hospedagem', 'Escritório', 'Combustível', 'Montana'] },
  { label: 'DESPESAS ADMINISTRATIVAS',   type: 'expense', color: '#7f1d1d',
    items: ['Reembolso Luiza', 'Reembolso Tobias', 'INSS', 'Contabilidade', 'CREA', 'Banco', 'Simples', 'Prefeitura'] },
  { label: 'DESPESAS OPERACIONAIS',      type: 'expense', color: '#b91c1c',
    items: ['Aluguel', 'Água', 'Luz', 'Internet', 'Telefone', 'IPTU', 'Licença'] },
  { label: 'DESPESAS COM MARKETING',     type: 'expense', color: '#dc2626',
    items: ['Instagram', 'Facebook', 'Google Ads', 'Gráfica/Designer'] },
  { label: 'IMPOSTOS',                   type: 'expense', color: '#9a3412',
    items: ['Nota fiscal', 'Taxa máquina', 'Tarifas bancárias'] },
  { label: 'INVESTIMENTOS',              type: 'expense', color: '#1d4ed8',
    items: ['Criptomoedas', 'CDB', 'Fundo imobiliário', 'Ações'] },
  { label: 'DIVISÃO DE LUCRO',           type: 'expense', color: '#7c3aed',
    items: [] as string[] /* preenchido via contratos */ },
];

const FORMAS_PAGAMENTO = ['PIX', 'DÉB. AUT.', 'BOLETO', 'CARTÃO', 'DINHEIRO', 'TED/DOC', 'CHEQUE'];

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Row {
  id: string;
  date: string;
  classification: string;
  type: 'income' | 'expense';
  costCenter: string;
  description: string;
  amount: string;         // string formatada
  installment: string;
  paymentDate: string;
  paymentMethod: string;
  saved: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
let rowSeq = 0;
const newId = () => `row-${++rowSeq}-${Date.now()}`;

const today = () => new Date().toISOString().slice(0, 10);

const emptyRow = (sYear: number, sMonth: number): Row => {
  const now = new Date();
  let dt = now;
  // Se estiver criando linha numa aba retroativa/futura, trava a data pro inicio desse mês alvo
  if (now.getFullYear() !== sYear || now.getMonth() !== sMonth) {
     dt = new Date(sYear, sMonth, 1, 12, 0, 0);
  }
  return {
    id: newId(),
    date: dt.toISOString().slice(0, 10),
    classification: 'Selecionar...', // Evita campo em branco visualmente perigoso
    type: 'expense',
    costCenter: '',
    description: '',
    amount: '',
    installment: '1/1',
    paymentDate: '',  // vazio — usuário preenche quando o pagamento ocorrer
    paymentMethod: 'PIX',
    saved: false,
  };
};

const parseBRL = (s: any) => {
  if (typeof s === 'number') return s;
  if (!s || typeof s !== 'string') return 0;
  const cleaned = s.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const fmtBRL = (n: any) => {
  const val = typeof n === 'number' ? n : 0;
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const maskBRL = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return (parseFloat(digits) / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
};

// ─── componente ───────────────────────────────────────────────────────────────
export default function Transactions() {
  const MONTHS = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
                  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

  const [selectedYear,  setSelectedYear]  = React.useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());

  // saldo inicial — editável somente em Janeiro (mês 0)
  // Not used anymore: const [saldoInicial, setSaldoInicial] = React.useState(0);

  // Parcelamento Automático
  const [installModalOpen, setInstallModalOpen] = React.useState(false);
  const [installRow, setInstallRow] = React.useState<Row | null>(null);
  const [installTotal, setInstallTotal] = React.useState(0);
  const [installDates, setInstallDates] = React.useState<string[]>([]);

  // linhas do mês selecionado
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openingBalance, setOpeningBalance] = React.useState(0);

  const loadOpeningBalance = async () => {
    try {
      const data = await apiFetch(`/api/opening-balance?year=${selectedYear}&month=${selectedMonth}`);
      setOpeningBalance(data.amount || 0);
    } catch (e) {
      console.error('Error loading opening balance:', e);
    }
  };

  const saveInitialBalance = async (val: number) => {
    try {
      await apiFetch('/api/initial-balance', {
        method: 'POST',
        body: JSON.stringify({ year: selectedYear, month: 0, amount: val })
      });
      toast.success('Saldo inicial de Janeiro atualizado!');
      loadOpeningBalance();
    } catch (e) {
      toast.error('Erro ao salvar saldo inicial');
    }
  };


  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/transactions?year=${selectedYear}&month=${selectedMonth}`);
      const formatted = (Array.isArray(data) ? data : []).map(r => ({
        ...r,
        amount: fmtBRL(r.amount)
      }));
      setRows(formatted);
    } catch (error) {
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  };

  // contratos (para Receita com Serviços e Divisão de Lucro)
  const [contratos, setContratos] = React.useState<string[]>([]);
  const fetchClients = async () => {
    try {
      const cs = await apiFetch('/api/clients');
      setContratos(cs.map((c: any) => c.contrato).filter(Boolean));
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  React.useEffect(() => {
    fetchClients();
  }, []);

  // Retorna os itens do centro de custo: itens fixos do grupo + contratos (híbrido)
  const getCostCenterItems = (classification: string): string[] => {
    const cls = CLASSIFICACOES.find(c => c.label === classification);
    if (!cls) return contratos; // sem classificação: mostra só contratos
    // Mescla itens fixos + números de contratos, sem duplicatas
    const combined = [...cls.items, ...contratos.filter(ct => !cls.items.includes(ct))];
    return combined;
  };

  // Carrega transações ao mudar de mês/ano
  React.useEffect(() => {
    loadTransactions();
    loadOpeningBalance();
  }, [selectedYear, selectedMonth]);


  // saldo inicial — Janeiro: manual | outros meses: acumulado do mês anterior
  const [saldoAnterior, setSaldoAnterior] = React.useState(0);

  const { totalReceita, totalDespesa, totalAReceber, totalAPagar } = React.useMemo(() => {
    let tRec = 0;
    let tDesp = 0;
    let pRec = 0;
    let pDesp = 0;

    rows.forEach(r => {
      const val = parseBRL(r.amount);
      const pDate = r.paymentDate?.trim();

      if (pDate) {
        if (r.type === 'income') tRec += val;
        else tDesp += val;
      } else {
        if (r.type === 'income') pRec += val;
        else pDesp += val;
      }
    });
    return { totalReceita: tRec, totalDespesa: tDesp, totalAReceber: pRec, totalAPagar: pDesp };
  }, [rows]);

  const resultado = totalReceita - totalDespesa;
  
  // Saldo inicial efetivo do mês exibido
  const effectiveSaldo = openingBalance;
  
  const acumuladoFinal = effectiveSaldo + resultado;


  // ── parcelas (gerador automático) ────────────────────────────────────────────
  const handleInstallmentBlur = (row: Row, value: string) => {
    updateRow(row.id, { installment: value });
    const match = value.match(/^1\/(\d+)$/);
    if (match) {
      const n = parseInt(match[1]);
      if (n > 1) {
        setInstallRow(row);
        setInstallTotal(n);
        
        const dates: string[] = [];
        // Usamos uma lógica mais segura para não pular meses (ex: de 31/jan para março)
        const parts = (row.date || today()).split('-');
        let y = parseInt(parts[0]);
        let m = parseInt(parts[1]) - 1; // 0-based
        let d = parseInt(parts[2]);

        for (let i = 2; i <= n; i++) {
          let nextM = m + (i - 1);
          let nextY = y + Math.floor(nextM / 12);
          nextM = nextM % 12;
          
          // Ajusta o dia se o mês seguinte for mais curto
          const lastDayOfNextMonth = new Date(nextY, nextM + 1, 0).getDate();
          const targetD = Math.min(d, lastDayOfNextMonth);
          
          const dt = new Date(nextY, nextM, targetD, 12, 0, 0);
          dates.push(dt.toISOString().split('T')[0]);
        }
        setInstallDates(dates);
        setInstallModalOpen(true);
      }
    }
  };

  const generateInstallments = async () => {
    if (!installRow) return;
    
    // 1. Salvar a primeira parcela no banco imediatamente para garantir que ela exista com o novo status X/N
    try {
      await saveRow(installRow.id);
    } catch (e) {
      console.error('Erro ao salvar parcela 1/N inicial', e);
    }

    const installments = [];
    for (let i = 2; i <= installTotal; i++) {
      const pDate = installDates[i - 2];
      const nr = { 
        ...installRow,
        id: undefined, // Deixa o banco gerar novo ID
        installment: `${i}/${installTotal}`,
        date: pDate,
        paymentDate: '',
        saved: true
      };
      installments.push(nr);
    }
    
    try {
      await Promise.all(installments.map(nr => 
        apiFetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({ 
            ...nr, 
            amount: parseBRL(nr.amount),
            cost_center_name: nr.costCenter,
            payment_date: nr.paymentDate || null
          })
        })
      ));
      
      toast.success(`${installTotal - 1} parcelas futuras agendadas com sucesso!`);
      loadTransactions();
    } catch {
      toast.error('Erro ao agendar parcelas futuras');
    }
    
    setInstallModalOpen(false);
    setInstallRow(null);
  };

  // ── mutations ────────────────────────────────────────────────────────────────
  const acumuladoFinalView = effectiveSaldo + resultado;

  // ── Acumulado Visual Linha-a-Linha ───────────────────────────────────────────
  let accumulated = effectiveSaldo;
  const processed = [...rows]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(r => {
      const pDate = r.paymentDate?.trim();
      const val = parseBRL(r.amount);
      if (pDate) {
        // No regime de caixa, só afeta o acumulado se FOI PAGO
        if (r.type === 'income') accumulated += val;
        else accumulated -= val;
      }
      return { ...r, accumulated };
    });

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => {
      if (r.id !== id) return r;
      // Se alterou a data, desmarca como 'salvo' para exigir confirmação antes de migrar
      const newSaved = (patch.date !== undefined || patch.paymentDate !== undefined) ? false : (patch.saved ?? r.saved);
      return { ...r, ...patch, saved: newSaved };
    }));

  const addRowAfter = (afterId?: string) => {
    const nr = emptyRow(selectedYear, selectedMonth);
    setRows(rs => {
      if (!afterId) return [...rs, nr];
      const idx = rs.findIndex(r => r.id === afterId);
      const copy = [...rs];
      copy.splice(idx + 1, 0, nr);
      return copy;
    });
  };

  const saveRow = async (id: string | number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    try {
      const resp = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...row,
          amount: parseBRL(row.amount),
          cost_center_name: row.costCenter,
          payment_date: row.paymentDate || null
        })
      });
      
      if (resp?.error) throw new Error(resp.error);

      toast.success('Lançamento salvo!');
      loadTransactions();
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message || 'Falha na conexão'}`);
    }
  };

  const removeRow = async (id: string | number) => {
    if (typeof id === 'string' && id.startsWith('row-')) {
      setRows(rs => rs.filter(r => r.id !== id));
      return;
    }

    try {
      await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      toast.success('Lançamento excluído!');
      loadTransactions();
    } catch (error) {
      toast.error('Erro ao excluir lançamento');
    }
  };


  // ── render helpers ────────────────────────────────────────────────────────────
  const cellCls = 'px-2 py-1 text-xs bg-transparent border border-white/10 rounded focus:outline-none focus:border-primary/60 text-white w-full';

  const ClassSelect = ({ id, value, onChange }: { id: string; value: string; onChange: (v: string, type: 'income'|'expense') => void }) => {
    const cls = CLASSIFICACOES.find(c => c.label === value);
    return (
      <div className="relative min-w-[160px]">
        <select
          value={value}
          onChange={e => {
            const c = CLASSIFICACOES.find(x => x.label === e.target.value);
            onChange(e.target.value, c?.type ?? 'expense');
          }}
          className="w-full text-xs font-bold text-black rounded px-2 py-1 appearance-none cursor-pointer border-0 focus:outline-none"
          style={{ backgroundColor: cls?.color ?? '#374151', color: cls ? '#fff' : '#9ca3af' }}
        >
          <option value="">Selecionar...</option>
          {CLASSIFICACOES.map(c => (
            <option key={c.label} value={c.label} style={{ background: c.color, color: '#fff' }}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="text-white min-h-screen" style={{ background: '#0a0a0c' }}>

      {/* ── Seletor Ano / Mês ── */}
      <div className="flex items-center gap-1 mb-0 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedYear(y => y - 1)}
          className="shrink-0 bg-white/10 hover:bg-white/20 px-3 py-2 text-sm font-bold rounded transition-colors"
        >◀</button>
        <div className="shrink-0 bg-slate-800 px-5 py-2 font-bold text-sm rounded">
          {selectedYear}
        </div>
        <button
          onClick={() => setSelectedYear(y => y + 1)}
          className="shrink-0 bg-white/10 hover:bg-white/20 px-3 py-2 text-sm font-bold rounded transition-colors"
        >▶</button>

        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(i)}
            className={cn(
              'shrink-0 px-4 py-2 font-bold text-xs rounded transition-colors',
              selectedMonth === i
                ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/30'
                : 'bg-[#16161a] text-slate-300 hover:bg-white/10'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mt-4">
        {/* ── Tabela principal ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-2xl border border-white/5 bg-[#111114]">
          {/* Header */}
          <div className="grid grid-cols-[140px_240px_180px_minmax(150px,1fr)_110px_80px_140px_140px_120px_50px] bg-black/60 border-b border-white/10 text-[10px] font-bold uppercase text-slate-400">
            {['Data Lançamento','Classificação','Centro de Custo','Descrição','Valor','Parcelas','Data Pagamento','Forma Pagamento','Acumulado',''].map(h => (
              <div key={h} className="px-2 py-3">{h}</div>
            ))}
          </div>

          {/* Saldo Inicial is now managed automatically via Acumulado */}

          {/* Botões de Ação Rápida no Topo */}
          <div className="flex gap-3 px-4 py-3 border-b border-white/5 bg-[#0d0d10]/50">
            <button
              onClick={() => {
                const nr = emptyRow(selectedYear, selectedMonth);
                nr.type = 'income';
                setRows([nr, ...rows]);
              }}
              className="flex items-center gap-2 bg-emerald-950/40 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-900/50 transition-all border border-emerald-900/50"
            >
              <Plus size={14} /> Nova Receita
            </button>
            <button
              onClick={() => {
                const nr = emptyRow(selectedYear, selectedMonth);
                nr.type = 'expense';
                setRows([nr, ...rows]);
              }}
              className="flex items-center gap-2 bg-rose-950/40 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-900/50 transition-all border border-rose-900/50"
            >
              <Plus size={14} /> Nova Despesa
            </button>
          </div>

          {/* Linhas + botão + abaixo de cada uma */}
          {processed.map((row, idx) => {
            const isIncome = row.type === 'income';
            const cls = CLASSIFICACOES.find(c => c.label === row.classification);
            return (
              <React.Fragment key={row.id}>
                {/* Linha do lançamento */}
                <div
                  className={cn(
                    'grid grid-cols-[140px_240px_180px_minmax(150px,1fr)_110px_80px_140px_140px_120px_50px] border-b border-white/5 transition-colors',
                    isIncome ? 'bg-emerald-950/20 hover:bg-emerald-950/40' : 'bg-rose-950/20 hover:bg-rose-950/40'
                  )}
                >
                  {/* Data Lanç. */}
                  <div className="px-2 py-1.5">
                    <input type="date" className={cellCls} value={row.date}
                      onChange={e => updateRow(row.id, { date: e.target.value })} />
                  </div>

                  {/* Classificação */}
                  <div className="px-2 py-1.5">
                    <ClassSelect
                      id={row.id}
                      value={row.classification}
                      onChange={(v, t) => updateRow(row.id, { classification: v, type: t, costCenter: '' })}
                    />
                  </div>

                  {/* Centro de Custo — itens do grupo selecionado */}
                  <div className="px-2 py-1.5">
                    <select className={cellCls} value={row.costCenter}
                      onChange={e => updateRow(row.id, { costCenter: e.target.value })}>
                      <option value="" style={{ color: '#000' }}>—</option>
                      {getCostCenterItems(row.classification).map(c => (
                        <option key={c} value={c} style={{ color: '#000' }}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Descrição */}
                  <div className="px-2 py-1.5">
                    <input className={cellCls} placeholder="Descrição..." value={row.description}
                      onChange={e => updateRow(row.id, { description: e.target.value })} />
                  </div>

                  {/* Valor */}
                  <div className="px-2 py-1.5">
                    <input
                      className={cn(cellCls, isIncome ? 'text-emerald-300' : 'text-rose-300')}
                      placeholder="R$ 0,00"
                      value={row.amount}
                      onChange={e => updateRow(row.id, { amount: maskBRL(e.target.value) })}
                    />
                  </div>

                  {/* Parcelamento */}
                  <div className="px-2 py-1.5">
                    <input className={cellCls} placeholder="1/1" value={row.installment}
                      onChange={e => updateRow(row.id, { installment: e.target.value })} 
                      onBlur={e => handleInstallmentBlur(row, e.target.value)} />
                  </div>

                  {/* Data Pagamento — vazia até o pagamento ser confirmado */}
                  <div className="px-2 py-1.5">
                    <input
                      type="date"
                      className={cn(cellCls, !row.paymentDate && 'border-dashed border-white/20 text-slate-500')}
                      value={row.paymentDate}
                      onChange={e => updateRow(row.id, { paymentDate: e.target.value })}
                      title={!row.paymentDate ? 'Preencha quando o pagamento for realizado' : ''}
                    />
                  </div>

                  {/* Forma Pagamento */}
                  <div className="px-2 py-1.5">
                    <select className={cellCls} value={row.paymentMethod}
                      onChange={e => updateRow(row.id, { paymentMethod: e.target.value })}>
                      {FORMAS_PAGAMENTO.map(f => <option key={f} style={{ color: '#000' }}>{f}</option>)}
                    </select>
                  </div>

                  {/* Acumulado */}
                  <div className={cn('px-2 py-1.5 flex items-center text-xs font-bold',
                    row.accumulated >= 0 ? 'text-emerald-300' : 'text-rose-400')}>
                    {fmtBRL(row.accumulated)}
                  </div>

                  {/* Ações */}
                  <div className="px-2 py-1.5 flex items-center gap-1">
                    {!row.saved && (
                      <button onClick={() => saveRow(row.id)}
                        className="p-1 rounded hover:bg-emerald-600/30 text-emerald-400 transition-colors" title="Salvar">
                        <Save size={13} />
                      </button>
                    )}
                    <button onClick={() => removeRow(row.id)}
                      className="p-1 rounded hover:bg-rose-600/30 text-rose-400 transition-colors" title="Excluir">
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Botão + abaixo de cada linha */}
                <div className="flex gap-2 px-2 py-0.5 border-b border-white/5 bg-[#0d0d10]">
                  <button
                    onClick={() => {
                      const nr = emptyRow(selectedYear, selectedMonth);
                      nr.type = 'income';
                      const idx2 = rows.findIndex(r2 => r2.id === row.id);
                      const copy = [...rows];
                      copy.splice(idx2 + 1, 0, nr);
                      setRows(copy);
                    }}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    <Plus size={10} /> Receita
                  </button>
                  <button
                    onClick={() => {
                      const nr = emptyRow(selectedYear, selectedMonth);
                      nr.type = 'expense';
                      setRows(rs => {
                        const idx2 = rs.findIndex(r2 => r2.id === row.id);
                        const copy = [...rs];
                        copy.splice(idx2 + 1, 0, nr);
                        return copy;
                      });
                    }}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Plus size={10} /> Despesa
                  </button>
                </div>
              </React.Fragment>
            );
          })}

        </div>

        {/* ── Painel de Resumo ── */}
        <div className="w-56 shrink-0 rounded-2xl border border-white/5 bg-[#111114] p-5 space-y-4 self-start">
          {/* Resultado */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-slate-400">Resultado</span>
            <span className={cn('font-bold text-sm', resultado >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {fmtBRL(resultado)}
            </span>
          </div>

          {/* Caixa efetivado — somente lançamentos COM data de pagamento */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <p className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">Caixa (pagos)</p>
            {selectedMonth === 0 ? (
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-slate-500">Saldo Inicial</span>
                <input
                  className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-1 text-xs font-bold text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={fmtBRL(openingBalance)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    const val = digits ? parseFloat(digits) / 100 : 0;
                    setOpeningBalance(val);
                  }}
                  onBlur={() => saveInitialBalance(openingBalance)}
                />
              </div>
            ) : (
              <SummaryRow label="Saldo Inicial"  value={fmtBRL(effectiveSaldo)}  color="text-indigo-300" />
            )}
            <SummaryRow label="Total Receita"  value={fmtBRL(totalReceita)}    color="text-emerald-400" />
            <SummaryRow label="Total Despesa"  value={fmtBRL(totalDespesa)}    color="text-rose-400" />
          </div>


          {/* Pendentes — lançamentos SEM data de pagamento */}
          {(totalAReceber > 0 || totalAPagar > 0) && (
            <div className="border-t border-dashed border-white/10 pt-3 space-y-2">
              <p className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">Pendentes</p>
              {totalAReceber > 0 && (
                <SummaryRow label="A Receber" value={fmtBRL(totalAReceber)} color="text-emerald-600" />
              )}
              {totalAPagar > 0 && (
                <SummaryRow label="A Pagar"   value={fmtBRL(totalAPagar)}   color="text-rose-600" />
              )}
            </div>
          )}

          {/* Acumulado final (somente pagos + saldo inicial) */}
          <div className="border-t border-white/10 pt-3">
            <SummaryRow
              label="Acumulado"
              value={fmtBRL(acumuladoFinal)}
              color={acumuladoFinal >= 0 ? 'text-emerald-300' : 'text-rose-400'}
              bold
            />
          </div>
        </div>
      </div>

      {/* Modal Mágico de Parcelamento */}
      {installModalOpen && installRow && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#16161a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Agendar Parcelas</h2>
              <p className="text-xs text-slate-400">Gerar lançamentos para as parcelas futuras de <strong className="text-white">{installRow.description || 'vazio'}</strong>?</p>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {Array.from({ length: installTotal - 1 }).map((_, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Parcela {idx + 2}/{installTotal} (Data Prevista)
                  </label>
                  <input
                    type="date"
                    className="w-full bg-black/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={installDates[idx]}
                    onChange={e => {
                      const cp = [...installDates];
                      cp[idx] = e.target.value;
                      setInstallDates(cp);
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setInstallModalOpen(false); setInstallRow(null); }}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={generateInstallments}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, color = 'text-white', bold = false }: {
  label: string; value: string; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className={cn('text-[10px] uppercase text-slate-500', bold && 'font-bold text-slate-300 text-xs')}>
        {label}
      </span>
      <span className={cn('text-xs tabular-nums', color, bold && 'font-bold text-sm')}>{value}</span>
    </div>
  );
}
