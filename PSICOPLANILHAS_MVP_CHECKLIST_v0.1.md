# **PSICOPLANILHAS\_MVP\_CHECKLIST\_v0.1**

## **1\. Objetivo do Documento**

Definir o checklist mínimo para validar se o PsicoPlanilhas 2.0 está pronto para produção.

Este documento serve para impedir lançamento incompleto.

O MVP só pode ser considerado pronto quando:

1. clientes antigos conseguirem ativar acesso;  
2. planilhas estiverem liberadas corretamente;  
3. Assistente IA Pro bloquear/liberar corretamente;  
4. admin conseguir operar suporte;  
5. importação por e-mail estiver validada;  
6. pagamentos e webhooks estiverem funcionando;  
7. vídeo-banners aparecerem corretamente;  
8. regras de segurança estiverem aplicadas.

---

## **2\. Regra Principal**

Não lançar se algum destes blocos falhar:

Ativação por e-mail  
Login  
Acesso vitalício  
Cadeado do Assistente IA Pro  
Admin clientes  
Importação CSV  
Pagamento/webhook  
E-mails transacionais

Se um desses quebrar, o sistema pode gerar suporte, perda de confiança ou acesso indevido.

---

# **3\. Checklist — Fundação Técnica**

## **3.1 Projeto**

* Projeto Next.js criado.  
* TypeScript configurado.  
* Tailwind configurado.  
* shadcn/ui instalado.  
* Supabase conectado.  
* Variáveis de ambiente configuradas.  
* Ambiente local funcionando.  
* Ambiente staging funcionando.  
* Ambiente produção preparado.

## **3.2 Rotas públicas**

* `/`  
* `/login`  
* `/ativar-acesso`  
* `/esqueci-senha`  
* `/definir-senha`

## **3.3 Rotas cliente**

* `/app`  
* `/app/planilhas`  
* `/app/assistente-gpt`  
* `/app/assistente-pro`  
* `/app/produtos`  
* `/app/minha-conta`

## **3.4 Rotas admin**

* `/admin`  
* `/admin/clientes`  
* `/admin/clientes/[id]`  
* `/admin/importacao`  
* `/admin/planilhas`  
* `/admin/produtos`  
* `/admin/banners`  
* `/admin/assinaturas`  
* `/admin/relatorios-ia`  
* `/admin/emails`  
* `/admin/configuracoes`

---

# **4\. Checklist — Banco de Dados**

## **4.1 Tabelas obrigatórias**

* `profiles`  
* `products`  
* `purchases`  
* `subscriptions`  
* `activation_tokens`, se necessário  
* `promo_banners`  
* `ai_reports`  
* `email_templates`  
* `admin_logs`

## **4.2 Produtos fixos**

* Produto `psicoplanilhas-vitalicio` criado.  
* Produto `assistente-ia-pro` criado.

## **4.3 Funções**

* `has_lifetime_access(user_uuid)` criada.  
* `has_active_assistant(user_uuid)` criada.

## **4.4 View**

* `user_access_status` criada.  
* View mostra acesso vitalício corretamente.  
* View mostra Assistente Pro ativo/vencido corretamente.  
* View mostra vencimento do Assistente Pro.

---

# **5\. Checklist — Autenticação**

## **5.1 Login**

* Login com e-mail/senha funciona.  
* Logout funciona.  
* Usuário cliente vai para `/app`.  
* Usuário admin vai para `/admin`.  
* Usuário bloqueado não entra.  
* `last_login_at` atualiza no login.

## **5.2 Segurança do login**

* Sistema não informa se e-mail existe.  
* Sistema não informa se senha está errada separadamente.  
* Mensagem de erro é genérica.  
* Não existe senha padrão.  
* Não existe envio de senha por e-mail.  
* Não existe campo `password_hash` próprio.

---

# **6\. Checklist — Ativação por E-mail**

## **6.1 Página `/ativar-acesso`**

* Página existe.  
* Campo de e-mail existe.  
* Botão “Enviar link de ativação” existe.  
* Resposta pública é sempre neutra.

Mensagem obrigatória:

Se este e-mail estiver cadastrado, você receberá um link de ativação.

## **6.2 Cliente antigo**

* Cliente importado recebe `activation_status = pending_activation`.  
* Cliente recebe link de ativação.  
* Link permite criar nova senha.  
* Após criar senha, `activation_status = active`.  
* Cliente consegue logar depois da ativação.

## **6.3 Link expirado**

* Link expirado não permite definir senha.  
* Mensagem clara aparece.  
* Cliente consegue solicitar novo link.

## **6.4 Reenvio**

* Admin consegue reenviar link de ativação.  
* Página `/ativar-acesso` consegue reenviar link.  
* Link antigo é invalidado quando novo é gerado.  
* Reenvio gera log.

---

# **7\. Checklist — Acesso Vitalício**

## **7.1 Cliente com PsicoPlanilhas**

* Cliente com `purchase paid` acessa planilhas.  
* Cliente com `purchase manual` acessa planilhas.  
* Cliente sem purchase não acessa planilhas.  
* Cliente bloqueado não acessa planilhas.

## **7.2 Cliente antigo importado**

* Recebe purchase manual do produto `psicoplanilhas-vitalicio`.  
* Não recebe subscription do Assistente Pro.  
* Vê planilhas liberadas.  
* Vê Assistente GPT incluso.  
* Vê Assistente IA Pro com cadeado.

---

# **8\. Checklist — Área do Cliente**

## **8.1 Dashboard**

* Boas-vindas aparece.  
* Card “Minhas Planilhas” aparece.  
* Banner Assistente IA Pro aparece.  
* Banner segmentado aparece conforme perfil.  
* Produtos recomendados aparecem.  
* Aviso de uso responsável aparece.

## **8.2 Perfil profissional**

* Usuário `unknown` vê escolha de perfil.  
* Psicólogo vê banner de psicólogos.  
* Psicopedagogo vê banner de psicopedagogos.  
* Perfil `both` vê os dois banners.  
* Escolha de perfil não bloqueia acesso.

---

# **9\. Checklist — Planilhas**

## **9.1 Admin de planilhas**

* Admin cadastra planilha.  
* Admin edita planilha.  
* Admin desativa planilha.  
* Admin testa link Google Sheets.  
* Planilha inativa não aparece para cliente.

## **9.2 Cliente**

* Cliente vê lista de planilhas.  
* Busca funciona, se implementada.  
* Filtro por categoria funciona, se implementado.  
* Botão “Acessar Planilha” abre o Google Sheets.  
* Botão “Ver Tutorial” funciona quando houver link.

## **9.3 Aviso obrigatório**

Texto precisa aparecer na área de planilhas:

Esta planilha é um recurso de apoio operacional.  
Ela agiliza cálculos, organização e visualização dos dados.  
O uso correto exige o manual original do instrumento.  
Não substitui avaliação profissional, teste original, manual ou interpretação clínica.

---

# **10\. Checklist — Assistente GPT Incluso**

## **10.1 Página**

* Página `/app/assistente-gpt` existe.  
* Explica que é bônus incluso.  
* Explica que abre fora da plataforma.  
* Botão abre o GPT Builder externo.  
* Texto deixa claro que é apoio textual.

## **10.2 Regra**

* Todo cliente com acesso vitalício vê o Assistente GPT incluso.  
* Assistente GPT incluso não depende da assinatura Pro.  
* Assistente GPT incluso não salva histórico interno.

---

# **11\. Checklist — Assistente IA Pro**

## **11.1 Estados**

### **Sem assinatura**

* Mostra cadeado.  
* Mostra preço R$50/ano.  
* Mostra botão de assinatura.  
* Não mostra formulário de geração.

### **Ativo**

* Mostra formulário.  
* Mostra vencimento.  
* Permite gerar relatório.  
* Salva histórico.

### **Vencido**

* Volta para cadeado.  
* Mantém acesso às planilhas.  
* Mostra botão renovar.  
* Não permite gerar relatório.

### **Manual**

* Admin consegue liberar manualmente.  
* Liberação manual tem vencimento.  
* Após vencimento, volta o cadeado.

---

## **11.2 Formulário**

Campos mínimos:

* Nome ou identificação do avaliado.  
* Idade ou faixa etária.  
* Área do relatório.  
* Dados da planilha.  
* Objetivo do relatório.  
* Observações opcionais.  
* Upload de imagem, se entrou no MVP.

## **11.3 Histórico**

* Relatório é salvo em `ai_reports`.  
* Usuário vê seus próprios relatórios.  
* Usuário não vê relatório de outro cliente.  
* Botão copiar funciona.  
* Botão visualizar funciona.

## **11.4 Prompt seguro**

O assistente não pode:

* diagnosticar;  
* inventar ponto de corte;  
* substituir manual;  
* afirmar resultado definitivo;  
* gerar laudo automático;  
* dizer que dispensa avaliação profissional.

Aviso obrigatório no final:

Este texto é uma versão inicial de apoio e deve ser revisado pelo profissional responsável antes de qualquer uso formal.

---

# **12\. Checklist — Vídeo-Banners**

## **12.1 Banners obrigatórios**

* Assistente IA Pro.  
* Produtos para Psicólogos.  
* Produtos para Psicopedagogos.

## **12.2 Comportamento**

* Banner aparece fechado.  
* Vídeo abre em modal.  
* Não existe autoplay.  
* Não aparecem três players abertos no dashboard.  
* Botão principal leva ao checkout/página correta.  
* Botão secundário abre vídeo ou detalhes.

## **12.3 Segmentação**

* `all` aparece para todos.  
* `psychologist` aparece para psicólogos.  
* `psychopedagogue` aparece para psicopedagogos.  
* `both` vê os dois públicos.

---

# **13\. Checklist — Produtos Externos**

## **13.1 Admin**

* Admin cadastra produto externo.  
* Admin define público.  
* Admin define imagem.  
* Admin define vídeo.  
* Admin define URL de checkout.  
* Admin ativa/desativa produto.

## **13.2 Cliente**

* Cliente vê produtos por perfil.  
* Página `/app/produtos` lista produtos.  
* Botão “Conhecer” ou “Comprar” funciona.  
* Dashboard não fica poluído.

---

# **14\. Checklist — Admin**

## **14.1 Clientes**

* Lista clientes.  
* Busca por nome.  
* Busca por e-mail.  
* Mostra ativação.  
* Mostra acesso vitalício.  
* Mostra Assistente Pro.  
* Mostra vencimento.  
* Mostra último login.

## **14.2 Ações**

* Reenviar ativação.  
* Enviar reset de senha.  
* Bloquear cliente.  
* Desbloquear cliente.  
* Liberar acesso vitalício.  
* Cancelar acesso vitalício.  
* Ativar Assistente Pro.  
* Alterar vencimento.  
* Cancelar Assistente Pro.

## **14.3 Logs**

Gerar log para:

* bloquear usuário;  
* desbloquear usuário;  
* reenviar ativação;  
* alterar e-mail;  
* liberar acesso vitalício;  
* cancelar acesso vitalício;  
* ativar Assistente Pro;  
* alterar vencimento;  
* cancelar Assistente Pro;  
* editar link de planilha;  
* editar banner.

---

# **15\. Checklist — Importação CSV**

## **15.1 CSV**

* Aceita CSV mínimo `name,email`.  
* Aceita CSV recomendado.  
* Valida colunas.  
* Normaliza e-mails.  
* Remove espaços.  
* Converte e-mail para minúsculas.  
* Detecta duplicados.  
* Separa e-mails inválidos.  
* Mostra prévia antes de importar.

## **15.2 Importação**

* Cria usuário no Supabase Auth.  
* Cria `profile`.  
* Define `activation_status = pending_activation`.  
* Cria `purchase manual`.  
* Não cria `subscription`.  
* Gera relatório da importação.

## **15.3 Piloto obrigatório**

* Testar com 20 usuários.  
* Depois 100\.  
* Depois 500\.  
* Só depois restante da base.

---

# **16\. Checklist — Pagamento e Webhook**

## **16.1 Checkout**

* Produto Assistente IA Pro configurado.  
* Preço R$50/ano configurado.  
* Botão de assinatura funciona.  
* Botão de renovação funciona.

## **16.2 Webhook**

Quando pagamento aprovado:

* Localiza usuário por e-mail.  
* Cria ou atualiza subscription.  
* Define `started_at = now()`.  
* Define `expires_at = now() + 1 ano`.  
* Define `status = active`.  
* Registra `payment_reference`.  
* Remove cadeado.

## **16.3 Renovação**

* Usuário vencido consegue renovar.  
* Nova data de vencimento é criada.  
* Formulário volta a liberar.

## **16.4 Falha**

* Webhook com erro gera log.  
* Admin consegue corrigir manualmente.  
* Não libera acesso sem pagamento confirmado.

---

# **17\. Checklist — E-mails**

## **17.1 Templates**

* Ativação de acesso.  
* Lembrete de ativação.  
* Reset de senha.  
* Compra Assistente Pro.  
* Assistente vencendo.  
* Assistente vencido.  
* Renovação confirmada.

## **17.2 Entrega**

* Domínio de envio configurado.  
* SPF configurado.  
* DKIM configurado.  
* DMARC configurado.  
* Teste de envio aprovado.  
* Links renderizam corretamente.  
* Variáveis funcionam.

---

# **18\. Checklist — Segurança**

## **18.1 RLS**

* RLS ativado nas tabelas sensíveis.  
* Cliente só vê dados próprios.  
* Cliente não vê outros usuários.  
* Cliente não vê logs.  
* Cliente não vê tokens.  
* Cliente não vê relatórios de terceiros.  
* Admin vê dados necessários.

## **18.2 Tokens**

* Token não é salvo puro.  
* Token expira.  
* Token é uso único.  
* Token antigo invalida quando novo é gerado.

## **18.3 Rate limit**

* `/ativar-acesso` tem limite de tentativas.  
* `/esqueci-senha` tem limite de tentativas.  
* Sistema evita spam de e-mail.

---

# **19\. Checklist — Mobile**

* Login funciona no celular.  
* Dashboard funciona no celular.  
* Cards de planilha ficam legíveis.  
* Botões são grandes o suficiente.  
* Vídeo modal funciona no celular.  
* Admin básico é utilizável no desktop.  
* Cliente consegue acessar planilhas pelo celular.

---

# **20\. Checklist — Teste por Persona**

## **20.1 Cliente antigo importado**

* Foi importado por CSV.  
* Recebeu link.  
* Criou senha.  
* Entrou.  
* Viu planilhas.  
* Viu Assistente GPT.  
* Viu Assistente Pro bloqueado.  
* Viu banners.

## **20.2 Cliente novo R$97**

* Compra aprovada.  
* Acesso criado.  
* Planilhas liberadas.  
* Assistente Pro bloqueado.

## **20.3 Cliente com Assistente Pro**

* Compra R$50/ano.  
* Pro libera.  
* Relatório gera.  
* Histórico salva.

## **20.4 Cliente vencido**

* Pro expira.  
* Cadeado volta.  
* Planilhas continuam.  
* Renovação libera.

## **20.5 Admin**

* Importa cliente.  
* Reenvia ativação.  
* Libera vitalício.  
* Ativa Pro.  
* Altera vencimento.  
* Edita planilha.  
* Edita banner.  
* Consulta logs.

---

# **21\. Critérios de Bloqueio**

Não lançar se:

* cliente antigo não conseguir criar senha;  
* cliente sem assinatura acessar Pro;  
* cliente com Pro ativo ficar bloqueado;  
* cliente antigo não acessar planilhas;  
* admin não conseguir reenviar ativação;  
* webhook não criar assinatura;  
* e-mails não chegarem;  
* RLS não estiver validado;  
* importação CSV gerar duplicados sem controle;  
* sistema expuser se e-mail existe ou não.

---

# **22\. Definition of Done**

O MVP está pronto quando:

* 20 clientes piloto foram importados e ativaram acesso.  
* Cliente antigo acessa planilhas.  
* Cliente antigo vê Pro bloqueado.  
* Cliente compra Pro.  
* Pro libera por 1 ano.  
* Pro bloqueia após vencimento.  
* Admin resolve suporte básico.  
* Banners aparecem por perfil.  
* E-mails funcionam.  
* Pagamento funciona.  
* Segurança mínima validada.  
* Deploy produção validado.

---

# **23\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| MVP só lança com ativação funcionando | Congelado |
| Cliente antigo não recebe Pro grátis | Congelado |
| Pro depende de assinatura anual | Congelado |
| Cadeado depende de vencimento | Congelado |
| CSV precisa validar duplicados | Congelado |
| Admin precisa reenviar ativação | Congelado |
| E-mails precisam ser testados antes do disparo real | Congelado |
| Piloto antes dos 3.000 usuários | Congelado |
| RLS precisa estar validado | Congelado |

---

## **24\. Frase Norteadora**

O MVP do PsicoPlanilhas 2.0 só está pronto quando clientes antigos conseguem ativar acesso por e-mail, acessar suas planilhas vitalícias e comprar o Assistente IA Pro anual sem risco de acesso indevido ou confusão comercial.

