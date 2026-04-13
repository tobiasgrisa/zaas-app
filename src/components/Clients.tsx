import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

const emptyForm = {
  id: undefined as number | undefined,
  contrato: '', valor: '', nome: '', cpfCnpj: '', endereco: '', cep: '', bairro: '', cidade: '', uf: ''
};

// Converte string formatada ou número para float puro
function parseValor(v: string | number): number {
  if (typeof v === 'number') return v;
  // Remove "R$", pontos de milhar e troca vírgula por ponto
  const cleaned = String(v).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Formata número para exibição em BRL
function formatBRL(v: string | number): string {
  return parseValor(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Clients() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [formData, setFormData] = React.useState({ ...emptyForm });
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const fetchClients = async () => {
    try {
      const data = await apiFetch('/api/clients');
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  React.useEffect(() => { fetchClients(); }, []);

  const openNew = () => {
    setFormData({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (client: any) => {
    setFormData({
      id: client.id,
      contrato: client.contrato || '',
      // Exibe o valor formatado no campo para o usuário ver
      valor: formatBRL(client.valor),
      nome: client.nome || '',
      cpfCnpj: client.cpfCnpj || '',
      endereco: client.endereco || '',
      cep: client.cep || '',
      bairro: client.bairro || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.cpfCnpj) {
      toast.error('Nome e CPF/CNPJ são obrigatórios');
      return;
    }

    // Envia o valor como número puro para o servidor
    const payload = {
      ...formData,
      valor: parseValor(formData.valor),
    };

    try {
      const isUpdate = !!formData.id;
      await apiFetch(isUpdate ? `/api/clients/${formData.id}` : '/api/clients', {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(isUpdate ? 'Cliente atualizado com sucesso!' : 'Cliente salvo com sucesso!');
      setDialogOpen(false);
      setFormData({ ...emptyForm });
      fetchClients();
    } catch (e) {
      toast.error('Erro ao salvar cliente.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;
    try {
      await apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
      toast.success('Contrato excluído!');
      fetchClients();
    } catch (e) {
      toast.error('Erro ao excluir cliente.');
    }
  };

  // Formata o campo valor enquanto o usuário digita (máscara BRL)
  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setFormData(f => ({ ...f, valor: '' }));
      return;
    }
    const float = parseFloat(digits) / 100;
    setFormData(f => ({
      ...f,
      valor: float.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    }));
  };

  const formatCpfCnpj = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const isEditing = !!formData.id;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
        <Button
          className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 gap-2"
          onClick={openNew}
        >
          <Plus size={18} />
          Cadastrar Cliente
        </Button>
      </div>

      {/* Dialog cadastro / edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl bg-[#16161a] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Cliente' : 'Cadastrar Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Contrato"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.contrato}
              onChange={e => setFormData(f => ({ ...f, contrato: e.target.value }))}
            />
            <Input
              placeholder="Valor (R$)"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.valor}
              onChange={e => handleValorChange(e.target.value)}
            />
            <Input
              placeholder="Nome"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.nome}
              onChange={e => setFormData(f => ({ ...f, nome: e.target.value }))}
            />
            <Input
              placeholder="CPF/CNPJ"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.cpfCnpj}
              onChange={e => setFormData(f => ({ ...f, cpfCnpj: formatCpfCnpj(e.target.value) }))}
            />
            <Input
              placeholder="Endereço"
              className="col-span-2 bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.endereco}
              onChange={e => setFormData(f => ({ ...f, endereco: e.target.value }))}
            />
            <Input
              placeholder="CEP"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.cep}
              onChange={e => setFormData(f => ({ ...f, cep: e.target.value }))}
            />
            <Input
              placeholder="Bairro"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.bairro}
              onChange={e => setFormData(f => ({ ...f, bairro: e.target.value }))}
            />
            <Input
              placeholder="Cidade"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.cidade}
              onChange={e => setFormData(f => ({ ...f, cidade: e.target.value }))}
            />
            <Input
              placeholder="UF"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
              value={formData.uf}
              onChange={e => setFormData(f => ({ ...f, uf: e.target.value }))}
            />
          </div>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white h-12 rounded-xl"
          >
            {isEditing ? 'Salvar Alterações' : 'Salvar Cliente'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Tabela */}
      <Card className="bg-[#16161a] border-white/5 shadow-2xl rounded-[2rem]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-slate-400">CONTRATO</TableHead>
                <TableHead className="text-slate-400">VALOR</TableHead>
                <TableHead className="text-slate-400">CLIENTE</TableHead>
                <TableHead className="text-slate-400">CPF/CNPJ</TableHead>
                <TableHead className="text-slate-400">ENDEREÇO</TableHead>
                <TableHead className="text-slate-400">CEP</TableHead>
                <TableHead className="text-slate-400">BAIRRO</TableHead>
                <TableHead className="text-slate-400">CIDADE</TableHead>
                <TableHead className="text-slate-400">UF</TableHead>
                <TableHead className="text-slate-400">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(client => (
                <TableRow key={client.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-white">{client.contrato}</TableCell>
                  <TableCell className="text-white">{formatBRL(client.valor)}</TableCell>
                  <TableCell className="text-white">{client.nome}</TableCell>
                  <TableCell className="text-white">{client.cpfCnpj}</TableCell>
                  <TableCell className="text-white">{client.endereco}</TableCell>
                  <TableCell className="text-white">{client.cep}</TableCell>
                  <TableCell className="text-white">{client.bairro}</TableCell>
                  <TableCell className="text-white">{client.cidade}</TableCell>
                  <TableCell className="text-white">{client.uf}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(client)}
                      >
                        <Pencil size={16} className="text-slate-400 hover:text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 size={16} className="text-red-500 hover:text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
