// Removed dotenv for Vercel
import express from 'express';
import path from 'path';
import { supabase } from './lib/supabase.js';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!resend) {
  console.warn('RESEND_API_KEY não encontrada. O envio de e-mails será simulado no console.');
}

export const app = express();
app.use(express.json());

// API Routes
export const api = express.Router();

  // Dashboard Summary
  api.get('/summary', async (req, res) => {
    try {
      const companyId = req.headers['x-company-id'] || 1;

      const { data: accounts, error: accError } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('company_id', companyId);

      const { data: incomeTx, error: incError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .eq('status', 'completed')
        .eq('company_id', companyId);

      const { data: expenseTx, error: expError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .eq('status', 'completed')
        .eq('company_id', companyId);

      if (accError || incError || expError) throw accError || incError || expError;

      const totalBalance = accounts?.reduce((sum, a) => sum + Number(a.balance), 0) || 0;
      const totalIncome = incomeTx?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalExpense = expenseTx?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      res.json({
        balance: totalBalance,
        income: totalIncome,
        expense: totalExpense,
        profit: totalIncome - totalExpense
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transactions
  api.get('/transactions', async (req, res) => {
    try {
      const { year, month } = req.query;

      let query = supabase
        .from('transactions')
        .select(`
          *,
          cost_center:cost_center_id(name),
          project:project_id(name),
          bank_account:bank_account_id(name)
        `)
        .order('date', { ascending: false });

      if (year) {
        const startOfYear = `${year}-01-01`;
        const endOfYear = `${year}-12-31`;
        query = query.gte('date', startOfYear).lte('date', endOfYear);
      }

      // Note: month is 0-indexed from frontend
      if (year && month) {
        const y = parseInt(year as string);
        const m = parseInt(month as string) + 1;
        const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const endOfMonth = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
        query = query.gte('date', startOfMonth).lte('date', endOfMonth);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map for frontend compatibility
      const mapped = data.map(t => ({
        ...t,
        costCenter: t.cost_center?.name,
        project_name: t.project?.name,
        bank_account_name: t.bank_account?.name,
        classification: t.cost_center?.name, // Temporary mapping if needed
        saved: true
      }));

      res.json(mapped);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/transactions', async (req, res) => {
    try {
      const { date, type, amount, contact_id, contact_type, cost_center_id, project_id, bank_account_id, status, due_date, competence, notes } = req.body;
      const company_id = req.headers['x-company-id'] || 1;

      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          date, type, amount, contact_id, contact_type, cost_center_id, project_id, bank_account_id, status, due_date, competence, notes, company_id
        }])
        .select()
        .single();

      if (error) throw error;

      // Update bank balance if completed
      if (status === 'completed' && bank_account_id) {
        const multiplier = type === 'income' ? 1 : -1;
        const change = Number(amount) * multiplier;

        await supabase.rpc('increment_balance', {
          account_id: bank_account_id,
          amount_change: change
        });
      }

      res.json({ id: data.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.get('/clients', async (req, res) => {
    try {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/clients', async (req, res) => {
    try {
      const { contrato, valor, nome, cpfCnpj, endereco, cep, bairro, cidade, uf } = req.body;
      const company_id = req.headers['x-company-id'] || 1;

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          contrato, valor, nome, cpf_cnpj: cpfCnpj, endereco, cep, bairro, cidade, uf, company_id
        }])
        .select()
        .single();

      if (error) throw error;
      res.json({ id: data.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.put('/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { contrato, valor, nome, cpfCnpj, endereco, cep, bairro, cidade, uf } = req.body;

      const { error } = await supabase
        .from('clients')
        .update({
          contrato, valor, nome, cpf_cnpj: cpfCnpj, endereco, cep, bairro, cidade, uf
        })
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.delete('/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/clientes/importar', async (req, res) => {
    try {
      const clientes = req.body;
      const company_id = req.headers['x-company-id'] || 1;

      const formatted = clientes.map((c: any) => ({
        contrato: c.contrato,
        valor: c.valor,
        nome: c.nome,
        cpf_cnpj: c.cpfCnpj,
        endereco: c.endereco,
        cep: c.cep,
        bairro: c.bairro,
        cidade: c.cidade,
        uf: c.uf,
        company_id
      }));

      const { data, error } = await supabase.from('clients').insert(formatted).select();

      if (error) throw error;
      res.json({ inserted: data?.length || 0, ignored: clientes.length - (data?.length || 0) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Master Data
  api.get('/suppliers', async (req, res) => {
    const { data } = await supabase.from('suppliers').select('*');
    res.json(data || []);
  });
  api.get('/projects', async (req, res) => {
    const { data } = await supabase.from('projects').select('*');
    res.json(data || []);
  });
  api.get('/cost-centers', async (req, res) => {
    const { data } = await supabase.from('cost_centers').select('*');
    res.json(data || []);
  });
  api.get('/bank-accounts', async (req, res) => {
    const { data } = await supabase.from('bank_accounts').select('*');
    res.json(data || []);
  });

  // --- Auth & Team Management ---

  // Register Company & Master User
  api.post('/auth/register-company', async (req, res) => {
    const { companyName, cnpj, adminName, email, password } = req.body;
    try {
      // 1. Create Company
      const { data: company, error: compError } = await supabase
        .from('companies')
        .insert([{ name: companyName, cnpj }])
        .select()
        .single();

      if (compError) throw compError;

      // 2. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: adminName } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário.');

      // 3. Create Profile (Master)
      const { error: profError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          name: adminName,
          email,
          company_id: company.id,
          role: 'master',
          status: 'approved'
        }]);

      if (profError) throw profError;

      // 4. Seed Initial Data for the new company
      const defaultCostCenters = [
        { name: 'Venda de Imóveis', type: 'income', company_id: company.id },
        { name: 'Serviços de Engenharia', type: 'income', company_id: company.id },
        { name: 'Material de Construção', type: 'expense', company_id: company.id },
        { name: 'Mão de Obra', type: 'expense', company_id: company.id },
        { name: 'Administrativo', type: 'expense', company_id: company.id }
      ];

      const defaultAccounts = [
        { name: 'Conta Principal', balance: 0, company_id: company.id }
      ];

      await Promise.all([
        supabase.from('cost_centers').insert(defaultCostCenters),
        supabase.from('bank_accounts').insert(defaultAccounts)
      ]);

      res.json({ success: true, user: { ...authData.user, role: 'master', company_id: company.id } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register Member User
  api.post('/auth/register-user', async (req, res) => {
    const { name, email, password, cnpj } = req.body;
    try {
      // 1. Find Company by CNPJ
      const { data: company, error: compError } = await supabase
        .from('companies')
        .select('id')
        .eq('cnpj', cnpj)
        .single();

      if (compError || !company) throw new Error('Empresa não encontrada com este CNPJ.');

      // 2. Check Invitation
      const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('company_id', company.id)
        .single();

      if (inviteError || !invite) {
        throw new Error('Você não possui um convite pendente para esta empresa.');
      }

      // 3. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });

      if (authError) throw authError;

      // 4. Create Profile (Pending Member)
      const { error: profError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user!.id,
          name,
          email,
          company_id: company.id,
          role: 'member',
          status: 'pending'
        }]);

      if (profError) throw profError;

      // 5. Cleanup invitation
      await supabase.from('invitations').delete().eq('id', invite.id);

      res.json({ success: true, message: 'Cadastro realizado. Aguarde aprovação do administrador.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List Team Members
  api.get('/team/members', async (req, res) => {
    const { company_id } = req.query;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Invite User
  api.post('/team/invite', async (req, res) => {
    const { email, name, company_id, company_name } = req.body;
    try {
      // Save invitation
      const { error: inviteError } = await supabase
        .from('invitations')
        .upsert([{ email, company_id }], { onConflict: 'email, company_id' });

      if (inviteError) throw inviteError;

      // Send Email
      const inviteLink = `${process.env.APP_URL || 'http://localhost:3000'}/signup`;

      if (process.env.RESEND_API_KEY && resend) {
        await resend.emails.send({
          from: 'EngERP <noreply@zass.com.br>',
          to: email,
          subject: 'Convite para participar da equipe no EngERP',
          html: `
            <p>Olá ${name},</p>
            <p>Você foi convidado para participar da equipe da empresa <strong>${company_name}</strong> no sistema EngERP.</p>
            <p>Para se cadastrar, acesse o link abaixo e informe o CNPJ da empresa quando solicitado.</p>
            <a href="${inviteLink}">${inviteLink}</a>
          `
        });
      } else {
        console.log(`[MOCK EMAIL] To: ${email}, Link: ${inviteLink}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Approve User
  api.post('/team/approve', async (req, res) => {
    const { profile_id, status } = req.body; // status: 'approved' or 'rejected' (delete)
    try {
      if (status === 'approved') {
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'approved' })
          .eq('id', profile_id);
        if (error) throw error;
      } else {
        // If rejected, we might want to delete the profile or just mark as rejected
        const { error } = await supabase.from('profiles').delete().eq('id', profile_id);
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use('/api', api);

  // Serve Frontend / Start Local Server (ignored by Vercel Serverless)
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    // Only used locally for Vite Dev Server
    import('vite').then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      }).then((vite) => {
        app.use(vite.middlewares);
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`Server running on http://localhost:${PORT}`);
          console.log(`Supabase integrated.`);
        });
      });
    });
  } else if (process.env.VERCEL !== '1') {
    // Standard Node.js VPS Production (non-Vercel)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running internally on port ${PORT}`);
    });
  }

  export default app;
