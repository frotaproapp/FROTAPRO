
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FirestoreLicenseRepository } from '../../../infra/firebase/repositories/FirestoreLicenseRepository';
import { FirestoreAuditRepository } from '../../../infra/firebase/repositories/FirestoreAuditRepository';
import { firestore } from '../../../infra/firebase/firebaseAdmin';
import { AuditLog } from '../../../codigo-fonte/domain/AuditLog';
import { trackUsage } from './services/metrics'; // Importa o rastreador

export const createTrip = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const municipalityId = auth.token.municipality_id;
  const userId = auth.uid;

  if (!municipalityId) {
    throw new HttpsError('permission-denied', 'Prefeitura não identificada no token');
  }

  // Validação de Licença
  const licenseRepo = new FirestoreLicenseRepository();
  const license = await licenseRepo.findActiveByMunicipality(municipalityId);

  if (!license || !license.isActive()) {
    throw new HttpsError('permission-denied', 'SISTEMA BLOQUEADO: Licença expirada.');
  }

  const { vehicleId, driverId, kmStart, destination } = data;

  try {
    const tripRef = await firestore.collection('trips').add({
      municipalityId,
      vehicleId,
      driverId,
      kmStart,
      destination: destination || '',
      date: new Date(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userId,
      status: 'AGENDADA'
    });

    // Auditoria
    const auditRepo = new FirestoreAuditRepository();
    const auditLog = new AuditLog(municipalityId, userId, 'CREATE_TRIP', `trip/${tripRef.id}`);
    await auditRepo.save(auditLog);

    // Métrica de Uso (KPI Oficial)
    // Executa em background (sem await) para não atrasar a resposta
    trackUsage(municipalityId, 'trip').catch(console.error);

    return { success: true, tripId: tripRef.id };

  } catch (error) {
    console.error("Erro createTrip:", error);
    throw new HttpsError('internal', 'Erro ao salvar viagem.');
  }
});
