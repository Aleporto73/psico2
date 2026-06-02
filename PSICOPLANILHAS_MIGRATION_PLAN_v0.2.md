# **PSICOPLANILHAS\_MIGRATION\_PLAN\_v0.2**

## **1\. Objetivo do Documento**

Definir o plano de migração do sistema PHP antigo para o PsicoPlanilhas 2.0.

A migração será feita sem acesso ao banco antigo.

A única fonte disponível é a lista de e-mails dos clientes antigos.

---

## **2\. Situação Atual**

O sistema antigo roda em PHP.

O banco antigo não está acessível.

Não há acesso confiável a:

* senhas antigas;  
* histórico completo de login;  
* dados internos do sistema PHP;  
* registros detalhados de compra;  
* permissões antigas.

Existe acesso a:

* lista de e-mails dos clientes;  
* possivelmente nomes;  
* possivelmente telefones;  
* possivelmente códigos de compra;  
* possivelmente data de compra;  
* links atuais das planilhas;  
* conteúdo comercial atual;  
* imagens e banners reaproveitáveis.

---

## **3\. Decisão Oficial**

A migração será baseada em e-mail.

Regra:

Quem estiver na lista de e-mails será tratado como cliente antigo com acesso vitalício ao PsicoPlanilhas.

O cliente antigo não terá senha migrada.

Ele deverá criar nova senha por link de ativação enviado ao e-mail cadastrado.

---

## **4\. O Que Será Migrado**

Migrar:

* e-mails dos clientes;  
* nomes, se disponíveis;  
* telefones, se disponíveis;  
* código de compra, se disponível;  
* data de compra, se disponível;  
* acesso vitalício às planilhas;  
* links das planilhas;  
* imagens das planilhas;  
* tutoriais;  
* templates de e-mail úteis;  
* produtos e banners comerciais.

---

## **5\. O Que NÃO Será Migrado**

Não migrar:

* senha antiga;  
* hash de senha antigo;  
* sessão antiga;  
* banco PHP antigo;  
* layout antigo;  
* código PHP antigo;  
* gambiarras;  
* permissões não comprovadas;  
* histórico interno não disponível;  
* qualquer dado sem fonte confiável.

Regra:

Se não está na lista de e-mails ou em fonte confiável, não inventar.

---

## **6\. Resultado Esperado para Cliente Antigo**

Todo cliente antigo importado deve receber:

* acesso vitalício às planilhas;  
* acesso ao Assistente GPT Builder incluso;  
* acesso aos tutoriais;  
* vídeo-banners comerciais;  
* área “Outros Produtos”;  
* Assistente IA Pro bloqueado com oferta de R$50/ano.

Cliente antigo não recebe automaticamente:

* Assistente IA Pro;  
* produtos extras pagos;  
* assinatura anual gratuita;  
* acesso administrativo.

---

## **7\. Fluxo Geral da Migração**

Preparar CSV  
↓  
Limpar e validar e-mails  
↓  
Criar usuários no Supabase Auth  
↓  
Criar profiles  
↓  
Criar purchase manual vitalícia  
↓  
Gerar link de ativação  
↓  
Enviar e-mail de ativação  
↓  
Cliente cria nova senha  
↓  
Cliente acessa dashboard

---

## **8\. CSV de Migração**

## **8.1 CSV mínimo**

name,email

## **8.2 CSV recomendado**

name,email,phone,purchase\_code,purchase\_date,profile\_type,source

## **8.3 Campos**

| Campo | Obrigatório | Observação |
| ----- | ----- | ----- |
| name | Sim | Se não tiver, usar parte antes do @ |
| email | Sim | Fonte principal de identificação |
| phone | Não | Pode ficar vazio |
| purchase\_code | Não | Útil para suporte |
| purchase\_date | Não | Útil para histórico |
| profile\_type | Não | psychologist, psychopedagogue, both ou unknown |
| source | Não | Ex: old\_php\_email\_import |

---

## **9\. Limpeza da Lista**

Antes da importação:

1. remover espaços antes/depois do e-mail;  
2. converter e-mail para minúsculas;  
3. remover linhas vazias;  
4. remover duplicados;  
5. validar formato do e-mail;  
6. separar e-mails inválidos;  
7. gerar relatório de erros.

Exemplo:

Contato@Email.com  → contato@email.com

---

## **10\. Tratamento de Duplicados**

Se o mesmo e-mail aparecer mais de uma vez:

* manter apenas um usuário;  
* preservar o primeiro nome válido;  
* preservar código de compra, se houver;  
* registrar duplicidade no relatório;  
* não criar múltiplos acessos.

Regra:

Um e-mail \= um usuário.

---

## **11\. Status Inicial do Cliente Importado**

Ao importar, criar:

status \= active  
activation\_status \= pending\_activation  
profile\_type \= unknown, se não houver informação  
source \= old\_php\_email\_import

O usuário existe no sistema, mas ainda precisa criar senha.

---

## **12\. Criação no Supabase Auth**

Para cada cliente válido:

1. criar usuário no Supabase Auth;  
2. não definir senha manualmente;  
3. não enviar senha padrão;  
4. gerar link de ativação ou convite;  
5. associar o usuário ao profile.

Regra proibida:

Nunca criar senha igual para todos.

Regra correta:

Cliente cria a própria senha por link seguro.

---

## **13\. Criação em `profiles`**

Para cada usuário:

id \= id do auth.users  
name \= nome do CSV  
email \= e-mail normalizado  
role \= customer  
profile\_type \= unknown, se não informado  
status \= active  
activation\_status \= pending\_activation  
source \= old\_php\_email\_import  
imported\_at \= now()

---

## **14\. Criação da Compra Vitalícia**

Para cada cliente importado, criar registro em `purchases`:

product \= psicoplanilhas-vitalicio  
payment\_status \= manual  
source \= old\_php\_email\_import  
purchased\_at \= data de importação ou data da compra, se existir

Essa compra manual libera as planilhas.

---

## **15\. Não Criar Subscription**

Para cliente antigo importado:

subscriptions \= vazio

Motivo:

Cliente antigo não ganha Assistente IA Pro automaticamente.

Resultado:

* planilhas liberadas;  
* Assistente GPT incluso liberado;  
* Assistente IA Pro com cadeado.

---

## **16\. Link de Ativação**

O link de ativação permite ao cliente criar nova senha.

Regras:

* link individual;  
* link com expiração;  
* uso único;  
* não reutilizável;  
* enviado apenas ao e-mail cadastrado;  
* token salvo apenas em hash, se houver tabela própria.

Exemplo de rota:

/ativar-senha?token=...

Ou fluxo nativo do Supabase:

invite / recovery link

---

## **17\. Página Pública `/ativar-acesso`**

## **17.1 Objetivo**

Permitir que cliente antigo solicite novo link de ativação.

## **17.2 Texto**

Já era cliente PsicoPlanilhas?

Digite o e-mail usado na compra para ativar seu novo acesso.  
Você receberá um link para criar sua nova senha.

## **17.3 Campo**

E-mail

## **17.4 Botão**

Enviar link de ativação

## **17.5 Resposta obrigatória**

Sempre mostrar:

Se este e-mail estiver cadastrado, você receberá um link de ativação.

Nunca mostrar:

E-mail não encontrado.

Motivo:

Não expor a base de clientes.

---

## **18\. E-mail de Ativação**

## **18.1 Assunto**

Ative seu novo acesso PsicoPlanilhas

## **18.2 Corpo**

Olá, {{nome}}.

Estamos atualizando a área de membros do PsicoPlanilhas.

Seu acesso vitalício às planilhas continua garantido.

Para entrar na nova plataforma, crie sua nova senha pelo link abaixo:

{{activation\_link}}

Esse link é individual e expira por segurança.

Depois de criar sua senha, você poderá acessar suas planilhas, o Assistente GPT incluso e conhecer as novas ferramentas disponíveis.

Se você não solicitou este acesso, apenas ignore este e-mail.

---

## **19\. E-mail de Lembrete de Ativação**

Enviar para quem não ativou após alguns dias.

## **19.1 Assunto**

Seu novo acesso PsicoPlanilhas ainda está pendente

## **19.2 Corpo**

Olá, {{nome}}.

Seu novo acesso PsicoPlanilhas já está disponível, mas ainda falta criar sua senha.

Clique no link abaixo para ativar sua conta:

{{activation\_link}}

Seu acesso vitalício às planilhas continua garantido.

---

## **20\. Frequência de Envio**

Não disparar para os 3.000 clientes sem teste.

Estratégia recomendada:

Lote 1: 20 usuários de teste  
Lote 2: 100 usuários  
Lote 3: 500 usuários  
Lote 4: restante da base

Objetivo:

* validar entrega;  
* evitar spam;  
* corrigir erro de link;  
* medir taxa de ativação;  
* evitar suporte explodindo.

---

## **21\. Teste Antes da Importação Real**

Criar CSV de teste:

name,email,profile\_type  
Teste Psicologo,email1@dominio.com,psychologist  
Teste Psicopedagogo,email2@dominio.com,psychopedagogue  
Teste Ambos,email3@dominio.com,both  
Teste Unknown,email4@dominio.com,unknown

Validar:

* criação no Auth;  
* criação do profile;  
* criação da purchase manual;  
* envio de e-mail;  
* link de ativação;  
* criação de senha;  
* login;  
* dashboard;  
* planilhas liberadas;  
* Assistente Pro bloqueado.

---

## **22\. Checklist de Importação**

Antes de importar:

* produto `psicoplanilhas-vitalicio` criado;  
* produto `assistente-ia-pro` criado;  
* admin criado;  
* templates de e-mail criados;  
* página `/ativar-acesso` funcionando;  
* login funcionando;  
* dashboard funcionando;  
* regra de acesso vitalício funcionando;  
* regra do cadeado funcionando;  
* planilhas cadastradas;  
* vídeo-banners cadastrados.

---

## **23\. Relatório da Importação**

Após importar, gerar relatório:

| Métrica | Descrição |
| ----- | ----- |
| Total de linhas | Quantas linhas havia no CSV |
| Importados | Quantos usuários criados |
| Atualizados | Quantos já existiam |
| Duplicados | E-mails repetidos |
| Inválidos | E-mails inválidos |
| Erros | Falhas técnicas |
| E-mails enviados | Links disparados |
| Pendentes de ativação | Ainda não criaram senha |
| Ativados | Já criaram senha |

---

## **24\. Admin — Importação**

## **24.1 Rota**

/admin/importacao

## **24.2 Funções**

Admin pode:

* subir CSV;  
* visualizar prévia;  
* validar colunas;  
* ver duplicados;  
* confirmar importação;  
* baixar relatório de erros;  
* reenviar links de ativação;  
* filtrar clientes pendentes;  
* filtrar clientes ativados.

---

## **25\. Admin — Clientes Importados**

Na tela de clientes, mostrar coluna:

Ativação

Valores:

Pendente  
Ativado

Ações:

Reenviar ativação  
Copiar link de ativação  
Marcar como bloqueado  
Abrir cliente

---

## **26\. Reenvio de Ativação**

O admin pode reenviar link.

Regras:

* gerar novo token;  
* invalidar token antigo;  
* registrar em `admin_logs`;  
* enviar novo e-mail;  
* manter status `pending_activation` até o cliente criar senha.

---

## **27\. Cliente Que Diz “Meu E-mail Não Chegou”**

Fluxo de suporte:

1. pedir e-mail usado na compra;  
2. buscar no admin;  
3. se existir, reenviar ativação;  
4. se não existir, pedir comprovante de compra;  
5. se comprovado, cadastrar manualmente;  
6. criar purchase manual;  
7. enviar ativação.

---

## **28\. Cliente Que Não Está na Lista**

Não negar de forma agressiva.

Mensagem de suporte:

Não localizei esse e-mail na base importada.  
Envie o comprovante de compra ou o e-mail usado na compra para verificarmos manualmente.

Se comprovado:

* criar usuário;  
* criar acesso vitalício manual;  
* enviar link de ativação.

---

## **29\. Cliente Que Usava Outro E-mail**

Fluxo:

1. cliente informa e-mail atual;  
2. cliente informa e-mail antigo;  
3. admin busca e-mail antigo;  
4. se encontrar, atualiza e-mail com cuidado;  
5. registrar log;  
6. reenviar ativação para o e-mail novo.

Regra:

Alteração de e-mail precisa gerar log.

---

## **30\. Risco de Spam**

Como haverá envio para muitos clientes antigos, usar e-mail transacional confiável.

Recomendações:

* configurar domínio de envio;  
* configurar SPF/DKIM/DMARC;  
* enviar em lotes;  
* evitar assunto sensacionalista;  
* evitar muitos links;  
* monitorar rejeições;  
* monitorar descadastros, se aplicável.

---

## **31\. Risco de Suporte**

Possíveis problemas:

* cliente não lembra e-mail usado;  
* cliente não recebe link;  
* link expirou;  
* e-mail caiu no spam;  
* cliente quer acesso ao Assistente Pro achando que é incluso;  
* cliente acha que perdeu acesso antigo.

Mitigação:

* página clara de ativação;  
* FAQ curto;  
* e-mail claro;  
* suporte com resposta padrão;  
* botão de reenviar link;  
* aviso explícito sobre Assistente Pro pago separado.

---

## **32\. FAQ da Migração**

### **32.1 “Perdi meu acesso antigo?”**

Resposta:

Não. Seu acesso vitalício às planilhas continua garantido.  
Apenas criamos uma nova área de membros, por isso você precisa criar uma nova senha.

### **32.2 “Minha senha antiga funciona?”**

Resposta:

Não. Por segurança, a nova plataforma exige a criação de uma nova senha.

### **32.3 “O Assistente IA Pro está incluso?”**

Resposta:

O Assistente GPT básico continua incluso no seu acesso.  
O Assistente IA Pro dentro da plataforma é um recurso novo, com assinatura anual de R$50.

### **32.4 “Não recebi o e-mail.”**

Resposta:

Acesse /ativar-acesso e informe o e-mail usado na compra.  
Se estiver cadastrado, enviaremos um novo link.

---

## **33\. Ordem Recomendada de Execução**

### **Etapa 1 — Preparação**

* limpar lista de e-mails;  
* criar CSV padrão;  
* configurar Supabase;  
* criar banco;  
* criar produtos fixos;  
* criar admin.

### **Etapa 2 — Fluxo de ativação**

* criar `/ativar-acesso`;  
* criar template de e-mail;  
* criar geração de link;  
* criar troca de senha;  
* testar ativação.

### **Etapa 3 — Importação piloto**

* importar 20 usuários;  
* testar com e-mails reais controlados;  
* corrigir erros;  
* validar dashboard.

### **Etapa 4 — Importação parcial**

* importar 100 usuários;  
* monitorar suporte;  
* revisar taxa de entrega;  
* revisar spam.

### **Etapa 5 — Importação completa**

* importar restante;  
* enviar e-mails por lote;  
* acompanhar ativação;  
* reenviar lembretes.

### **Etapa 6 — Campanha comercial**

* enviar e-mail apresentando Assistente IA Pro;  
* mostrar vídeo-banner no dashboard;  
* vender R$50/ano;  
* divulgar produtos por perfil.

---

## **34\. Plano de Rollback**

Como não há alteração no sistema antigo, rollback é simples.

Se a migração falhar:

* pausar envio de e-mails;  
* manter sistema antigo online, se ainda disponível;  
* corrigir importador;  
* corrigir ativação;  
* reenviar apenas para usuários afetados.

Não apagar usuários importados sem necessidade.

Melhor regra:

Corrigir estado do usuário, não deletar em massa.

---

## **35\. Logs Obrigatórios**

Registrar:

* importação iniciada;  
* importação concluída;  
* usuário criado;  
* usuário duplicado;  
* erro de importação;  
* link de ativação enviado;  
* link reenviado;  
* usuário ativou conta;  
* admin alterou e-mail;  
* admin liberou acesso manual;  
* admin bloqueou usuário.

---

## **36\. Métricas Pós-Migração**

Acompanhar:

* total importado;  
* ativados;  
* pendentes;  
* taxa de abertura do e-mail;  
* taxa de ativação;  
* taxa de suporte;  
* compras do Assistente Pro;  
* renovações;  
* cliques nos vídeo-banners;  
* conversão por perfil.

---

## **37\. Critérios de Sucesso**

A migração será considerada bem-sucedida se:

* clientes antigos conseguem criar nova senha;  
* acesso vitalício aparece corretamente;  
* planilhas estão liberadas;  
* Assistente GPT incluso aparece;  
* Assistente IA Pro aparece bloqueado para quem não comprou;  
* checkout do Assistente Pro funciona;  
* admin consegue reenviar ativação;  
* suporte consegue resolver e-mails não encontrados.

---

## **38\. O Que Não Fazer**

Não fazer:

* tentar recuperar senha antiga;  
* pedir senha antiga ao cliente;  
* criar senha padrão;  
* enviar senha por e-mail;  
* importar dados sem validação;  
* mandar e-mail para 3.000 pessoas sem piloto;  
* dizer que o cliente perdeu acesso;  
* prometer Assistente Pro gratuito para base antiga;  
* esconder que o Assistente Pro é pago separado.

---

## **39\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Migração por lista de e-mails | Congelado |
| Sem banco antigo | Congelado |
| Sem senha antiga | Congelado |
| Cliente cria nova senha | Congelado |
| Página `/ativar-acesso` obrigatória | Congelado |
| Importar acesso vitalício manual | Congelado |
| Não liberar Assistente Pro automaticamente | Congelado |
| Envio em lotes | Congelado |
| Suporte por comprovante se e-mail não existir | Congelado |
| Admin pode reenviar ativação | Congelado |

---

## **40\. Frase Norteadora**

A migração do PsicoPlanilhas 2.0 não tenta ressuscitar o banco PHP antigo: ela reativa a base por e-mail, preserva o acesso vitalício às planilhas e usa a nova área de membros para converter clientes antigos em assinantes do Assistente IA Pro.

