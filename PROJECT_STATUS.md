# Status do Projeto PlannerSystem

## 📅 Última Atualização: 27/01/2026

## � 2026-01-27 | Versão: 1.1.2
### 🔹 Hotfix: Correção de Build e Sintaxe JSX
- **O que mudou:** Resolução de erros de tags HTML não fechadas (`</div>`) que quebravam o build do Vite e geravam erros de "símbolo já declarado".
- **Arquivos afetados:** `src/components/Dashboard.tsx`
- **Mudança no DB:** Não
- **Decisões Críticas:** Identificação e remoção de tags órfãs e adição de fechamentos ausentes em blocos condicionais de renderização (Cards de Fornecedores e Avulsos). Build verificado com sucesso.
---

## �🛡️ Status de Produção
- **Estabilidade**: Estável
- **Risco Atual**: Baixo
- **Ambiente**: Produção/Desenvolvimento

## 🚀 Ciclo de Desenvolvimento Atual
**Foco**: Clareza nos Alertas e Visibilidade Financeira

### 🐛 Correções e Melhorias Recentes
1. **Detalhamento do Alerta de Atrasos (UX/Diagnóstico)**:
   - **Problema**: O usuário via "2 pagamentos vencidos" no alerta, mas a lista de "Pagamentos Próximos" (que só mostra Eventos) estava vazia ou incompleta. Isso causava confusão se o atraso fosse de um Pagamento Avulso ou Fornecedor.
   - **Solução**: O alerta global foi refatorado para discriminar a origem da pendência.
   - **Novo Comportamento**: O alerta agora diz: "Existem pendências vencidas: 1 Evento(s), 1 Fornecedor(es)." em vez de apenas um número total.
   - **Benefício**: Elimina a ambiguidade ("Onde está esse pagamento?") e direciona o usuário para o card correto (Eventos, Avulsos ou Fornecedores).

2. **Visibilidade de Pagamentos Atrasados**:
   - Correção no filtro `filterPaymentsByDateRange` para garantir que eventos atrasados sempre apareçam na lista, independente do filtro de data selecionado.

3. **Filtro de Fornecedores sem Data**:
   - **Problema**: Fornecedores com data de pagamento indefinida ou inválida (ex: "0000-00-00") estavam sendo contabilizados como atrasados (pois o parser interpretava como ano 1899 < hoje).
   - **Solução**: Adicionado filtro explícito para ignorar custos sem `payment_date` definido e melhoria no parser de data para rejeitar anos anteriores a 1900.
   - **Resultado**: Alertas de "Fornecedor Atrasado" agora refletem apenas dívidas reais com datas válidas vencidas.

4. **Navegação Inteligente no Alerta**:
   - **Problema**: O botão "Ver Detalhes" do alerta sempre levava para o card de "Próximos Pagamentos" (Eventos), mesmo que o atraso fosse de um Fornecedor ou Pagamento Avulso.
   - **Solução**: Implementada lógica de redirecionamento condicional. O sistema agora identifica o tipo de atraso predominante e rola a tela para o card correto (Eventos, Fornecedores ou Avulsos), destacando-o visualmente e expandindo detalhes se necessário.

## 📂 Estrutura de Arquivos Relevante
```
src/
  components/
    Dashboard.tsx  (Alerta detalhado implementado)
  utils/
    dashboardFilters.ts
```

## 📊 Banco de Dados & Schema
- **Integridade**: Preservada.

## 🛣️ Roadmap Imediato
1.  Validar se a nova mensagem de alerta esclarece a origem dos pagamentos "fantasmas" (provavelmente são avulsos ou fornecedores).
2.  Monitorar logs do console se o problema persistir.

## 📝 Notas Técnicas
- **Transparência**: Alertas agregados devem sempre ser decomponíveis para evitar a sensação de "erro do sistema".
