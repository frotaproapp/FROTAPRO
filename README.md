# FROTAPRO - Sistema de Gestão de Frota

Sistema web institucional para gerenciamento de frota municipal, controle de viagens, pacientes (TFD) e manutenção.

## 🚀 Tecnologias

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend (Serverless)**: Netlify Functions (Node.js)
- **Banco de Dados**: PostgreSQL (Prod) / IndexedDB (Local/Offline)
- **Relatórios**: jsPDF, autoTable

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/frotapro.git
cd frotapro
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 📦 Deploy

O projeto está configurado para deploy no **Netlify**.

1. Conecte o repositório ao Netlify.
2. Configure as variáveis de ambiente no painel do Netlify (se necessário para o banco de dados real):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `API_KEY` (se houver integrações externas)

## 🔑 Acesso Padrão (Local / Fallback)

Se o banco de dados estiver vazio, o sistema aceitará:
- **CPF**: `99631547191`
- **Senha**: `admin123`

## 📄 Licenciamento

Este software é protegido por sistema de licenciamento SaaS.
- Chave de Teste: `FROTAPRO-TRIAL-30D`
- Chave Pro: `FROTAPRO-2024-PRO`

