# **PSICOPLANILHAS\_PAYMENT\_WEBHOOK\_SPEC\_v0.1**

## **1\. Objetivo do Documento**

Definir a integração de pagamento do PsicoPlanilhas 2.0 com a API própria da Asaas.

Este documento cobre:

1. Produto vendido.  
2. Checkout/pagamento.  
3. Criação ou atualização de assinatura.  
4. Webhook de pagamento aprovado.  
5. Renovação anual.  
6. Cancelamento/reembolso.  
7. Logs.  
8. Reprocessamento manual.  
9. Regra do cadeado do Assistente IA Pro.

---

## **2\. Decisão Oficial**

O PsicoPlanilhas 2.0 usará integração própria com a API da Asaas.

Não usar no MVP:

Hotmart  
Mercado Pago  
Stripe  
Paddle  
PagSeguro  
Kiwify  
Eduzz

Regra:

O pagamento do Assistente IA Pro será processado pela API própria da Asaas e controlado internamente no banco do PsicoPlanilhas.

---

## **3\. Produto Principal de Pagamento**

### **Assistente IA Pro**

Nome: Assistente IA Pro  
Preço: R$50,00  
Periodicidade: anual  
Duração de acesso: 1 ano após pagamento confirmado  
Modelo: assinatura anual simples  
Créditos: não usar

Regra comercial:

O usuário paga R$50 e recebe acesso ao Assistente IA Pro por 1 ano.  
Após o vencimento, o cadeado volta automaticamente.

---

## **4\. Produto PsicoPlanilhas R$97**

O produto PsicoPlanilhas Vitalício também poderá usar Asaas, mas a prioridade do MVP é o Assistente IA Pro.

### **PsicoPlanilhas Vitalício**

Nome: PsicoPlanilhas Vitalício  
Preço: R$97,00  
Periodicidade: pagamento único  
Acesso: vitalício

Regra:

Pagamento confirmado do PsicoPlanilhas Vitalício cria uma compra em `purchases`.

---

## **5\. Diferença entre Compra Única e Assinatura**

| Produto | Banco | Regra |
| ----- | ----- | ----- |
| PsicoPlanilhas R$97 | `purchases` | Libera planilhas vitalícias |
| Assistente IA Pro R$50/ano | `subscriptions` | Libera Assistente Pro até `expires_at` |

---

## **6\. Rotas Internas da Aplicação**

Criar rotas internas para pagamento:

/api/asaas/create-checkout  
/api/asaas/webhook  
/api/asaas/reprocess-webhook

### **`/api/asaas/create-checkout`**

Função:

* receber usuário logado;  
* identificar produto;  
* criar cobrança/assinatura na Asaas;  
* retornar link de pagamento ou dados necessários para checkout.

### **`/api/asaas/webhook`**

Função:

* receber eventos da Asaas;  
* validar token;  
* identificar pagamento;  
* atualizar banco;  
* liberar ou bloquear acesso.

### **`/api/asaas/reprocess-webhook`**

Função:

* permitir reprocessamento manual pelo admin;  
* corrigir falha de webhook;  
* registrar log.

---

## **7\. Variáveis de Ambiente**

Configurar:

ASAAS\_API\_KEY=  
ASAAS\_BASE\_URL=  
ASAAS\_WEBHOOK\_TOKEN=  
ASAAS\_ASSISTANT\_PRODUCT\_ID=  
ASAAS\_LIFETIME\_PRODUCT\_ID=  
NEXT\_PUBLIC\_APP\_URL=  
SUPPORT\_EMAIL=

Ambientes:

sandbox  
production

Regra:

Nunca commitar chave da Asaas no repositório.

---

## **8\. Tabelas Envolvidas**

Tabelas principais:

profiles  
products  
purchases  
subscriptions  
admin\_logs  
email\_templates

Tabela recomendada adicional:

payment\_events

---

## **9\. Tabela `payment_events`**

## **9.1 Função**

Guardar todos os eventos recebidos da Asaas para auditoria, debug e reprocessamento.

## **9.2 Campos**

id  
provider  
event\_id  
event\_type  
payment\_id  
subscription\_provider\_id  
customer\_provider\_id  
user\_id  
status  
raw\_payload  
processed\_at  
processing\_error  
created\_at

## **9.3 Valores**

provider \= asaas  
status \= received | processed | ignored | failed

Regra:

Todo webhook recebido deve ser salvo antes de qualquer processamento.

---

## **10\. Fluxo de Compra do Assistente IA Pro**

Usuário logado clica em Assinar R$50/ano  
↓  
Sistema chama /api/asaas/create-checkout  
↓  
Sistema cria cobrança/assinatura na Asaas  
↓  
Usuário paga  
↓  
Asaas envia webhook  
↓  
Sistema valida webhook  
↓  
Sistema localiza usuário  
↓  
Sistema cria/atualiza subscription  
↓  
expires\_at \= data do pagamento \+ 1 ano  
↓  
Assistente IA Pro libera

---

## **11\. Fluxo de Renovação**

Usuário vencido clica em Renovar  
↓  
Sistema gera nova cobrança Asaas  
↓  
Usuário paga  
↓  
Webhook chega  
↓  
Sistema atualiza subscription  
↓  
expires\_at \= data do novo pagamento \+ 1 ano  
↓  
Cadeado desaparece

Regra:

Renovação deve sempre criar novo período de 1 ano a partir da data de pagamento confirmado, salvo decisão comercial futura diferente.

---

## **12\. Regra de Liberação do Assistente IA Pro**

Liberar se:

status \= active ou manual  
expires\_at \>= now()

Bloquear se:

não existe assinatura  
ou status \= expired  
ou status \= cancelled  
ou expires\_at \< now()

Função já definida:

has\_active\_assistant(user\_uuid)

---

## **13\. Eventos Asaas Relevantes**

O sistema deve tratar principalmente eventos de cobrança.

Eventos esperados para MVP:

PAYMENT\_CREATED  
PAYMENT\_CONFIRMED  
PAYMENT\_RECEIVED  
PAYMENT\_OVERDUE  
PAYMENT\_REFUNDED  
PAYMENT\_DELETED

Regra prática:

| Evento | Ação |
| ----- | ----- |
| PAYMENT\_CREATED | registrar evento, não liberar |
| PAYMENT\_CONFIRMED | pode liberar, se política permitir |
| PAYMENT\_RECEIVED | liberar/confirmar acesso |
| PAYMENT\_OVERDUE | não bloquear imediatamente se ainda dentro do prazo interno |
| PAYMENT\_REFUNDED | cancelar acesso Pro relacionado |
| PAYMENT\_DELETED | cancelar ou ignorar conforme contexto |

---

## **14\. Evento que Libera Acesso**

Para MVP, liberar Assistente IA Pro em:

PAYMENT\_CONFIRMED  
PAYMENT\_RECEIVED

Regra:

Se qualquer um desses eventos confirmar pagamento válido, criar ou atualizar assinatura anual.

Evitar duplicidade:

Se `payment_id` já foi processado, não criar nova assinatura duplicada.

---

## **15\. Idempotência**

Webhook pode chegar mais de uma vez.

Regra obrigatória:

Mesmo payment\_id \+ mesmo event\_type não pode gerar efeito duplicado.

Implementar:

verificar payment\_events.payment\_id  
verificar payment\_events.event\_type  
verificar payment\_events.processed\_at

Se já processado:

registrar como ignored  
não alterar assinatura novamente

---

## **16\. Identificação do Usuário**

O webhook precisa localizar o usuário.

Ordem recomendada:

1. metadata enviada na cobrança;  
2. e-mail do cliente;  
3. payment\_reference;  
4. busca manual pelo admin, se falhar.

Metadata recomendada ao criar cobrança:

user\_id  
product\_slug  
plan\_slug  
email

Regra:

Sempre enviar `user_id` interno na criação da cobrança, se a Asaas permitir campo externo/metadata.

---

## **17\. Se Usuário Não Existir**

Caso pagamento chegue para e-mail sem usuário:

criar usuário no Supabase Auth  
criar profile pending\_activation  
criar acesso correspondente  
enviar e-mail para ativar conta

Regra:

Pagamento confirmado não pode ficar perdido.

---

## **18\. Compra do Assistente Pro para Cliente Novo**

Se a pessoa compra Assistente IA Pro mas ainda não tinha conta:

criar usuário  
criar profile  
criar subscription active  
enviar link de ativação

Ela poderá acessar o Assistente Pro após criar senha.

---

## **19\. Compra do PsicoPlanilhas R$97**

Quando pagamento confirmado do produto vitalício:

criar ou localizar usuário  
criar profile, se necessário  
criar purchase paid  
produto \= psicoplanilhas-vitalicio  
enviar link de ativação, se usuário novo

Resultado:

planilhas liberadas  
Assistente GPT incluso  
Assistente IA Pro bloqueado

---

## **20\. Compra Combinada Futura**

Se futuramente vender combo:

PsicoPlanilhas \+ Assistente IA Pro

O webhook deve criar:

purchase paid do psicoplanilhas-vitalicio  
subscription active do assistente-ia-pro

Fica fora do MVP, mas o banco já permite.

---

## **21\. Cancelamento, Reembolso ou Exclusão**

## **21.1 Reembolso do Assistente IA Pro**

Se evento indicar reembolso:

localizar subscription vinculada  
status \= cancelled  
cancelled\_at \= now()  
registrar payment\_reference  
voltar cadeado  
enviar e-mail, se necessário

## **21.2 Reembolso do PsicoPlanilhas R$97**

Se reembolso confirmado:

localizar purchase  
payment\_status \= refunded  
bloquear acesso vitalício, se não houver outra purchase válida  
registrar log

Regra:

Não apagar histórico. Alterar status.

---

## **22\. Pagamento em Atraso**

Evento de atraso não deve bloquear o usuário automaticamente se ele ainda está dentro do período anual pago.

Exemplo:

Usuário pagou em 2026  
expires\_at \= 2027  
nova cobrança vence e fica atrasada

Nesse caso:

se expires\_at ainda é futuro, manter acesso  
se expires\_at já passou, bloquear

Regra:

O cadeado depende do `expires_at` interno, não apenas do status de cobrança externa.

---

## **23\. Webhook — Validação de Segurança**

Antes de processar:

1. validar método HTTP;  
2. validar token/header do webhook;  
3. validar payload;  
4. salvar evento bruto;  
5. verificar idempotência;  
6. processar.

Se token inválido:

retornar 401  
registrar tentativa  
não processar

Se payload inválido:

retornar 400  
registrar erro  
não processar

---

## **24\. Webhook — Resposta HTTP**

Se evento recebido corretamente:

200 OK

Mesmo que evento seja ignorado por duplicidade:

200 OK

Se erro temporário interno:

500

Regra:

Só retornar erro quando quiser que o provedor tente reenviar.

---

## **25\. Processamento do Evento**

Fluxo interno:

Recebe webhook  
↓  
Valida token  
↓  
Salva em payment\_events  
↓  
Identifica tipo do evento  
↓  
Identifica payment\_id  
↓  
Identifica usuário  
↓  
Identifica produto  
↓  
Aplica regra comercial  
↓  
Atualiza purchases/subscriptions  
↓  
Marca evento como processed  
↓  
Envia e-mail, se necessário  
↓  
Registra admin\_log/sistema

---

## **26\. Reprocessamento Manual**

Admin deve ter rota/tela para reprocessar evento com erro.

Rota admin:

/admin/pagamentos/eventos

Ações:

Ver payload  
Ver erro  
Reprocessar  
Marcar como ignorado  
Abrir cliente

Regra:

Reprocessamento deve respeitar idempotência.

---

## **27\. Tela Admin — Pagamentos**

## **27.1 Rota**

/admin/pagamentos

## **27.2 Mostrar**

Cliente  
E-mail  
Produto  
Provider  
Payment ID  
Status  
Evento  
Data  
Processado?  
Erro  
Ações

## **27.3 Filtros**

Todos  
Processados  
Falhos  
Ignorados  
Assistente Pro  
PsicoPlanilhas  
Reembolsados

---

## **28\. Tela Admin — Assinaturas**

Rota:

/admin/assinaturas

Mostrar:

Cliente  
E-mail  
Plano  
Status  
Início  
Vencimento  
Fonte  
Payment reference  
Ações

Ações:

Renovar manualmente  
Alterar vencimento  
Cancelar  
Abrir cliente  
Ver eventos de pagamento

---

## **29\. E-mails Relacionados a Pagamento**

## **29.1 Compra Assistente Pro aprovada**

Evento:

assistant\_purchase

Assunto:

Assistente IA Pro liberado

Corpo:

Olá, {{nome}}.

Seu Assistente IA Pro foi liberado com sucesso.

Acesso válido até: {{expires\_at}}

Acesse sua área de membros para começar a usar.

---

## **29.2 Assistente Pro renovado**

Evento:

assistant\_renewed

Assunto:

Assistente IA Pro renovado

Corpo:

Olá, {{nome}}.

Sua assinatura do Assistente IA Pro foi renovada.

Novo vencimento: {{expires\_at}}

---

## **29.3 Assistente Pro vencendo**

Evento:

assistant\_expiring

Assunto:

Seu Assistente IA Pro vence em breve

Corpo:

Olá, {{nome}}.

Seu Assistente IA Pro vence em {{expires\_at}}.

Renove por R$50/ano para continuar usando sem interrupção.

---

## **29.4 Assistente Pro vencido**

Evento:

assistant\_expired

Assunto:

Seu Assistente IA Pro expirou

Corpo:

Olá, {{nome}}.

Sua assinatura do Assistente IA Pro expirou.

Você ainda mantém acesso às suas planilhas, mas o Assistente IA Pro está bloqueado.

Renove para liberar novamente.

---

## **30\. Rotina de Expiração**

Além do webhook, o sistema precisa verificar vencimentos.

Criar rotina diária:

verificar subscriptions com expires\_at \< now()  
e status \= active  
alterar status para expired

Regra:

O cadeado deve funcionar mesmo que nenhum webhook de atraso chegue.

---

## **31\. Job Diário**

Rodar 1 vez por dia:

1\. localizar assinaturas vencidas  
2\. marcar status \= expired  
3\. enviar e-mail de vencimento, se ainda não enviado  
4\. registrar log

Também pode rodar aviso 7 dias antes:

expires\_at \= hoje \+ 7 dias  
enviar assistant\_expiring

---

## **32\. Logs Obrigatórios**

Registrar:

checkout criado  
webhook recebido  
webhook processado  
webhook ignorado por duplicidade  
webhook falhou  
assinatura criada  
assinatura renovada  
assinatura cancelada  
assinatura expirada  
reembolso processado  
admin reprocessou evento  
admin alterou vencimento

---

## **33\. Segurança**

Obrigatório:

validar token do webhook  
não expor API key no frontend  
não confiar apenas no frontend  
não liberar acesso sem confirmação server-side  
salvar payload bruto  
usar idempotência  
registrar erros

---

## **34\. Testes Obrigatórios**

## **34.1 Pagamento aprovado**

* Criar cobrança teste.  
* Simular pagamento aprovado.  
* Receber webhook.  
* Criar subscription.  
* Definir expires\_at \+ 1 ano.  
* Liberar Assistente Pro.

## **34.2 Duplicidade**

* Enviar mesmo webhook 2 vezes.  
* Não duplicar assinatura.  
* Não estender vencimento duas vezes indevidamente.

## **34.3 Usuário vencido**

* Definir expires\_at passado.  
* Ver cadeado.  
* Renovar.  
* Ver acesso liberado.

## **34.4 Reembolso**

* Simular reembolso.  
* Cancelar subscription.  
* Voltar cadeado.

## **34.5 Falha de webhook**

* Simular evento inválido.  
* Registrar erro.  
* Reprocessar pelo admin.

---

## **35\. Critérios de Bloqueio**

Não lançar se:

webhook não valida token  
pagamento aprovado não libera Pro  
pagamento duplicado duplica assinatura  
reembolso não bloqueia Pro  
usuário sem pagamento acessa Pro  
admin não consegue corrigir falha  
logs não registram eventos

---

## **36\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Pagamento via API própria Asaas | Congelado |
| Hotmart fora do MVP | Congelado |
| Mercado Pago/Stripe fora do MVP | Congelado |
| Assistente Pro custa R$50/ano | Congelado |
| Sem créditos | Congelado |
| Webhook libera assinatura | Congelado |
| Cadeado depende de `expires_at` | Congelado |
| Eventos devem ser idempotentes | Congelado |
| Payload bruto deve ser salvo | Congelado |
| Admin pode reprocessar erro | Congelado |
| Job diário marca vencidos | Congelado |

---

## **37\. Frase Norteadora**

O pagamento do PsicoPlanilhas 2.0 deve ser simples e seguro: a Asaas confirma a cobrança, o webhook atualiza a assinatura interna, o Assistente IA Pro libera por 1 ano e volta ao cadeado quando `expires_at` vencer.

