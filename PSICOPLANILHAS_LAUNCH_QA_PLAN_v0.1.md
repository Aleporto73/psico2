# **PSICOPLANILHAS\_LAUNCH\_QA\_PLAN\_v0.1**

## **1\. Objetivo do Documento**

Definir o plano final de QA, homologação e lançamento do PsicoPlanilhas 2.0.

Este documento valida se o sistema pode ir para produção sem quebrar:

1. ativação por e-mail;  
2. login;  
3. acesso vitalício às planilhas;  
4. Assistente GPT incluso;  
5. Assistente IA Pro anual;  
6. pagamento via Asaas;  
7. vídeo-banners comerciais;  
8. admin;  
9. importação da base antiga;  
10. segurança/RLS.

---

## **2\. Regra Principal de Lançamento**

O PsicoPlanilhas 2.0 só pode ser lançado quando estes fluxos estiverem funcionando:

Cliente antigo ativa acesso por e-mail.  
Cliente acessa planilhas vitalícias.  
Cliente vê Assistente IA Pro bloqueado.  
Cliente compra Assistente IA Pro.  
Pagamento Asaas libera por 1 ano.  
Ao vencer, volta o cadeado.  
Admin consegue resolver suporte.

Se qualquer um desses fluxos falhar, não lançar.

---

## **3\. Ambientes**

O projeto deve ter 3 ambientes:

development  
staging  
production

## **3.1 Development**

Uso:

* desenvolvimento local;  
* testes técnicos;  
* dados falsos;  
* chaves sandbox.

## **3.2 Staging**

Uso:

* homologação real;  
* importação piloto;  
* teste de e-mail;  
* teste de Asaas sandbox;  
* teste de personas.

## **3.3 Production**

Uso:

* usuários reais;  
* Asaas produção;  
* e-mails reais;  
* domínio oficial;  
* base antiga importada por lotes.

---

## **4\. Checklist Pré-Staging**

Antes de testar em staging:

* Banco criado.  
* RLS ativado.  
* Produtos fixos criados.  
* Admin criado.  
* Login funcionando.  
* `/ativar-acesso` funcionando.  
* E-mail transacional configurado.  
* Asaas sandbox configurado.  
* Webhook sandbox configurado.  
* Dashboard cliente criado.  
* Admin mínimo funcionando.  
* Planilhas cadastradas.  
* Vídeo-banners cadastrados.  
* Assistente IA Pro com cadeado funcionando.

---

## **5\. Dados de Teste Obrigatórios**

Criar pelo menos estes usuários:

| Usuário | Situação |
| ----- | ----- |
| Cliente antigo pendente | Importado, sem senha criada |
| Cliente antigo ativo | Importado, senha criada |
| Cliente novo R$97 | Compra vitalícia paga |
| Cliente sem acesso | Sem purchase |
| Cliente com Pro ativo | Subscription ativa |
| Cliente com Pro vencido | Subscription expirada |
| Cliente bloqueado | status blocked |
| Admin | role admin |

---

## **6\. Teste Persona 1 — Cliente Antigo Pendente**

## **6.1 Estado inicial**

profile existe  
activation\_status \= pending\_activation  
purchase manual \= psicoplanilhas-vitalicio  
subscription \= vazio

## **6.2 Testar**

* Recebe e-mail de ativação.  
* Clica no link.  
* Cria nova senha.  
* Faz login.  
* `activation_status` vira `active`.  
* Entra no dashboard.  
* Vê planilhas.  
* Vê Assistente GPT incluso.  
* Vê Assistente IA Pro bloqueado.  
* Vê vídeo-banners.

## **6.3 Resultado esperado**

Cliente antigo entra sem depender do banco PHP antigo.

---

## **7\. Teste Persona 2 — Cliente Antigo que Não Recebeu E-mail**

## **7.1 Fluxo**

Cliente acessa /ativar-acesso  
↓  
Digita e-mail  
↓  
Recebe resposta neutra  
↓  
Recebe novo link, se e-mail existir  
↓  
Cria senha

## **7.2 Testar**

* Resposta pública não revela se e-mail existe.  
* E-mail existente recebe link.  
* E-mail inexistente não recebe link.  
* Sistema mostra sempre mensagem neutra.  
* Rate limit funciona.  
* Link antigo é invalidado quando novo é gerado.

## **7.3 Mensagem obrigatória**

Se este e-mail estiver cadastrado, você receberá um link de ativação.

---

## **8\. Teste Persona 3 — Cliente Novo R$97**

## **8.1 Fluxo**

Compra PsicoPlanilhas  
↓  
Pagamento aprovado  
↓  
Sistema cria purchase paid  
↓  
Cliente ativa conta  
↓  
Acessa planilhas

## **8.2 Testar**

* Pagamento cria usuário, se necessário.  
* Pagamento cria profile.  
* Pagamento cria purchase do produto vitalício.  
* Cliente recebe link de ativação.  
* Cliente acessa planilhas.  
* Cliente vê Assistente IA Pro bloqueado.  
* Cliente não recebe Pro automaticamente.

---

## **9\. Teste Persona 4 — Cliente com Assistente IA Pro Ativo**

## **9.1 Estado inicial**

subscription.status \= active  
expires\_at \>= hoje

## **9.2 Testar**

* Dashboard mostra Pro ativo.  
* Página `/app/assistente-pro` mostra formulário.  
* Formulário gera relatório.  
* Relatório salva em `ai_reports`.  
* Histórico aparece.  
* Cliente consegue copiar relatório.  
* Cliente vê data de vencimento.

## **9.3 Resultado esperado**

Usuário ativo não vê cadeado.

---

## **10\. Teste Persona 5 — Cliente com Assistente IA Pro Vencido**

## **10.1 Estado inicial**

subscription.status \= expired  
ou expires\_at \< hoje

## **10.2 Testar**

* Cliente mantém acesso às planilhas.  
* Cliente mantém Assistente GPT incluso.  
* Assistente IA Pro volta ao cadeado.  
* Formulário não aparece.  
* Botão “Renovar” aparece.  
* Renovação via Asaas libera novamente.

## **10.3 Resultado esperado**

O vencimento não afeta planilhas, só o Assistente IA Pro.

---

## **11\. Teste Persona 6 — Admin**

## **11.1 Testar clientes**

* Lista clientes.  
* Busca por nome.  
* Busca por e-mail.  
* Vê status de ativação.  
* Vê acesso vitalício.  
* Vê Assistente Pro.  
* Vê vencimento.  
* Reenvia ativação.  
* Envia reset de senha.  
* Bloqueia cliente.  
* Desbloqueia cliente.

## **11.2 Testar acessos**

* Libera acesso vitalício manual.  
* Cancela acesso vitalício.  
* Ativa Assistente Pro manualmente.  
* Altera vencimento.  
* Cancela Assistente Pro.  
* Todas as ações geram log.

## **11.3 Testar conteúdo**

* Cadastra planilha.  
* Edita link Google Sheets.  
* Desativa planilha.  
* Cadastra banner.  
* Edita banner.  
* Cadastra produto externo.  
* Edita checkout.

---

## **12\. Teste de Importação CSV**

## **12.1 CSV mínimo**

name,email

## **12.2 Testar**

* Upload funciona.  
* Prévia aparece.  
* E-mails são normalizados.  
* Duplicados são detectados.  
* E-mails inválidos são separados.  
* Importação cria usuários.  
* Importação cria profiles.  
* Importação cria purchase manual.  
* Importação não cria subscription.  
* Relatório de importação é gerado.

## **12.3 Lotes obrigatórios**

Lote 1: 20 usuários  
Lote 2: 100 usuários  
Lote 3: 500 usuários  
Lote 4: restante

Não importar 3.000 usuários de uma vez.

---

## **13\. Teste de Planilhas**

## **13.1 Admin**

* Cadastra planilha.  
* Define imagem.  
* Define categoria.  
* Define link Google Sheets.  
* Define tutorial.  
* Ativa/desativa.  
* Ordena.

## **13.2 Cliente**

* Vê planilhas ativas.  
* Não vê planilhas inativas.  
* Abre link do Google Sheets.  
* Vê tutorial, se existir.  
* Vê aviso de uso com manual original.

## **13.3 Texto obrigatório**

Esta planilha é um recurso de apoio operacional.  
Ela agiliza cálculos, organização e visualização dos dados.  
O uso correto exige o manual original do instrumento.  
Não substitui avaliação profissional, teste original, manual ou interpretação clínica.

---

## **14\. Teste de Vídeo-Banners**

## **14.1 Banners obrigatórios**

* Assistente IA Pro.  
* Produtos para Psicólogos.  
* Produtos para Psicopedagogos.

## **14.2 Testar segmentação**

| Perfil | Deve ver |
| ----- | ----- |
| psychologist | Assistente IA Pro \+ Psicólogos |
| psychopedagogue | Assistente IA Pro \+ Psicopedagogos |
| both | Assistente IA Pro \+ Psicólogos \+ Psicopedagogos |
| unknown | Assistente IA Pro \+ escolha de perfil |

## **14.3 UX**

* Vídeo aparece como banner.  
* Player não aparece aberto no dashboard.  
* Modal abre ao clicar.  
* Não tem autoplay.  
* Botão principal funciona.  
* Botão secundário funciona.  
* Dashboard não fica poluído.

---

## **15\. Teste do Assistente IA Pro**

## **15.1 Usuário sem Pro**

* Vê cadeado.  
* Não vê formulário.  
* Não consegue chamar endpoint de geração.  
* Não consegue inserir relatório manualmente.

## **15.2 Usuário com Pro ativo**

* Vê formulário.  
* Gera relatório.  
* Histórico salva.  
* Output inclui aviso profissional.

## **15.3 Prompt seguro**

Verificar se o assistente não usa:

diagnóstico definitivo  
laudo automático  
substitui manual  
resultado oficial  
dispensa avaliação profissional

Aviso obrigatório:

Este texto é uma versão inicial de apoio e deve ser revisado pelo profissional responsável antes de qualquer uso formal.

---

## **16\. Teste Asaas — Pagamento e Webhook**

## **16.1 Checkout**

* Botão “Assinar R$50/ano” cria cobrança/assinatura.  
* Checkout abre corretamente.  
* Metadata inclui `user_id`, `email`, `product_slug`.

## **16.2 Webhook aprovado**

* Recebe evento.  
* Valida token.  
* Salva payload bruto.  
* Cria `payment_events`.  
* Localiza usuário.  
* Cria ou atualiza `subscriptions`.  
* Define `expires_at = pagamento + 1 ano`.  
* Libera Assistente IA Pro.

## **16.3 Duplicidade**

* Mesmo webhook enviado 2 vezes não duplica assinatura.  
* Mesmo pagamento não estende vencimento duas vezes indevidamente.

## **16.4 Reembolso/cancelamento**

* Evento de reembolso cancela assinatura.  
* Cadeado volta.  
* Histórico financeiro não é apagado.

## **16.5 Falha**

* Webhook inválido não libera acesso.  
* Erro fica registrado.  
* Admin consegue reprocessar.

---

## **17\. Teste de E-mails**

## **17.1 Templates obrigatórios**

* Ativação de acesso.  
* Lembrete de ativação.  
* Reset de senha.  
* Compra Assistente Pro.  
* Assistente vencendo.  
* Assistente vencido.  
* Renovação confirmada.

## **17.2 Entregabilidade**

* SPF configurado.  
* DKIM configurado.  
* DMARC configurado.  
* Domínio verificado.  
* E-mails chegam no Gmail.  
* E-mails chegam no Outlook.  
* Links funcionam.  
* Variáveis renderizam corretamente.

---

## **18\. Teste de Segurança/RLS**

## **18.1 Cliente A vs Cliente B**

Cliente A não pode acessar:

* profile do Cliente B;  
* purchases do Cliente B;  
* subscriptions do Cliente B;  
* ai\_reports do Cliente B;  
* uploads privados do Cliente B.

## **18.2 Cliente não vira admin**

Cliente não pode:

* alterar `role`;  
* alterar `status`;  
* alterar `activation_status`;  
* acessar `/admin`;  
* chamar API admin.

## **18.3 Cliente não libera Pro sozinho**

Cliente não pode:

* criar subscription;  
* editar `expires_at`;  
* criar purchase;  
* inserir relatório sem assinatura ativa.

## **18.4 Tokens**

* Token não é salvo puro.  
* Token expira.  
* Token é uso único.  
* Novo token invalida antigo.

---

## **19\. Teste Mobile**

## **19.1 Cliente**

* Login funciona no celular.  
* Ativação funciona no celular.  
* Dashboard legível.  
* Cards de planilhas legíveis.  
* Botões clicáveis.  
* Modal de vídeo funciona.  
* Assistente Pro utilizável.  
* Página de produtos utilizável.

## **19.2 Admin**

Admin pode ser priorizado para desktop no MVP.

Mas testar:

* login admin no mobile não quebra;  
* menu admin não fica inacessível;  
* tabelas não quebram completamente.

---

## **20\. Teste de Copy e Risco Comercial**

Verificar se nenhuma página diz:

teste oficial  
substitui manual  
diagnóstico automático  
laudo automático  
resultado clínico definitivo  
dispensa avaliação

Verificar se as páginas usam:

apoio operacional  
uso com manual original  
apoio textual  
relatório revisável  
responsabilidade profissional

---

## **21\. Checklist de Produção**

Antes do deploy final:

* Domínio configurado.  
* SSL ativo.  
* Supabase produção configurado.  
* Asaas produção configurado.  
* Webhook produção configurado.  
* E-mail produção configurado.  
* Variáveis de ambiente conferidas.  
* Service role fora do frontend.  
* RLS validado.  
* Admin principal criado.  
* Backup configurado.  
* Página de suporte criada.  
* FAQ de ativação criada.  
* Piloto com 20 usuários aprovado.

---

## **22\. Plano de Lançamento**

## **22.1 Lançamento interno**

Usar apenas equipe/admin.

Validar:

* login;  
* planilhas;  
* admin;  
* pagamentos;  
* e-mails;  
* webhook;  
* RLS.

## **22.2 Lançamento piloto**

Importar:

20 usuários reais controlados

Monitorar:

* ativação;  
* suporte;  
* entrega de e-mail;  
* bugs;  
* clareza do texto.

## **22.3 Lançamento parcial**

Importar:

100 usuários

Se estável:

500 usuários

Só depois:

restante da base

---

## **23\. Plano de Rollback**

Se algo der errado:

1. pausar importação;  
2. pausar envio de e-mails;  
3. pausar checkout, se necessário;  
4. manter usuários já importados;  
5. corrigir bug;  
6. reenviar links apenas para afetados;  
7. não apagar base em massa.

Regra:

Corrigir estado do usuário, não deletar em massa.

---

## **24\. Suporte no Lançamento**

Preparar respostas para:

## **24.1 “Minha senha antiga não funciona”**

A nova plataforma exige a criação de uma nova senha por segurança.  
Use a opção Ativar Acesso com o e-mail usado na compra.

## **24.2 “Não recebi o e-mail”**

Verifique sua caixa de spam ou acesse Ativar Acesso para solicitar um novo link.

## **24.3 “Meu e-mail não está cadastrado”**

Envie o comprovante de compra ou o e-mail usado na compra para verificarmos manualmente.

## **24.4 “O Assistente Pro está bloqueado”**

O Assistente GPT básico continua incluso no seu acesso vitalício.  
O Assistente IA Pro dentro da plataforma é um recurso novo, com assinatura anual.

---

## **25\. Métricas Pós-Lançamento**

Acompanhar diariamente:

usuários importados  
usuários ativados  
pendentes de ativação  
taxa de ativação  
e-mails entregues  
e-mails com erro  
cliques no Assistente Pro  
compras do Assistente Pro  
relatórios gerados  
renovações  
tickets de suporte  
cliques nos vídeo-banners  
conversão por perfil

---

## **26\. Critérios de Sucesso**

O lançamento será considerado bem-sucedido se:

* clientes antigos ativam acesso;  
* planilhas ficam liberadas corretamente;  
* Assistente IA Pro não libera sem pagamento;  
* Asaas libera acesso corretamente após pagamento;  
* admin resolve suporte sem dev;  
* não há vazamento entre usuários;  
* e-mails chegam;  
* base antiga começa a converter para Pro.

---

## **27\. Critérios de Bloqueio**

Não lançar se:

ativação por e-mail falhar  
login falhar  
RLS falhar  
cliente ver dados de outro cliente  
cliente acessar Pro sem pagar  
webhook Asaas não liberar acesso  
webhook duplicado duplicar assinatura  
admin não conseguir reenviar ativação  
e-mails não chegarem  
planilhas não abrirem  
copy parecer diagnóstico ou substituição de manual

---

## **28\. Definition of Done Final**

O PsicoPlanilhas 2.0 está pronto para produção quando:

* 20 clientes piloto ativaram acesso.  
* Planilhas abriram corretamente.  
* Assistente GPT incluso abriu corretamente.  
* Assistente IA Pro ficou bloqueado para quem não pagou.  
* Pagamento Asaas liberou Pro por 1 ano.  
* Pro vencido voltou ao cadeado.  
* Admin conseguiu operar suporte.  
* RLS foi validado.  
* E-mails foram entregues.  
* Vídeo-banners apareceram por perfil.  
* Importação por lote foi validada.  
* Suporte tem respostas prontas.  
* Produção está configurada.

---

## **29\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Lançar em lotes | Congelado |
| Piloto com 20 usuários | Congelado |
| Não importar 3.000 de uma vez | Congelado |
| Não lançar sem RLS validado | Congelado |
| Não lançar sem webhook testado | Congelado |
| Não lançar sem e-mail funcionando | Congelado |
| Não lançar se copy tiver risco clínico | Congelado |
| Rollback pausa envio, não apaga base | Congelado |
| Suporte precisa estar preparado | Congelado |

---

## **30\. Frase Norteadora**

O lançamento do PsicoPlanilhas 2.0 deve ser feito em lotes, com QA por personas, validação de segurança, teste real de pagamento Asaas e suporte preparado para reativar a base antiga sem quebrar o acesso vitalício às planilhas.

