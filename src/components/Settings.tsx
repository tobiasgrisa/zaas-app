import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Building2, FileText, Upload, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function validateCNPJ(cnpj: string) {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14) return false;
  
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

export function formatCNPJ(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
}

export default function Settings() {
  const [company, setCompany] = React.useState({
    name: 'EngERP',
    cnpj: '',
    logo: ''
  });

  const [isValid, setIsValid] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('erp-company-data');
    if (saved) {
      const data = JSON.parse(saved);
      setCompany(data);
      if (data.cnpj) setIsValid(validateCNPJ(data.cnpj));
    }
  }, []);

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatCNPJ(e.target.value);
    setCompany({ ...company, cnpj: val });
    if (val.length === 18) {
      setIsValid(validateCNPJ(val));
    } else {
      setIsValid(null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany({ ...company, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = () => {
    if (company.cnpj && !validateCNPJ(company.cnpj)) {
      toast.error('CNPJ inválido. Por favor, corrija antes de salvar.');
      return;
    }
    localStorage.setItem('erp-company-data', JSON.stringify(company));
    window.dispatchEvent(new Event('company-data-updated'));
    toast.success('Configurações da empresa salvas com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
             <Building2 size={24} className="text-primary" />
          </div>
          Configurações da Empresa
        </h2>
        <p className="text-slate-500 mt-2 font-medium">Personalize a identidade do seu sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Identidade Visual */}
        <Card className="bg-[#111114] border-white/5 rounded-[2rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center">
          <div className="relative group mb-6">
            <div className={cn(
              "w-40 h-40 rounded-[2.5rem] bg-[#16161a] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary/50",
              company.logo && "border-solid border-primary/30"
            )}>
              {company.logo ? (
                <img src={company.logo} alt="Logo Preview" className="w-full h-full object-contain p-4" />
              ) : (
                <Upload className="text-slate-600 transition-transform group-hover:scale-110" size={40} />
              )}
            </div>
            <label className="absolute bottom-2 right-2 p-3 bg-primary rounded-2xl cursor-pointer shadow-xl hover:bg-primary/90 transition-all active:scale-90">
              <Upload size={18} className="text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>
          </div>
          <h3 className="text-xl font-bold text-white">{company.name || 'Sua Empresa'}</h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Logo da Empresa</p>
          <p className="text-[10px] text-slate-600 mt-4 leading-relaxed italic">Recomendado: Fundo transparente, formato PNG ou SVG.</p>
        </Card>

        {/* Lado Direito: Dados Formais */}
        <Card className="lg:col-span-2 bg-[#111114] border-white/5 rounded-[2rem] shadow-2xl p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Nome Fantasia / Razão Social</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input 
                  className="bg-[#16161a] border-white/5 pl-10 h-14 rounded-2xl focus:ring-primary/50 text-white font-bold"
                  placeholder="Ex: Engenharia Avançada LTDA"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">CNPJ da Empresa</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input 
                  className={cn(
                    "bg-[#16161a] border-white/5 pl-10 h-14 rounded-2xl focus:ring-primary/50 text-white font-mono",
                    isValid === true && "border-emerald-500/30",
                    isValid === false && "border-rose-500/30"
                  )}
                  placeholder="00.000.000/0000-00"
                  value={company.cnpj}
                  onChange={handleCNPJChange}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isValid === true && <CheckCircle2 className="text-emerald-500" size={20} />}
                  {isValid === false && <AlertCircle className="text-rose-500" size={20} />}
                </div>
              </div>
              {isValid === false && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 ml-1">CNPJ Inválido</p>}
            </div>

            <div className="pt-8 border-t border-white/5 mt-8 flex justify-end">
              <Button 
                onClick={saveSettings}
                className="bg-primary hover:bg-primary/90 text-white px-8 h-12 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                <Save size={18} />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
