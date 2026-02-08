
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { api } from './api';

/**
 * SERVIÇO DE LICENCIAMENTO (FRONTEND - READ ONLY)
 * A lógica de escrita foi movida para o Backend (Cloud Functions).
 * Este serviço apenas calcula dias restantes e formata status para a UI.
 */
export const LicenseService = {
  
  // Calcula dias restantes baseado no objeto da organização
  daysToExpire: (org: any) => {
    const dateStr = org?.licenseExpiresAt || org?.license_expires_at;
    if (!dateStr) return 0;
    
    const expires = new Date(dateStr);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  },

  // Verifica se está em modo restrito
  isRestricted: (org: any) => {
    if (!org) return true;
    const days = LicenseService.daysToExpire(org);
    return days <= 0 || org.license_status === 'RESTRICTED' || org.active === false;
  }
};
