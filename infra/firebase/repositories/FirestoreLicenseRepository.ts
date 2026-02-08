
import { firestore } from '../firebaseAdmin'
import { LicenseRepository } from '../../../codigo-fonte/repositories/LicenseRepository'
import { License } from '../../../codigo-fonte/domain/License'

export class FirestoreLicenseRepository implements LicenseRepository {
  private collection = firestore.collection('licenses')

  async findActiveByMunicipality(
    municipalityId: string
  ): Promise<License | null> {
    const snapshot = await this.collection
      .where('municipalityId', '==', municipalityId)
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()

    return new License(
      doc.id,
      data.municipalityId,
      data.type,
      data.status,
      data.startsAt.toDate(),
      data.expiresAt.toDate(),
      data.processNumber,
      data.empenhoNumber
    )
  }

  async save(license: License): Promise<void> {
    await this.collection.doc(license.id).set({
      municipalityId: license.municipalityId,
      type: license.type,
      status: license.status,
      startsAt: license.startsAt,
      expiresAt: license.expiresAt,
      processNumber: license.processNumber || null,
      empenhoNumber: license.empenhoNumber || null,
      createdAt: new Date(),
    })
  }

  async expire(licenseId: string): Promise<void> {
    await this.collection.doc(licenseId).update({
      status: 'expired',
      expiredAt: new Date(),
    })
  }
}
