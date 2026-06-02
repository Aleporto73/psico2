# **PSICOPLANILHAS\_SECURITY\_RLS\_SPEC\_v0.1**

## **1\. Objetivo do Documento**

Definir as regras de segurança, Row Level Security, permissões e proteção de dados do PsicoPlanilhas 2.0.

Este documento cobre:

1. Segurança de autenticação.  
2. Regras de acesso do cliente.  
3. Regras de acesso do admin.  
4. RLS por tabela.  
5. Proteção de tokens.  
6. Proteção de webhooks.  
7. Uso correto da chave `service_role`.  
8. Logs obrigatórios.  
9. Checklist de validação antes de produção.

---

## **2\. Princípio Central**

A regra mental do sistema é:

Cliente vê apenas o que é dele.  
Cliente vê produtos e banners ativos.  
Admin vê tudo que precisa operar.  
Service role só roda no servidor.

Nunca confiar apenas no frontend.

Toda regra sensível precisa estar protegida no backend, no banco ou em ambos.

---

## **3\. Stack de Segurança**

Base técnica:

Supabase Auth  
Supabase Postgres  
Row Level Security  
Next.js Server Actions / API Routes  
Service role apenas no servidor  
RLS em tabelas sensíveis  
Logs administrativos  
Rate limit em rotas públicas sensíveis

---

## **4\. Tabelas Sensíveis**

As tabelas abaixo precisam ter RLS ativado:

alter table public.profiles enable row level security;  
alter table public.products enable row level security;  
alter table public.purchases enable row level security;  
alter table public.subscriptions enable row level security;  
alter table public.activation\_tokens enable row level security;  
alter table public.promo\_banners enable row level security;  
alter table public.ai\_reports enable row level security;  
alter table public.email\_templates enable row level security;  
alter table public.admin\_logs enable row level security;  
alter table public.payment\_events enable row level security;

Se `payment_events` não existir no MVP inicial, ignorar até a tabela ser criada.

---

## **5\. Papéis do Sistema**

## **5.1 Roles no perfil**

Campo:

profiles.role

Valores:

admin  
customer

## **5.2 Status de usuário**

Campo:

profiles.status

Valores:

active  
blocked  
inactive

## **5.3 Ativação**

Campo:

profiles.activation\_status

Valores:

pending\_activation  
active

---

## **6\. Função Auxiliar — Verificar Admin**

Criar função:

create or replace function public.is\_admin(user\_uuid uuid)  
returns boolean  
language sql  
stable  
security definer  
as $$  
  select exists (  
    select 1  
    from public.profiles p  
    where p.id \= user\_uuid  
      and p.role \= 'admin'  
      and p.status \= 'active'  
  );  
$$;

Uso:

public.is\_admin(auth.uid())

Regra:

Apenas usuário com `role = admin` e `status = active` deve ser tratado como admin.

---

## **7\. Função Auxiliar — Usuário Ativo**

create or replace function public.is\_active\_user(user\_uuid uuid)  
returns boolean  
language sql  
stable  
security definer  
as $$  
  select exists (  
    select 1  
    from public.profiles p  
    where p.id \= user\_uuid  
      and p.status \= 'active'  
  );  
$$;

---

## **8\. Regra Geral das Policies**

Para tabelas privadas:

Cliente só acessa linhas com user\_id \= auth.uid().  
Admin acessa todas.

Para tabelas públicas controladas:

Cliente lê apenas itens ativos.  
Admin lê e edita tudo.

Para tabelas críticas:

Cliente não acessa diretamente.  
Admin ou servidor controlam.

---

# **9\. RLS — `profiles`**

## **9.1 Cliente**

Cliente pode ler o próprio perfil.

create policy "customers can read own profile"  
on public.profiles  
for select  
to authenticated  
using (  
  id \= auth.uid()  
);

Cliente pode atualizar apenas campos permitidos do próprio perfil, mas isso deve ser controlado preferencialmente por API/server action.

Campos que o cliente pode alterar:

name  
phone  
profile\_type

Cliente não pode alterar:

role  
status  
activation\_status  
email  
source  
imported\_at

## **9.2 Admin**

Admin pode ler todos os perfis.

create policy "admins can read all profiles"  
on public.profiles  
for select  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
);

Admin pode editar perfis via rota segura/admin.

create policy "admins can update profiles"  
on public.profiles  
for update  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
)  
with check (  
  public.is\_admin(auth.uid())  
);

## **9.3 Insert**

Criação de profile deve ocorrer pelo servidor/importador/webhook.

Não liberar insert direto para cliente comum.

---

# **10\. RLS — `products`**

## **10.1 Cliente**

Cliente pode ler produtos ativos.

create policy "customers can read active products"  
on public.products  
for select  
to authenticated  
using (  
  is\_active \= true  
);

## **10.2 Admin**

Admin pode ler, criar, editar e desativar produtos.

create policy "admins can manage products"  
on public.products  
for all  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
)  
with check (  
  public.is\_admin(auth.uid())  
);

## **10.3 Regra**

Cliente nunca edita produto.

Produtos incluem:

planilhas  
produto vitalício  
Assistente IA Pro  
produtos externos  
tutoriais  
bundles

---

# **11\. RLS — `purchases`**

## **11.1 Cliente**

Cliente pode ler as próprias compras.

create policy "customers can read own purchases"  
on public.purchases  
for select  
to authenticated  
using (  
  user\_id \= auth.uid()  
);

## **11.2 Admin**

Admin pode ler e gerenciar compras.

create policy "admins can manage purchases"  
on public.purchases  
for all  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
)  
with check (  
  public.is\_admin(auth.uid())  
);

## **11.3 Insert**

Insert de compra deve ocorrer por:

webhook de pagamento  
importador CSV  
admin manual

Cliente não insere compra diretamente.

---

# **12\. RLS — `subscriptions`**

## **12.1 Cliente**

Cliente pode ler a própria assinatura.

create policy "customers can read own subscriptions"  
on public.subscriptions  
for select  
to authenticated  
using (  
  user\_id \= auth.uid()  
);

## **12.2 Admin**

Admin pode gerenciar assinaturas.

create policy "admins can manage subscriptions"  
on public.subscriptions  
for all  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
)  
with check (  
  public.is\_admin(auth.uid())  
);

## **12.3 Insert/Update**

Criação e atualização de assinatura deve ocorrer por:

webhook Asaas  
admin manual  
job de expiração

Cliente não cria nem edita assinatura diretamente.

---

# **13\. RLS — `activation_tokens`**

## **13.1 Regra**

Tokens não devem ser acessados pelo cliente diretamente.

Tabela crítica.

Permissão:

Cliente: nenhum acesso direto.  
Admin: leitura operacional limitada, se necessário.  
Servidor: cria, valida e invalida tokens.

## **13.2 Policy recomendada**

Não criar policy de leitura para cliente.

Admin pode ler metadados, se necessário:

create policy "admins can read activation tokens"  
on public.activation\_tokens  
for select  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
);

## **13.3 Insert/Update/Delete**

Preferencialmente apenas servidor com service role.

Regra:

Nunca expor token puro.  
Salvar somente `token_hash`.

---

# **14\. RLS — `promo_banners`**

## **14.1 Cliente**

Cliente pode ler banners ativos.

create policy "customers can read active promo banners"  
on public.promo\_banners  
for select  
to authenticated  
using (  
  is\_active \= true  
);

## **14.2 Admin**

Admin pode gerenciar todos os banners.

create policy "admins can manage promo banners"  
on public.promo\_banners  
for all  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
)  
with check (  
  public.is\_admin(auth.uid())  
);

## **14.3 Segmentação**

A filtragem por público pode ocorrer no frontend/backend:

all  
psychologist  
psychopedagogue  
both

Mas nunca deve expor dados sensíveis.

---

# **15\. RLS — `ai_reports`**

## **15.1 Cliente**

Cliente pode ler os próprios relatórios.

create policy "customers can read own ai reports"  
on public.ai\_reports  
for select  
to authenticated  
using (  
  user\_id \= auth.uid()  
);

Cliente pode inserir relatório apenas para si mesmo e apenas se o Assistente Pro estiver ativo.

create policy "customers can insert own ai reports if assistant active"  
on public.ai\_reports  
for insert  
to authenticated  
with check (  
  user\_id \= auth.uid()  
  and public.has\_active\_assistant(auth.uid())  
);

## **15.2 Admin**

Admin pode ler relatórios, mas o uso deve gerar log operacional.

create policy "admins can read ai reports"  
on public.ai\_reports  
for select  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
);

## **15.3 Regra de privacidade**

Admin não deve abrir relatório IA sem necessidade operacional.

Quando abrir, registrar:

admin\_id  
ação: abriu relatório IA  
report\_id  
user\_id  
data

---

# **16\. RLS — `email_templates`**

## **16.1 Cliente**

Cliente não acessa templates.

## **16.2 Admin**

Admin pode ler e editar templates.

create policy "admins can manage email templates"  
on public.email\_templates  
for all  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
)  
with check (  
  public.is\_admin(auth.uid())  
);

## **16.3 Envio de e-mail**

Envio deve ocorrer no backend.

Cliente não dispara template diretamente, exceto por rotas públicas controladas como:

/ativar-acesso  
/esqueci-senha

Essas rotas precisam de rate limit.

---

# **17\. RLS — `admin_logs`**

## **17.1 Cliente**

Cliente não acessa logs.

## **17.2 Admin**

Admin pode ler logs.

create policy "admins can read admin logs"  
on public.admin\_logs  
for select  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
);

## **17.3 Insert**

Insert de log deve ser feito pelo servidor.

Se permitir insert por admin autenticado:

create policy "admins can insert admin logs"  
on public.admin\_logs  
for insert  
to authenticated  
with check (  
  public.is\_admin(auth.uid())  
);

---

# **18\. RLS — `payment_events`**

## **18.1 Cliente**

Cliente não acessa eventos de pagamento diretamente.

## **18.2 Admin**

Admin pode ler eventos.

create policy "admins can read payment events"  
on public.payment\_events  
for select  
to authenticated  
using (  
  public.is\_admin(auth.uid())  
);

## **18.3 Insert/Update**

Webhook no servidor insere e atualiza eventos.

Não permitir insert/update pelo cliente comum.

---

# **19\. Service Role**

## **19.1 Regra absoluta**

A chave `service_role` ou secret equivalente:

nunca vai para o frontend  
nunca aparece no browser  
nunca fica em código client-side  
nunca é exposta em logs

## **19.2 Onde pode usar**

Somente em ambiente servidor:

Next.js API Routes  
Server Actions seguras  
Jobs internos  
Webhook Asaas  
Importador CSV no admin  
Rotinas de expiração

## **19.3 Por quê**

A chave service role bypassa RLS.

Portanto, se vazar, a segurança por RLS perde efeito.

---

# **20\. Chaves Públicas**

A chave pública/anon/publishable pode ser usada no frontend apenas com RLS corretamente ativado.

Regra:

Frontend usa chave pública.  
Backend usa chave secreta.

Nunca misturar.

---

# **21\. Webhook Asaas**

## **21.1 Segurança mínima**

A rota `/api/asaas/webhook` deve:

1. aceitar apenas método esperado;  
2. validar token/header;  
3. salvar payload bruto;  
4. validar evento;  
5. garantir idempotência;  
6. processar assinatura/compra;  
7. registrar log.

## **21.2 Proibido**

liberar acesso por parâmetro vindo do frontend  
aceitar webhook sem validação  
processar pagamento duplicado  
confiar só no e-mail sem checar contexto

---

# **22\. Rate Limit**

Rotas públicas sensíveis precisam de limite:

/ativar-acesso  
/esqueci-senha  
/api/asaas/webhook  
/login

Sugestão inicial:

/ativar-acesso: 3 solicitações por e-mail por hora  
/esqueci-senha: 3 solicitações por e-mail por hora  
/login: limite por IP e e-mail  
/webhook: validar token \+ limitar abuso

---

# **23\. Respostas Neutras**

Em rotas públicas de e-mail, sempre responder de forma neutra.

## **23.1 Ativar acesso**

Se este e-mail estiver cadastrado, você receberá um link de ativação.

## **23.2 Esqueci senha**

Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.

Nunca responder:

E-mail encontrado.  
E-mail não encontrado.  
Usuário inexistente.  
Senha incorreta para este e-mail.

Motivo:

Evitar enumeração de usuários.

---

# **24\. Proteção de Dados dos Relatórios**

## **24.1 Dados sensíveis**

`ai_reports` pode conter dados profissionais e conteúdo sensível.

Regra:

Cliente só vê os próprios relatórios.  
Admin só abre se necessário.  
Toda abertura por admin gera log.

## **24.2 Fase futura**

Avaliar futuramente:

criptografia adicional de output\_text  
retenção limitada de relatórios  
opção de exclusão pelo cliente  
exportação de dados

Fora do MVP, mas não esquecer.

---

# **25\. Storage**

Se usar Supabase Storage para imagens/prints:

Buckets sugeridos:

product-images  
spreadsheet-thumbnails  
report-uploads  
banner-images

## **25.1 Buckets públicos**

Podem ser públicos:

product-images  
spreadsheet-thumbnails  
banner-images

## **25.2 Bucket privado**

Deve ser privado:

report-uploads

Regra:

Uploads de relatório pertencem ao usuário e não devem ser públicos.

---

# **26\. RLS/Policies para Storage**

## **26.1 Imagens públicas**

Produto/banner pode ser público, pois não contém dado sensível.

## **26.2 Uploads privados**

Cliente só acessa arquivos em pasta própria:

report-uploads/{user\_id}/arquivo.ext

Regra:

usuário só lê/escreve dentro de report-uploads/{auth.uid()}

Admin acessa apenas por necessidade operacional.

---

# **27\. Logs Obrigatórios**

Registrar em `admin_logs`:

importação CSV  
reenviar ativação  
alterar e-mail  
bloquear usuário  
desbloquear usuário  
liberar acesso vitalício  
cancelar acesso vitalício  
ativar Assistente Pro  
alterar vencimento  
cancelar Assistente Pro  
editar link de planilha  
editar banner  
abrir relatório IA  
reprocessar pagamento

Registrar em `payment_events`:

webhook recebido  
webhook processado  
webhook falhou  
webhook ignorado por duplicidade

---

# **28\. Confirmações Obrigatórias no Admin**

Pedir confirmação antes de:

bloquear usuário  
cancelar acesso vitalício  
cancelar Assistente Pro  
alterar vencimento para data anterior  
desativar planilha  
desativar banner  
excluir relatório  
alterar e-mail

---

# **29\. Regras de API**

## **29.1 API pública**

Rotas públicas:

/api/auth/activate  
/api/auth/reset  
/api/asaas/webhook

Precisam de:

validação de payload  
rate limit  
resposta neutra quando aplicável  
logs de erro

## **29.2 API autenticada**

Rotas autenticadas:

/api/app/\*  
/api/admin/\*

Precisam validar:

sessão  
role  
status  
permissão

## **29.3 API admin**

Toda rota `/api/admin/*` deve verificar:

public.is\_admin(auth.uid())

ou validação equivalente no servidor.

---

# **30\. Permissões por Tabela — Resumo**

| Tabela | Cliente | Admin | Servidor |
| ----- | ----- | ----- | ----- |
| profiles | próprio perfil | tudo | tudo |
| products | ativos | tudo | tudo |
| purchases | próprias | tudo | tudo |
| subscriptions | próprias | tudo | tudo |
| activation\_tokens | nenhum | limitado | tudo |
| promo\_banners | ativos | tudo | tudo |
| ai\_reports | próprios | leitura com log | tudo |
| email\_templates | nenhum | tudo | tudo |
| admin\_logs | nenhum | leitura | tudo |
| payment\_events | nenhum | leitura/reprocesso | tudo |

---

# **31\. Testes Obrigatórios de Segurança**

## **31.1 Cliente A não vê Cliente B**

Testar:

* profile;  
* purchases;  
* subscriptions;  
* ai\_reports;  
* report uploads.

Resultado esperado:

Cliente A não acessa nada do Cliente B.

## **31.2 Cliente não vira admin**

Testar:

* alterar `role`;  
* alterar `status`;  
* alterar `activation_status`;  
* acessar `/admin`;  
* chamar API admin.

Resultado esperado:

bloqueado

## **31.3 Cliente não libera Pro sozinho**

Testar:

* criar subscription pelo frontend;  
* editar expires\_at;  
* inserir purchase;  
* chamar rota proibida.

Resultado esperado:

bloqueado

## **31.4 Cliente sem Pro não gera relatório**

Testar:

* abrir `/app/assistente-pro`;  
* tentar chamar endpoint de geração;  
* tentar inserir em `ai_reports`.

Resultado esperado:

bloqueado

## **31.5 Webhook inválido**

Testar:

* sem token;  
* token errado;  
* payload inválido;  
* evento duplicado.

Resultado esperado:

não libera acesso indevido

---

# **32\. Checklist de Produção**

Antes de produção:

* RLS ativado em todas as tabelas sensíveis.  
* Policies revisadas.  
* Service role fora do frontend.  
* Webhook valida token.  
* Rotas públicas têm rate limit.  
* Tokens não são salvos puros.  
* Cliente não acessa dados de outro cliente.  
* Cliente não edita compra.  
* Cliente não edita assinatura.  
* Cliente não altera role.  
* Admin gera logs.  
* Uploads sensíveis são privados.  
* E-mails não expõem se usuário existe.  
* Erros não vazam stack trace.  
* Variáveis de ambiente revisadas.  
* Backups configurados.

---

# **33\. Critérios de Bloqueio**

Não lançar se:

RLS estiver desativado em tabela sensível  
service\_role aparecer no frontend  
cliente conseguir ver dados de outro cliente  
cliente conseguir ativar Assistente Pro sem pagamento  
webhook aceitar evento sem validação  
activation\_tokens expuser token puro  
report-uploads for público  
admin não registrar alterações sensíveis

---

# **34\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| RLS obrigatório | Congelado |
| Cliente vê só dados próprios | Congelado |
| Produtos/banners ativos podem ser lidos por clientes | Congelado |
| Admin vê e edita tudo que precisa operar | Congelado |
| Service role só no servidor | Congelado |
| Tokens salvos apenas como hash | Congelado |
| Webhook precisa validação | Congelado |
| Rotas públicas precisam resposta neutra | Congelado |
| Relatórios IA são privados | Congelado |
| Uploads de relatório ficam privados | Congelado |
| Ações sensíveis geram log | Congelado |

---

## **35\. Frase Norteadora**

A segurança do PsicoPlanilhas 2.0 deve ser simples e rígida: cliente vê apenas os próprios dados, admin opera com logs, pagamentos são confirmados no servidor, o Assistente Pro só libera por assinatura ativa e nenhuma chave secreta aparece no frontend.

