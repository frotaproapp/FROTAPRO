
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firestore } from '../../../infra/firebase/firebaseAdmin';

// Executa todos os dias às 02:00 da manhã
export const cronExpireLicenses = onSchedule('every day 02:00', async (event) => {
  const now = new Date();
  const todayISO = now.toISOString();

  console.log(`[CRON] Verificação de licenças: ${todayISO}`);

  try {
    // Busca organizações ativas onde a data de expiração é menor que hoje
    // Nota: Armazenamos datas como ISO String no novo modelo
    const snapshot = await firestore
      .collection('organizations')
      .where('active', '==', true)
      .where('license_expires_at', '<', todayISO)
      .get();

    if (snapshot.empty) {
      console.log('[CRON] Nenhuma licença expirada encontrada.');
      return;
    }

    const batch = firestore.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // 1. Atualiza Status para RESTRICTED (Modo Leitura)
      // Não apagamos dados, apenas bloqueamos a flag 'active' e setamos status
      batch.update(doc.ref, {
        active: false, // Bloqueia escritas nas regras de segurança
        license_status: 'RESTRICTED',
        updatedAt: todayISO
      });

      // 2. Log de Auditoria do Sistema
      const auditRef = firestore.collection('audit_logs').doc();
      batch.set(auditRef, {
        municipalityId: doc.id,
        userId: 'system-cron',
        action: 'LICENSE_EXPIRE_AUTO',
        entity: `organization/${doc.id}`,
        details: `Licença expirada automaticamente. Modo Restrito ativado.`,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      count++;
    }

    await batch.commit();
    console.log(`[CRON] ${count} organizações movidas para Modo Restrito.`);

  } catch (error) {
    console.error('[CRON] Erro crítico:', error);
  }
});
