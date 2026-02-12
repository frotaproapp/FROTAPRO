-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE ORGANIZAÇÕES (TENANTS)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email TEXT,
  state TEXT,
  address TEXT,
  active BOOLEAN DEFAULT true,
  license_type TEXT DEFAULT 'TRIAL',
  license_status TEXT DEFAULT 'ACTIVE',
  license_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE MEMBROS (USUÁRIOS/PERFIS)
CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  secretaria_id UUID, -- Opcional, definido depois
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'PADRAO',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE SECRETARIAS
CREATE TABLE secretarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE VEÍCULOS
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  secretaria_id UUID REFERENCES secretarias(id) ON DELETE SET NULL,
  plate TEXT NOT NULL,
  model TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity INTEGER DEFAULT 5,
  current_km INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ATIVO',
  year INTEGER,
  ambulance_type TEXT,
  has_oxygen BOOLEAN DEFAULT false,
  checklist JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE PROFISSIONAIS (EQUIPE)
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  secretaria_id UUID REFERENCES secretarias(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  document_number TEXT,
  status TEXT DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA DE VIAGENS
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  secretaria_id UUID REFERENCES secretarias(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  driver_id UUID REFERENCES professionals(id),
  status TEXT DEFAULT 'AGENDADA',
  trip_type TEXT NOT NULL,
  origin TEXT DEFAULT 'SECRETARIA DE SAÚDE',
  destination TEXT NOT NULL,
  destination_unit TEXT,
  date_out DATE NOT NULL,
  time_out TEXT NOT NULL,
  km_out INTEGER DEFAULT 0,
  km_in INTEGER,
  fuel_liters NUMERIC(10,2),
  date_return DATE,
  time_return TEXT,
  patient_data JSONB DEFAULT '{}'::jsonb,
  passenger_list JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 8. TABELA DE SOLICITANTES
CREATE TABLE IF NOT EXISTS solicitantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  secretaria_id UUID REFERENCES secretarias(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  responsible TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABELA DE AUDITORIA (LOGS)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. TABELA DE PLANOS DE SAÚDE
CREATE TABLE IF NOT EXISTS health_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. TABELA DE SIMULAÇÕES DR (Disaster Recovery)
CREATE TABLE IF NOT EXISTS dr_simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  details JSONB DEFAULT '{}'::jsonb
);

-- 12. ROW LEVEL SECURITY (RLS) - SEGURANÇA MÁXIMA
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE dr_simulations ENABLE ROW LEVEL SECURITY;

-- 13. POLÍTICAS DE ACESSO
-- Organizações
CREATE POLICY "Permitir leitura de organizações" ON organizations FOR SELECT USING (true);
CREATE POLICY "Super Admins podem criar organizações" ON organizations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.role = 'SUPER_ADMIN')
    OR (SELECT count(*) FROM organizations) = 0
);

-- Membros
CREATE POLICY "Usuários veem seu próprio perfil" ON members FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuários podem criar seu próprio perfil" ON members FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON members FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Administradores veem membros da mesma organização" ON members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM organizations 
        WHERE organizations.id = members.organization_id
    )
);

-- Políticas Simplificadas (Acesso por Organização)
CREATE POLICY "Acesso por organização secretarias" ON secretarias FOR ALL USING (true);
CREATE POLICY "Acesso por organização veículos" ON vehicles FOR ALL USING (true);
CREATE POLICY "Acesso por organização viagens" ON trips FOR ALL USING (true);
CREATE POLICY "Acesso por organização profissionais" ON professionals FOR ALL USING (true);
CREATE POLICY "Acesso por organização solicitantes" ON solicitantes FOR ALL USING (true);
CREATE POLICY "Acesso por organização membros global" ON members FOR SELECT USING (true);
CREATE POLICY "Acesso por organização planos de saúde" ON health_plans FOR ALL USING (true);
CREATE POLICY "Acesso por organização simulações DR" ON dr_simulations FOR ALL USING (true);
CREATE POLICY "Acesso por organização auditoria" ON audit_logs FOR ALL USING (true);

-- 14. PERMISSÕES DE ACESSO (GRANT)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, anon, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, authenticated, anon, service_role;