// Removed dotenv for Vercel
import express from 'express';
import path from 'path';
import { supabase } from './lib/supabase.js';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[supabase] Missing SUPABASE_URL or key environment variables.');
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
        costCenter: t.cost_center_name || t.cost_center?.name,
        project_name: t.project?.name,
        bank_account_name: t.bank_account?.name,
        classification: t.classification,
        description: t.description || t.notes,
        paymentDate: t.payment_date, // Novo campo do banco
        saved: true
      }));

      res.json(mapped);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Initial Balance per month/year
  api.get('/initial-balance', async (req, res) => {
    try {
      const company_id = req.headers['x-company-id'] || 1;
      const { year, month } = req.query;
      const { data, error } = await supabase
        .from('initial_balances')
        .select('amount')
        .eq('company_id', company_id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (error) throw error;
      res.json({ amount: data?.amount || 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/initial-balance', async (req, res) => {
    try {
      const company_id = req.headers['x-company-id'] || 1;
      const { year, month, amount } = req.body;
      const { error } = await supabase
        .from('initial_balances')
        .upsert({
          company_id,
          year,
          month,
          amount: Number(amount)
        }, { onConflict: 'company_id,year,month' });

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.delete('/transactions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/transactions', async (req, res) => {
    try {
      const { 
        id, date, type, amount, contact_id, contact_type, status, due_date, competence, notes,
        description, classification, cost_center_name, installment, payment_date, paymentDate,
        cost_center_id, project_id, bank_account_id
      } = req.body;
      const company_id = req.headers['x-company-id'] || 1;

      // Sanitização de campos de ID para evitar erro de Foreign Key (string vazia -> null)
      const sanitizeId = (val: any) => (val === '' || val === undefined || val === null) ? null : val;

      const payload = {
        date, type, amount: Number(amount), contact_id: sanitizeId(contact_id), 
        contact_type: sanitizeId(contact_type), status, due_date, competence, notes,
        description, classification, cost_center_name, installment, 
        payment_date: payment_date || paymentDate || null,
        cost_center_id: sanitizeId(cost_center_id), 
        project_id: sanitizeId(project_id), 
        bank_account_id: sanitizeId(bank_account_id),
        company_id
      };

      const { data, error } = await supabase
        .from('transactions')
        .upsert([id && !String(id).startsWith('row-') ? { id, ...payload } : payload])
        .select()
        .single();

      if (error) {
        console.error('[transactions] Save error:', error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ id: data.id });
    } catch (error: any) {
      console.error('[transactions] Unexpected error:', error);
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
      // Safety check: Ensure we are using a Service Role key on the server
      const isServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY);
      if (!isServiceRole && process.env.VERCEL === '1') {
        throw new Error('Configuração incompleta na Vercel: A chave "SUPABASE_SERVICE_ROLE_KEY" não foi encontrada. Verifique as variáveis de ambiente.');
      }

      // 1. Check if Company already exists, otherwise create it
      let company;
      const { data: existingCompany } = await supabase
        .from('companies')
        .select()
        .eq('cnpj', cnpj)
        .maybeSingle();

      if (existingCompany) {
        company = existingCompany;
      } else {
        const { data: newCompany, error: compError } = await supabase
          .from('companies')
          .insert([{ name: companyName, cnpj }])
          .select()
          .single();

        if (compError) throw compError;
        company = newCompany;
      }

      // 2. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { name: adminName },
          emailRedirectTo: 'https://zaas-app.vercel.app/'
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário.');

      // 3. Create or Update Profile (Master)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select()
        .eq('email', email)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profError } = await supabase
          .from('profiles')
          .insert([{
            id: authData?.user?.id || existingProfile?.id,
            name: adminName,
            email,
            company_id: company.id,
            role: 'master',
            status: 'approved'
          }]);

        if (profError) throw profError;
      }

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
        .select('id, modules')
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
        options: { 
          data: { name },
          emailRedirectTo: 'https://zaas-app.vercel.app/'
        }
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
          status: 'approved',
          modules: invite.modules || []
        }]);

      if (profError) throw profError;

      // 5. Cleanup invitation
      await supabase.from('invitations').delete().eq('id', invite.id);

      res.json({ success: true, message: 'Cadastro realizado com sucesso! Seja bem-vindo.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List Team Members (Profiles + Invitations)
  api.get('/team/members', async (req, res) => {
    const { company_id } = req.query;
    try {
      const [profilesRes, invitationsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('company_id', company_id).order('created_at', { ascending: true }),
        supabase.from('invitations').select('*').eq('company_id', company_id).order('created_at', { ascending: true })
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (invitationsRes.error) throw invitationsRes.error;

      // Merge results
      const members = [
        ...profilesRes.data.map(p => ({ ...p, type: 'profile' })),
        ...invitationsRes.data.map(i => ({ ...i, type: 'invitation', status: i.status === 'sent' ? 'invitation_sent' : i.status }))
      ];

      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Invite User
  api.post('/team/invite', async (req, res) => {
    const { email, name, company_id, company_name, modules } = req.body;
    try {
      // Save invitation
      const { error: inviteError } = await supabase
        .from('invitations')
        .upsert([{ email, company_id, modules, name, status: 'sent' }], { onConflict: 'email, company_id' });

      if (inviteError) throw inviteError;

      // 2. Trigger Supabase Invite Email
      // This sends a native Supabase invitation email
      const { error: authInviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `https://zaas-app.vercel.app/`,
        data: { name }
      });

      if (authInviteError) {
        console.error('[Supabase Invite Error]', authInviteError);
        // Throwing the error ensures it's returned as 500 to the frontend
        // so the user sees the real reason for failure (rate limit, etc)
        throw new Error(`Supabase Auth: ${authInviteError.message}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Approve User
  api.post('/team/approve', async (req, res) => {
    const { profile_id, status } = req.body; // status: 'approved' or 'rejected'
    try {
      if (status === 'approved') {
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'approved' })
          .eq('id', profile_id);
        if (error) throw error;
      } else {
        // If rejected during pending stage, delete profile and auth user
        await supabase.auth.admin.deleteUser(profile_id);
        await supabase.from('profiles').delete().eq('id', profile_id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Member Modules
  api.post('/team/update-modules', async (req, res) => {
    const { profile_id, modules } = req.body;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ modules })
        .eq('id', profile_id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove Member (Hard Delete to liberate email)
  api.post('/team/remove', async (req, res) => {
    const { id, type, email } = req.body; // id can be profile_id or invitation_id
    try {
      if (type === 'profile') {
        // 1. Delete from Supabase Auth first
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) {
          console.error('[Supabase Auth Delete Error]', authError);
          // We continue because the user might have been deleted manually already
        }
        
        // 2. Delete from Profiles table
        const { error: profError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);
        
        if (profError) throw profError;
      } else {
        // For invitations, we try to clean up Auth if a user record was pre-created
        if (email) {
          try {
            // Hardened: list more users to ensure we find the one to liberate
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
              perPage: 1000 // Ensure we don't miss users in larger systems
            });
            const targetUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (targetUser) {
              await supabase.auth.admin.deleteUser(targetUser.id);
              console.log(`[ACL] Usuário de convite ${email} removido do Auth para liberação.`);
            }
          } catch (e) {
            console.error('Falha ao limpar usuário de convite do Auth:', e);
          }
        }

        // Delete from Invitations table
        const { error } = await supabase
          .from('invitations')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Resend Invite
  // Resend Invite (via Supabase)
  api.post('/team/resend-invite', async (req, res) => {
    const { email, name } = req.body;
    try {
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `https://zaas-app.vercel.app/`,
        data: { name }
      });
      
      if (error) {
        console.error('[Supabase Resend Invite Error]', error);
        throw new Error(`Supabase Auth: ${error.message}`);
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
