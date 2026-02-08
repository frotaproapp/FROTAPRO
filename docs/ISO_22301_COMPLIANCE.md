
# DECLARAÇÃO DE CONFORMIDADE ISO 22301:2019
**Sistema:** FROTAPRO GOV  
**Classificação:** DOCUMENTO DE AUDITORIA

## 1. ESCOPO
Este documento detalha como o sistema Frotapro atende aos requisitos da norma internacional **ISO 22301 (Segurança e Resiliência – Sistemas de Gestão de Continuidade de Negócios)**, garantindo a operacionalidade do serviço público mesmo em cenários de desastre.

## 2. REQUISITOS ATENDIDOS

### Cláusula 8.2: Análise de Impacto no Negócio (BIA)
O sistema possui classificação de processos baseada em impacto:
| Processo | Impacto Operacional | RTO (Tempo Objetivo de Recuperação) | RPO (Ponto Objetivo de Recuperação) |
| :--- | :--- | :--- | :--- |
| Gestão de Viagens | Crítico | 4 horas | 24 horas |
| Controle de Frota | Alto | 4 horas | 24 horas |
| Relatórios Gerenciais | Baixo | 24 horas | 24 horas |

### Cláusula 8.3: Estratégias de Continuidade
O Frotapro implementa as seguintes estratégias técnicas:
*   **Redundância de Dados:** Dados replicados geograficamente (Multi-Region Firebase).
*   **Backups Imutáveis:** Armazenamento WORM (Write Once, Read Many) para proteção contra Ransomware.
*   **Ambiente Paralelo (Sandbox):** Infraestrutura segregada para testes de restauração sem risco à produção.

### Cláusula 8.4: Planos de Continuidade de Negócios
*   Procedimentos documentados de **Disaster Recovery (DR)**.
*   Funções e responsabilidades definidas (Matriz RACI) para resposta a incidentes.

### Cláusula 8.5: Exercícios e Testes (DR Drills)
Para validar a eficácia das estratégias, o sistema impõe um cronograma obrigatório de simulações:

*   **Periodicidade:** Trimestral (Janeiro, Abril, Julho, Outubro).
*   **Automação:** Execução automática via Cloud Scheduler.
*   **Evidência:** Geração de relatório imutável na coleção `dr_reports` contendo:
    *   Data/Hora da execução.
    *   Hash do backup utilizado.
    *   Resultado da validação de integridade.
    *   Status de conformidade.

## 3. GOVERNANÇA E AUDITORIA
Todas as operações críticas (Backup, Restore, Simulação) geram logs de auditoria inalteráveis (`audit_logs`), permitindo rastreabilidade total conforme exigido por órgãos de controle (TCE/CGU).

---
**Data da Última Auditoria:** [DATA_ATUAL]  
**Responsável de Continuidade:** Equipe de Engenharia Frotapro
