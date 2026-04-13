import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Search, Save, Trash2, PieChart, BarChart3, TrendingUp, TrendingDown, Landmark, ArrowUpCircle, ArrowDownCircle, ChevronDown, Plus, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

// ─── tipos ───────────────────────────────────────────────────────────────────
type Item = { id: number; value: string };
type Group = { id: number; title: string; items: Item[] };

let nextId = 1;
const mkId = () => nextId++;

const mkItem = (value: string): Item => ({ id: mkId(), value });
const mkGroup = (title: string, items: string[]): Group => ({
  id: mkId(),
  title,
  items: items.map(mkItem),
});

// ─── dados iniciais ───────────────────────────────────────────────────────────
const initialReceita: Group[] = [
  mkGroup('RECEITA COM SERVIÇOS', []),   // preenchido via API (contratos)
  mkGroup('RECEITA COM PRODUTOS', ['INVESTIMENTO']),
];

const initialDespesas: Group[] = [
  mkGroup('DESPESAS COM PRODUTOS', ["Casas d'água", 'Cassol', 'Leroy Merlin', 'Balaroti', 'Acessórios', 'Google Drive']),
  mkGroup('DESPESAS COM SERVIÇOS', ['Mão de obra', 'Frete']),
  mkGroup('DESPESAS NÃO OPERACIONAIS', ['Transporte', 'Alimentação', 'Hospedagem', 'Escritório', 'Combustível', 'Montana']),
  mkGroup('DESPESAS ADMINISTRATIVAS', ['Reembolso Luiza', 'Reembolso Tobias', 'INSS', 'Contabilidade', 'CREA', 'Banco', 'Simples', 'Prefeitura']),
  mkGroup('DESPESAS OPERACIONAIS', ['Aluguel', 'Água', 'Luz', 'Internet', 'Telefone', 'IPTU', 'Licença']),
  mkGroup('DESPESAS COM MARKETING', ['Instagram', 'Facebook', 'Google Ads', 'Gráfica/Designer']),
  mkGroup('IMPOSTOS', ['Nota fiscal', 'Taxa máquina', 'Tarifas bancárias']),
  mkGroup('INVESTIMENTOS', ['Criptomoedas', 'CDB', 'Fundo imobiliário', 'Ações']),
  mkGroup('DIVISÃO DE LUCRO', []),      // preenchido via API (contratos)
];

// ─── helper: atualiza grupos imutavelmente ────────────────────────────────────
function updateGroup(groups: Group[], gId: number, fn: (g: Group) => Group): Group[] {
  return groups.map(g => g.id === gId ? fn(g) : g);
}

// ─── sub-componente: um grupo ─────────────────────────────────────────────────
interface GroupCardProps {
  group: Group;
  color: 'green' | 'red';
  contractItems?: string[];  // contratos auto-injetados (somente exibição)
  onTitleChange: (val: string) => void;
  onItemChange: (iId: number, val: string) => void;
  onAddItem: () => void;
  onRemoveItem: (iId: number) => void;
}

function GroupBlock({ group, color, contractItems = [], onTitleChange, onItemChange, onAddItem, onRemoveItem }: GroupCardProps) {
  const itemBg      = color === 'green' ? 'bg-emerald-900/40 border border-emerald-700/30' : 'bg-rose-900/30 border border-rose-700/30';
  const contractBg  = color === 'green' ? 'bg-emerald-900/20 border border-emerald-700/20' : 'bg-rose-900/15 border border-rose-700/20';
  const addColor    = color === 'green' ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-rose-400 hover:bg-rose-900/30';
  const xColor      = color === 'green' ? 'text-emerald-400 hover:text-emerald-200' : 'text-rose-400 hover:text-rose-200';
  const contractTag = color === 'green' ? 'text-emerald-600' : 'text-rose-700';

  return (
    <div>
      {/* Título editável */}
      <input
        className="font-bold text-slate-300 mb-2 bg-transparent w-full outline-none text-xs uppercase tracking-wider border-b border-transparent hover:border-white/20 focus:border-white/40 transition-colors pb-1"
        value={group.title}
        onChange={e => onTitleChange(e.target.value)}
      />
      <div className="space-y-1">
        {/* Itens manuais (editáveis e removíveis) */}
        {group.items.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-1 p-2 rounded text-sm text-slate-200 ${itemBg}`}
          >
            <input
              className="bg-transparent flex-1 outline-none min-w-0"
              value={item.value}
              onChange={e => onItemChange(item.id, e.target.value)}
            />
            <button
              onClick={() => onRemoveItem(item.id)}
              className={`shrink-0 ${xColor} transition-colors`}
              title="Remover"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {/* Contratos auto-injetados (somente leitura) */}
        {contractItems.map(ct => (
          <div
            key={`ct-${ct}`}
            className={`flex items-center gap-1 p-2 rounded text-sm text-slate-300 ${contractBg}`}
            title="Contrato vinculado automaticamente"
          >
            <span className="flex-1">{ct}</span>
            <span className={`text-[9px] uppercase font-bold tracking-wider ${contractTag} opacity-70`}>auto</span>
          </div>
        ))}

        {/* Botão adicionar item manual */}
        <button
          onClick={onAddItem}
          className={`w-full flex items-center gap-1 p-2 rounded text-xs italic transition-colors ${addColor}`}
        >
          <Plus size={13} />
          Adicionar item
        </button>
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function CostCenter() {
  const [receitaGroups, setReceitaGroups] = React.useState<Group[]>(initialReceita);
  const [despesaGroups, setDespesaGroups] = React.useState<Group[]>(initialDespesas);
  const [contractNumbers, setContractNumbers] = React.useState<string[]>([]);

  // Carrega contratos e injeta nos grupos dependentes
  const loadData = async () => {
    try {
      const clients = await apiFetch('/api/clients');
      const nums = clients.map((c: any) => c.contrato).filter(Boolean);
      setContractNumbers(nums);
      
      // Atualiza Receita com Serviços (index 0) e Divisão de Lucro
      setReceitaGroups(prev =>
        prev.map((g, i) =>
          i === 0 ? { ...g, items: nums.map(mkItem) } : g
        )
      );
      setDespesaGroups(prev =>
        prev.map(g =>
          g.title === 'DIVISÃO DE LUCRO' ? { ...g, items: nums.map(mkItem) } : g
        )
      );
    } catch (error) {
      console.error('Error loading cost center data:', error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Determina quais grupos devem receber os contratos automaticamente (além dos itens manuais)
  const groupsWithContracts = [
    'RECEITA COM SERVIÇOS',
    'DESPESAS COM SERVIÇOS',
    'DIVISÃO DE LUCRO',
  ];

  // ── helpers de mutação ──────────────────────────────────────────────────────
  const mutateReceita = (gId: number, fn: (g: Group) => Group) =>
    setReceitaGroups(gs => updateGroup(gs, gId, fn));

  const mutateDespesa = (gId: number, fn: (g: Group) => Group) =>
    setDespesaGroups(gs => updateGroup(gs, gId, fn));

  const makeHandlers = (gId: number, mutate: typeof mutateReceita) => ({
    onTitleChange: (val: string) =>
      mutate(gId, g => ({ ...g, title: val })),
    onItemChange: (iId: number, val: string) =>
      mutate(gId, g => ({ ...g, items: g.items.map(i => i.id === iId ? { ...i, value: val } : i) })),
    onAddItem: () =>
      mutate(gId, g => ({ ...g, items: [...g.items, mkItem('')] })),
    onRemoveItem: (iId: number) =>
      mutate(gId, g => ({ ...g, items: g.items.filter(i => i.id !== iId) })),
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Centro de Custo</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ── RECEITA ── */}
        <Card className="bg-[#16161a] border-white/5 shadow-2xl rounded-[2rem] p-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-xl font-bold bg-emerald-700 p-3 rounded-xl text-white flex-1 mr-2">
              RECEITA
            </CardTitle>
            <button
              className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white transition-colors shrink-0"
              title="Adicionar grupo de receita"
              onClick={() =>
                setReceitaGroups(gs => [...gs, mkGroup('NOVO GRUPO', [])])
              }
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {receitaGroups.map(g => (
              <GroupBlock
                key={g.id}
                group={g}
                color="green"
                contractItems={
                  groupsWithContracts.includes(g.title)
                    ? contractNumbers.filter(ct => !g.items.some(i => i.value === ct))
                    : []
                }
                {...makeHandlers(g.id, mutateReceita)}
              />
            ))}
          </div>
        </Card>

        {/* ── DESPESAS ── */}
        <Card className="bg-[#16161a] border-white/5 shadow-2xl rounded-[2rem] p-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-xl font-bold bg-rose-800 p-3 rounded-xl text-white flex-1 mr-2">
              DESPESAS
            </CardTitle>
            <button
              className="w-10 h-10 rounded-xl bg-rose-700 hover:bg-rose-600 flex items-center justify-center text-white transition-colors shrink-0"
              title="Adicionar grupo de despesa"
              onClick={() =>
                setDespesaGroups(gs => [...gs, mkGroup('NOVO GRUPO', [])])
              }
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            {despesaGroups.map(g => (
              <GroupBlock
                key={g.id}
                group={g}
                color="red"
                contractItems={
                  groupsWithContracts.includes(g.title)
                    ? contractNumbers.filter(ct => !g.items.some(i => i.value === ct))
                    : []
                }
                {...makeHandlers(g.id, mutateDespesa)}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
