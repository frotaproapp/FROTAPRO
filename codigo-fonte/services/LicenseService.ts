
import { LicenseRepository } from '../repositories/LicenseRepository'
import { LicenseExpiredError } from '../errors/LicenseExpiredError'

export class LicenseService {
  constructor(private licenseRepo: LicenseRepository) {}

  async validateOrThrow(municipalityId: string): Promise<void> {
    const license = await this.licenseRepo.findActiveByMunicipality(
      municipalityId
    )

    if (!license || !license.isActive()) {
      throw new LicenseExpiredError()
    }
  }
}
