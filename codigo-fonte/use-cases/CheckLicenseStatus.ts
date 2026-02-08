
import { LicenseService } from '../services/LicenseService'

export class CheckLicenseStatus {
  constructor(private licenseService: LicenseService) {}

  async execute(municipalityId: string): Promise<boolean> {
    try {
      await this.licenseService.validateOrThrow(municipalityId)
      return true
    } catch {
      return false
    }
  }
}
