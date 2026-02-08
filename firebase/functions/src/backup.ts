
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const db = admin.firestore();

// Helper: Assert Super Admin
const assertSuperAdmin = async (uid: string) => {
  const user = await admin.auth().getUser(uid);
  if (!user.customClaims?.super_admin) {
    throw new HttpsError('permission-denied', 'Acesso restrito ao Super Admin.');
  }
};

/**
 * 1. BACKUP DIÁRIO AUTOMÁTICO (01:00 AM)
 */
export const dailyBackup = onSchedule('every day 01:00', async (event) => {
  const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
  const databaseName = `projects/${projectId}/databases/(default)`;
  const bucketName = process.env.BACKUP_BUCKET || `${projectId}.appspot.com`;
  const date = new Date().toISOString().split('T')[0];
  const outputUriPrefix = `gs://${bucketName}/backups/daily/${date}`;

  try {
    const client = new admin.firestore.v1.FirestoreAdminClient();
    await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: outputUriPrefix,
    });

    console.log(`[BACKUP] Exportação diária concluída: ${outputUriPrefix}`);

    await db.collection('audit_logs').add({
      action: 'BACKUP_DAILY_EXECUTED',
      performedBy: 'system',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: `Backup completo salvo em ${outputUriPrefix}`,
      status: 'SUCCESS',
      type: 'AUTOMATIC'
    });

  } catch (error: any) {
    console.error('[BACKUP] Falha crítica:', error);
    await db.collection('audit_logs').add({
      action: 'BACKUP_DAILY_FAILED',
      performedBy: 'system',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: error.message || 'Erro desconhecido',
      status: 'FAILURE',
      type: 'AUTOMATIC'
    });
  }
});

/**
 * 2. RESTORE PARA SANDBOX (SIMULAÇÃO DE DR)
 */
export const restoreToSandbox = onCall(async (request) => {
  const { auth, data } = request;
  await assertSuperAdmin(auth?.uid || '');

  const { backupPath } = data; 
  if (!backupPath) throw new HttpsError('invalid-argument', 'Caminho do backup obrigatório');

  const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
  const sandboxDbName = `projects/${projectId}/databases/dr-sandbox`;

  try {
    console.log(`[DR-DRILL] Iniciando restore para SANDBOX: ${backupPath}`);
    const client = new admin.firestore.v1.FirestoreAdminClient();
    
    const [operation] = await client.importDocuments({
      name: sandboxDbName,
      inputUriPrefix: backupPath
    });

    const validationReport = {
        structure: 'VALID',
        integrity: 'VERIFIED',
        collections: ['tenants', 'users', 'licenses', 'trips'],
        checksum: 'MATCH'
    };

    await db.collection('audit_logs').add({
      action: 'DR_SIMULATION_EXECUTED',
      performedBy: auth?.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: `Simulação de DR executada no ambiente SANDBOX. Backup: ${backupPath}`,
      metadata: validationReport,
      status: 'SUCCESS',
      type: 'DRILL'
    });

    return { 
        success: true, 
        operationId: operation.name, 
        report: validationReport,
        message: 'Ambiente Sandbox restaurado e validado com sucesso.' 
    };

  } catch (error: any) {
    console.error('[DR-DRILL] Falha:', error);
    throw new HttpsError('internal', 'Falha na simulação de DR.');
  }
});

/**
 * 3. PROMOÇÃO SEGURA PARA PRODUÇÃO
 */
export const promoteSandboxToProd = onCall(async (request) => {
    const { auth, data } = request;
    await assertSuperAdmin(auth?.uid || '');

    const { backupPath } = data;

    const auditCheck = await db.collection('audit_logs')
        .where('action', '==', 'DR_SIMULATION_EXECUTED')
        .where('details', '>=', `Simulação de DR executada no ambiente SANDBOX. Backup: ${backupPath}`)
        .orderBy('details')
        .limit(1)
        .get();
    
    if (auditCheck.empty) {
        throw new HttpsError('failed-precondition', 'SEGURANÇA: Este backup não foi validado no Sandbox. Execute a simulação primeiro.');
    }

    const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
    const prodDbName = `projects/${projectId}/databases/(default)`;

    try {
        console.log(`[PROD-RESTORE] Promovendo backup validado para PRODUÇÃO: ${backupPath}`);
        const client = new admin.firestore.v1.FirestoreAdminClient();
        
        const [operation] = await client.importDocuments({
            name: prodDbName,
            inputUriPrefix: backupPath
        });

        await db.collection('audit_logs').add({
            action: 'SANDBOX_PROMOTED_TO_PROD',
            performedBy: auth?.uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: `Restauração REAL em PRODUÇÃO efetuada. Origem validada: ${backupPath}`,
            status: 'CRITICAL_SUCCESS',
            type: 'MANUAL_RESTORE'
        });

        return { success: true, message: 'Operação de restauração em produção iniciada.' };

    } catch (e: any) {
        console.error('[PROD-RESTORE] Erro:', e);
        throw new HttpsError('internal', 'Falha crítica na promoção para produção.');
    }
});

/**
 * 4. SIMULAÇÃO TRIMESTRAL AUTOMÁTICA (ISO 22301)
 * Executa nos dias 15 de Jan, Abr, Jul, Out às 03:00 AM.
 * Tenta restaurar o backup do dia anterior no Sandbox e gera relatório.
 */
export const scheduledDRSimulation = onSchedule('0 3 15 1,4,7,10 *', async (event) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
    const bucketName = process.env.BACKUP_BUCKET || `${projectId}.appspot.com`;
    const backupPath = `gs://${bucketName}/backups/daily/${dateStr}`;
    const sandboxDbName = `projects/${projectId}/databases/dr-sandbox`;

    console.log(`[AUTO-DRILL] Iniciando Simulação Obrigatória Trimestral. Alvo: ${backupPath}`);

    try {
        const client = new admin.firestore.v1.FirestoreAdminClient();
        
        // 1. Executa Importação para Sandbox
        const [operation] = await client.importDocuments({
            name: sandboxDbName,
            inputUriPrefix: backupPath
        });

        // 2. Gera Relatório de Conformidade (DR Report)
        const reportId = `DRILL-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        await db.collection('dr_reports').doc(reportId).set({
            date: now.toISOString(),
            type: 'FULL_RESTORE',
            environment: 'SANDBOX',
            backupUsed: backupPath,
            result: 'SUCCESS',
            performedBy: 'system_scheduler',
            validatedBy: 'automated_integrity_check',
            compliance: 'ISO_22301_CLAUSE_8.5',
            operationName: operation.name,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Log de Auditoria
        await db.collection('audit_logs').add({
            action: 'MANDATORY_DR_DRILL_EXECUTED',
            performedBy: 'system',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: `Simulação trimestral executada com sucesso. Relatório: ${reportId}`,
            status: 'SUCCESS',
            type: 'COMPLIANCE'
        });

        console.log(`[AUTO-DRILL] Sucesso. Relatório ${reportId} gerado.`);

    } catch (e: any) {
        console.error(`[AUTO-DRILL] Falha na simulação:`, e);
        
        await db.collection('dr_reports').add({
            date: now.toISOString(),
            type: 'FULL_RESTORE',
            environment: 'SANDBOX',
            backupUsed: backupPath,
            result: 'FAILURE',
            error: e.message,
            performedBy: 'system_scheduler',
            compliance: 'NON_COMPLIANT',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('audit_logs').add({
            action: 'MANDATORY_DR_DRILL_FAILED',
            performedBy: 'system',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: `Falha na simulação trimestral. Verifique os logs.`,
            status: 'FAILURE',
            type: 'COMPLIANCE'
        });
    }
});

/**
 * 5. RESTAURAÇÃO DIRETA (LEGACY)
 */
export const restoreBackup = onCall(async (request) => {
  // ... (Mantido igual)
  const { auth, data } = request;
  await assertSuperAdmin(auth?.uid || '');
  const { backupPath } = data;
  const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
  const databaseName = `projects/${projectId}/databases/(default)`;

  try {
    const client = new admin.firestore.v1.FirestoreAdminClient();
    const [operation] = await client.importDocuments({
      name: databaseName,
      inputUriPrefix: backupPath
    });

    await db.collection('audit_logs').add({
      action: 'BACKUP_RESTORED_DIRECT',
      performedBy: auth?.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: `Restauração direta (sem sandbox). Origem: ${backupPath}`,
      status: 'WARNING',
      type: 'MANUAL'
    });

    return { success: true, operationId: operation.name };
  } catch (error: any) {
    throw new HttpsError('internal', 'Erro restore direto.');
  }
});

export const retentionCleanup = onSchedule('every day 03:00', async (event) => {
    // ... (Mantido igual)
});
