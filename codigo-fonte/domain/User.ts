
export type UserRole = 'super_admin' | 'admin' | 'operador' | 'consulta'

export class User {
  constructor(
    public readonly id: string,
    public readonly municipalityId: string,
    public role: UserRole,
    public status: 'active' | 'blocked'
  ) {}
}
