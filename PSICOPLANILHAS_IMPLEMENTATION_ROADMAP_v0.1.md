# **PSICOPLANILHAS\_IMPLEMENTATION\_ROADMAP\_v0.1**

## **1\. Objetivo do Documento**

Definir a ordem real de implementação do PsicoPlanilhas 2.0.

Este roadmap existe para impedir que o desenvolvimento comece pela parte errada.

Prioridade correta:

1\. Banco  
2\. Login  
3\. Ativação por e-mail  
4\. Acesso vitalício  
5\. Dashboard  
6\. Planilhas  
7\. Vídeo-banners  
8\. Assistente IA Pro  
9\. Pagamento anual  
10\. Importação da base antiga

Regra central:

Não começar por tela bonita.  
Começar por autenticação, acesso, banco e regra do cadeado.

---

## **2\. Produto Final Esperado**

O MVP deve entregar:

* login seguro;  
* ativação de clientes antigos por e-mail;  
* área de membros simples;  
* acesso vitalício às planilhas;  
* Assistente GPT Builder incluso;  
* Assistente IA Pro com cadeado;  
* assinatura anual R$50;  
* vídeo-banners comerciais;  
* admin simples;  
* importação dos clientes antigos;  
* controle de vencimento do Assistente IA Pro.

---

## **3\. Stack Congelada**

Stack recomendada para MVP:

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

---

## **4\. Regra Contra Complexidade**

Antes de implementar qualquer recurso, validar:

Isso ajuda a:  
1\. entregar as planilhas?  
2\. ativar a base antiga?  
3\. vender o Assistente IA Pro?  
4\. vender outros produtos?

Se a resposta for não, fica fora do MVP.

---

# **5\. Fase 0 — Preparação do Projeto**

## **5.1 Objetivo**

Criar a base técnica limpa.

## **5.2 Tarefas**

* Criar repositório.  
* Criar projeto Next.js.  
* Configurar TypeScript.  
* Configurar Tailwind.  
* Instalar shadcn/ui.  
* Criar estrutura de pastas.  
* Configurar Supabase.  
* Configurar variáveis de ambiente.  
* Criar layout base.  
* Criar rotas públicas e privadas.

## **5.3 Rotas iniciais**

/  
 /login  
 /ativar-acesso  
 /esqueci-senha  
 /app  
 /admin

## **5.4 Gate de aprovação**

Só avançar quando:

* projeto roda localmente;  
* Supabase conectado;  
* variáveis funcionando;  
* layout base criado;  
* rotas básicas acessíveis.

---

# **6\. Fase 1 — Banco de Dados**

## **6.1 Objetivo**

Criar o banco simples conforme a spec.

## **6.2 Tabelas**

Criar:

profiles  
products  
purchases  
subscriptions  
activation\_tokens  
promo\_banners  
ai\_reports  
email\_templates  
admin\_logs

## **6.3 Funções obrigatórias**

Criar:

has\_lifetime\_access(user\_uuid)  
has\_active\_assistant(user\_uuid)

## **6.4 View obrigatória**

Criar:

user\_access\_status

## **6.5 Produtos fixos**

Inserir no banco:

PsicoPlanilhas Vitalício  
slug: psicoplanilhas-vitalicio  
price: 97  
billing\_type: one\_time

Assistente IA Pro  
slug: assistente-ia-pro  
price: 50  
billing\_type: yearly

## **6.6 Gate de aprovação**

Só avançar quando:

* tabelas criadas;  
* funções funcionando;  
* view funcionando;  
* produtos fixos cadastrados;  
* um usuário teste consegue ter acesso vitalício manual;  
* um usuário teste consegue ter Assistente Pro ativo/vencido.

---

# **7\. Fase 2 — Autenticação e Ativação**

## **7.1 Objetivo**

Resolver o ponto mais crítico: cliente antigo cria nova senha por e-mail.

## **7.2 Tarefas**

* Implementar login.  
* Implementar logout.  
* Implementar proteção de rotas.  
* Implementar `/ativar-acesso`.  
* Implementar envio de link de ativação.  
* Implementar criação de nova senha.  
* Implementar reset de senha.  
* Atualizar `activation_status`.  
* Atualizar `last_login_at`.

## **7.3 Páginas**

/login  
/ativar-acesso  
/esqueci-senha  
/definir-senha

## **7.4 Regras obrigatórias**

* Não criar senha padrão.  
* Não enviar senha por e-mail.  
* Não mostrar se e-mail existe.  
* Usar resposta pública neutra.  
* Bloquear usuário com `status = blocked`.  
* Redirecionar admin para `/admin`.  
* Redirecionar cliente para `/app`.

## **7.5 Mensagem neutra obrigatória**

Se este e-mail estiver cadastrado, você receberá um link.

## **7.6 Gate de aprovação**

Só avançar quando:

* cliente importado consegue criar senha;  
* cliente não ativado não entra sem senha;  
* reset funciona;  
* login funciona;  
* resposta neutra funciona;  
* usuário bloqueado não acessa;  
* admin entra no `/admin`.

---

# **8\. Fase 3 — Admin Básico**

## **8.1 Objetivo**

Criar o painel mínimo para controlar clientes e acessos.

## **8.2 Rotas**

/admin  
/admin/clientes  
/admin/clientes/\[id\]  
/admin/importacao  
/admin/planilhas  
/admin/banners  
/admin/assinaturas

## **8.3 Funcionalidades mínimas**

Admin deve conseguir:

* listar clientes;  
* buscar cliente por nome/e-mail;  
* ver status de ativação;  
* ver acesso vitalício;  
* ver status do Assistente Pro;  
* reenviar ativação;  
* enviar reset de senha;  
* bloquear/desbloquear cliente;  
* liberar acesso vitalício manual;  
* ativar Assistente Pro manualmente;  
* alterar vencimento do Assistente Pro.

## **8.4 Logs**

Gerar `admin_logs` para:

bloquear usuário  
liberar acesso vitalício  
ativar Assistente Pro  
alterar vencimento  
reenviar ativação  
alterar e-mail

## **8.5 Gate de aprovação**

Só avançar quando o admin consegue:

* encontrar cliente;  
* liberar planilhas;  
* bloquear cliente;  
* ativar Assistente Pro;  
* alterar vencimento;  
* reenviar ativação;  
* ver logs.

---

# **9\. Fase 4 — Importação da Base Antiga**

## **9.1 Objetivo**

Importar os clientes antigos por lista de e-mails.

## **9.2 Entrada**

CSV mínimo:

name,email

CSV recomendado:

name,email,phone,purchase\_code,purchase\_date,profile\_type,source

## **9.3 Fluxo**

Upload CSV  
↓  
Validar colunas  
↓  
Normalizar e-mails  
↓  
Detectar duplicados  
↓  
Exibir prévia  
↓  
Confirmar importação  
↓  
Criar Auth user  
↓  
Criar profile pending\_activation  
↓  
Criar purchase manual vitalícia  
↓  
Enviar ativação, se habilitado

## **9.4 Resultado esperado**

Cada cliente importado deve ficar com:

status \= active  
activation\_status \= pending\_activation  
purchase \= psicoplanilhas-vitalicio manual  
subscription \= vazio

## **9.5 Gate de aprovação**

Fazer primeiro com CSV de teste.

Só avançar quando:

* 20 usuários teste importam corretamente;  
* duplicados são detectados;  
* e-mails inválidos são separados;  
* purchase manual é criada;  
* ativação funciona;  
* relatório de importação é gerado.

---

# **10\. Fase 5 — Área do Cliente**

## **10.1 Objetivo**

Criar a área principal do cliente.

## **10.2 Rotas**

/app  
/app/planilhas  
/app/assistente-gpt  
/app/assistente-pro  
/app/produtos  
/app/minha-conta

## **10.3 Dashboard**

Ordem visual:

1\. Boas-vindas  
2\. Card Minhas Planilhas  
3\. Banner Assistente IA Pro  
4\. Banner segmentado por perfil  
5\. Produtos recomendados  
6\. Aviso de uso responsável

## **10.4 Gate de aprovação**

Só avançar quando:

* cliente antigo ativado entra no dashboard;  
* vê planilhas liberadas;  
* vê Assistente GPT incluso;  
* vê Assistente Pro bloqueado;  
* vê banners;  
* perfil profissional altera banners.

---

# **11\. Fase 6 — Planilhas**

## **11.1 Objetivo**

Entregar o produto principal.

## **11.2 Admin de planilhas**

Campos:

nome  
slug  
categoria  
descrição  
imagem  
link Google Sheets  
link tutorial  
público  
status  
ordem

## **11.3 Área do cliente**

Cada planilha deve ter:

imagem  
nome  
categoria  
descrição curta  
botão Acessar Planilha  
botão Ver Tutorial

## **11.4 Aviso obrigatório**

Esta planilha é um recurso de apoio operacional.  
Ela agiliza cálculos, organização e visualização dos dados.  
O uso correto exige o manual original do instrumento.  
Não substitui avaliação profissional, teste original, manual ou interpretação clínica.

## **11.5 Gate de aprovação**

Só avançar quando:

* admin cadastra planilha;  
* cliente vê planilha;  
* link abre corretamente;  
* planilha inativa não aparece;  
* aviso obrigatório aparece.

---

# **12\. Fase 7 — Vídeo-Banners e Produtos**

## **12.1 Objetivo**

Criar vitrine comercial limpa.

## **12.2 Banners obrigatórios**

Assistente IA Pro  
Produtos para Psicólogos  
Produtos para Psicopedagogos

## **12.3 Comportamento**

* vídeo aparece como banner;  
* vídeo abre em modal;  
* não usar autoplay;  
* não abrir 3 players no dashboard;  
* segmentar por perfil.

## **12.4 Produtos externos**

Cadastrar produtos como:

Axis TCC  
PsicoBook  
NeuroRastreio  
ABA Simples  
PEI  
Produtos de relatórios

## **12.5 Gate de aprovação**

Só avançar quando:

* banner fixo aparece para todos;  
* banner psicólogo aparece para psicólogos;  
* banner psicopedagogo aparece para psicopedagogos;  
* perfil `both` vê os dois;  
* modal de vídeo funciona;  
* botão leva para checkout/página correta.

---

# **13\. Fase 8 — Assistente IA Pro**

## **13.1 Objetivo**

Criar produto de recorrência.

## **13.2 Estados**

sem assinatura \= cadeado  
ativo \= formulário liberado  
vencido \= cadeado \+ renovar  
manual \= liberado até data definida

## **13.3 Formulário MVP**

Campos:

Nome ou identificação do avaliado  
Idade ou faixa etária  
Área do relatório  
Dados da planilha  
Objetivo do relatório  
Observações opcionais  
Upload de imagem, se viável

## **13.4 Histórico**

Salvar em:

ai\_reports

## **13.5 Regras do prompt**

O assistente deve:

* não diagnosticar;  
* não inventar pontos de corte;  
* não substituir manual;  
* não afirmar resultado clínico definitivo;  
* usar apenas dados fornecidos;  
* finalizar com aviso de revisão profissional.

## **13.6 Gate de aprovação**

Só avançar quando:

* usuário sem assinatura não gera relatório;  
* usuário ativo gera relatório;  
* relatório salva no histórico;  
* usuário vencido volta para cadeado;  
* prompt respeita regras;  
* limite técnico invisível funciona.

---

# **14\. Fase 9 — Pagamento e Webhooks**

## **14.1 Objetivo**

Liberar Assistente IA Pro automaticamente após pagamento.

## **14.2 Checkout**

Produto:

Assistente IA Pro  
R$50/ano

## **14.3 Webhook aprovado**

Quando pagamento aprovado:

localizar usuário por e-mail  
criar ou atualizar subscription  
started\_at \= agora  
expires\_at \= agora \+ 1 ano  
status \= active  
registrar payment\_reference  
enviar e-mail de confirmação

## **14.4 Renovação**

Quando renovar:

expires\_at \= agora \+ 1 ano  
status \= active  
cadeado desaparece

## **14.5 Gate de aprovação**

Só avançar quando:

* pagamento teste aprova;  
* assinatura é criada;  
* vencimento fica correto;  
* usuário acessa Assistente Pro;  
* vencimento manual bloqueia após expirar;  
* renovação reativa acesso.

---

# **15\. Fase 10 — E-mails Automáticos**

## **15.1 Templates obrigatórios**

Ativação de acesso  
Reset de senha  
Compra Assistente Pro  
Assistente vencendo  
Assistente vencido  
Renovação confirmada

## **15.2 E-mails críticos**

* ativação da nova conta;  
* redefinição de senha;  
* confirmação do Assistente Pro;  
* lembrete de vencimento;  
* vencimento.

## **15.3 Gate de aprovação**

Só avançar quando:

* templates editáveis funcionam;  
* variáveis renderizam;  
* e-mails chegam;  
* domínio de envio configurado;  
* links funcionam;  
* não cai tudo em spam no teste.

---

# **16\. Fase 11 — Testes de Fluxo Completo**

## **16.1 Persona 1 — Cliente antigo**

Deve:

* receber link;  
* criar senha;  
* acessar dashboard;  
* ver planilhas;  
* ver GPT Builder;  
* ver Assistente Pro bloqueado;  
* ver banners.

## **16.2 Persona 2 — Cliente novo R$97**

Deve:

* comprar;  
* receber acesso;  
* criar senha;  
* acessar planilhas;  
* ver Assistente Pro bloqueado.

## **16.3 Persona 3 — Cliente com Assistente Pro**

Deve:

* comprar R$50/ano;  
* ter assinatura ativa;  
* gerar relatório;  
* ver histórico.

## **16.4 Persona 4 — Cliente vencido**

Deve:

* manter planilhas;  
* perder Assistente Pro;  
* ver cadeado;  
* conseguir renovar.

## **16.5 Persona 5 — Admin**

Deve:

* importar clientes;  
* reenviar ativação;  
* liberar acesso manual;  
* alterar vencimento;  
* cadastrar planilha;  
* cadastrar banner;  
* ver logs.

---

# **17\. Fase 12 — Deploy**

## **17.1 Ambiente**

Criar:

development  
staging  
production

## **17.2 Antes de produção**

Validar:

* variáveis de ambiente;  
* Supabase produção;  
* domínio;  
* e-mail transacional;  
* checkout produção;  
* webhooks produção;  
* RLS;  
* backups;  
* admin principal;  
* página de suporte.

## **17.3 Gate de produção**

Só lançar se:

* login funciona;  
* ativação funciona;  
* planilhas liberam;  
* Assistente Pro trava/libera;  
* pagamentos funcionam;  
* e-mails chegam;  
* admin consegue operar;  
* base piloto foi testada.

---

# **18\. Ordem Real de Entrega do MVP**

## **Sprint 1 — Fundação**

Next.js  
Supabase  
Banco  
Auth básico  
Layout base

## **Sprint 2 — Ativação**

/ativar-acesso  
/definir-senha  
/esqueci-senha  
activation\_status  
e-mails de ativação

## **Sprint 3 — Admin mínimo**

clientes  
detalhe do cliente  
liberar vitalício  
ativar Assistente Pro  
reenviar ativação  
logs

## **Sprint 4 — Importação**

CSV  
validação  
duplicados  
purchase manual  
relatório de importação

## **Sprint 5 — Área do cliente**

dashboard  
planilhas  
Assistente GPT  
cadeado Assistente Pro  
minha conta

## **Sprint 6 — Banners e produtos**

3 vídeo-banners  
segmentação por perfil  
produtos externos  
modal de vídeo

## **Sprint 7 — Assistente Pro**

formulário  
OpenAI API  
histórico  
prompt seguro  
limite técnico

## **Sprint 8 — Pagamento**

checkout  
webhook  
assinatura anual  
renovação  
e-mails

## **Sprint 9 — QA e lançamento**

testes completos  
importação piloto  
ajustes  
deploy produção

---

# **19\. Prioridade Absoluta**

A ordem que não pode ser invertida:

1\. Auth  
2\. Ativação  
3\. Acesso vitalício  
4\. Admin clientes  
5\. Importação  
6\. Dashboard  
7\. Planilhas  
8\. Cadeado  
9\. Banners  
10\. Assistente Pro  
11\. Pagamento

Não começar por:

design avançado  
animações  
editor de relatório complexo  
upload sofisticado  
dashboard cheio de gráficos  
sistema de cursos  
CRM

---

# **20\. Definition of Done do MVP**

O MVP está pronto quando:

* cliente antigo consegue ativar acesso;  
* cliente antigo vê planilhas;  
* cliente antigo não recebe Assistente Pro grátis;  
* cliente vê oferta do Assistente Pro;  
* cliente consegue comprar Assistente Pro;  
* assinatura libera por 1 ano;  
* após vencimento volta o cadeado;  
* admin consegue importar base;  
* admin consegue resolver suporte;  
* vídeo-banners aparecem por perfil;  
* produtos extras podem ser divulgados;  
* sistema está limpo e simples.

---

# **21\. Riscos Técnicos**

| Risco | Mitigação |
| ----- | ----- |
| E-mail cair em spam | configurar domínio, SPF, DKIM, DMARC |
| Cliente não lembrar e-mail | suporte por comprovante |
| Importação duplicada | normalização e deduplicação |
| Webhook falhar | logs e reprocessamento manual |
| Custo de IA subir | limite técnico invisível |
| Admin errar vencimento | confirmação \+ log |
| Usuário achar Pro incluso | copy clara e cadeado |
| Tela ficar poluída | vídeo em banner/modal |

---

# **22\. Riscos Comerciais**

| Risco | Mitigação |
| ----- | ----- |
| Base antiga não ativar | campanha em lotes \+ lembrete |
| Usuário não entender nova senha | FAQ e e-mail claro |
| Baixa conversão do Pro | vídeo fixo no dashboard |
| Muitos produtos confundirem | segmentação por perfil |
| Produto parecer diagnóstico | linguagem de apoio operacional |

---

# **23\. Métricas Pós-Lançamento**

Acompanhar:

usuários importados  
usuários ativados  
pendentes de ativação  
taxa de ativação  
cliques no Assistente Pro  
compras do Assistente Pro  
renovações  
relatórios gerados  
cliques nos banners  
conversão por perfil  
tickets de suporte

---

# **24\. Critérios de Bloqueio**

Não lançar se:

* ativação por e-mail falhar;  
* login estiver instável;  
* cliente sem assinatura acessar Assistente Pro;  
* cliente antigo não acessar planilhas;  
* admin não conseguir reenviar ativação;  
* webhook não registrar assinatura;  
* e-mails não chegarem;  
* RLS não estiver validado;  
* não houver suporte para cliente sem e-mail encontrado.

---

# **25\. O Que Fica Para Pós-MVP**

upload avançado de PDF  
editor rico de relatório  
exportação em PDF  
templates complexos de relatório  
login social  
2FA  
CRM interno  
afiliados  
cupons avançados  
dashboard financeiro  
LMS completo  
comunidade

---

# **26\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Construir por fases | Congelado |
| Auth antes de UI | Congelado |
| Ativação antes de importação completa | Congelado |
| Admin mínimo antes do cliente final | Congelado |
| Importação piloto obrigatória | Congelado |
| Banners depois da área base | Congelado |
| Assistente Pro depois do cadeado | Congelado |
| Pagamento depois do fluxo manual validado | Congelado |
| Deploy só após testes de personas | Congelado |

---

## **27\. Frase Norteadora**

A implementação do PsicoPlanilhas 2.0 deve seguir uma ordem simples e segura: primeiro ativar usuários e controlar acessos; depois entregar planilhas; depois vender Assistente Pro e produtos extras.

