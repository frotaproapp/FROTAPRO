
export type MunicipalityStatus = 'active' | 'blocked'

export class Municipality {
  constructor(
    public readonly id: string,
    public name: string,
    public cnpj: string,
    public estado: string,
    public status: MunicipalityStatus = 'active'
  ) {}
}
