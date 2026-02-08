
import { supabase } from './supabaseClient';
import { AuditLogEntry } from '../types';

export const auditService = {
  logAction: async ({
    tenantId,
    action,
    entity,
    entityId = null
  }: {
    tenantId: string;
    action: string;
    entity: string;
    entityId?: string | null;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tenantId) return;

      const { error } = await supabase.from('audit_logs').insert([{
        organization_id: tenantId,
        user_id: user.id,
        action: action,
        entity: entity,
        details: { entity_id: entityId }
      }]);

      if (error) throw error;
    } catch (error) {
      console.error("[AUDIT ERROR]", error);
    }
  },

  getLogs: async (tenantId: string): Promise<AuditLogEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, members(name, role)')
        .eq('organization_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        userId: log.user_id,
        userName: log.members?.name || 'Sistema',
        userRole: log.members?.role || 'OPERADOR',
        entity: log.entity,
        details: log.details,
        timestamp: log.created_at,
        secretariaId: log.secretaria_id
      }));
    } catch (error) {
      console.error("[AUDIT FETCH ERROR]", error);
      return [];
    }
  }
};
