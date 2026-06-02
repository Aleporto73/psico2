# **PSICOPLANILHAS\_DEV\_PROMPT\_v0.1**

## **1\. Função deste Documento**

Este é o prompt mestre para orientar uma IA/dev na implementação do PsicoPlanilhas 2.0.

A IA/dev deve seguir este documento como fonte principal de execução.

Não inventar escopo.

Não transformar o projeto em SaaS complexo.

Não criar sistema clínico.

Não criar editor de planilhas.

Não criar sistema de créditos.

---

## **2\. Missão**

Construir o **PsicoPlanilhas 2.0**, uma área de membros simples para:

1. entregar planilhas em Google Sheets;  
2. ativar clientes antigos por e-mail;  
3. liberar acesso vitalício às planilhas;  
4. vender Assistente IA Pro por R$50/ano;  
5. bloquear o Assistente IA Pro após 1 ano;  
6. exibir vídeo-banners comerciais segmentados;  
7. vender outros produtos da empresa.

---

## **3\. Contexto do Projeto**

O sistema antigo roda em PHP.

O antigo parceiro/dev saiu.

Não há acesso confiável ao banco antigo.

Existe uma lista de e-mails dos clientes antigos.

A base antiga tem aproximadamente 3.000 usuários sem recorrência.

Esses clientes devem manter acesso vitalício às planilhas, mas não recebem o Assistente IA Pro automaticamente.

---

## **4\. Produto Principal**

### **PsicoPlanilhas Vitalício**

* Preço: R$97.  
* Pagamento único.  
* Acesso vitalício.  
* Entrega: links de Google Sheets.  
* Inclui Assistente GPT Builder externo.  
* Não inclui Assistente IA Pro interno.

---

## **5\. Produto Recorrente**

### **Assistente IA Pro**

* Preço: R$50/ano.  
* Acesso por 1 ano.  
* Sem créditos.  
* Com histórico dentro da plataforma.  
* Bloqueia automaticamente ao vencer.  
* Volta a mostrar cadeado após `expires_at`.

Regra:

Se status \= active/manual  
E expires\_at \>= hoje  
Então libera Assistente IA Pro.

Caso contrário  
Mostra cadeado.

---

## **6\. O Que o Sistema É**

O PsicoPlanilhas 2.0 é:

* área de membros;  
* biblioteca de links de planilhas;  
* hub comercial;  
* vitrine de produtos;  
* sistema simples de assinatura anual;  
* sistema simples de ativação por e-mail;  
* painel admin operacional.

---

## **7\. O Que o Sistema NÃO É**

O PsicoPlanilhas 2.0 não é:

* sistema clínico;  
* prontuário;  
* avaliação psicológica;  
* aplicação oficial de teste;  
* substituto de manual;  
* ferramenta diagnóstica;  
* editor de planilha;  
* LMS completo;  
* CRM;  
* marketplace complexo;  
* sistema de créditos.

---

## **8\. Regra das Planilhas**

As planilhas servem para agilizar o trabalho de quem já faria manualmente.

Texto obrigatório:

Esta planilha é um recurso de apoio operacional.  
Ela agiliza cálculos, organização e visualização dos dados.  
O uso correto exige o manual original do instrumento.  
Não substitui avaliação profissional, teste original, manual ou interpretação clínica.

Linguagem permitida:

apoio operacional  
organização dos dados  
auxílio na correção  
cálculo automatizado  
visualização de resultados  
apoio para relatório  
uso com manual original

Linguagem proibida:

diagnóstico automático  
laudo automático  
teste oficial  
substitui manual  
resultado definitivo  
aplicação oficial  
avaliação completa

---

## **9\. Stack Obrigatória Recomendada**

Usar:

Next.js  
TypeScript  
Supabase Auth  
Supabase Postgres  
Supabase Storage  
Tailwind CSS  
shadcn/ui  
OpenAI API  
Mercado Pago ou Stripe  
Resend ou Brevo  
Vercel

Preferência:

Supabase Auth gerencia login e senha.  
Tabela profiles guarda dados comerciais.

Não criar sistema próprio de senha.

---

## **10\. Rotas Públicas**

Criar:

/  
 /login  
 /ativar-acesso  
 /esqueci-senha  
 /definir-senha

---

## **11\. Rotas do Cliente**

Criar:

/app  
/app/planilhas  
/app/assistente-gpt  
/app/assistente-pro  
/app/produtos  
/app/minha-conta

---

## **12\. Rotas do Admin**

Criar:

/admin  
/admin/clientes  
/admin/clientes/\[id\]  
/admin/importacao  
/admin/planilhas  
/admin/produtos  
/admin/banners  
/admin/assinaturas  
/admin/relatorios-ia  
/admin/emails  
/admin/configuracoes

---

## **13\. Banco de Dados**

Criar tabelas:

profiles  
products  
purchases  
subscriptions  
activation\_tokens  
promo\_banners  
ai\_reports  
email\_templates  
admin\_logs

Não criar:

credits  
ai\_credits  
credit\_logs

---

## **14\. Tabela `profiles`**

Finalidade:

Guardar dados comerciais do usuário.

Campos mínimos:

id  
name  
email  
phone  
role  
profile\_type  
status  
activation\_status  
source  
imported\_at  
created\_at  
updated\_at  
last\_login\_at

Valores:

role: admin | customer  
profile\_type: psychologist | psychopedagogue | both | unknown  
status: active | blocked | inactive  
activation\_status: pending\_activation | active

---

## **15\. Tabela `products`**

Finalidade:

Guardar planilhas, assistentes, produtos externos e bundles.

Campos mínimos:

id  
name  
slug  
type  
audience  
category  
description  
image\_url  
access\_url  
tutorial\_url  
video\_url  
checkout\_url  
price  
billing\_type  
is\_active  
sort\_order  
created\_at  
updated\_at

Valores:

type: spreadsheet | assistant | external\_product | tutorial | bundle  
audience: all | psychologist | psychopedagogue | both  
billing\_type: one\_time | yearly | external | free

Produtos fixos obrigatórios:

psicoplanilhas-vitalicio  
assistente-ia-pro

---

## **16\. Tabela `purchases`**

Finalidade:

Controlar compras únicas e acesso vitalício.

Campos mínimos:

id  
user\_id  
product\_id  
purchase\_code  
payment\_status  
payment\_reference  
source  
purchased\_at  
created\_at

Regra:

Se existe purchase do produto psicoplanilhas-vitalicio  
com payment\_status \= paid ou manual,  
usuário tem acesso vitalício às planilhas.

Cliente antigo importado:

payment\_status \= manual  
source \= old\_php\_email\_import

---

## **17\. Tabela `subscriptions`**

Finalidade:

Controlar Assistente IA Pro anual.

Campos mínimos:

id  
user\_id  
product\_id  
plan\_slug  
status  
started\_at  
expires\_at  
renewed\_at  
cancelled\_at  
payment\_reference  
source  
created\_at  
updated\_at

Regra:

Assistente liberado:  
status \= active/manual  
expires\_at \>= now()

Assistente bloqueado:  
sem assinatura  
ou expires\_at \< now()  
ou status \= expired/cancelled

---

## **18\. Tabela `activation_tokens`**

Finalidade:

Controlar link de ativação e reset, se o fluxo nativo do Supabase não cobrir tudo.

Campos mínimos:

id  
user\_id  
email  
token\_hash  
purpose  
expires\_at  
used\_at  
created\_at

Regras:

Nunca salvar token puro.  
Salvar apenas token\_hash.  
Token expira.  
Token é de uso único.  
Novo token invalida anterior.

---

## **19\. Tabela `promo_banners`**

Finalidade:

Controlar vídeo-banners comerciais.

Campos mínimos:

id  
title  
subtitle  
audience  
image\_url  
video\_url  
button\_text  
button\_url  
secondary\_button\_text  
secondary\_button\_url  
position  
is\_active  
sort\_order  
created\_at  
updated\_at

Banners obrigatórios:

Assistente IA Pro  
Produtos para Psicólogos  
Produtos para Psicopedagogos

---

## **20\. Tabela `ai_reports`**

Finalidade:

Guardar histórico dos relatórios gerados pelo Assistente IA Pro.

Campos mínimos:

id  
user\_id  
title  
report\_type  
input\_text  
input\_image\_url  
output\_text  
created\_at

Regra:

Só usuário com Assistente IA Pro ativo pode gerar relatório.

---

## **21\. Tabela `email_templates`**

Finalidade:

Guardar templates editáveis.

Eventos mínimos:

access\_activation  
activation\_reminder  
password\_reset  
assistant\_purchase  
assistant\_expiring  
assistant\_expired  
assistant\_renewed

---

## **22\. Tabela `admin_logs`**

Finalidade:

Registrar ações sensíveis.

Logar obrigatoriamente:

importar clientes  
reenviar ativação  
bloquear usuário  
desbloquear usuário  
alterar e-mail  
liberar acesso vitalício  
cancelar acesso vitalício  
ativar Assistente Pro  
alterar vencimento  
cancelar Assistente Pro  
editar link de planilha  
editar banner  
abrir relatório IA

---

## **23\. Funções Obrigatórias**

Criar função:

has\_lifetime\_access(user\_uuid)

Regra:

Retorna true se o usuário tem purchase paid/manual do produto psicoplanilhas-vitalicio.

Criar função:

has\_active\_assistant(user\_uuid)

Regra:

Retorna true se o usuário tem subscription active/manual do produto assistente-ia-pro com expires\_at \>= now().

---

## **24\. View Obrigatória**

Criar view:

user\_access\_status

Deve mostrar:

user\_id  
name  
email  
profile\_type  
status  
activation\_status  
last\_login\_at  
has\_lifetime\_access  
has\_active\_assistant  
assistant\_expires\_at

---

## **25\. Fluxo de Migração**

Entrada:

CSV com name,email

CSV recomendado:

name,email,phone,purchase\_code,purchase\_date,profile\_type,source

Fluxo:

Upload CSV  
Validar colunas  
Normalizar e-mails  
Detectar duplicados  
Criar usuário no Supabase Auth  
Criar profile pending\_activation  
Criar purchase manual vitalícia  
Gerar link de ativação  
Enviar e-mail de ativação

Resultado:

Cliente antigo:  
\- acessa planilhas após ativar  
\- recebe Assistente GPT Builder incluso  
\- vê Assistente Pro com cadeado  
\- vê vídeo-banners

Não fazer:

não criar subscription para cliente antigo  
não liberar Assistente Pro automaticamente  
não criar senha padrão

---

## **26\. Fluxo `/ativar-acesso`**

Tela pública.

Texto:

Já era cliente PsicoPlanilhas?

Digite o e-mail usado na compra para ativar seu novo acesso.  
Você receberá um link para criar sua nova senha.

Resposta obrigatória:

Se este e-mail estiver cadastrado, você receberá um link de ativação.

Nunca mostrar:

E-mail não encontrado.  
E-mail encontrado.  
Você não é cliente.

Motivo:

Evitar exposição da base de clientes.

---

## **27\. Login**

Rota:

/login

Campos:

E-mail  
Senha

Botões:

Entrar  
Esqueci minha senha  
Ativar meu acesso

Regras:

Supabase Auth valida credenciais.  
Se status \= blocked, bloquear acesso.  
Se role \= admin, ir para /admin.  
Se role \= customer, ir para /app.  
Atualizar last\_login\_at.

---

## **28\. Reset de Senha**

Rota:

/esqueci-senha

Resposta pública sempre neutra:

Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.

Admin nunca define senha manualmente.

Admin apenas envia link de reset.

---

## **29\. Primeiro Login**

Se:

profile\_type \= unknown

mostrar pergunta:

Qual é o seu perfil principal?

Opções:

Psicólogo(a)  
Psicopedagogo(a) / Neuropsicopedagogo(a)  
Atuo nas duas áreas  
Responder depois

Essa escolha não bloqueia acesso às planilhas.

---

## **30\. Dashboard do Cliente**

Rota:

/app

Ordem dos blocos:

Boas-vindas  
Card Minhas Planilhas  
Vídeo-banner Assistente IA Pro  
Vídeo-banner segmentado por perfil  
Produtos recomendados  
Aviso de uso responsável

Regra:

O usuário deve entender em 10 segundos:  
onde estão as planilhas,  
onde está o assistente,  
e quais produtos pode conhecer.

---

## **31\. Área de Planilhas**

Rota:

/app/planilhas

Cada card:

imagem  
nome  
categoria  
descrição curta  
botão Acessar Planilha  
botão Ver Tutorial

O botão abre:

products.access\_url

Somente planilhas ativas aparecem.

---

## **32\. Assistente GPT Incluso**

Rota:

/app/assistente-gpt

Função:

Mostrar explicação curta.  
Abrir link externo do GPT Builder.  
Reforçar que é apoio textual.

Botão:

Abrir Assistente GPT

---

## **33\. Assistente IA Pro**

Rota:

/app/assistente-pro

Estados:

Sem assinatura: cadeado \+ oferta R$50/ano.  
Ativo: formulário \+ histórico \+ vencimento.  
Vencido: cadeado \+ renovar.  
Manual: liberado até data definida.

---

## **34\. Formulário do Assistente IA Pro**

Campos MVP:

Nome ou identificação do avaliado  
Idade ou faixa etária  
Área do relatório  
Dados da planilha  
Objetivo do relatório  
Observações opcionais  
Upload de imagem, se viável

Botão:

Gerar relatório

Regra:

O botão só funciona se has\_active\_assistant(user\_id) \= true.

---

## **35\. Prompt Seguro do Assistente**

O assistente deve:

transformar dados em texto profissional  
usar apenas dados fornecidos  
não diagnosticar  
não inventar pontos de corte  
não substituir manual  
não afirmar resultado definitivo  
não gerar laudo automático  
finalizar com aviso de revisão profissional

Aviso final obrigatório:

Este texto é uma versão inicial de apoio e deve ser revisado pelo profissional responsável antes de qualquer uso formal.

---

## **36\. Vídeo-Banners**

Três banners principais:

1\. Assistente IA Pro  
2\. Produtos para Psicólogos  
3\. Produtos para Psicopedagogos

Regra visual:

Vídeos aparecem como banner.  
Vídeo abre em modal.  
Não usar autoplay.  
Não mostrar três players abertos no dashboard.

Exibição:

psychologist: Assistente IA Pro \+ Psicólogos  
psychopedagogue: Assistente IA Pro \+ Psicopedagogos  
both: Assistente IA Pro \+ Psicólogos \+ Psicopedagogos  
unknown: Assistente IA Pro \+ escolha de perfil

---

## **37\. Admin Mínimo**

Admin deve conseguir:

listar clientes  
buscar cliente  
ver ativação  
reenviar ativação  
enviar reset  
bloquear/desbloquear  
liberar acesso vitalício  
ativar Assistente Pro manualmente  
alterar vencimento  
importar CSV  
cadastrar planilhas  
editar links  
cadastrar produtos  
cadastrar banners  
ver assinaturas  
ver relatórios IA  
editar e-mails

---

## **38\. Admin — Importação**

Rota:

/admin/importacao

Funções:

Upload CSV  
Prévia  
Validação  
Duplicados  
Confirmação  
Importação  
Relatório de erros  
Envio de ativação

Importação deve ser testada antes com lote pequeno.

Lotes recomendados:

20 usuários  
100 usuários  
500 usuários  
restante

---

## **39\. Pagamento do Assistente IA Pro**

Produto:

Assistente IA Pro  
R$50/ano

Fluxo:

Cliente clica em assinar  
Checkout  
Pagamento aprovado  
Webhook localiza usuário por e-mail  
Cria/atualiza subscription  
started\_at \= now()  
expires\_at \= now() \+ 1 ano  
status \= active

Renovação:

Novo pagamento aprovado  
expires\_at \= now() \+ 1 ano  
status \= active

---

## **40\. Webhook**

Webhook deve:

validar pagamento  
localizar usuário  
criar usuário se necessário  
criar/atualizar subscription  
registrar payment\_reference  
enviar e-mail de confirmação  
registrar log

Se falhar:

registrar erro  
permitir reprocessamento manual pelo admin

---

## **41\. E-mails Obrigatórios**

Criar templates para:

Ativação de acesso  
Lembrete de ativação  
Reset de senha  
Compra Assistente Pro  
Assistente vencendo  
Assistente vencido  
Renovação confirmada

---

## **42\. Segurança**

Obrigatório:

RLS ativado  
cliente vê apenas próprios dados  
admin vê tudo  
resposta neutra em ativação/reset  
rate limit em ativar-acesso  
sem senha padrão  
sem token puro no banco  
logs em ações sensíveis

---

## **43\. Testes Obrigatórios**

Testar personas:

### **Cliente antigo**

importado  
recebe ativação  
cria senha  
entra  
vê planilhas  
vê Assistente Pro bloqueado

### **Cliente novo R$97**

compra  
recebe acesso  
entra  
vê planilhas  
vê Pro bloqueado

### **Cliente com Pro ativo**

compra Pro  
acessa formulário  
gera relatório  
histórico salva

### **Cliente vencido**

Pro expira  
cadeado volta  
planilhas continuam  
renovação libera novamente

### **Admin**

importa base  
busca cliente  
reenvia ativação  
libera vitalício  
ativa Pro  
edita vencimento  
edita planilha  
edita banner

---

## **44\. Ordem de Execução Obrigatória**

Executar nesta ordem:

1\. Setup Next.js/Supabase  
2\. Banco  
3\. Auth  
4\. Ativação por e-mail  
5\. Admin clientes  
6\. Acesso vitalício  
7\. Importação CSV  
8\. Dashboard cliente  
9\. Planilhas  
10\. Cadeado Assistente Pro  
11\. Vídeo-banners  
12\. Assistente Pro  
13\. Pagamentos  
14\. E-mails automáticos  
15\. QA  
16\. Deploy

Não inverter.

---

## **45\. Definition of Done**

O MVP estará pronto quando:

cliente antigo ativa acesso por e-mail  
cliente antigo acessa planilhas  
cliente antigo vê Pro bloqueado  
cliente compra Pro  
Pro libera por 1 ano  
Pro bloqueia após vencimento  
admin importa clientes  
admin reenvia ativação  
admin edita planilhas e banners  
vídeo-banners aparecem por perfil  
relatórios Pro são gerados e salvos

---

## **46\. Proibido Inventar**

Não implementar no MVP:

créditos  
assinatura mensal  
editor de planilha  
prontuário  
sistema clínico  
LMS  
comunidade  
CRM  
afiliados  
cupons complexos  
login social  
multiempresa  
dashboard financeiro complexo

---

## **47\. Entrega Esperada da IA/dev**

Ao executar, entregar sempre:

1\. O que foi feito  
2\. Arquivos criados/alterados  
3\. Como testar  
4\. Riscos ou pendências  
5\. Próximo passo recomendado

Nunca entregar código sem explicar como testar.

---

## **48\. Frase Norteadora**

Construa o PsicoPlanilhas 2.0 como uma área de membros simples: ativar clientes antigos por e-mail, entregar planilhas vitalícias, vender o Assistente IA Pro anual e exibir produtos complementares por vídeo-banners limpos.

