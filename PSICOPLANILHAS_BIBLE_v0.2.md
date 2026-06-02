# **PSICOPLANILHAS\_BIBLE\_v0.2**

## **1\. Identidade do Projeto**

**Nome:** PsicoPlanilhas 2.0  
**Tipo:** Área de membros simples \+ biblioteca de planilhas \+ hub comercial \+ assistente de relatórios.  
**Status:** Reconstrução do sistema PHP antigo em stack moderna.  
**Stack recomendada:** Next.js \+ TypeScript \+ Supabase \+ Tailwind/shadcn \+ OpenAI API.

---

## **2\. Definição Curta**

O PsicoPlanilhas 2.0 é uma área de membros simples para entregar planilhas profissionais em Google Sheets, liberar o Assistente GPT Builder incluso no acesso vitalício, vender o Assistente IA Pro anual e divulgar outros produtos da empresa por meio de vídeo-banners comerciais segmentados.

---

## **3\. Mudança Crítica da v0.2**

A migração não dependerá do banco antigo.

Situação real:

* existe lista de e-mails dos clientes;  
* não há acesso ao banco de dados antigo;  
* não há senha antiga confiável;  
* não há como migrar login/senha do PHP antigo;  
* os clientes antigos terão que criar nova senha.

Decisão oficial:

A migração será baseada na lista de e-mails.  
Cada cliente antigo será importado como usuário com acesso vitalício manual.  
O acesso será ativado por link enviado ao e-mail de compra.

---

## **4\. O Que o Projeto É**

O PsicoPlanilhas 2.0 é:

* uma área de login para clientes;  
* uma biblioteca organizada de planilhas;  
* um local para acessar links de Google Sheets;  
* uma área para acessar o Assistente GPT Builder incluso;  
* um canal de venda do Assistente IA Pro anual;  
* uma vitrine dos outros produtos da empresa;  
* um sistema simples para controlar acesso vitalício;  
* um sistema simples para controlar assinatura anual do Assistente Pro;  
* uma plataforma de reativação comercial da base antiga.

---

## **5\. O Que o Projeto NÃO É**

O PsicoPlanilhas 2.0 não é:

* sistema clínico;  
* prontuário;  
* aplicativo de avaliação;  
* substituto de testes originais;  
* substituto de manuais;  
* ferramenta diagnóstica;  
* editor próprio de planilhas;  
* LMS completo;  
* comunidade;  
* sistema de créditos;  
* CRM complexo;  
* plataforma multiempresa.

---

## **6\. Princípio Central das Planilhas**

As planilhas servem para agilizar o trabalho de profissionais que já fariam cálculos, organização e conferência manualmente.

Regra oficial:

As planilhas são ferramentas operacionais de apoio.  
O uso correto exige o manual original do instrumento.  
A interpretação final é sempre responsabilidade do profissional habilitado.

Linguagem permitida:

* apoio operacional;  
* organização dos dados;  
* auxílio na correção;  
* cálculo automatizado;  
* visualização de resultados;  
* apoio para relatório;  
* uso com manual original;  
* agilizar quem faz manualmente.

Linguagem proibida:

* teste oficial;  
* substitui o manual;  
* diagnóstico automático;  
* laudo automático;  
* avaliação psicológica completa;  
* aplicação oficial do instrumento;  
* resultado clínico definitivo.

---

## **7\. Modelo Comercial**

### **7.1 Produto Principal**

**Produto:** PsicoPlanilhas  
**Preço:** R$97  
**Pagamento:** único  
**Acesso:** vitalício  
**Função:** produto de entrada e ativação da base.

Inclui:

* 100 planilhas profissionais;  
* acesso à área de membros;  
* links das planilhas no Google Sheets;  
* tutoriais;  
* Assistente GPT Builder incluso;  
* vídeo-banners dos outros produtos.

---

### **7.2 Assistente GPT Builder Incluso**

O comprador do PsicoPlanilhas R$97 recebe acesso a um Assistente GPT Builder externo.

Regra:

* é bônus incluso;  
* abre fora da plataforma;  
* não salva histórico no sistema;  
* não possui controle interno avançado;  
* não é o produto recorrente principal.

---

### **7.3 Assistente IA Pro**

**Produto:** Assistente IA Pro de Relatórios  
**Preço:** R$50/ano  
**Pagamento:** anual  
**Acesso:** 1 ano após a compra  
**Modelo:** assinatura anual simples  
**Créditos:** não usar.

Regra principal:

Quem compra o Assistente IA Pro tem acesso liberado por 1 ano.  
Ao vencer, o sistema bloqueia automaticamente e volta a mostrar o cadeado.

---

## **8\. Estratégia Comercial**

O PsicoPlanilhas 2.0 não deve ser tratado apenas como uma área de planilhas.

Ele é uma máquina simples de:

1. entregar acesso vitalício;  
2. reativar a base antiga;  
3. vender Assistente IA Pro;  
4. vender outros produtos;  
5. gerar recorrência.

Frase estratégica:

R$97 compra o cliente.  
R$50/ano cria recorrência.  
Os vídeo-banners vendem os outros produtos.

---

## **9\. Base Antiga**

A base antiga possui aproximadamente 3.000 usuários sem recorrência.

Regra para esses clientes:

* mantêm acesso vitalício às planilhas;  
* recebem acesso ao Assistente GPT Builder incluso;  
* não recebem Assistente IA Pro automaticamente;  
* veem o Assistente IA Pro com cadeado;  
* veem os vídeo-banners comerciais;  
* podem comprar o Assistente IA Pro por R$50/ano;  
* podem comprar outros produtos da empresa.

---

## **10\. Migração Sem Banco Antigo**

### **10.1 Fonte de verdade**

A fonte de verdade da migração será:

lista de e-mails dos compradores antigos

Campos mínimos:

name

email

Campos opcionais:

phone

purchase\_code

purchase\_date

profile\_type

source

---

### **10.2 Processo de importação**

Fluxo:

Importar CSV de e-mails

↓

Criar usuário no Supabase Auth sem senha definida pelo admin

↓

Criar profile

↓

Criar purchase manual do PsicoPlanilhas vitalício

↓

Marcar usuário como pending\_activation

↓

Enviar e-mail para criar nova senha

↓

Cliente cria senha

↓

Cliente acessa a plataforma

---

### **10.3 Regra de senha**

Não migrar senha antiga.

Não criar senha padrão.

Não usar senha igual para todos.

Proibido:

123456

psico123

senha temporária fixa

senha enviada em texto puro

Obrigatório:

link único de criação de senha

link com expiração

validação por posse do e-mail

---

## **11\. Página Pública de Ativação**

### **11.1 Rota**

/ativar-acesso

### **11.2 Objetivo**

Permitir que clientes antigos ativem o novo acesso mesmo que não encontrem o e-mail enviado.

### **11.3 Texto da página**

Já era cliente PsicoPlanilhas?

Digite o e-mail usado na compra para ativar seu novo acesso.

Você receberá um link para criar sua nova senha.

### **11.4 Campo**

E-mail

### **11.5 Botão**

Enviar link de ativação

### **11.6 Mensagem de segurança**

A resposta deve ser neutra:

Se este e-mail estiver cadastrado, você receberá um link de ativação.

Nunca mostrar:

E-mail não encontrado.

Este e-mail não é cliente.

Motivo:

Evitar exposição da base de clientes.

---

## **12\. Estados do Usuário Migrado**

### **12.1 pending\_activation**

Usuário importado, mas ainda não criou senha.

Pode:

* receber link de ativação;  
* criar nova senha.

Não pode:

* acessar plataforma antes de ativar.

---

### **12.2 active**

Usuário ativou acesso.

Pode:

* acessar planilhas;  
* acessar Assistente GPT Builder;  
* ver Assistente IA Pro com cadeado;  
* ver vídeo-banners;  
* comprar produtos.

---

### **12.3 blocked**

Usuário bloqueado pelo admin.

Não pode:

* acessar área de membros.

---

## **13\. Segmentação de Perfil**

No primeiro acesso, o usuário poderá informar seu perfil principal:

* Psicólogo(a)  
* Psicopedagogo(a) / Neuropsicopedagogo(a)  
* Ambos  
* Prefiro responder depois

Esse perfil controla os vídeo-banners e produtos exibidos.

Valores internos:

psychologist

psychopedagogue

both

unknown

---

## **14\. Vídeo-Banners Comerciais**

A plataforma terá 3 vídeo-banners principais.

### **14.1 Vídeo-Banner Fixo — Assistente IA Pro**

**Público:** todos  
**Objetivo:** vender assinatura anual de R$50  
**Posição:** topo do dashboard.

Ações:

* assistir vídeo;  
* assinar por R$50/ano;  
* renovar, se vencido.

Texto base:

Gere relatórios estruturados com IA usando os dados das suas planilhas.

Ative o Assistente IA Pro por R$50/ano.

---

### **14.2 Vídeo-Banner para Psicólogos**

**Público:** psicólogos  
**Objetivo:** vender produtos clínicos.

Exemplos:

* Axis TCC;  
* produtos de relatórios;  
* ferramentas clínicas;  
* NeuroRastreio quando fizer sentido.

Texto base:

Soluções para psicólogos que querem organizar atendimentos, relatórios, rastreios e processos clínicos com mais agilidade.

---

### **14.3 Vídeo-Banner para Psicopedagogos**

**Público:** psicopedagogos e neuropsicopedagogos  
**Objetivo:** vender produtos educacionais e de avaliação funcional.

Exemplos:

* PsicoBook;  
* NeuroRastreio;  
* ABA Simples;  
* PEI;  
* materiais de aprendizagem.

Texto base:

Soluções para psicopedagogos e neuropsicopedagogos que querem organizar avaliações, relatórios, PEI, aprendizagem e acompanhamento.

---

## **15\. Regra de Exibição dos Banners**

| Perfil | Mostrar |
| ----- | ----- |
| psychologist | Assistente IA Pro \+ Psicólogos |
| psychopedagogue | Assistente IA Pro \+ Psicopedagogos |
| both | Assistente IA Pro \+ Psicólogos \+ Psicopedagogos |
| unknown | Assistente IA Pro \+ escolha de perfil |

Regra visual:

Vídeos aparecem como banners.  
O vídeo só abre em modal ou página interna.  
Nunca exibir três players abertos no dashboard.

---

## **16\. Navegação do Cliente**

Menu principal:

Dashboard

Minhas Planilhas

Assistente GPT

Assistente IA Pro

Tutoriais

Outros Produtos

Minha Conta

Sair

---

## **17\. Dashboard do Cliente**

O dashboard deve ser limpo, direto e comercial.

Ordem recomendada:

1. Boas-vindas.  
2. Card “Minhas Planilhas”.  
3. Vídeo-banner do Assistente IA Pro.  
4. Vídeo-banner segmentado por perfil.  
5. Produtos recomendados.  
6. Aviso de uso responsável.

Regra:

O usuário deve entender em 10 segundos onde estão as planilhas, onde está o assistente e quais produtos pode conhecer.

---

## **18\. Área “Minhas Planilhas”**

Cada planilha deve aparecer como card simples.

Campos:

* imagem;  
* nome;  
* categoria;  
* descrição curta;  
* botão “Acessar Planilha”;  
* botão “Ver Tutorial”, se existir;  
* aviso de uso com manual original.

Texto fixo:

Esta planilha é um recurso de apoio operacional.

Ela agiliza cálculos, organização e visualização dos dados.

O uso correto exige o manual original do instrumento.

Não substitui avaliação profissional, teste original, manual ou interpretação clínica.

---

## **19\. Assistente GPT Incluso**

Página:

/app/assistente-gpt

Função:

* explicar o bônus;  
* abrir o link externo do GPT Builder;  
* orientar uso com prints/dados da planilha;  
* reforçar revisão profissional.

Texto base:

O Assistente GPT incluso ajuda você a estruturar relatórios a partir dos dados das planilhas.

Ele é um apoio textual e não substitui sua análise profissional.

Botão:

Abrir Assistente GPT

---

## **20\. Assistente IA Pro**

Página:

/app/assistente-pro

### **20.1 Usuário sem assinatura**

Mostrar:

* cadeado;  
* vídeo do Assistente IA Pro;  
* benefícios;  
* preço R$50/ano;  
* botão de assinatura.

Texto:

Assistente IA Pro bloqueado.

Assine por R$50/ano para gerar relatórios diretamente na plataforma.

---

### **20.2 Usuário com assinatura ativa**

Mostrar:

* formulário de geração;  
* histórico de relatórios;  
* data de vencimento;  
* orientações de uso.

---

### **20.3 Usuário com assinatura vencida**

Mostrar:

* cadeado;  
* mensagem de vencimento;  
* botão de renovação.

Texto:

Sua assinatura anual expirou.

Renove por R$50/ano para voltar a usar o Assistente IA Pro.

---

## **21\. Regra do Cadeado**

O sistema deve liberar o Assistente IA Pro somente se:

usuário possui assinatura ativa

e

expires\_at \>= data atual

Caso contrário:

mostrar cadeado

bloquear formulário

mostrar oferta de assinatura ou renovação

Estados possíveis:

* nunca comprou;  
* ativo;  
* vencido;  
* cancelado;  
* liberado manualmente pelo admin.

---

## **22\. Banco de Dados Simples**

### **22.1 profiles**

Guarda dados comerciais do usuário.

id

name

email

role

profile\_type

status

activation\_status

created\_at

updated\_at

last\_login\_at

Valores de `role`:

admin

customer

Valores de `profile_type`:

psychologist

psychopedagogue

both

unknown

Valores de `status`:

active

blocked

inactive

Valores de `activation_status`:

pending\_activation

active

---

### **22.2 products**

Guarda planilhas, produtos externos, assistente e bundles.

id

name

slug

type

description

image\_url

access\_url

tutorial\_url

video\_url

checkout\_url

audience

is\_active

sort\_order

created\_at

updated\_at

Tipos:

spreadsheet

external\_product

assistant

tutorial

bundle

---

### **22.3 purchases**

Registra compras únicas, incluindo acesso vitalício manual.

id

user\_id

product\_id

purchase\_code

purchase\_date

payment\_status

payment\_reference

source

created\_at

Valores de `payment_status`:

paid

manual

pending

refunded

cancelled

Regra:

Cliente antigo importado recebe purchase manual do produto `psicoplanilhas-vitalicio`.

---

### **22.4 subscriptions**

Registra o Assistente IA Pro anual.

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

Valores de `status`:

active

expired

cancelled

manual

pending

---

### **22.5 activation\_tokens**

Controla ativação de acesso por e-mail.

id

user\_id

email

token\_hash

purpose

expires\_at

used\_at

created\_at

Valores de `purpose`:

account\_activation

password\_reset

Regra:

O token nunca deve ser salvo puro no banco.  
Salvar apenas hash do token.

---

### **22.6 promo\_banners**

Controla vídeo-banners comerciais.

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

---

### **22.7 ai\_reports**

Histórico dos relatórios gerados pelo Assistente IA Pro.

id

user\_id

title

report\_type

input\_text

input\_image\_url

output\_text

created\_at

---

### **22.8 email\_templates**

Templates de e-mail.

id

name

event

subject

body

is\_active

created\_at

updated\_at

Eventos iniciais:

access\_activation

password\_reset

assistant\_purchase

assistant\_expired

assistant\_renewed

activation\_reminder

---

## **23\. Painel Admin**

Menu admin:

Dashboard

Clientes

Planilhas

Produtos

Vídeo-Banners

Assinaturas

Relatórios IA

E-mails

Importação

Configurações

---

## **24\. Admin — Clientes**

Campos obrigatórios:

* nome;  
* e-mail;  
* perfil;  
* status;  
* ativação;  
* acesso vitalício;  
* data da compra;  
* Assistente IA Pro ativo;  
* vencimento do Assistente IA Pro;  
* último login.

Ações:

* cadastrar cliente;  
* editar cliente;  
* enviar link de ativação;  
* reenviar link de ativação;  
* resetar senha;  
* ativar acesso vitalício;  
* ativar Assistente Pro manualmente;  
* definir vencimento;  
* bloquear usuário;  
* exportar CSV;  
* importar CSV.

---

## **25\. Admin — Importação**

### **25.1 Rota**

/admin/importacao

### **25.2 Objetivo**

Importar a base antiga de aproximadamente 3.000 clientes usando apenas e-mail.

### **25.3 CSV mínimo**

name,email

### **25.4 CSV recomendado**

name,email,phone,purchase\_code,purchase\_date,profile\_type,source

### **25.5 Processo**

Upload CSV

↓

Validar colunas

↓

Detectar e-mails duplicados

↓

Exibir prévia

↓

Confirmar importação

↓

Criar usuário Auth

↓

Criar profile com pending\_activation

↓

Criar purchase manual/vitalícia

↓

Gerar link de ativação

↓

Enviar e-mail, se habilitado

### **25.6 Duplicados**

Se e-mail já existir:

não criar novo usuário

atualizar dados comerciais apenas se necessário

manter histórico

registrar aviso

---

## **26\. E-mail de Ativação**

### **26.1 Assunto**

Ative seu novo acesso PsicoPlanilhas

### **26.2 Corpo base**

Olá, {{nome}}.

Estamos atualizando a área de membros do PsicoPlanilhas.

Seu acesso vitalício às planilhas continua garantido.

Para entrar na nova plataforma, crie uma nova senha pelo link abaixo:

{{activation\_link}}

Esse link é individual e expira por segurança.

Se você não solicitou este acesso, apenas ignore este e-mail.

---

## **27\. Reenvio de Ativação**

O sistema deve permitir reenviar o link:

* pelo admin;  
* pela página `/ativar-acesso`;  
* por fluxo de recuperação de senha.

Regra:

Sempre invalidar tokens antigos quando um novo for gerado.

---

## **28\. Produtos e Vídeo-Banners**

Admin poderá cadastrar:

* Assistente IA Pro;  
* produtos para psicólogos;  
* produtos para psicopedagogos;  
* vídeo-banner fixo;  
* vídeo-banner segmentado;  
* imagem;  
* vídeo;  
* checkout;  
* ordem de exibição.

---

## **29\. UX/UI**

Princípios visuais:

* clean;  
* leve;  
* poucos menus;  
* cards claros;  
* sem excesso de texto;  
* foco em botão de ação;  
* vídeos fechados em banner/modal;  
* dashboard com poucas decisões visíveis.

Regra:

Não transformar a área de membros em uma feira de anúncios.  
A venda precisa parecer recomendação útil, não poluição visual.

---

## **30\. Stack Recomendada**

* Next.js  
* TypeScript  
* Supabase Auth  
* Supabase Postgres  
* Supabase Storage  
* Tailwind CSS  
* shadcn/ui  
* OpenAI API  
* Mercado Pago ou Stripe  
* Vercel  
* Resend ou Brevo

---

## **31\. Ordem de Desenvolvimento**

### **Fase 1 — Fundação**

* Criar projeto Next.js.  
* Configurar Supabase.  
* Criar autenticação.  
* Criar banco inicial.  
* Criar login.  
* Criar dashboard simples.

### **Fase 2 — Migração por E-mail**

* Criar importador CSV.  
* Criar profiles.  
* Criar purchases manuais.  
* Criar fluxo de ativação por link.  
* Criar página `/ativar-acesso`.  
* Criar e-mail de ativação.

### **Fase 3 — Entrega das Planilhas**

* Criar área “Minhas Planilhas”.  
* Cadastrar links Google Sheets.  
* Criar admin de planilhas.  
* Criar aviso de uso com manual original.

### **Fase 4 — Vídeo-Banners e Produtos**

* Criar promo\_banners.  
* Criar banners segmentados.  
* Criar área “Outros Produtos”.  
* Criar lógica por perfil.

### **Fase 5 — Assistente IA Pro**

* Criar assinatura anual.  
* Criar regra de cadeado.  
* Criar tela bloqueada.  
* Criar tela ativa.  
* Criar histórico de relatórios.

### **Fase 6 — Comercial e Automação**

* Integrar checkout.  
* Criar webhooks de pagamento.  
* Criar e-mails automáticos.  
* Criar alertas de vencimento.  
* Criar renovação.

---

## **32\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Projeto simples | Congelado |
| Área de membros | Congelado |
| R$97 vitalício | Congelado |
| Base antiga por lista de e-mails | Congelado |
| Sem migração de senha antiga | Congelado |
| Ativação por link de e-mail | Congelado |
| Página `/ativar-acesso` | Congelado |
| 3.000 usuários antigos sem recorrência | Congelado |
| Assistente GPT Builder incluso | Congelado |
| Assistente IA Pro R$50/ano | Congelado |
| Sem créditos | Congelado |
| Cadeado volta após 1 ano | Congelado |
| Planilhas continuam no Google Sheets | Congelado |
| Manual original obrigatório | Congelado |
| Vídeo-banners comerciais | Congelado |
| 3 vídeo-banners principais | Congelado |
| Segmentação psicólogo/psicopedagogo | Congelado |
| UX clean | Congelado |

---

## **33\. Frase Norteadora**

O PsicoPlanilhas 2.0 é uma área de membros simples que entrega planilhas, ativa clientes antigos por e-mail, libera um assistente básico incluso, segmenta o usuário por perfil profissional e converte a base atual para recorrência por meio do Assistente IA Pro e dos produtos complementares da empresa.

---

## **34\. Regra Contra Complexidade**

Sempre que surgir uma nova ideia, validar com a pergunta:

Isso ajuda a:

1\. entregar as planilhas?

2\. ativar a base antiga?

3\. vender o Assistente IA Pro?

4\. vender outro produto?

Se a resposta for não, fica fora do MVP.

---

## **35\. Veredito Final**

A reconstrução não depende mais do sistema PHP antigo.

O projeto depende apenas de:

1. lista confiável de e-mails;  
2. fluxo seguro de ativação;  
3. banco simples;  
4. área de membros limpa;  
5. checkout do Assistente IA Pro;  
6. vídeo-banners bem posicionados.

Essa é a versão correta do PsicoPlanilhas 2.0.

