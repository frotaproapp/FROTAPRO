
import { functions } from './firebase'; // Assumindo que você tem uma config firebase exportando 'functions'
import { httpsCallable } from 'firebase/functions';

// Mapeamento das Cloud Functions para uso no Frontend do Super Admin

export const adminApi = {
  createMunicipality: async (data: { name: string, cnpj: string, estado: string, adminEmail: string }) => {
    const fn = httpsCallable(functions, 'createMunicipality');
    const result = await fn(data);
    return result.data;
  },

  activateLicense: async (data: { municipalityId: string, type: 'trial' | 'annual', durationDays: number, processNumber?: string }) => {
    const fn = httpsCallable(functions, 'activateLicense');
    const result = await fn(data);
    return result.data;
  }
};
