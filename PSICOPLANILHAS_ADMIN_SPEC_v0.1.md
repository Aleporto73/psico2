# **PSICOPLANILHAS\_ADMIN\_SPEC\_v0.1**

## **1\. Objetivo do Documento**

Definir o painel administrativo do PsicoPlanilhas 2.0.

O admin precisa controlar:

1. Clientes.  
2. Acesso vitalício às planilhas.  
3. Assinatura anual do Assistente IA Pro.  
4. Planilhas e links do Google Sheets.  
5. Vídeo-banners comerciais.  
6. Produtos extras.  
7. E-mails automáticos.  
8. Importação da base antiga.  
9. Logs de ações importantes.

---

## **2\. Princípio Central do Admin**

O painel admin deve ser simples, operacional e rápido.

Ele não deve virar um sistema complexo.

A função principal é:

Encontrar cliente, liberar acesso, editar link, controlar assinatura e vender mais.

---

## **3\. Menu Admin**

Menu recomendado:

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
Sair

---

## **4\. Dashboard Admin**

## **4.1 Rota**

/admin

## **4.2 Objetivo**

Mostrar visão rápida da operação.

## **4.3 Cards principais**

Clientes totais  
Clientes ativos  
Clientes bloqueados  
Clientes com Assistente IA Pro ativo  
Assinaturas vencidas  
Assinaturas vencendo em 7 dias  
Planilhas cadastradas  
Vídeo-banners ativos  
Relatórios IA gerados no mês

## **4.4 Ações rápidas**

Buscar cliente  
Cadastrar cliente  
Importar CSV  
Cadastrar planilha  
Cadastrar banner  
Ver assinaturas vencidas

---

## **5\. Admin — Clientes**

## **5.1 Rota**

/admin/clientes

## **5.2 Objetivo**

Gerenciar usuários da plataforma.

## **5.3 Tabela de clientes**

Colunas obrigatórias:

Nome  
E-mail  
Perfil  
Acesso vitalício  
Assistente Pro  
Vencimento Pro  
Último login  
Status  
Ações

## **5.4 Filtros**

Todos  
Ativos  
Bloqueados  
Com acesso vitalício  
Sem acesso vitalício  
Com Assistente Pro ativo  
Com Assistente Pro vencido  
Perfil psicólogo  
Perfil psicopedagogo  
Perfil ambos  
Perfil não informado

## **5.5 Busca**

Buscar por:

Nome  
E-mail  
Código da compra  
Referência de pagamento

---

## **6\. Cadastro de Cliente**

## **6.1 Campos**

Nome  
E-mail  
Telefone  
Perfil profissional  
Status  
Criar acesso vitalício?  
Enviar e-mail de acesso?

## **6.2 Regras**

Ao cadastrar manualmente:

* criar usuário no Auth;  
* criar registro em `profiles`;  
* se marcado, criar compra manual em `purchases`;  
* enviar e-mail de acesso, se marcado.

## **6.3 Status inicial**

active

---

## **7\. Página de Detalhe do Cliente**

## **7.1 Rota**

/admin/clientes/\[id\]

## **7.2 Blocos**

A página do cliente deve mostrar:

Dados do cliente  
Acesso vitalício  
Assistente IA Pro  
Compras  
Relatórios IA  
Logs administrativos  
Ações rápidas

---

## **8\. Ações no Cliente**

Admin pode:

Editar nome  
Editar telefone  
Editar perfil profissional  
Bloquear usuário  
Desbloquear usuário  
Resetar senha  
Liberar acesso vitalício  
Remover acesso vitalício  
Ativar Assistente IA Pro  
Renovar Assistente IA Pro  
Alterar vencimento do Assistente IA Pro  
Cancelar Assistente IA Pro  
Reenviar e-mail de acesso

---

## **9\. Acesso Vitalício**

## **9.1 Regra**

O acesso vitalício às planilhas depende de compra paga ou manual do produto:

psicoplanilhas-vitalicio

## **9.2 Admin pode criar acesso manual**

Ao clicar em:

Liberar acesso vitalício

O sistema cria registro em `purchases`:

payment\_status \= manual  
source \= admin

## **9.3 Admin pode remover acesso**

Ao remover, o sistema não deve apagar o histórico.

Melhor regra:

alterar payment\_status para cancelled  
registrar em admin\_logs

---

## **10\. Assistente IA Pro no Admin**

## **10.1 Regra**

O Assistente IA Pro depende de assinatura ativa em `subscriptions`.

## **10.2 Ações**

Admin pode:

Ativar por 1 ano  
Ativar até data personalizada  
Renovar por mais 1 ano  
Cancelar  
Marcar como vencido  
Alterar vencimento

## **10.3 Campos exibidos**

Status  
Data de início  
Data de vencimento  
Fonte  
Referência de pagamento  
Última renovação

## **10.4 Regra de segurança**

Toda alteração manual deve gerar log.

Exemplo:

Admin alterou vencimento do Assistente IA Pro de 01/06/2026 para 01/06/2027.

---

## **11\. Admin — Planilhas**

## **11.1 Rota**

/admin/planilhas

## **11.2 Objetivo**

Cadastrar e editar as planilhas entregues ao cliente.

## **11.3 Tabela**

Colunas:

Nome  
Categoria  
Público  
Status  
Ordem  
Última atualização  
Ações

## **11.4 Campos da planilha**

Nome  
Slug  
Categoria  
Descrição curta  
Imagem  
Link Google Sheets  
Link tutorial  
Público  
Ativa?  
Ordem

## **11.5 Ações**

Cadastrar planilha  
Editar  
Desativar  
Reativar  
Duplicar  
Testar link

## **11.6 Regra**

Planilhas desativadas não aparecem para clientes.

---

## **12\. Link Google Sheets**

## **12.1 Regra**

O botão “Acessar Planilha” deve abrir o link salvo em:

products.access\_url

## **12.2 Admin deve conseguir testar**

Botão:

Testar link

Abre o link em nova aba.

## **12.3 Alerta**

Se o link estiver vazio, o card não deve ser publicado como ativo.

---

## **13\. Admin — Produtos**

## **13.1 Rota**

/admin/produtos

## **13.2 Objetivo**

Cadastrar produtos complementares para vender dentro da área de membros.

Exemplos:

Axis TCC  
PsicoBook  
NeuroRastreio  
ABA Simples  
PEI  
Produtos de relatórios  
Cursos  
Outros

## **13.3 Campos**

Nome  
Slug  
Tipo  
Público  
Descrição curta  
Imagem  
Vídeo  
URL de checkout  
Preço  
Status  
Ordem

## **13.4 Tipos**

external\_product  
assistant  
bundle  
tutorial

## **13.5 Público**

all  
psychologist  
psychopedagogue  
both

---

## **14\. Admin — Vídeo-Banners**

## **14.1 Rota**

/admin/banners

## **14.2 Objetivo**

Controlar os banners comerciais do dashboard e da área de produtos.

## **14.3 Banners obrigatórios**

Assistente IA Pro  
Produtos para Psicólogos  
Produtos para Psicopedagogos

## **14.4 Campos**

Título  
Subtítulo  
Público  
Posição  
Imagem/thumbnail  
URL do vídeo  
Texto do botão principal  
URL do botão principal  
Texto do botão secundário  
URL do botão secundário  
Status  
Ordem

## **14.5 Posições**

dashboard\_top  
dashboard\_middle  
products\_page  
assistant\_page

## **14.6 Regra**

O vídeo não deve aparecer aberto no dashboard.

O banner abre vídeo em modal.

---

## **15\. Admin — Assinaturas**

## **15.1 Rota**

/admin/assinaturas

## **15.2 Objetivo**

Controlar o Assistente IA Pro.

## **15.3 Tabela**

Colunas:

Cliente  
E-mail  
Plano  
Status  
Início  
Vencimento  
Fonte  
Referência  
Ações

## **15.4 Filtros**

Todas  
Ativas  
Vencidas  
Canceladas  
Manuais  
Vencendo em 7 dias  
Vencendo em 30 dias

## **15.5 Ações**

Renovar  
Cancelar  
Alterar vencimento  
Abrir cliente

---

## **16\. Regra de Vencimento**

## **16.1 Ativo**

expires\_at \>= hoje  
status \= active ou manual

## **16.2 Vencido**

expires\_at \< hoje

## **16.3 Comportamento**

Quando vencido:

* cliente mantém acesso às planilhas;  
* Assistente IA Pro volta para cadeado;  
* aparece botão de renovação;  
* pode receber e-mail de renovação.

---

## **17\. Admin — Relatórios IA**

## **17.1 Rota**

/admin/relatorios-ia

## **17.2 Objetivo**

Monitorar uso do Assistente IA Pro.

## **17.3 Tabela**

Colunas:

Cliente  
E-mail  
Tipo de relatório  
Data  
Tamanho  
Ações

## **17.4 Ações**

Ver detalhes  
Excluir  
Abrir cliente

## **17.5 Regra de privacidade**

O admin deve acessar relatórios apenas por necessidade operacional.

Recomendação:

* registrar log quando admin abrir relatório;  
* evitar exibição do texto completo direto na tabela.

---

## **18\. Admin — E-mails**

## **18.1 Rota**

/admin/emails

## **18.2 Objetivo**

Editar templates automáticos.

## **18.3 Templates iniciais**

Acesso criado  
Reset de senha  
Compra Assistente Pro  
Renovação Assistente Pro  
Vencimento próximo  
Assinatura vencida

## **18.4 Campos**

Nome do template  
Evento  
Assunto  
Corpo  
Status

## **18.5 Variáveis permitidas**

{{nome}}  
{{email}}  
{{produto}}  
{{link\_acesso}}  
{{expires\_at}}  
{{checkout\_url}}

---

## **19\. Admin — Importação**

## **19.1 Rota**

/admin/importacao

## **19.2 Objetivo**

Importar a base antiga de aproximadamente 3.000 usuários.

## **19.3 Formato CSV mínimo**

name,email,phone,purchase\_code,purchase\_date,profile\_type

## **19.4 Campos obrigatórios**

name  
email

## **19.5 Campos opcionais**

phone  
purchase\_code  
purchase\_date  
profile\_type

## **19.6 Processo de importação**

Upload CSV  
↓  
Validar colunas  
↓  
Exibir prévia  
↓  
Marcar duplicados  
↓  
Confirmar importação  
↓  
Criar usuário Auth  
↓  
Criar profile  
↓  
Criar purchase manual/vitalícia  
↓  
Gerar senha temporária ou magic link  
↓  
Enviar e-mail, se habilitado

---

## **20\. Regras da Importação**

## **20.1 Usuário importado recebe**

Acesso vitalício às planilhas  
Assistente GPT Builder incluso  
Assistente IA Pro bloqueado  
Vídeo-banners ativos

## **20.2 Usuário importado NÃO recebe**

Assistente IA Pro gratuito  
Assinatura anual automática  
Produtos extras pagos

## **20.3 Duplicados**

Se o e-mail já existir:

não criar novo usuário  
atualizar dados comerciais se necessário  
registrar aviso

## **20.4 Erros**

Gerar relatório de erros:

linha  
e-mail  
motivo do erro

---

## **21\. Admin — Configurações**

## **21.1 Rota**

/admin/configuracoes

## **21.2 Configurações iniciais**

URL do Assistente GPT Builder incluso  
URL de checkout do Assistente IA Pro  
Preço do Assistente IA Pro  
Texto do aviso das planilhas  
Limite técnico diário do Assistente Pro  
E-mail de suporte  
Nome da empresa  
CNPJ

---

## **22\. Logs Administrativos**

## **22.1 Quando registrar log**

Registrar log quando admin:

criar cliente  
editar cliente  
bloquear cliente  
liberar acesso vitalício  
remover acesso vitalício  
ativar Assistente Pro  
alterar vencimento  
cancelar assinatura  
editar link de planilha  
editar banner  
abrir relatório IA  
importar CSV

## **22.2 Campos do log**

admin\_id  
ação  
tabela alvo  
id alvo  
metadata  
data

---

## **23\. Permissões**

## **23.1 Admin**

Pode:

ver tudo  
editar clientes  
editar planilhas  
editar banners  
editar produtos  
editar assinaturas  
editar templates  
importar usuários

## **23.2 Cliente**

Não acessa `/admin`.

## **23.3 Bloqueio**

Se usuário não for admin e tentar acessar `/admin`:

redirecionar para /app

---

## **24\. Webhooks de Pagamento**

## **24.1 Objetivo**

Liberar automaticamente o Assistente IA Pro após pagamento.

## **24.2 Evento de compra do Assistente Pro**

Quando pagamento aprovado:

localizar usuário por e-mail  
criar usuário se necessário  
criar ou atualizar assinatura  
started\_at \= agora  
expires\_at \= agora \+ 1 ano  
status \= active  
registrar payment\_reference  
enviar e-mail de confirmação

## **24.3 Evento de renovação**

Quando renovação aprovada:

atualizar assinatura  
expires\_at \= agora \+ 1 ano  
status \= active  
renovar acesso  
registrar log

## **24.4 Evento de cancelamento/reembolso**

Quando cancelado/reembolsado:

status \= cancelled  
bloquear Assistente Pro  
manter acesso às planilhas, se houver compra vitalícia

---

## **25\. Regras Contra Erro Humano**

## **25.1 Confirmação obrigatória**

Pedir confirmação antes de:

bloquear usuário  
remover acesso vitalício  
cancelar Assistente Pro  
alterar vencimento para data anterior  
excluir relatório  
desativar planilha

## **25.2 Mensagem de confirmação**

Exemplo:

Tem certeza que deseja bloquear este usuário?  
Essa ação impedirá o acesso à área de membros.

---

## **26\. UX do Admin**

## **26.1 Prioridade**

O admin deve ser rápido.

Regras:

* busca no topo;  
* tabelas simples;  
* ações visíveis;  
* filtros claros;  
* nada de dashboard poluído;  
* nada de gráficos inúteis no MVP.

## **26.2 O que evitar**

gráficos complexos  
abas escondidas  
menus profundos  
edições sem log  
campos demais no cadastro inicial

---

## **27\. Checklist do Admin MVP**

## **Clientes**

* listar clientes;  
* buscar cliente;  
* criar cliente;  
* editar cliente;  
* resetar senha;  
* bloquear/desbloquear;  
* liberar acesso vitalício.

## **Planilhas**

* listar;  
* criar;  
* editar;  
* testar link;  
* ativar/desativar.

## **Assistente Pro**

* ver assinaturas;  
* ativar manualmente;  
* alterar vencimento;  
* cancelar;  
* ver vencidos.

## **Banners**

* criar;  
* editar;  
* ativar/desativar;  
* ordenar.

## **Produtos**

* criar produto externo;  
* editar link de checkout;  
* segmentar por público.

## **Importação**

* importar CSV;  
* detectar duplicados;  
* criar acesso vitalício;  
* gerar relatório de erros.

---

## **28\. O Que Fica Fora do MVP**

CRM completo  
funil de vendas interno  
afiliados  
cupons avançados  
dashboard financeiro complexo  
comissão por vendedor  
multiempresa  
multiadmin granular  
editor visual de página

---

## **29\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Admin simples | Congelado |
| Clientes no centro do admin | Congelado |
| Planilhas como links Google Sheets | Congelado |
| Assistente Pro por assinatura anual | Congelado |
| Admin pode ativar manualmente | Congelado |
| Toda alteração sensível gera log | Congelado |
| Importação dos 3.000 usuários | Congelado |
| Produtos e banners editáveis | Congelado |
| Sem CRM complexo no MVP | Congelado |

---

## **30\. Frase Norteadora**

O painel admin do PsicoPlanilhas 2.0 deve permitir controlar rapidamente clientes, acessos, planilhas, assinaturas, banners e produtos, sem transformar a plataforma em um sistema grande ou burocrático.

