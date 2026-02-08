
import { License } from '../domain/License'

export interface LicenseRepository {
  findActiveByMunicipality(
    municipalityId: string
  ): Promise<License | null>

  save(license: License): Promise<void>

  expire(licenseId: string): Promise<void>
}
