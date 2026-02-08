
# PLANO DE RECUPERAÇÃO DE DESASTRES (DISASTER RECOVERY PLAN - DRP)
**Sistema:** FROTAPRO GOV  
**Classificação:** DOCUMENTO CRÍTICO DE SEGURANÇA
**Norma de Referência:** ISO 22301:2019

## 1. INTRODUÇÃO
Este documento descreve os procedimentos técnicos e operacionais para a recuperação do sistema Frotapro Gov em caso de incidentes críticos, corrupção de dados ou falhas catastróficas. O plano visa garantir a continuidade dos negócios e minimizar o tempo de inatividade (RTO) e a perda de dados (RPO).

## 2. AMBIENTES DE RESTAURAÇÃO
Para garantir a integridade dos dados antes da restauração em produção, o sistema opera com arquitetura de duplo ambiente:

1.  **Ambiente de Produção `(default)`**: Banco de dados ativo utilizado pelas prefeituras.
2.  **Ambiente Sandbox `(dr-sandbox)`**: Banco de dados isolado exclusivamente para testes de restauração e simulações de crise.

## 3. PROCEDIMENTO DE RESTAURAÇÃO SEGURA

O sistema proíbe a restauração direta de backups em produção sem validação prévia. O fluxo obrigatório é:

### FASE 1: Simulação (Drill)
1.  O Super Administrador seleciona um snapshot de backup válido (armazenado em Cloud Storage WORM).
2.  Aciona a função `restoreToSandbox`.
3.  O sistema restaura os dados no ambiente `dr-sandbox`.
4.  Testes automáticos de integridade (checksum, contagem de coleções, verificação de schema) são executados.
5.  Um relatório de auditoria (`DR_SIMULATION_EXECUTED`) é gerado.

### FASE 2: Promoção para Produção
1.  Somente após a geração do log de sucesso na Fase 1, o botão de "Promoção" é habilitado.
2.  O Super Administrador confirma a operação (com MFA se disponível).
3.  A função `promoteSandboxToProd` copia os dados validados para o ambiente `(default)`.
4.  Um log crítico (`SANDBOX_PROMOTED_TO_PROD`) é gravado de forma imutável.

## 4. CRONOGRAMA ANUAL DE SIMULAÇÃO OBRIGATÓRIA

Para conformidade com a ISO 22301 (Cláusula 8.5), os seguintes testes são mandatórios:

| Período | Tipo de Simulação | Ambiente | Responsável |
| :--- | :--- | :--- | :--- |
| **Janeiro** | Restore Completo | Sandbox | Automático (Sistema) |
| **Abril** | Restore Parcial | Sandbox | Automático (Sistema) |
| **Julho** | Falha Lógica Simulada | Sandbox | Automático (Sistema) |
| **Outubro** | Restore + Promoção Simulada | Sandbox | Automático (Sistema) |

*Nota: O sistema executa automaticamente estes testes via Cloud Scheduler e registra o resultado em `dr_reports`.*

## 5. CENÁRIOS DE DESASTRE E RESPOSTAS

| Cenário | Resposta | RTO Estimado |
| :--- | :--- | :--- |
| **Exclusão Acidental de Dados** | Executar restore parcial ou total via Sandbox. | 30 min |
| **Corrupção Lógica de Dados** | Identificar backup íntegro anterior, validar no Sandbox, promover. | 1 hora |
| **Ataque de Ransomware** | O sistema usa Cloud Storage com versionamento e WORM. Restaurar última versão limpa. | 2 horas |
| **Falha Total do Datacenter (Region)** | Ativar réplica em região secundária (se contratado plano Enterprise). | 4 horas |

## 6. AUDITORIA E CONFORMIDADE
Todas as operações de DR são registradas na coleção `audit_logs` e não podem ser apagadas. O relatório de simulação contém:
*   ID do Operador / Sistema
*   Data/Hora
*   Hash do Backup utilizado
*   Resultado da validação estrutural

Este procedimento atende aos requisitos de segurança da informação exigidos pelos Tribunais de Contas (TCE/TCU) para sistemas de gestão pública.

---
**Data da Última Revisão:** [DATA_ATUAL]  
**Responsável Técnico:** Equipe de Engenharia Frotapro
