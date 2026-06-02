# **PSICOPLANILHAS\_ASSISTANT\_PRO\_SPEC\_v0.1**

## **1\. Objetivo do Documento**

Definir o funcionamento do **Assistente IA Pro** dentro do PsicoPlanilhas 2.0.

Este documento cobre:

1. Acesso ao Assistente IA Pro.  
2. Regra de bloqueio e vencimento anual.  
3. Tela do assistente.  
4. Entrada de dados.  
5. Geração de relatório.  
6. Histórico.  
7. Regras de segurança textual.  
8. Limites técnicos invisíveis.  
9. Regras para o prompt base.

---

## **2\. Definição do Produto**

**Nome comercial:** Assistente IA Pro  
**Preço:** R$50/ano  
**Tipo:** assinatura anual  
**Modelo:** uso liberado enquanto a assinatura estiver ativa  
**Créditos:** não usar  
**Objetivo:** gerar relatórios estruturados a partir de dados informados pelo usuário.

---

## **3\. Diferença entre Assistente GPT Incluso e Assistente IA Pro**

| Item | Assistente GPT Incluso | Assistente IA Pro |
| ----- | ----- | ----- |
| Incluso no R$97 | Sim | Não |
| Preço separado | Não | R$50/ano |
| Abre fora da plataforma | Sim | Não |
| Fica dentro da plataforma | Não | Sim |
| Tem histórico | Não | Sim |
| Tem controle por assinatura | Não | Sim |
| Trava após vencimento | Não | Sim |
| Usa banco do sistema | Não | Sim |

---

## **4\. Regra Comercial**

O Assistente IA Pro é o principal produto de recorrência do PsicoPlanilhas 2.0.

Regra:

O usuário paga R$50 e recebe acesso ao Assistente IA Pro por 1 ano.  
Após 1 ano, o acesso é bloqueado automaticamente.  
Para liberar novamente, o usuário precisa renovar.

---

## **5\. Regra de Acesso**

O sistema deve liberar o Assistente IA Pro somente se:

usuário possui assinatura ativa  
e  
expires\_at \>= data atual

Se não atender à regra:

mostrar cadeado  
bloquear formulário  
mostrar oferta de assinatura ou renovação

---

## **6\. Estados do Assistente IA Pro**

## **6.1 Nunca comprou**

Mostrar:

🔒 Assistente IA Pro bloqueado

Assine por R$50/ano para gerar relatórios diretamente pela plataforma.

Botões:

Assistir vídeo  
Assinar por R$50/ano

---

## **6.2 Ativo**

Mostrar:

✅ Assistente IA Pro ativo

Você pode gerar relatórios diretamente pela plataforma.  
Acesso liberado até: \[data\]

Botões:

Gerar relatório  
Ver histórico

---

## **6.3 Vencido**

Mostrar:

🔒 Sua assinatura expirou

Renove por R$50/ano para voltar a usar o Assistente IA Pro.

Botões:

Renovar agora  
Assistir vídeo

---

## **6.4 Liberado manualmente pelo admin**

Mostrar:

✅ Acesso liberado até: \[data\]

Regra:

A liberação manual também precisa ter data de vencimento.

---

## **7\. Rota Principal**

/app/assistente-pro

Essa rota deve mudar conforme o status do usuário:

| Status | Tela |
| ----- | ----- |
| Sem assinatura | Tela de venda com cadeado |
| Assinatura ativa | Formulário de geração |
| Assinatura vencida | Tela de renovação |
| Cancelado | Tela de reativação |

---

## **8\. Tela Bloqueada**

## **8.1 Elementos obrigatórios**

A tela bloqueada deve conter:

* cadeado visual;  
* título claro;  
* descrição curta;  
* vídeo-banner do Assistente IA Pro;  
* preço R$50/ano;  
* botão de assinatura;  
* lista curta de benefícios;  
* aviso profissional.

## **8.2 Texto base**

Assistente IA Pro

Gere relatórios estruturados com IA usando os dados das suas planilhas.  
Ideal para acelerar a escrita, organizar informações e produzir uma primeira versão revisável.

Assinatura anual: R$50/ano.

## **8.3 Benefícios**

Geração de relatórios estruturados  
Histórico dentro da plataforma  
Apoio a partir dos dados da planilha  
Texto editável e copiável  
Economia de tempo na rotina profissional

## **8.4 Aviso**

O Assistente IA Pro é uma ferramenta de apoio textual.  
A análise final e a revisão são responsabilidade do profissional.

---

## **9\. Tela Ativa**

## **9.1 Elementos obrigatórios**

Quando ativo, mostrar:

1. Status da assinatura.  
2. Data de vencimento.  
3. Formulário de geração.  
4. Histórico recente.  
5. Orientações de uso.  
6. Aviso profissional.

---

## **10\. Formulário de Geração de Relatório**

## **10.1 Campos MVP**

Campos obrigatórios:

Nome ou identificação do avaliado  
Idade ou faixa etária  
Área do relatório  
Dados da planilha  
Objetivo do relatório

Campos opcionais:

Profissão do usuário  
Observações clínicas/educacionais  
Contexto da avaliação  
Upload de print/imagem  
Tom do relatório

---

## **11\. Campo “Área do relatório”**

Opções iniciais:

Psicologia  
Psicopedagogia  
Neuropsicopedagogia  
ABA / Desenvolvimento  
Aprendizagem  
Comportamento  
Outro

---

## **12\. Campo “Objetivo do relatório”**

Opções iniciais:

Relatório descritivo  
Síntese dos resultados  
Texto para devolutiva  
Relatório escolar  
Relatório clínico revisável  
Encaminhamento  
Observações para acompanhamento

---

## **13\. Campo “Dados da planilha”**

O usuário poderá colar:

* resultados;  
* escores;  
* observações;  
* interpretação manual feita por ele;  
* pontos fortes;  
* pontos de atenção;  
* resumo da planilha;  
* dados extraídos do print.

Texto auxiliar:

Cole aqui os dados principais da planilha, observações e informações que deseja usar no relatório.

---

## **14\. Upload de Print/Imagem**

## **14.1 Status no MVP**

Upload de imagem pode entrar no MVP se for tecnicamente simples.

Se complicar custo ou prazo, deixar para fase 2\.

## **14.2 Regra**

A imagem deve ser usada apenas como apoio para extrair/entender dados apresentados pelo usuário.

O sistema não deve prometer leitura perfeita da imagem.

Texto auxiliar:

Você pode enviar um print da planilha como apoio.  
Revise sempre os dados antes de usar o relatório.

---

## **15\. Botão de Geração**

Texto do botão:

Gerar relatório

Estados:

| Estado | Comportamento |
| ----- | ----- |
| Assinatura ativa | Gera relatório |
| Sem assinatura | Mostra cadeado |
| Vencida | Mostra renovar |
| Formulário incompleto | Solicita campos obrigatórios |

---

## **16\. Resultado Gerado**

Após gerar, mostrar:

Relatório gerado

Ações:

Copiar texto  
Salvar no histórico  
Gerar nova versão  
Editar dados

---

## **17\. Estrutura Padrão do Relatório**

O relatório gerado deve seguir esta estrutura base:

1\. Identificação  
2\. Objetivo do relatório  
3\. Dados analisados  
4\. Síntese dos resultados  
5\. Pontos observados  
6\. Indicadores relevantes  
7\. Considerações profissionais  
8\. Sugestões de acompanhamento  
9\. Aviso de revisão profissional

---

## **18\. Texto de Segurança no Final do Relatório**

Todo relatório gerado deve incluir aviso discreto:

Este texto é uma versão inicial de apoio e deve ser revisado pelo profissional responsável antes de qualquer uso formal.

---

## **19\. Regras de Linguagem Permitida**

O assistente pode usar:

sugere  
indica  
aponta  
observa-se  
os dados informados mostram  
há sinais compatíveis com  
recomenda-se análise profissional  
pode ser relevante investigar

---

## **20\. Regras de Linguagem Proibida**

O assistente não deve usar:

diagnostica-se  
o avaliado tem  
confirma transtorno  
resultado oficial  
laudo automático  
dispensa avaliação  
substitui o manual  
aplicação oficial  
conclusão definitiva

---

## **21\. Regra sobre Manuais e Instrumentos**

O Assistente IA Pro não interpreta instrumento protegido como se fosse manual oficial.

Regra:

O usuário é responsável por aplicar, corrigir e interpretar conforme o manual original.  
O assistente apenas ajuda a transformar dados e observações em texto estruturado.

Texto interno de orientação:

Não invente normas, tabelas, pontos de corte, classificação ou interpretação de instrumentos.  
Use apenas os dados fornecidos pelo usuário.  
Quando faltar informação, sinalize que é necessário consultar o manual original.

---

## **22\. Prompt Base — Versão Inicial**

Você é um assistente de apoio à escrita de relatórios profissionais.

Sua função é transformar dados fornecidos pelo usuário em um texto claro, organizado e revisável.

Regras obrigatórias:  
\- Não diagnosticar.  
\- Não afirmar resultado clínico definitivo.  
\- Não substituir avaliação profissional.  
\- Não substituir teste original ou manual.  
\- Não inventar pontos de corte, normas, percentis, classificações ou interpretações.  
\- Usar apenas os dados fornecidos pelo usuário.  
\- Quando faltarem dados, informar que o profissional deve consultar o manual original.  
\- Escrever em linguagem profissional, clara e cautelosa.  
\- Sempre finalizar com aviso de revisão profissional.

Estrutura preferencial:  
1\. Identificação  
2\. Objetivo  
3\. Dados analisados  
4\. Síntese  
5\. Pontos observados  
6\. Considerações  
7\. Sugestões de acompanhamento  
8\. Aviso de revisão profissional

---

## **23\. Modo de Saída**

O assistente deve gerar texto em português do Brasil.

Tom:

profissional  
claro  
ético  
cauteloso  
objetivo

Evitar:

texto sensacionalista  
certeza diagnóstica  
jargão excessivo  
promessa clínica

---

## **24\. Tipos de Relatório MVP**

No MVP, criar poucos tipos:

Relatório descritivo  
Síntese para devolutiva  
Relatório psicopedagógico revisável  
Relatório psicológico revisável  
Relatório de acompanhamento

Não criar 20 modelos no início.

---

## **25\. Histórico de Relatórios**

## **25.1 Regra**

Todo relatório gerado por usuário ativo deve ser salvo em `ai_reports`.

Campos principais:

user\_id  
title  
report\_type  
input\_text  
input\_image\_url  
output\_text  
created\_at

## **25.2 Tela**

O histórico deve mostrar:

Título  
Tipo  
Data  
Botão Ver  
Botão Copiar

## **25.3 Ações**

Ver relatório  
Copiar relatório  
Excluir relatório

---

## **26\. Título Automático do Relatório**

Se o usuário não preencher título, gerar título automático:

Relatório \- \[Nome/Identificação\] \- \[Data\]

Exemplo:

Relatório \- João \- 02/06/2026

---

## **27\. Limites Técnicos Invisíveis**

Embora o produto seja vendido como “ilimitado”, o sistema precisa ter proteção técnica contra abuso.

Não chamar isso de créditos para o usuário.

Usar internamente:

limite de segurança  
política de uso justo  
proteção contra uso automatizado

## **27.1 Limite sugerido**

Para MVP:

até 20 gerações por dia por usuário

Se passar disso:

Você atingiu o limite de segurança diário.  
Tente novamente amanhã ou entre em contato com o suporte.

## **27.2 Por quê**

Esse limite evita:

* abuso;  
* robôs;  
* revenda de acesso;  
* custo descontrolado de IA;  
* uso fora do propósito da plataforma.

---

## **28\. Tamanho de Entrada**

Limite inicial recomendado:

até 12.000 caracteres por geração

Se passar:

O texto enviado está muito longo.  
Reduza as informações ou divida em partes.

---

## **29\. Tamanho de Saída**

Saída recomendada:

entre 800 e 2.000 palavras

Mas o sistema não deve prometer número fixo de páginas.

---

## **30\. Política de Arquivos**

No MVP, aceitar preferencialmente:

PNG  
JPG  
PDF simples, se viável

Se PDF complicar o MVP:

deixar PDF para fase 2

---

## **31\. Segurança e Privacidade**

## **31.1 Aviso ao usuário**

Antes de gerar:

Evite inserir informações desnecessárias ou sensíveis.  
Use apenas os dados relevantes para construir o relatório.

## **31.2 Regra**

O sistema deve guardar apenas o necessário para histórico.

---

## **32\. Botões e Microcopy**

## **32.1 Botões principais**

Gerar relatório  
Copiar relatório  
Salvar no histórico  
Ver histórico  
Renovar assinatura  
Assinar por R$50/ano

## **32.2 Mensagens de erro**

### **Sem assinatura**

Seu Assistente IA Pro está bloqueado.  
Assine por R$50/ano para liberar.

### **Assinatura vencida**

Sua assinatura anual expirou.  
Renove para voltar a gerar relatórios.

### **Erro na geração**

Não foi possível gerar o relatório agora.  
Tente novamente em instantes.

### **Dados insuficientes**

Inclua mais dados ou observações para gerar um relatório melhor.

---

## **33\. Fluxo de Compra**

Usuário clica em Assinar  
↓  
Vai para checkout  
↓  
Pagamento aprovado  
↓  
Webhook registra assinatura  
↓  
started\_at \= data da compra  
expires\_at \= data da compra \+ 1 ano  
↓  
Assistente libera automaticamente

---

## **34\. Fluxo de Renovação**

Usuário vencido clica em Renovar  
↓  
Vai para checkout  
↓  
Pagamento aprovado  
↓  
Sistema cria/atualiza assinatura  
↓  
expires\_at \= data da renovação \+ 1 ano  
↓  
Cadeado desaparece

---

## **35\. Webhook de Pagamento**

O webhook deve:

1. Confirmar pagamento.  
2. Identificar usuário pelo e-mail ou referência.  
3. Criar ou atualizar assinatura.  
4. Definir `expires_at`.  
5. Registrar `payment_reference`.  
6. Liberar acesso.  
7. Enviar e-mail de confirmação.

---

## **36\. Admin do Assistente IA Pro**

## **36.1 Rota**

/admin/assistente

## **36.2 Funções**

Admin pode:

ver assinaturas ativas  
ver assinaturas vencidas  
ativar manualmente  
alterar vencimento  
cancelar acesso  
ver relatórios gerados  
editar prompt base  
ver logs de uso

---

## **37\. Painel de Uso**

Métricas úteis:

relatórios gerados hoje  
relatórios gerados no mês  
usuários ativos do Assistente  
assinaturas vencendo  
assinaturas vencidas  
erros de geração

---

## **38\. E-mails Automáticos**

## **38.1 Compra aprovada**

Assunto:

Assistente IA Pro liberado

Corpo base:

Olá, {{nome}}.

Seu Assistente IA Pro foi liberado com sucesso.  
Acesso válido até {{expires\_at}}.

Acesse sua área de membros para começar a usar.

## **38.2 Assinatura perto do vencimento**

Enviar 7 dias antes.

Assunto:

Seu Assistente IA Pro vence em breve

Corpo base:

Olá, {{nome}}.

Seu acesso ao Assistente IA Pro vence em {{expires\_at}}.  
Renove por R$50/ano para continuar usando sem interrupção.

## **38.3 Assinatura vencida**

Assunto:

Seu Assistente IA Pro expirou

Corpo base:

Olá, {{nome}}.

Sua assinatura do Assistente IA Pro expirou.  
Você ainda mantém acesso às suas planilhas, mas o assistente avançado está bloqueado.

Renove para liberar novamente.

---

## **39\. Regras de MVP**

## **39.1 Entra no MVP**

Tela bloqueada  
Tela ativa  
Checkout anual  
Webhook  
Cadeado por expires\_at  
Formulário textual  
Geração de relatório  
Histórico  
Prompt base seguro  
Limite técnico diário

## **39.2 Pode ficar para Fase 2**

Upload PDF  
Leitura avançada de imagem  
Modelos múltiplos complexos  
Editor rico de relatório  
Exportação PDF  
Assinatura eletrônica  
Integração com prontuário

---

## **40\. Checklist de Validação**

## **40.1 Usuário sem assinatura**

* vê cadeado;  
* não vê formulário;  
* vê preço R$50/ano;  
* consegue ir para checkout.

## **40.2 Usuário ativo**

* vê formulário;  
* gera relatório;  
* relatório salva no histórico;  
* vê vencimento;  
* não vê cadeado.

## **40.3 Usuário vencido**

* vê cadeado;  
* não consegue gerar relatório;  
* vê botão renovar;  
* mantém acesso às planilhas.

## **40.4 Admin**

* consegue ativar manualmente;  
* consegue alterar vencimento;  
* consegue ver relatórios;  
* consegue ver status das assinaturas.

---

## **41\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Assistente Pro custa R$50/ano | Congelado |
| Sem créditos | Congelado |
| Cadeado volta após 1 ano | Congelado |
| Histórico dentro da plataforma | Congelado |
| GPT Builder incluso continua externo | Congelado |
| Prompt não diagnostica | Congelado |
| Manual original continua obrigatório | Congelado |
| Limite técnico invisível contra abuso | Congelado |
| Upload avançado pode ficar para fase 2 | Congelado |

---

## **42\. Frase Norteadora**

O Assistente IA Pro é um recurso anual de apoio à escrita de relatórios, vendido por R$50/ano, liberado por assinatura ativa e bloqueado automaticamente após o vencimento, sem modelo de créditos e sem promessa diagnóstica.

