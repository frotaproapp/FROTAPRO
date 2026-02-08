
-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE ORGANIZAÇÕES (TENANTS)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  state TEXT,
  address TEXT,
  active BOOLEAN DEFAULT true,
  license_type TEXT DEFAULT 'TRIAL',
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

-- 8. TABELA DE AUDITORIA (LOGS)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ROW LEVEL SECURITY (RLS) - SEGURANÇA MÁXIMA
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Exemplo de política para VEÍCULOS (Somente mesma organização)
CREATE POLICY "Membros veem veiculos da sua org" ON vehicles
  FOR ALL USING (organization_id = (SELECT organization_id FROM members WHERE id = auth.uid()));

CREATE POLICY "Membros veem viagens da sua org" ON trips
  FOR ALL USING (organization_id = (SELECT organization_id FROM members WHERE id = auth.uid()));

CREATE POLICY "Membros veem membros da sua org" ON members
  FOR ALL USING (organization_id = (SELECT organization_id FROM members WHERE id = auth.uid()));
