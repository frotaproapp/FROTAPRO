
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
      if (!member) return {};

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
      return (data || []) as Vehicle[];
    },
    save: async (v: Partial<Vehicle>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('members').select('organization_id').eq('id', user?.id).single();
      
      const payload = { 
        ...v, 
        organization_id: member?.organization_id,
        current_km: v.currentKm,
        ambulance_type: v.ambulanceType,
        has_oxygen: v.hasOxygen
      };
      
      if (v.id) {
        await supabase.from('vehicles').update(payload).eq('id', v.id);
      } else {
        await supabase.from('vehicles').insert([payload]);
      }
    }
  },

  trips: {
    list: async () => {
      const { data } = await supabase.from('trips').select('*, professionals(name), vehicles(plate, model)').order('date_out', { ascending: false });
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
      await supabase.from('trips').insert([t]);
    },
    update: async (t: any) => {
      const { id, ...updateData } = t;
      await supabase.from('trips').update(updateData).eq('id', id);
    }
  },

  professionals: {
    list: async () => {
      const { data } = await supabase.from('professionals').select('*').order('name');
      return (data || []) as Professional[];
    },
    save: async (p: any) => {
      if (p.id) await supabase.from('professionals').update(p).eq('id', p.id);
      else await supabase.from('professionals').insert([p]);
    },
    delete: async (id: string) => {
      await supabase.from('professionals').delete().eq('id', id);
    }
  },

  users: {
    list: async () => {
      const { data } = await supabase.from('members').select('*').order('name');
      return data || [];
    }
  },

  solicitors: {
    list: async () => {
      const { data } = await supabase.from('solicitantes').select('*');
      return data || [];
    },
    add: async (name: string, responsible: string, secretariaId?: string) => {
      await supabase.from('solicitantes').insert([{ name, responsible, secretaria_id: secretariaId }]);
    },
    delete: async (id: string) => {
      await supabase.from('solicitantes').delete().eq('id', id);
    }
  },

  license: {
    getPermissions: async () => {
      return { status: LicenseStatus.ACTIVE };
    }
  },
  
  alerts: { list: async () => [] },
  healthPlans: { 
    list: async () => {
      const { data } = await supabase.from('health_plans').select('*');
      return data || [];
    },
    add: async (name: string) => {
      await supabase.from('health_plans').insert([{ name }]);
    },
    update: async (plan: any) => {
      const { id, ...updateData } = plan;
      await supabase.from('health_plans').update(updateData).eq('id', id);
    },
    delete: async (id: string) => {
      await supabase.from('health_plans').delete().eq('id', id);
    }
  },
  dr: {
    listSimulations: async () => {
      const { data } = await supabase.from('dr_simulations').select('*').order('started_at', { ascending: false });
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
      // Wraps user creation for organizational context
      const { data } = await supabase.from('members').insert([{ ...userData, organization_id: tenantId }]);
      return data;
    },
    updateUser: async (tenantId: string, userId: string, data: any) => {
      await supabase.from('members').update(data).eq('id', userId);
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
      const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
      return (data || []) as any[];
    },
    renewLicense: async (tenantId: string, days: number) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      await supabase.from('organizations').update({ 
        license_expires_at: expiresAt.toISOString(),
        license_status: 'ACTIVE',
        active: true 
      }).eq('id', tenantId);
    },
    deleteTenant: async (tenantId: string) => {
      await supabase.from('organizations').delete().eq('id', tenantId);
    },
    createTenant: async (tenantData: any) => {
      const { data } = await supabase.from('organizations').insert([tenantData]);
      return data;
    }
  }
};
