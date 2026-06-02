# **PSICOPLANILHAS\_DATABASE\_SCHEMA\_v0.2**

## **1\. Objetivo do Documento**

Definir o banco de dados do PsicoPlanilhas 2.0 considerando a decisão final:

Não existe acesso ao banco antigo.  
Não existe migração de senha.  
A base antiga será ativada por lista de e-mails.

O banco precisa resolver:

1. Login seguro com Supabase Auth.  
2. Importação de clientes antigos por e-mail.  
3. Ativação de nova senha por link.  
4. Acesso vitalício às planilhas.  
5. Cadeado do Assistente IA Pro após 1 ano.  
6. Vídeo-banners comerciais segmentados.  
7. Histórico do Assistente IA Pro.  
8. Admin simples.

---

## **2\. Decisão Técnica Principal**

Usar:

Supabase Auth \+ Supabase Postgres

Regra oficial:

Senha não fica em tabela própria.  
Senha não será migrada.  
Senha será criada pelo cliente via link seguro de ativação.

Portanto, **não usar**:

password\_hash  
password  
temporary\_password  
senha\_padrao

---

## **3\. Tabelas Principais**

profiles  
products  
purchases  
subscriptions  
activation\_tokens  
promo\_banners  
ai\_reports  
email\_templates  
admin\_logs

Tabelas explicitamente proibidas:

ai\_credits  
credits  
credit\_logs

O projeto não usa créditos.

---

# **4\. Tabela `profiles`**

## **4.1 Função**

Guarda dados comerciais e operacionais do usuário.

A autenticação real fica em:

auth.users

## **4.2 SQL**

create table public.profiles (  
  id uuid primary key references auth.users(id) on delete cascade,  
  name text,  
  email text unique not null,  
  phone text,

  role text not null default 'customer',  
  profile\_type text not null default 'unknown',

  status text not null default 'active',  
  activation\_status text not null default 'pending\_activation',

  source text,  
  imported\_at timestamp with time zone,

  created\_at timestamp with time zone default now(),  
  updated\_at timestamp with time zone default now(),  
  last\_login\_at timestamp with time zone  
);

---

## **4.3 Valores permitidos**

### **`role`**

admin  
customer

### **`profile_type`**

psychologist  
psychopedagogue  
both  
unknown

### **`status`**

active  
blocked  
inactive

### **`activation_status`**

pending\_activation  
active

---

## **4.4 Regras**

| Situação | `status` | `activation_status` |
| ----- | ----- | ----- |
| Cliente importado, ainda sem senha | active | pending\_activation |
| Cliente criou senha e acessou | active | active |
| Cliente bloqueado pelo admin | blocked | active ou pending\_activation |
| Cliente inativo manualmente | inactive | active ou pending\_activation |

---

# **5\. Tabela `products`**

## **5.1 Função**

Guarda tudo que pode ser entregue, vendido ou exibido.

Inclui:

* planilhas;  
* PsicoPlanilhas Vitalício;  
* Assistente IA Pro;  
* produtos externos;  
* tutoriais;  
* bundles.

## **5.2 SQL**

create table public.products (  
  id uuid primary key default gen\_random\_uuid(),

  name text not null,  
  slug text unique not null,  
  type text not null,

  audience text not null default 'all',  
  category text,

  description text,  
  image\_url text,

  access\_url text,  
  tutorial\_url text,  
  video\_url text,  
  checkout\_url text,

  price numeric(10,2),  
  billing\_type text,

  is\_active boolean not null default true,  
  sort\_order integer default 0,

  created\_at timestamp with time zone default now(),  
  updated\_at timestamp with time zone default now()  
);

---

## **5.3 Valores permitidos**

### **`type`**

spreadsheet  
assistant  
external\_product  
tutorial  
bundle

### **`audience`**

all  
psychologist  
psychopedagogue  
both

### **`billing_type`**

one\_time  
yearly  
external  
free

---

# **6\. Produtos Fixos Obrigatórios**

## **6.1 PsicoPlanilhas Vitalício**

name: PsicoPlanilhas Vitalício  
slug: psicoplanilhas-vitalicio  
type: bundle  
price: 97.00  
billing\_type: one\_time  
audience: all

Esse produto libera acesso vitalício às planilhas.

---

## **6.2 Assistente IA Pro**

name: Assistente IA Pro  
slug: assistente-ia-pro  
type: assistant  
price: 50.00  
billing\_type: yearly  
audience: all

Esse produto libera acesso por 1 ano.

---

# **7\. Tabela `purchases`**

## **7.1 Função**

Registra compras únicas.

Uso principal:

PsicoPlanilhas Vitalício \- R$97

Também registra acesso manual dos clientes antigos importados.

## **7.2 SQL**

create table public.purchases (  
  id uuid primary key default gen\_random\_uuid(),

  user\_id uuid not null references public.profiles(id) on delete cascade,  
  product\_id uuid not null references public.products(id),

  purchase\_code text,  
  payment\_status text not null default 'paid',  
  payment\_reference text,  
  source text,

  purchased\_at timestamp with time zone default now(),  
  created\_at timestamp with time zone default now()  
);

---

## **7.3 Valores de `payment_status`**

paid  
manual  
pending  
refunded  
cancelled

---

## **7.4 Regra de acesso vitalício**

O usuário tem acesso às planilhas se existir compra do produto:

psicoplanilhas-vitalicio

com status:

paid  
manual

---

## **7.5 Cliente antigo importado**

Para cada cliente antigo:

payment\_status \= manual  
source \= old\_php\_email\_import  
product \= psicoplanilhas-vitalicio

---

# **8\. Tabela `subscriptions`**

## **8.1 Função**

Controla o Assistente IA Pro anual.

Essa tabela determina o cadeado.

## **8.2 SQL**

create table public.subscriptions (  
  id uuid primary key default gen\_random\_uuid(),

  user\_id uuid not null references public.profiles(id) on delete cascade,  
  product\_id uuid not null references public.products(id),

  plan\_slug text not null,  
  status text not null default 'active',

  started\_at timestamp with time zone not null default now(),  
  expires\_at timestamp with time zone not null,

  renewed\_at timestamp with time zone,  
  cancelled\_at timestamp with time zone,

  payment\_reference text,  
  source text,

  created\_at timestamp with time zone default now(),  
  updated\_at timestamp with time zone default now()  
);

---

## **8.3 Valores de `status`**

active  
expired  
cancelled  
manual  
pending

---

## **8.4 Regra do cadeado**

Assistente IA Pro liberado se:

status \= active ou manual  
e  
expires\_at \>= now()

Assistente IA Pro bloqueado se:

não existe assinatura  
ou  
expires\_at \< now()  
ou  
status \= expired  
ou  
status \= cancelled

---

# **9\. Tabela `activation_tokens`**

## **9.1 Função**

Controla links de ativação e redefinição de senha quando necessário.

Observação:

Se o Supabase Auth resolver 100% com invite/recovery link nativo, esta tabela pode ser usada apenas para auditoria.  
Se o sistema criar fluxo próprio de ativação, esta tabela é obrigatória.

## **9.2 SQL**

create table public.activation\_tokens (  
  id uuid primary key default gen\_random\_uuid(),

  user\_id uuid not null references public.profiles(id) on delete cascade,  
  email text not null,

  token\_hash text not null,  
  purpose text not null default 'account\_activation',

  expires\_at timestamp with time zone not null,  
  used\_at timestamp with time zone,

  created\_at timestamp with time zone default now()  
);

---

## **9.3 Valores de `purpose`**

account\_activation  
password\_reset

---

## **9.4 Regras de segurança**

Nunca salvar token puro.

Salvar apenas:

token\_hash

Token deve:

* ser único;  
* expirar;  
* ser de uso único;  
* ser invalidado após uso;  
* ser invalidado quando novo token for gerado.

---

# **10\. Página `/ativar-acesso`**

## **10.1 Fluxo**

Cliente acessa /ativar-acesso  
↓  
Digita e-mail da compra  
↓  
Sistema verifica se existe profile com aquele e-mail  
↓  
Se existir, gera link de ativação  
↓  
Envia e-mail  
↓  
Cliente cria nova senha  
↓  
activation\_status \= active

---

## **10.2 Resposta pública obrigatória**

Sempre mostrar resposta neutra:

Se este e-mail estiver cadastrado, você receberá um link de ativação.

Não mostrar:

E-mail encontrado  
E-mail não encontrado  
Cliente inexistente

Motivo:

Evitar exposição da base de clientes.

---

# **11\. Função SQL — Acesso Vitalício**

create or replace function public.has\_lifetime\_access(user\_uuid uuid)  
returns boolean  
language sql  
stable  
as $$  
  select exists (  
    select 1  
    from public.purchases pu  
    join public.products p on p.id \= pu.product\_id  
    where pu.user\_id \= user\_uuid  
      and p.slug \= 'psicoplanilhas-vitalicio'  
      and pu.payment\_status in ('paid', 'manual')  
  );  
$$;

---

# **12\. Função SQL — Assistente IA Pro Ativo**

create or replace function public.has\_active\_assistant(user\_uuid uuid)  
returns boolean  
language sql  
stable  
as $$  
  select exists (  
    select 1  
    from public.subscriptions s  
    join public.products p on p.id \= s.product\_id  
    where s.user\_id \= user\_uuid  
      and p.slug \= 'assistente-ia-pro'  
      and s.status in ('active', 'manual')  
      and s.expires\_at \>= now()  
  );  
$$;

---

# **13\. View `user_access_status`**

## **13.1 Função**

Facilitar o admin e o dashboard do cliente.

## **13.2 SQL**

create or replace view public.user\_access\_status as  
select  
  pr.id as user\_id,  
  pr.name,  
  pr.email,  
  pr.profile\_type,  
  pr.status,  
  pr.activation\_status,  
  pr.last\_login\_at,

  public.has\_lifetime\_access(pr.id) as has\_lifetime\_access,  
  public.has\_active\_assistant(pr.id) as has\_active\_assistant,

  (  
    select max(s.expires\_at)  
    from public.subscriptions s  
    join public.products p on p.id \= s.product\_id  
    where s.user\_id \= pr.id  
      and p.slug \= 'assistente-ia-pro'  
  ) as assistant\_expires\_at

from public.profiles pr;

---

## **13.3 Uso**

Admin vê rapidamente:

cliente  
e-mail  
perfil  
ativação  
acesso vitalício  
assistente ativo  
vencimento  
último login

---

# **14\. Tabela `promo_banners`**

## **14.1 Função**

Controla os vídeo-banners comerciais.

Banners principais:

1. Assistente IA Pro.  
2. Produtos para Psicólogos.  
3. Produtos para Psicopedagogos.

## **14.2 SQL**

create table public.promo\_banners (  
  id uuid primary key default gen\_random\_uuid(),

  title text not null,  
  subtitle text,

  audience text not null default 'all',  
  position text not null default 'dashboard\_middle',

  image\_url text,  
  video\_url text,

  button\_text text,  
  button\_url text,

  secondary\_button\_text text,  
  secondary\_button\_url text,

  is\_active boolean not null default true,  
  sort\_order integer default 0,

  created\_at timestamp with time zone default now(),  
  updated\_at timestamp with time zone default now()  
);

---

## **14.3 Valores de `audience`**

all  
psychologist  
psychopedagogue  
both

---

## **14.4 Valores de `position`**

dashboard\_top  
dashboard\_middle  
products\_page  
assistant\_page

---

# **15\. Banners Obrigatórios**

## **15.1 Assistente IA Pro**

title: Gere relatórios com IA  
audience: all  
position: dashboard\_top  
button\_text: Assinar por R$50/ano  
secondary\_button\_text: Assistir vídeo

---

## **15.2 Produtos para Psicólogos**

title: Soluções para Psicólogos  
audience: psychologist  
position: dashboard\_middle  
button\_text: Ver produtos  
secondary\_button\_text: Assistir vídeo

---

## **15.3 Produtos para Psicopedagogos**

title: Soluções para Psicopedagogos  
audience: psychopedagogue  
position: dashboard\_middle  
button\_text: Ver produtos  
secondary\_button\_text: Assistir vídeo

---

# **16\. Tabela `ai_reports`**

## **16.1 Função**

Guarda histórico de relatórios gerados pelo Assistente IA Pro.

## **16.2 SQL**

create table public.ai\_reports (  
  id uuid primary key default gen\_random\_uuid(),

  user\_id uuid not null references public.profiles(id) on delete cascade,

  title text,  
  report\_type text,

  input\_text text,  
  input\_image\_url text,

  output\_text text not null,

  created\_at timestamp with time zone default now()  
);

---

## **16.3 Regra**

Antes de gerar relatório:

verificar has\_active\_assistant(user\_id)

Se falso:

bloquear geração  
mostrar cadeado

---

# **17\. Tabela `email_templates`**

## **17.1 Função**

Guardar modelos de e-mail editáveis no admin.

## **17.2 SQL**

create table public.email\_templates (  
  id uuid primary key default gen\_random\_uuid(),

  name text not null,  
  event text not null,

  subject text not null,  
  body text not null,

  is\_active boolean not null default true,

  created\_at timestamp with time zone default now(),  
  updated\_at timestamp with time zone default now()  
);

---

## **17.3 Eventos iniciais**

access\_activation  
activation\_reminder  
password\_reset  
assistant\_purchase  
assistant\_expiring  
assistant\_expired  
assistant\_renewed

---

# **18\. Tabela `admin_logs`**

## **18.1 Função**

Registrar ações sensíveis feitas pelo admin.

## **18.2 SQL**

create table public.admin\_logs (  
  id uuid primary key default gen\_random\_uuid(),

  admin\_id uuid references public.profiles(id),

  action text not null,  
  target\_table text,  
  target\_id uuid,

  metadata jsonb,

  created\_at timestamp with time zone default now()  
);

---

## **18.3 Ações que exigem log**

importar clientes  
enviar link de ativação  
reenviar link de ativação  
bloquear usuário  
desbloquear usuário  
liberar acesso vitalício  
cancelar acesso vitalício  
ativar Assistente IA Pro  
alterar vencimento do Assistente IA Pro  
cancelar Assistente IA Pro  
editar link de planilha  
editar vídeo-banner  
abrir relatório IA

---

# **19\. Índices Recomendados**

create index idx\_profiles\_email on public.profiles(email);  
create index idx\_profiles\_profile\_type on public.profiles(profile\_type);  
create index idx\_profiles\_activation\_status on public.profiles(activation\_status);  
create index idx\_profiles\_status on public.profiles(status);

create index idx\_products\_slug on public.products(slug);  
create index idx\_products\_type on public.products(type);  
create index idx\_products\_audience on public.products(audience);

create index idx\_purchases\_user\_id on public.purchases(user\_id);  
create index idx\_purchases\_product\_id on public.purchases(product\_id);  
create index idx\_purchases\_payment\_status on public.purchases(payment\_status);

create index idx\_subscriptions\_user\_id on public.subscriptions(user\_id);  
create index idx\_subscriptions\_product\_id on public.subscriptions(product\_id);  
create index idx\_subscriptions\_status on public.subscriptions(status);  
create index idx\_subscriptions\_expires\_at on public.subscriptions(expires\_at);

create index idx\_activation\_tokens\_user\_id on public.activation\_tokens(user\_id);  
create index idx\_activation\_tokens\_email on public.activation\_tokens(email);  
create index idx\_activation\_tokens\_token\_hash on public.activation\_tokens(token\_hash);  
create index idx\_activation\_tokens\_expires\_at on public.activation\_tokens(expires\_at);

create index idx\_promo\_banners\_audience on public.promo\_banners(audience);  
create index idx\_promo\_banners\_position on public.promo\_banners(position);

create index idx\_ai\_reports\_user\_id on public.ai\_reports(user\_id);

create index idx\_admin\_logs\_admin\_id on public.admin\_logs(admin\_id);  
create index idx\_admin\_logs\_target\_table on public.admin\_logs(target\_table);

---

# **20\. Dados Mínimos para MVP**

Antes de lançar, o banco precisa ter:

1 admin ativo  
produto PsicoPlanilhas Vitalício  
produto Assistente IA Pro  
lista inicial de planilhas  
link do Assistente GPT Builder  
3 vídeo-banners principais  
templates básicos de e-mail  
base de clientes importada por e-mail

---

# **21\. Migração dos Clientes Antigos**

## **21.1 Entrada**

CSV mínimo:

name,email

CSV recomendado:

name,email,phone,purchase\_code,purchase\_date,profile\_type,source

---

## **21.2 Processo**

Validar CSV  
↓  
Normalizar e-mails  
↓  
Detectar duplicados  
↓  
Criar usuário no Auth  
↓  
Criar profile pending\_activation  
↓  
Criar purchase manual  
↓  
Gerar link de ativação  
↓  
Enviar e-mail de ativação

---

## **21.3 Resultado**

Cliente antigo importado recebe:

Acesso vitalício às planilhas  
Assistente GPT Builder incluso  
Assistente IA Pro bloqueado  
Vídeo-banners ativos

Cliente antigo importado não recebe:

Assistente IA Pro gratuito  
Assinatura anual automática  
Produtos pagos extras

---

# **22\. Fluxo de Ativação**

## **22.1 Por e-mail enviado na importação**

Cliente recebe e-mail  
↓  
Clica no link  
↓  
Cria nova senha  
↓  
activation\_status \= active  
↓  
Acessa dashboard

---

## **22.2 Pela página `/ativar-acesso`**

Cliente entra em /ativar-acesso  
↓  
Digita e-mail  
↓  
Sistema responde mensagem neutra  
↓  
Se e-mail existir, envia link  
↓  
Cliente cria nova senha

---

# **23\. Fluxo de Compra do Assistente IA Pro**

Cliente clica em Assinar R$50/ano  
↓  
Checkout  
↓  
Pagamento aprovado  
↓  
Webhook localiza usuário por e-mail  
↓  
Cria ou atualiza subscription  
↓  
started\_at \= agora  
expires\_at \= agora \+ 1 ano  
status \= active  
↓  
Cadeado desaparece

---

# **24\. Fluxo de Renovação**

Cliente vencido clica em Renovar  
↓  
Checkout  
↓  
Pagamento aprovado  
↓  
Sistema atualiza assinatura  
↓  
expires\_at \= agora \+ 1 ano  
status \= active  
↓  
Assistente IA Pro liberado

---

# **25\. Regras de Exibição por Perfil**

## **`psychologist`**

Mostrar:

Assistente IA Pro  
Produtos para Psicólogos  
Planilhas

## **`psychopedagogue`**

Mostrar:

Assistente IA Pro  
Produtos para Psicopedagogos  
Planilhas

## **`both`**

Mostrar:

Assistente IA Pro  
Produtos para Psicólogos  
Produtos para Psicopedagogos  
Planilhas

## **`unknown`**

Mostrar:

Assistente IA Pro  
Escolha de perfil  
Planilhas

---

# **26\. RLS — Regra Mental**

Ativar RLS em:

alter table public.profiles enable row level security;  
alter table public.products enable row level security;  
alter table public.purchases enable row level security;  
alter table public.subscriptions enable row level security;  
alter table public.activation\_tokens enable row level security;  
alter table public.promo\_banners enable row level security;  
alter table public.ai\_reports enable row level security;  
alter table public.email\_templates enable row level security;  
alter table public.admin\_logs enable row level security;

Regra mental:

Cliente vê o que é dele.  
Cliente vê produtos e banners ativos.  
Admin vê tudo.

As policies detalhadas devem ficar em documento técnico separado.

---

# **27\. Regras de Segurança**

## **27.1 Cliente comum pode ler**

próprio profile  
próprias purchases  
próprias subscriptions  
próprios ai\_reports  
products ativos  
promo\_banners ativos

## **27.2 Cliente comum não pode ler**

outros usuários  
admin\_logs  
tokens  
relatórios de outros usuários  
templates internos

## **27.3 Admin pode**

ver tudo  
editar clientes  
editar planilhas  
editar produtos  
editar banners  
editar assinaturas  
ver logs  
importar base

---

# **28\. Regras Contra Erro Humano**

Pedir confirmação antes de:

bloquear usuário  
cancelar acesso vitalício  
cancelar Assistente IA Pro  
alterar vencimento para data anterior  
excluir relatório  
desativar planilha  
desativar banner

Toda ação sensível gera `admin_logs`.

---

# **29\. Checklist de Validação**

## **29.1 Cliente importado**

* existe no Auth;  
* existe em `profiles`;  
* está como `pending_activation`;  
* tem `purchase manual`;  
* não tem `subscription`;  
* recebe link de ativação;  
* consegue criar senha;  
* acessa planilhas;  
* vê Assistente IA Pro bloqueado.

## **29.2 Cliente novo R$97**

* pagamento aprovado;  
* usuário criado;  
* acesso vitalício liberado;  
* Assistente GPT liberado;  
* Assistente IA Pro bloqueado.

## **29.3 Cliente com Assistente IA Pro ativo**

* tem assinatura ativa;  
* `expires_at >= now()`;  
* formulário liberado;  
* relatório salvo em histórico.

## **29.4 Cliente vencido**

* `expires_at < now()`;  
* vê cadeado;  
* mantém planilhas;  
* vê botão renovar.

## **29.5 Admin**

* importa CSV;  
* busca cliente;  
* reenvia ativação;  
* libera acesso manual;  
* altera vencimento;  
* edita links e banners.

---

# **30\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Supabase Auth gerencia login | Congelado |
| Não migrar senha antiga | Congelado |
| Não criar senha padrão | Congelado |
| Ativação por link de e-mail | Congelado |
| `/ativar-acesso` obrigatório | Congelado |
| `profiles` guarda dados comerciais | Congelado |
| `purchases` controla R$97 vitalício | Congelado |
| `subscriptions` controla Assistente Pro | Congelado |
| `activation_status` controla ativação | Congelado |
| `activation_tokens` controla links, se necessário | Congelado |
| Sem créditos | Congelado |
| Cadeado depende de `expires_at` | Congelado |
| Vídeo-banners em tabela própria | Congelado |
| Cliente antigo não ganha Assistente Pro | Congelado |
| Admin pode ativar manualmente com log | Congelado |

---

# **31\. Frase Técnica Norteadora**

O banco do PsicoPlanilhas 2.0 deve autenticar usuários via Supabase Auth, ativar clientes antigos por e-mail, liberar planilhas vitalícias por compra manual/paga, controlar o Assistente IA Pro por assinatura anual e exibir vídeo-banners segmentados por perfil.

