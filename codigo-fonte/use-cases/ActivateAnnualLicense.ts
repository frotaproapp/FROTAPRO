
import { License } from '../domain/License'
import { LicenseRepository } from '../repositories/LicenseRepository'

export class ActivateAnnualLicense {
  constructor(private licenseRepo: LicenseRepository) {}

  async execute(
    municipalityId: string,
    processNumber: string,
    empenhoNumber: string
  ): Promise<void> {
    const now = new Date()
    const expires = new Date()
    expires.setFullYear(now.getFullYear() + 1)

    const license = new License(
      crypto.randomUUID(),
      municipalityId,
      'annual',
      'active',
      now,
      expires,
      processNumber,
      empenhoNumber
    )

    await this.licenseRepo.save(license)
  }
}
