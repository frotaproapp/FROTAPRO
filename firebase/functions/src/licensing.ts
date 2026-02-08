import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as cors from 'cors';

// ✅ Inicialização do Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://frotapro-af016-default-rtdb.firebaseio.com",
  });
}

const db = admin.firestore();

// ✅ Configuração de CORS (Permite todas as origens)
const corsHandler = cors({ origin: true });

// --- HELPERS ---

const assertSuperAdmin = async (uid: string) => {
  const user = await admin.auth().getUser(uid);
  if (!user.customClaims?.super_admin) {
    throw new HttpsError('permission-denied', 'ACESSO RESTRITO: Operação exclusiva do proprietário do sistema.');
  }
};

const logAudit = async (tenantId: string, action: string, performedBy: string, details: string) => {
  await db.collection('license_audit').add({
    tenantId,
    action,
    performedBy, // 'system' ou UID do Super Admin
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    immutable: true
  });
};

// --- TRIGGERS & FUNCTIONS ---

/**
 * 1. TRIAL AUTOMÁTICO (30 DIAS)
 */
export const onTenantCreate = onDocumentCreated('tenants/{tenantId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const tenantId = event.params.tenantId;
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + (30 * 24 * 60 * 60 * 1000) // +30 dias
  );

  // Atualiza o documento com a licença TRIAL
  await snapshot.ref.update({
    plan: 'TRIAL_30',
    license: {
      status: 'ACTIVE',
      startAt: now,
      expiresAt: expiresAt,
      grantedBy: 'system_automation'
    },
    updatedAt: now
  });

  await logAudit(tenantId, 'TRIAL_CREATED', 'system', 'Criação automática de Trial de 30 dias.');
});

/**
 * 2. CONCESSÃO DE LICENÇA ANUAL (MANUAL)
 */
export const grantAnnualLicense = onCall({ cors: true }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) throw new HttpsError('unauthenticated', 'Login necessário');
  
  // Verifica segurança
  await assertSuperAdmin(auth.uid);

  const { tenantId } = data;
  if (!tenantId) throw new HttpsError('invalid-argument', 'ID da prefeitura obrigatório');

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + (365 * 24 * 60 * 60 * 1000) // +1 ano
  );

  // Aplica a renovação
  await db.doc(`tenants/${tenantId}`).update({
    plan: 'ANUAL',
    'license.status': 'ACTIVE',
    'license.startAt': now,
    'license.expiresAt': expiresAt,
    'license.grantedBy': auth.uid,
    updatedAt: now
  });

  await logAudit(tenantId, 'LICENSE_GRANTED_ANNUAL', auth.uid, 'Renovação anual concedida manualmente.');

  return { success: true, expiresAt: expiresAt.toDate().toISOString() };
});

/**
 * 3. CRON DIÁRIO DE EXPIRAÇÃO (02:00 AM)
 */
export const checkLicensesDaily = onSchedule('every day 02:00', async (event) => {
  const now = admin.firestore.Timestamp.now();

  console.log(`[CRON] Verificando licenças vencidas em: ${now.toDate().toISOString()}`);

  const expiredQuery = await db.collection('tenants')
    .where('license.status', '==', 'ACTIVE')
    .where('license.expiresAt', '<', now)
    .get();

  if (expiredQuery.empty) {
    console.log('[CRON] Nenhuma licença expirada hoje.');
    return;
  }

  const batch = db.batch();
  let count = 0;

  for (const doc of expiredQuery.docs) {
    batch.update(doc.ref, {
      'license.status': 'EXPIRED',
      updatedAt: now
    });

    const auditRef = db.collection('license_audit').doc();
    batch.set(auditRef, {
      tenantId: doc.id,
      action: 'LICENSE_EXPIRED_AUTO',
      performedBy: 'system_cron',
      details: `Vencimento detectado. Status alterado para EXPIRED.`,
      timestamp: now
    });

    count++;
  }

  await batch.commit();
  console.log(`[CRON] ${count} prefeituras bloqueadas por vencimento.`);
});

/**
 * 4. FUNÇÃO createTenant (Definitiva - CORS Habilitado)
 * Usa onRequest para controle total e middleware CORS.
 */
export const createTenant = onRequest((request, response) => {
  const req = request as any;
  const res = response as any;
  corsHandler(req, res, async () => {
    try {
      const { municipio, email, cnpj, uf } = req.body;

      if (!municipio || !email) {
        res.status(400).json({ error: "Dados inválidos: Município e Email são obrigatórios." });
        return;
      }

      // 🔥 Cria registro no Firestore (Coleção 'tenants' para compatibilidade com triggers)
      // Mapeia: municipio -> name, uf -> estado
      const ref = db.collection("tenants").doc();
      await ref.set({
        name: municipio,
        email,
        cnpj,
        estado: uf,
        criadoEm: new Date().toISOString(),
        active: true,
        // Campos de licença serão preenchidos pelo trigger onTenantCreate
      });

      res.status(200).json({ success: true, id: ref.id });
    } catch (error: any) {
      console.error("Erro createTenant:", error);
      res.status(500).json({ error: error.message });
    }
  });
});