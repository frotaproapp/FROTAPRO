
import { supabase } from './supabaseClient';

export const TenantService = {
  getTenant: async (id: string) => {
    try {
      if (!id) throw new Error("ID do Tenant não fornecido");
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        throw new Error("Tenant não encontrado.");
      }

      return { 
        data: {
          id: data.id,
          ...data,
          licenseExpiresAt: data.license_expires_at,
          active: data.active
        }
      };
    } catch (error: any) {
      console.error("TenantService.getTenant Error:", error);
      throw error;
    }
  }
};
