
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firestore } from '../../../infra/firebase/firebaseAdmin';
import { mailer } from './infra/email/mailer';

// Executa diariamente às 08:00
export const notifyLicenseExpiration = onSchedule('every day 08:00', async (event) => {
  const now = new Date();
  const warningDate = new Date();
  warningDate.setDate(now.getDate() + 7); // Aviso com 7 dias de antecedência

  console.log(`[NOTIFY] Iniciando verificação de licenças vencendo em ou antes de: ${warningDate.toISOString()}`);

  try {
    // Busca licenças ativas que vão vencer nos próximos 7 dias
    const licensesSnapshot = await firestore
      .collection('licenses')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', warningDate)
      .where('expiresAt', '>=', now) // Apenas as que ainda não venceram, mas vão vencer
      .get();

    if (licensesSnapshot.empty) {
      console.log('[NOTIFY] Nenhuma licença próxima do vencimento.');
      return;
    }

    for (const doc of licensesSnapshot.docs) {
      const license = doc.data();
      
      // Busca admins da prefeitura para notificar
      // Assumindo que usuários têm municipalityId e role='ORG_ADMIN'
      const adminsSnapshot = await firestore
        .collection('users') // Tabela de usuários sincronizada ou espelhada
        .where('municipalityId', '==', license.municipalityId)
        .where('role', '==', 'ORG_ADMIN')
        .get();

      if (adminsSnapshot.empty) {
          console.warn(`[NOTIFY] Sem administradores encontrados para notificar sobre a licença ${doc.id}`);
          continue;
      }

      const emails = adminsSnapshot.docs.map(userDoc => userDoc.data().email).filter(email => !!email);

      if (emails.length > 0) {
          const daysLeft = Math.ceil((license.expiresAt.toDate().getTime() - now.getTime()) / (1000 * 3600 * 24));
          
          await mailer.sendMail({
            from: '"Sistema FrotaPro Gov" <noreply@frotapro.gov.br>',
            to: emails.join(', '),
            subject: `⚠️ AVISO IMPORTANTE: Licença FrotaPro vence em ${daysLeft} dias`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #d32f2f;">Aviso de Vencimento de Licença</h2>
                <p>Prezados Gestores,</p>
                <p>Informamos que a licença de uso do sistema <strong>FrotaPro</strong> para sua unidade expirará em breve.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Município ID:</strong> ${license.municipalityId}</p>
                    <p><strong>Data de Vencimento:</strong> ${license.expiresAt.toDate().toLocaleDateString('pt-BR')}</p>
                    <p><strong>Dias Restantes:</strong> ${daysLeft}</p>
                </div>

                <p>Para evitar a interrupção dos serviços e o bloqueio do modo de escrita (lançamentos de viagens), por favor, providenciem a renovação contratual.</p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">Esta é uma mensagem automática do sistema de auditoria e controle FrotaPro.</p>
              </div>
            `,
          });
          
          // Log de Auditoria do Envio
          await firestore.collection('audit_logs').add({
              municipalityId: license.municipalityId,
              userId: 'system-mailer',
              action: 'NOTIFICATION_SENT',
              entity: `license/${doc.id}`,
              details: `E-mail enviado para ${emails.length} admins.`,
              timestamp: new Date()
          });
      }
    }
  } catch (error) {
    console.error('[NOTIFY] Erro ao enviar notificações:', error);
  }
});
