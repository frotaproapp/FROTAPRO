
# POLÍTICA DE SEGURANÇA DA INFORMAÇÃO, BACKUP E RETENÇÃO DE DADOS
**Sistema:** FROTAPRO GOV  
**Classificação:** DOCUMENTO TÉCNICO OFICIAL

## 1. OBJETIVO
Este documento estabelece as diretrizes técnicas e operacionais para a realização de cópias de segurança (backups), retenção e garantia de integridade dos dados, em conformidade com as exigências dos Tribunais de Contas Estaduais (TCE) e LGPD.

## 2. ARQUITETURA DE ARMAZENAMENTO
O sistema utiliza infraestrutura em nuvem de alta disponibilidade (Firebase/GCP), garantindo:
- **Redundância:** Dados replicados automaticamente.
- **Criptografia:** Dados criptografados em repouso (AES-256) e trânsito (TLS).
- **Imutabilidade:** Backups armazenados em buckets com controle de versão e retenção WORM (Write Once, Read Many).

## 3. POLÍTICA DE BACKUP AUTOMATIZADO

### 3.1. Frequência e Tipologia
1.  **Backup Diário Automático:** Executado via Cloud Function (`dailyBackup`) às 01:00 AM. Exporta todo o banco Firestore para o Cloud Storage.
2.  **Backup Mensal/Anual:** Promoção automática de snapshots diários para pastas de longa duração.

### 3.2. Localização e Segurança
Os backups são armazenados no Google Cloud Storage (Bucket Privado), sem acesso público e segregado do ambiente de execução.

## 4. POLÍTICA DE RETENÇÃO DE DADOS (DATA RETENTION)

| Tipo de Backup | Frequência | Retenção | Justificativa |
| :--- | :--- | :--- | :--- |
| **Diário** | Automático | 30 Dias | Recuperação operacional imediata. |
| **Mensal** | Automático | 12 Meses | Auditoria anual e fiscalização. |
| **Anual** | Automático | 5 Anos | Prescrição legal e histórica. |

## 5. PLANO DE CONTINGÊNCIA (DR) E RESTAURAÇÃO

### 5.1. Procedimento de Restauração
A restauração é uma operação crítica restrita ao **Super Admin** (Proprietário do Software), executada via função `restoreBackup`.
1.  Identificação do incidente.
2.  Seleção do snapshot válido (hash SHA-256 verificado).
3.  Execução da função de importação.
4.  Validação da integridade pós-restore.

### 5.2. Indicadores de Recuperação
- **RPO (Recovery Point Objective):** 24 horas (máximo de perda de dados aceitável).
- **RTO (Recovery Time Objective):** 4 horas (tempo máximo para retorno da operação).

## 6. AUDITORIA
Todas as operações de backup (sucesso/falha) e tentativas de restauração são registradas na coleção `audit_logs`, acessível apenas a auditores e administradores de nível superior.

---
**Responsável Técnico:** Equipe de Engenharia Frotapro  
**Validade:** Indeterminada (Revisão Anual)
