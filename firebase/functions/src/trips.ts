
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FirestoreLicenseRepository } from '../../../infra/firebase/repositories/FirestoreLicenseRepository';
import { LicenseService } from '../../../codigo-fonte/services/LicenseService';
import { CheckLicenseStatus } from '../../../codigo-fonte/use-cases/CheckLicenseStatus';

// Inicializa o Admin SDK se ainda não foi inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

export const createTrip = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Autenticação e Contexto
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const municipalityId = auth.token.municipality_id;
  if (!municipalityId) {
    throw new HttpsError('permission-denied', 'Token inválido: municipality_id ausente.');
  }

  // 2. Validação de Licença (CORE DO SISTEMA)
  const licenseRepo = new FirestoreLicenseRepository();
  const licenseService = new LicenseService(licenseRepo);
  const checkLicense = new CheckLicenseStatus(licenseService);

  const isAllowed = await checkLicense.execute(municipalityId);
  if (!isAllowed) {
    throw new HttpsError(
      'permission-denied', 
      'MODO_RESTRITO: A licença deste município está inativa ou expirada.'
    );
  }

  // 3. Lógica de Negócio (Persistência)
  const db = admin.firestore();
  
  // Sanitização básica (O Core poderia ter um UseCase específico para criar Trip também)
  const tripData = {
    ...data,
    municipalityId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: auth.uid,
    status: 'AGENDADA' // Default
  };

  try {
    const docRef = await db.collection('trips').add(tripData);
    
    // 4. Log de Auditoria
    await db.collection('audit_logs').add({
        municipalityId,
        userId: auth.uid,
        action: 'CREATE_TRIP',
        entity: `trip/${docRef.id}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, tripId: docRef.id };
  } catch (error) {
    console.error("Erro ao criar viagem:", error);
    throw new HttpsError('internal', 'Erro interno ao salvar viagem.');
  }
});
