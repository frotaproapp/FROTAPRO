
import { firestore } from '../../../infra/firebase/firebaseAdmin';

export async function trackUsage(
  municipalityId: string,
  metric: 'login' | 'trip'
) {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  const metricRef = firestore.collection('usage_metrics').doc(`${municipalityId}_${today}`);

  try {
      await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(metricRef);
        
        if (!doc.exists) {
          transaction.set(metricRef, {
            municipalityId,
            date: today,
            logins: metric === 'login' ? 1 : 0,
            tripsCreated: metric === 'trip' ? 1 : 0,
            lastUpdate: new Date()
          });
        } else {
          const currentData = doc.data()!;
          const updates: any = { lastUpdate: new Date() };
          
          if (metric === 'login') {
              updates.logins = (currentData.logins || 0) + 1;
          } else if (metric === 'trip') {
              updates.tripsCreated = (currentData.tripsCreated || 0) + 1;
          }
          
          transaction.update(metricRef, updates);
        }
      });
  } catch (e) {
      console.error(`[METRICS] Falha ao registrar métrica ${metric} para ${municipalityId}:`, e);
      // Não lançamos erro para não bloquear a operação principal (ex: criar viagem)
  }
}
