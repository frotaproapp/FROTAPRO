
import { firestore } from '../firebaseAdmin'
import { MunicipalityRepository } from '../../../codigo-fonte/repositories/MunicipalityRepository'
import { Municipality } from '../../../codigo-fonte/domain/Municipality'

export class FirestoreMunicipalityRepository
  implements MunicipalityRepository
{
  private collection = firestore.collection('municipalities')

  async findById(id: string): Promise<Municipality | null> {
    const doc = await this.collection.doc(id).get()
    if (!doc.exists) return null

    const data = doc.data()!

    return new Municipality(
      doc.id,
      data.name,
      data.cnpj,
      data.estado,
      data.status
    )
  }

  async updateStatus(
    id: string,
    status: 'active' | 'blocked'
  ): Promise<void> {
    await this.collection.doc(id).update({
      status,
      updatedAt: new Date(),
    })
  }
}
