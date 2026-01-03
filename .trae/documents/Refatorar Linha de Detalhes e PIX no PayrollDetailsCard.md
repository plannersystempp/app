## Objetivo
- Alinhar os botões exatamente com a margem direita (mesmo alinhamento do "Total a Pagar").
- Exibir "Chave PIX" como rótulo acima do valor, sempre presente (em branco quando não houver).
- Aumentar a distância entre a coluna da chave PIX e os botões.
- Manter responsividade: em telas menores, reduzir espaçamentos sem sobreposição.

## Alterações no Layout (Desktop)
1. Transformar a linha abaixo do separador em uma grade explícita de 4 colunas:
   - Coluna 1: Cachês.
   - Coluna 2: Horas Extras.
   - Coluna 3: PIX (label acima do valor + botão copiar).
   - Coluna 4: Ações (botões), com `justify-self-end` para alinhar à direita do card.
2. Classe base da linha:
   - `grid grid-cols-[1fr_1fr_minmax(180px,auto)_auto] gap-1 md:gap-1.5 lg:gap-2 items-start`.

## Exibição da Chave PIX
1. Bloco PIX (coluna 3):
   - Estrutura em coluna: `flex flex-col`.
   - Label: `text-[11px] sm:text-xs text-muted-foreground mb-0.5`.
   - Valor: `truncate` com largura responsiva (`sm:max-w-[220px] md:max-w-[280px] lg:max-w-[360px]`).
   - Botão copiar ao lado do valor.
2. Quando não houver `pixKey`:
   - Exibir valor em branco (`''` ou `—`) e renderizar o botão copiar desabilitado (`disabled`).

## Ações (Botões) e Alinhamento à Direita
1. Coluna 4 reservada para ações.
2. Container de ações:
   - `flex items-center justify-end gap-0 sm:gap-0 md:gap-1 lg:gap-1.5`.
   - Aplicar `justify-self-end` para alinhar com a margem direita interna do card.
3. Espaçamento entre PIX e botões:
   - Garantido pela separação em colunas (PIX col.3 e Ações col.4) e `gap` da grid.
4. Tamanhos dos botões:
   - `h-4 px-1 text-[11px]` (desktop compacto).
   - Em `sm`, manter `sm:px-1` e `sm:gap-0` para máxima compactação.

## Responsividade (sm/md)
1. `sm:`
   - Reduzir `gap` geral para `gap-0.5`.
   - Limitar `max-w` da chave para `sm:max-w-[200px]`.
   - Garantir truncamento para evitar colisões.
2. Mobile (já OK): manter linha em 2 colunas e ações no rodapé do card.

## Implementação
1. Editar `PayrollDetailsCard.tsx`:
   - Substituir container atual da linha por grid com 4 colunas e `justify-self-end` na coluna de ações.
   - Reestruturar bloco PIX para label acima do valor.
   - Renderizar bloco PIX sempre, com placeholder quando `!pixKey` e `Copy` desabilitado.
   - Remover hacks de `ml-auto/pr-*` e usar alinhamento via grid.
2. Revisar classes utilitárias para manter consistência de densidade (paddings/gaps menores).

## Validação
1. Preview em `http://localhost:8080/`:
   - Verificar alinhamento à direita dos botões em vários cards.
   - Checar que a coluna PIX tem label acima do valor e espaçamento visível até os botões.
   - Confirmar que cards sem PIX mostram campo em branco e os botões permanecem presentes.
2. Build sem erros.

## Entregáveis
- Código atualizado em `src/components/payroll/PayrollDetailsCard.tsx` com grid de 4 colunas, PIX sempre visível e ações alinhadas à direita.
- Sem alterações em outros componentes.