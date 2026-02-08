
import { supabase } from './supabaseClient';
import { Secretaria } from '../types';

export const secretariasService = {

  async listar(tenantId: string): Promise<Secretaria[]> {
    if (!tenantId) return [];
    
    const { data, error } = await supabase
        .from('secretarias')
        .select('*')
        .eq('organization_id', tenantId)
        .order('nome');
    
    if (error) {
        console.error("Erro ao listar secretarias:", error);
        return [];
    }
    return (data || []) as Secretaria[];
  },

  async criar(tenantId: string, nome: string) {
    if (!tenantId) throw new Error("ID da Organização não fornecido");
    
    const { data, error } = await supabase
        .from('secretarias')
        .insert([{
            organization_id: tenantId,
            nome: nome.toUpperCase(),
            active: true
        }])
        .select()
        .single();

    if (error) throw error;
    return data.id;
  },

  async ativar(tenantId: string, secId: string, active: boolean) {
    if (!tenantId) return;
    await supabase
        .from('secretarias')
        .update({ active })
        .eq('id', secId)
        .eq('organization_id', tenantId);
  },

  async remover(tenantId: string, secId: string) {
    if (!tenantId) return;
    await supabase
        .from('secretarias')
        .delete()
        .eq('id', secId)
        .eq('organization_id', tenantId);
  }
};
