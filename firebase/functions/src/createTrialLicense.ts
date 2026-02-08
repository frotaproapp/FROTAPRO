
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { firestore } from '../../../infra/firebase/firebaseAdmin';

export const createTrialLicense = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Segurança: Apenas Super Admin
  if (auth?.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Acesso restrito ao Super Admin.');
  }

  const { municipalityId } = data;
  if (!municipalityId) {
    throw new HttpsError('invalid-argument', 'ID do município é obrigatório.');
  }

  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(now.getDate() + 30); // 30 dias hardcoded para regra de negócio Trial

  try {
    // 2. Desativa licenças anteriores para garantir consistência
    const oldLicenses = await firestore.collection('licenses')
      .where('municipalityId', '==', municipalityId)
      .where('status', '==', 'active')
      .get();

    const batch = firestore.batch();
    
    oldLicenses.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'suspended', updatedAt: now });
    });

    // 3. Cria a nova licença Trial
    const newLicenseRef = firestore.collection('licenses').doc();
    batch.set(newLicenseRef, {
      municipalityId,
      type: 'trial',
      status: 'active',
      startsAt: now,
      expiresAt: expiresAt,
      createdAt: now,
      createdBy: auth.uid
    });

    // 4. Garante que o município esteja com status visual 'active'
    const muniRef = firestore.collection('municipalities').doc(municipalityId);
    batch.update(muniRef, { status: 'active' });

    await batch.commit();

    return {
      success: true,
      message: 'Trial de 30 dias ativado com sucesso.',
      licenseId: newLicenseRef.id,
      expiresAt: expiresAt.toISOString()
    };

  } catch (error) {
    console.error("Erro ao criar trial:", error);
    throw new HttpsError('internal', 'Falha ao ativar período de testes.');
  }
});
