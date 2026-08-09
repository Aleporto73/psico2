# CORRIGEFÁCIL → RELATÓRIO PRÓ — SPEC V1

**Status:** APROVADO  
**Data:** 2026-08-09  
**Escopo:** integração do CorrigeFácil com o Relatório Pró já existente no psico2  
**Princípio central:** CorrigeFácil corrige/classifica; Relatório Pró transforma os dados já corrigidos em texto profissional.

---

## 1. Objetivo

Permitir que uma avaliação corrigida no **CorrigeFácil** gere um relatório usando o **Relatório Pró já existente**, sem criar outro produto, outro motor de IA, outro contador de uso ou outro histórico paralelo.

Separação de responsabilidades:

- **CorrigeFácil:** aplicação/correção, resultado, classificação, gráfico e histórico da avaliação.
- **Relatório Pró:** transformação dos dados já corrigidos em texto profissional revisável.

Regra comercial mantida:

- produto separado do CorrigeFácil;
- 50 relatórios por mês;
- renovação mensal do limite durante 12 meses;
- pagamento único do Relatório Pró conforme regra comercial vigente;
- relatórios gerados a partir de planilhas e do CorrigeFácil consomem o mesmo limite mensal.

---

## 2. Fluxo V1

### 2.1 Antes da correção

Toda avaliação deve ter identificação mínima do avaliado:

- **Nome** — obrigatório;
- **Idade na data da avaliação** — obrigatória;
- **Respondente** — opcional, quando fizer sentido para o instrumento.

Para instrumentos que já exigem data de nascimento e data da avaliação, a idade não deve ser solicitada novamente. Deve-se reutilizar a idade calculada pelo servidor.

A idade não deve participar de nenhum novo cálculo psicométrico no frontend.

### 2.2 Após corrigir

Ordem principal da tela:

1. Resultado;
2. Gráfico;
3. **Gerar relatório**;
4. **Salvar sem relatório**.

### 2.3 Salvar sem relatório

Se o usuário escolher **Salvar sem relatório**, a avaliação deve ser salva normalmente contendo:

- nome;
- idade na data da avaliação;
- data da avaliação;
- respondente, quando houver;
- resultado congelado da avaliação.

Posteriormente, ao abrir a avaliação no histórico, deve existir a ação **Gerar relatório**.

### 2.4 Gerar relatório

Se o usuário escolher **Gerar relatório**:

1. salvar automaticamente a avaliação;
2. obter o `assessment_id`;
3. verificar o acesso ao Relatório Pró;
4. permitir escolher o destino do relatório;
5. permitir observação adicional opcional;
6. o servidor deve buscar a avaliação salva pelo `assessment_id`;
7. montar os dados estruturados destinados à IA;
8. gerar o texto com o motor atual do Relatório Pró;
9. salvar o relatório em `ai_reports`;
10. vincular o relatório à avaliação CorrigeFácil;
11. exibir o relatório sem retirar o usuário do CorrigeFácil.

A IA deve trabalhar sobre o resultado persistido da avaliação, não sobre uma cópia enviada pelo navegador.

---

## 3. Cliente sem Relatório Pró

O botão continua sendo **Gerar relatório**.

Ao acioná-lo sem acesso ativo ao Relatório Pró, deve abrir uma oferta dentro do próprio CorrigeFácil, com fricção mínima.

Mensagem comercial conceitual:

> Transforme este resultado em um relatório profissional.

A oferta deve comunicar o modelo vigente do Relatório Pró, incluindo o limite mensal e a validade anual.

Antes de enviar o usuário ao checkout, a avaliação deve ser salva automaticamente. Assim, nenhum trabalho é perdido e o usuário poderá retornar ao histórico e gerar o relatório após a liberação do produto.

Não enviar o usuário primeiro para `/assistente-pro` apenas para iniciar esse fluxo.

---

## 4. Dados do avaliado

### 4.1 `subject_label`

Passa a representar o **nome do avaliado**.

A decisão substitui, para este fluxo, o uso anterior de somente iniciais/código.

### 4.2 `subject_meta`

Deve armazenar conceitualmente:

- idade na data da avaliação;
- data da avaliação;
- `respondent_name`, quando houver.

Quando a idade vier do servidor, preservar a estrutura realmente calculada, por exemplo:

- `years`;
- `months`;
- `days`;
- `corrected`.

Quando a idade for informada manualmente, guardar apenas a precisão realmente fornecida.

Exemplo: se o usuário informa apenas **8 anos**, não inventar `0 meses` e `0 dias` como se essa precisão tivesse sido coletada.

---

## 5. Dados enviados à IA

A IA deve receber os dados recuperados da **avaliação persistida**.

### 5.1 Identificação

- nome do avaliado;
- idade na data da avaliação;
- data da avaliação;
- respondente, quando houver;
- profissional responsável, profissão e registro obtidos do perfil da conta quando disponíveis.

### 5.2 Instrumento

- código;
- nome;
- tipo de escore.

### 5.3 Escalas/resultados

Para cada escala, somente os campos realmente existentes:

- código/nome da escala;
- bruto;
- score;
- percentil;
- z;
- classificação;
- IC95;
- disponibilidade;
- mensagem;
- flags pertinentes.

### 5.4 Pedido do profissional

- destino do relatório;
- observações adicionais opcionais.

### 5.5 Regra de ausência

O sistema deve preservar a semântica dos dados recebidos:

- `null` não vira zero;
- campo ausente não deve ser inventado;
- `available=false` deve ser respeitado;
- a mensagem do servidor deve ser preservada quando pertinente;
- classificações não devem ser recalculadas.

---

## 6. Dados que NÃO entram na IA para nova interpretação

É proibido usar como base para recálculo/interpretação psicométrica:

- respostas item a item;
- texto integral dos itens;
- tabelas normativas;
- regras de pontuação;
- pontos de corte para a IA calcular;
- configuração dos gráficos;
- faixas visuais criadas apenas para exibição;
- print do gráfico;
- `visual_context`;
- qualquer norma para a IA reinterpretar.

A IA **não é um segundo motor psicométrico**.

---

## 7. Regra central do prompt

Quando a origem for CorrigeFácil, o motor deve receber instrução rígida equivalente a:

> Os resultados fornecidos foram calculados e classificados pelo CorrigeFácil. Preserve-os exatamente. Não recalcule escores, percentis, z, IC95 ou classificações. Não determine pontos de corte, não selecione normas e não produza diagnóstico a partir desses dados isoladamente.

A função da IA é organizar e redigir os dados fornecidos, não corrigi-los novamente.

---

## 8. Destinos do relatório

A V1 terá quatro destinos.

### 8.1 Família

Objetivo: relatório explicativo, profissional e compreensível, sem infantilização.

Estrutura-base:

1. Identificação;
2. Instrumento;
3. Síntese dos resultados;
4. Pontos de atenção;
5. Aspectos favoráveis/preservados, quando sustentados pelos dados;
6. Orientações gerais;
7. Aviso de revisão profissional.

A linguagem pode traduzir termos técnicos, mas não reinterpretar ou alterar o resultado.

### 8.2 Escola

Objetivo: síntese funcional/educacional sem criar causalidades não sustentadas.

Estrutura-base:

1. Identificação;
2. Objetivo;
3. Instrumento;
4. Resultados relevantes;
5. Síntese para o contexto escolar;
6. Pontos para observação/acompanhamento;
7. Sugestões gerais de apoio;
8. Aviso profissional.

É proibido afirmar que determinado resultado explica uma dificuldade escolar específica quando isso não estiver sustentado pelos dados/observações fornecidos.

### 8.3 Equipe multiprofissional

Objetivo: versão mais técnica e completa.

Estrutura-base:

1. Identificação;
2. Instrumento utilizado;
3. Resultados quantitativos disponíveis;
4. Classificações;
5. Síntese técnica;
6. Pontos relevantes para integração com outros dados;
7. Recomendações de acompanhamento;
8. Limitações/observação profissional.

Percentil, z e IC95 aparecem somente quando realmente existirem.

### 8.4 Registro interno

Objetivo: versão curta e operacional.

Estrutura-base:

1. Identificação;
2. Instrumento/data;
3. Resultados principais;
4. Síntese;
5. Observações profissionais;
6. Acompanhamento.

---

## 9. Relatório Pró existente

### 9.1 Reutilizar

A integração deve reutilizar:

- assinatura atual do Relatório Pró;
- validade anual atual;
- contador de 50 relatórios por mês;
- autenticação;
- chamada à OpenAI;
- `ai_reports`;
- histórico do Relatório Pró;
- tipos equivalentes já existentes:
  - `family`;
  - `school`;
  - `technical`;
  - `internal`.

### 9.2 Não criar

Não criar:

- segundo produto de relatório;
- segundo contador;
- carteira paralela de créditos;
- nova assinatura;
- outro motor OpenAI;
- outro histórico independente.

Planilhas e CorrigeFácil compartilham o mesmo limite mensal do Relatório Pró.

---

## 10. Relação avaliação ↔ relatório

A V1 deve permitir:

**1 avaliação CorrigeFácil → N relatórios**.

Exemplo:

- avaliação DASS-21 de uma pessoa;
  - relatório para Família;
  - relatório para Escola;
  - relatório para Equipe multiprofissional.

Cada nova geração consome 1 dos 50 relatórios mensais.

### 10.1 Alteração mínima proposta

Adicionar em `ai_reports` uma referência nullable conceitualmente chamada:

`corrigefacil_assessment_id`

Características:

- referência à avaliação CorrigeFácil;
- nullable para manter compatibilidade com relatórios tradicionais do PsicoPlanilhas;
- **sem UNIQUE**, pois uma avaliação pode gerar vários relatórios.

A implementação deve garantir que um usuário não consiga vincular um relatório a uma avaliação pertencente a outra conta.

Não usar busca textual por nome/título para criar essa relação.

---

## 11. Histórico CorrigeFácil

### 11.1 Avaliação sem relatório

Mostrar ação:

**Gerar relatório**

### 11.2 Avaliação com relatório(s)

Mostrar uma área conceitual:

**Relatórios desta avaliação**

Exemplos:

- Família · data · Ver;
- Escola · data · Ver;
- Equipe multiprofissional · data · Ver.

Também permitir:

**Gerar outro relatório**

Cada geração adicional consome uma nova unidade do limite mensal.

---

## 12. Tratamento de falhas

### 12.1 Avaliação salvou, IA falhou

Não desfazer a avaliação.

Mostrar mensagem equivalente a:

> Avaliação salva. Não foi possível gerar o relatório agora.

Ação:

**Tentar gerar novamente**

### 12.2 Limite mensal atingido

Não chamar a IA.

Informar o limite e bloquear nova geração até a próxima renovação mensal do saldo de uso.

### 12.3 Relatório Pró vencido/inativo

Não chamar a IA.

Mostrar a oferta de renovação/liberação conforme a regra comercial vigente.

---

## 13. Escopo permitido na V1

Pode mudar:

- identificação do avaliado no CorrigeFácil;
- armazenamento da idade;
- UX pós-correção;
- detalhe/histórico da avaliação;
- integração com Relatório Pró;
- prompt específico para origem CorrigeFácil;
- vínculo `ai_reports ↔ assessments`;
- pequena migration necessária exclusivamente para esse vínculo;
- testes da integração.

---

## 14. Escopo proibido na V1

Não mexer em:

- pontuação dos 21 instrumentos;
- normas;
- classificação;
- faixas psicométricas;
- gráficos já aprovados;
- loaders dos instrumentos;
- tabelas normativas;
- Edge para mudar cálculo psicométrico;
- `visual_context`;
- snapshot gráfico;
- novo produto comercial;
- novo contador de créditos;
- nova assinatura;
- novo histórico paralelo;
- interpretação de respostas item a item;
- geração de diagnóstico automático.

Qualquer necessidade fora desta lista exige nova autorização de escopo.

---

## 15. Implementação em blocos

A implementação deve ocorrer em quatro blocos independentes, sem abrir o próximo antes de concluir/revisar o anterior.

### Bloco 1 — Identificação

Objetivo:

- nome + idade;
- persistência correta;
- reutilização da idade calculada pelo servidor onde já existir;
- sem alteração psicométrica.

### Bloco 2 — Vínculo

Objetivo:

- migration mínima para relacionar `ai_reports` à avaliação CorrigeFácil;
- garantir posse do vínculo por usuário;
- permitir 1 avaliação → N relatórios.

### Bloco 3 — Motor

Objetivo:

- reaproveitar o Relatório Pró existente;
- adicionar modo/origem CorrigeFácil;
- montar payload estruturado da avaliação persistida;
- aplicar prompt rígido;
- suportar os quatro destinos.

### Bloco 4 — UX

Objetivo:

- gerar relatório diretamente na tela do resultado;
- gerar relatório posteriormente pelo histórico;
- mostrar relatórios já vinculados à avaliação;
- oferta comercial no próprio CorrigeFácil para quem não possui Relatório Pró;
- manter o mínimo de fricção possível.

Regra de execução de cada bloco:

**auditar → implementar → testar → PR → revisar → merge**.

---

## 16. Próximo passo oficial

O próximo passo autorizado é:

**Bloco 1 — Nome + idade.**

Antes de alterar código, executar auditoria cirúrgica para identificar exatamente quais telas, modelos e testes do CorrigeFácil precisam mudar para exigir nome + idade, preservando integralmente a psicometria e o contrato de resultados existente.

---

## 17. Regra de contenção de escopo

Esta SPEC não autoriza abrir frentes adjacentes.

Em especial, nenhuma etapa pode ser usada como justificativa para alterar normas, pontuação, gráficos, banco psicométrico, `visual_context` ou regras de classificação.

Quando houver dúvida entre reutilizar infraestrutura existente e criar infraestrutura nova, a V1 deve preferir reutilizar o que já existe, desde que isso preserve segurança, rastreabilidade e clareza do vínculo entre avaliação e relatório.
