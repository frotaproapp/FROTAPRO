
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { firestore } from '../../../infra/firebase/firebaseAdmin';

/**
 * GRANT LICENSE (Função Oficial de Licenciamento)
 * Executada exclusivamente pelo Super Admin.
 * Gera o registro de licença, atualiza a organização e cria log de auditoria imutável.
 */
export const grantLicense = onCall(async (request) => {
  const { auth, data, rawRequest } = request;

  // 1. Segurança: Apenas Super Admin
  if (auth?.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Acesso exclusivo ao Super Admin.');
  }

  const { organizationId, plan, durationDays, processNumber } = data;

  if (!organizationId || !durationDays) {
    throw new HttpsError('invalid-argument', 'Dados incompletos. Informe ID e Duração.');
  }

  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(now.getDate() + durationDays);

  try {
    const batch = firestore.batch();
    const orgRef = firestore.collection('organizations').doc(organizationId);
    
    // 2. Atualiza a Organização (Tenant)
    batch.update(orgRef, {
      active: true,
      license_status: 'ACTIVE',
      license_plan: plan || 'PRO',
      license_expires_at: expiresAt.toISOString(),
      license_updated_at: now.toISOString()
    });

    // 3. Cria Registro Histórico da Licença
    const licenseRef = firestore.collection('licenses').doc();
    batch.set(licenseRef, {
      municipalityId: organizationId,
      type: 'RENEWAL',
      status: 'active',
      startsAt: now,
      expiresAt: expiresAt,
      processNumber: processNumber || 'ADMIN_GRANT',
      grantedBy: auth.uid,
      createdAt: now
    });

    // 4. Log de Auditoria Imutável (Obrigatório TCE)
    const auditRef = firestore.collection('audit_logs').doc();
    const ipAddress = (rawRequest as any).ip || ((rawRequest as any).headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';

    batch.set(auditRef, {
      municipalityId: organizationId,
      userId: auth.uid,
      action: 'LICENSE_GRANT',
      entity: `organization/${organizationId}`,
      details: `Renovação por ${durationDays} dias. Plano: ${plan}. Validade: ${expiresAt.toISOString()}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: ipAddress
    });

    await batch.commit();

    return { success: true, newExpiresAt: expiresAt.toISOString() };

  } catch (e) {
    console.error("Erro grantLicense:", e);
    throw new HttpsError('internal', 'Falha ao processar licenciamento.');
  }
});

// Mantém createMunicipality para criação inicial via Admin Dashboard
export const createMunicipality = onCall(async (request) => {
  const { auth, data } = request;

  if (auth?.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Acesso negado.');
  }

  const { name, cnpj, estado } = data;

  try {
    // Criação com TRIAL de 30 dias automático
    const now = new Date();
    const trialExpires = new Date();
    trialExpires.setDate(now.getDate() + 30);

    const orgRef = await firestore.collection('organizations').add({
      name,
      cnpj,
      estado,
      active: true,
      license_status: 'ACTIVE',
      license_plan: 'TRIAL',
      license_expires_at: trialExpires.toISOString(),
      createdAt: now.toISOString()
    });

    // Log Auditoria Criação
    await firestore.collection('audit_logs').add({
      municipalityId: orgRef.id,
      userId: auth.uid,
      action: 'TENANT_CREATE',
      entity: `organization/${orgRef.id}`,
      details: `Prefeitura criada com Trial de 30 dias.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, municipalityId: orgRef.id };
  } catch (e) {
    throw new HttpsError('internal', 'Erro ao criar prefeitura.');
  }
});
