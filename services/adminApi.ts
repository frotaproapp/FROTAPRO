
// Mapeamento das funções administrativas para Netlify Functions

export const adminApi = {
  createMunicipality: async (data: { name: string, cnpj: string, estado: string, adminEmail: string }) => {
    const response = await fetch('/.netlify/functions/create-tenant', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.adminEmail,
        password: 'ChangeMe123!', // Senha temporária padrão
        adminName: data.name
      })
    });
    if (!response.ok) throw new Error('Falha ao criar município');
    return await response.json();
  },

  activateLicense: async (data: { municipalityId: string, type: 'trial' | 'annual', durationDays: number, processNumber?: string }) => {
    const response = await fetch('/.netlify/functions/renew-license', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: data.municipalityId,
        days: data.durationDays
      })
    });
    if (!response.ok) throw new Error('Falha ao ativar licença');
    return await response.json();
  }
};
