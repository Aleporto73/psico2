# **PSICOPLANILHAS\_AUTH\_ACTIVATION\_SPEC\_v0.1**

## **1\. Objetivo do Documento**

Definir o fluxo de autenticação, ativação de conta, criação de nova senha e recuperação de acesso do PsicoPlanilhas 2.0.

Este documento existe para impedir erros graves como:

* criar senha padrão;  
* enviar senha por e-mail;  
* depender da senha antiga do sistema PHP;  
* expor se um e-mail existe ou não na base;  
* deixar cliente antigo sem caminho claro para ativar acesso.

---

## **2\. Decisão Principal**

A autenticação será feita com:

Supabase Auth

O banco público guardará apenas dados comerciais e operacionais em `profiles`.

Regra oficial:

O PsicoPlanilhas 2.0 não migra senha antiga.  
Cada cliente antigo cria uma nova senha por link seguro enviado ao e-mail cadastrado.

---

## **3\. O Que Este Fluxo Resolve**

O fluxo de autenticação precisa resolver 6 casos:

1. Cliente antigo importado por e-mail.  
2. Cliente antigo que recebeu link de ativação.  
3. Cliente antigo que não recebeu o e-mail.  
4. Cliente novo que comprou PsicoPlanilhas R$97.  
5. Cliente que esqueceu a senha.  
6. Admin que precisa reenviar ativação.

---

## **4\. O Que É Proibido**

É proibido:

criar senha padrão  
enviar senha por e-mail  
usar a mesma senha para vários usuários  
pedir senha antiga do PHP  
salvar password\_hash próprio  
mostrar publicamente se um e-mail existe  
liberar acesso sem validar posse do e-mail

Exemplos proibidos:

123456  
psico123  
senha2026  
Senha temporária: abc123

Regra:

O cliente precisa provar posse do e-mail para criar ou redefinir senha.

---

## **5\. Estados do Usuário**

A tabela `profiles` deve conter:

status  
activation\_status

## **5.1 `status`**

Valores:

active  
blocked  
inactive

## **5.2 `activation_status`**

Valores:

pending\_activation  
active

---

## **6\. Interpretação dos Estados**

| Situação | status | activation\_status |
| ----- | ----- | ----- |
| Cliente importado, ainda sem senha | active | pending\_activation |
| Cliente criou senha | active | active |
| Cliente bloqueado antes de ativar | blocked | pending\_activation |
| Cliente bloqueado após ativar | blocked | active |
| Cliente inativo manualmente | inactive | active ou pending\_activation |

---

## **7\. Fluxo do Cliente Antigo Importado**

## **7.1 Entrada**

O cliente vem da lista de e-mails antiga.

Dados mínimos:

name  
email

## **7.2 Criação**

Durante a importação:

Criar usuário no Supabase Auth  
Criar profile  
Criar purchase manual vitalícia  
Definir activation\_status \= pending\_activation  
Enviar link para criação de senha

## **7.3 Resultado**

O cliente antigo recebe:

Acesso vitalício às planilhas  
Assistente GPT Builder incluso  
Assistente IA Pro bloqueado  
Vídeo-banners comerciais

Não recebe:

Assistente IA Pro gratuito  
Assinatura anual automática  
Senha antiga migrada  
Senha temporária

---

## **8\. Fluxo de Ativação por E-mail**

## **8.1 Fluxo**

Cliente recebe e-mail de ativação  
↓  
Clica no link seguro  
↓  
Vai para tela de criação de senha  
↓  
Define nova senha  
↓  
Sistema marca activation\_status \= active  
↓  
Cliente acessa dashboard

---

## **8.2 Página de criação de senha**

Rota sugerida:

/definir-senha

Ou rota técnica equivalente do Supabase Auth.

Campos:

Nova senha  
Confirmar nova senha

Botão:

Criar senha e acessar

---

## **8.3 Texto da tela**

Crie sua nova senha

Estamos atualizando a área de membros do PsicoPlanilhas.  
Seu acesso vitalício continua garantido.

Defina uma nova senha para acessar sua conta.

---

## **9\. Página Pública `/ativar-acesso`**

## **9.1 Objetivo**

Permitir que cliente antigo solicite novo link de ativação caso:

* não tenha recebido o e-mail;  
* o link tenha expirado;  
* o e-mail tenha ido para spam;  
* ele esteja entrando depois de muito tempo.

---

## **9.2 Rota**

/ativar-acesso

---

## **9.3 Tela**

Título:

Ativar meu acesso

Texto:

Já era cliente PsicoPlanilhas?

Digite o e-mail usado na compra para ativar seu novo acesso.  
Você receberá um link para criar sua nova senha.

Campo:

E-mail

Botão:

Enviar link de ativação

---

## **9.4 Resposta obrigatória**

Sempre mostrar a mesma mensagem:

Se este e-mail estiver cadastrado, você receberá um link de ativação.

Mesmo se o e-mail não existir.

---

## **9.5 Por que resposta neutra**

Motivo:

Evitar exposição da base de clientes.

Não mostrar:

E-mail encontrado.  
E-mail não encontrado.  
Você não é cliente.  
Este cadastro não existe.

---

## **10\. Validação do E-mail em `/ativar-acesso`**

## **10.1 Se o e-mail existir**

O sistema deve:

localizar profile pelo e-mail  
verificar status  
gerar novo link de ativação ou reset  
enviar e-mail  
registrar log  
mostrar resposta neutra

---

## **10.2 Se o e-mail não existir**

O sistema deve:

não revelar que não existe  
não criar usuário automaticamente  
não enviar e-mail  
registrar tentativa, se necessário  
mostrar resposta neutra

---

## **10.3 Se o usuário estiver bloqueado**

O sistema deve:

não enviar link  
mostrar resposta neutra  
registrar tentativa

Admin poderá resolver manualmente.

---

## **11\. Link de Ativação**

## **11.1 Regras**

O link deve ser:

individual  
temporário  
de uso único  
enviado apenas ao e-mail cadastrado  
invalidado após uso  
invalidado quando novo link for gerado

---

## **11.2 Expiração recomendada**

24 horas

Pode ser ajustado no admin depois.

---

## **11.3 Token**

Se houver token próprio:

salvar apenas token\_hash  
nunca salvar token puro

Campos em `activation_tokens`:

id  
user\_id  
email  
token\_hash  
purpose  
expires\_at  
used\_at  
created\_at

---

## **12\. Uso do Supabase Auth**

## **12.1 Regra**

Preferir fluxo nativo do Supabase quando possível:

invite user  
password recovery  
magic link  
email redirect

Mas o comportamento de negócio deve respeitar esta spec.

---

## **12.2 Importante**

Mesmo usando Supabase Auth, o sistema precisa atualizar:

profiles.activation\_status  
profiles.last\_login\_at

---

## **13\. Primeiro Login Após Ativação**

Quando o cliente cria senha e entra pela primeira vez:

1. marcar `activation_status = active`;  
2. atualizar `last_login_at`;  
3. verificar se possui acesso vitalício;  
4. redirecionar para `/app`;  
5. se `profile_type = unknown`, exibir escolha de perfil.

---

## **14\. Tela de Escolha de Perfil**

Aparece se:

profile\_type \= unknown

Texto:

Qual é o seu perfil principal?

Opções:

Psicólogo(a)  
Psicopedagogo(a) / Neuropsicopedagogo(a)  
Atuo nas duas áreas  
Responder depois

Mapeamento:

| Escolha | Valor salvo |
| ----- | ----- |
| Psicólogo(a) | psychologist |
| Psicopedagogo(a) / Neuropsicopedagogo(a) | psychopedagogue |
| Atuo nas duas áreas | both |
| Responder depois | unknown |

Regra:

Essa escolha não deve bloquear acesso às planilhas.

---

## **15\. Login Normal**

## **15.1 Rota**

/login

## **15.2 Campos**

E-mail  
Senha

Botões:

Entrar  
Esqueci minha senha  
Ativar meu acesso

---

## **15.3 Texto**

Acesse sua área de membros PsicoPlanilhas.

---

## **16\. Regras no Login**

Ao logar:

1. validar credenciais no Supabase Auth;  
2. buscar `profiles`;  
3. se `status = blocked`, bloquear acesso;  
4. se `status = inactive`, bloquear acesso;  
5. se ativo, atualizar `last_login_at`;  
6. redirecionar conforme role.

---

## **17\. Redirecionamento por Perfil**

| Role | Destino |
| ----- | ----- |
| admin | `/admin` |
| customer | `/app` |

Se não houver profile:

bloquear login  
mostrar erro genérico  
registrar ocorrência

---

## **18\. Mensagens de Erro do Login**

Usar mensagens simples.

Erro genérico:

Não foi possível entrar com esses dados.  
Verifique seu e-mail e senha ou use a opção de recuperação.

Não usar:

Senha incorreta.  
E-mail não existe.  
Usuário encontrado, mas senha errada.

Motivo:

Evitar enumeração de usuários.

---

## **19\. Esqueci Minha Senha**

## **19.1 Rota**

/esqueci-senha

## **19.2 Tela**

Texto:

Digite seu e-mail para receber um link de redefinição de senha.

Campo:

E-mail

Botão:

Enviar link

---

## **19.3 Resposta obrigatória**

Sempre mostrar:

Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.

---

## **20\. Fluxo de Reset de Senha**

Cliente solicita reset  
↓  
Sistema envia link, se e-mail existir  
↓  
Cliente acessa link  
↓  
Define nova senha  
↓  
Sistema confirma alteração  
↓  
Cliente entra normalmente

---

## **21\. Diferença Entre Ativação e Reset**

| Fluxo | Uso |
| ----- | ----- |
| Ativação | Cliente antigo ainda não criou senha |
| Reset | Cliente já criou senha e esqueceu |

Mas tecnicamente ambos podem usar fluxo semelhante de e-mail seguro.

---

## **22\. Admin — Reenviar Ativação**

## **22.1 Onde**

Na tela:

/admin/clientes/\[id\]

Ação:

Reenviar ativação

---

## **22.2 Regra**

Ao reenviar:

gerar novo link  
invalidar link anterior  
enviar e-mail  
registrar admin\_log  
manter activation\_status \= pending\_activation

---

## **22.3 Quando usar**

Usar quando:

* cliente não recebeu e-mail;  
* link expirou;  
* cliente digitou errado;  
* suporte confirmou o e-mail correto.

---

## **23\. Admin — Resetar Senha**

Admin não deve definir senha manualmente.

Admin pode apenas:

enviar link de redefinição

Botão:

Enviar reset de senha

Mensagem:

Um link de redefinição será enviado para o e-mail do cliente.

---

## **24\. Admin — Alterar E-mail do Cliente**

## **24.1 Quando permitir**

Permitir apenas em suporte manual, por exemplo:

* cliente usava e-mail antigo;  
* cliente enviou comprovante;  
* houve erro de digitação na importação.

---

## **24.2 Regra**

Ao alterar e-mail:

1. pedir confirmação;  
2. registrar e-mail antigo;  
3. registrar e-mail novo;  
4. atualizar Auth, se necessário;  
5. atualizar profile;  
6. registrar `admin_logs`;  
7. enviar novo link de ativação, se necessário.

---

## **24.3 Log obrigatório**

Exemplo:

Admin alterou e-mail do cliente de antigo@email.com para novo@email.com.

---

## **25\. E-mail de Ativação**

## **25.1 Evento**

access\_activation

## **25.2 Assunto**

Ative seu novo acesso PsicoPlanilhas

## **25.3 Corpo**

Olá, {{nome}}.

Estamos atualizando a área de membros do PsicoPlanilhas.

Seu acesso vitalício às planilhas continua garantido.

Para entrar na nova plataforma, crie sua nova senha pelo link abaixo:

{{activation\_link}}

Esse link é individual e expira por segurança.

Depois de criar sua senha, você poderá acessar suas planilhas, o Assistente GPT incluso e conhecer as novas ferramentas disponíveis.

Se você não solicitou este acesso, apenas ignore este e-mail.

---

## **26\. E-mail de Reset de Senha**

## **26.1 Evento**

password\_reset

## **26.2 Assunto**

Redefina sua senha PsicoPlanilhas

## **26.3 Corpo**

Olá, {{nome}}.

Recebemos uma solicitação para redefinir sua senha.

Clique no link abaixo para criar uma nova senha:

{{reset\_link}}

Se você não solicitou essa alteração, ignore este e-mail.

---

## **27\. E-mail de Lembrete de Ativação**

## **27.1 Evento**

activation\_reminder

## **27.2 Assunto**

Seu novo acesso PsicoPlanilhas ainda está pendente

## **27.3 Corpo**

Olá, {{nome}}.

Seu novo acesso PsicoPlanilhas já está disponível, mas ainda falta criar sua senha.

Clique no link abaixo para ativar sua conta:

{{activation\_link}}

Seu acesso vitalício às planilhas continua garantido.

---

## **28\. Variáveis de E-mail**

Variáveis permitidas:

{{nome}}  
{{email}}  
{{activation\_link}}  
{{reset\_link}}  
{{login\_url}}  
{{support\_email}}  
{{expires\_at}}

---

## **29\. Segurança Contra Abuso**

## **29.1 Rate limit**

A página `/ativar-acesso` deve limitar tentativas.

Sugestão:

máximo 3 solicitações por e-mail por hora  
máximo 10 solicitações por IP por hora

---

## **29.2 Motivo**

Evitar:

* spam;  
* tentativa de enumeração;  
* abuso de envio;  
* sobrecarga do serviço de e-mail.

---

## **30\. Logs Obrigatórios**

Registrar:

solicitação de ativação  
envio de ativação  
reenvio de ativação por admin  
ativação concluída  
solicitação de reset  
reset concluído  
tentativa bloqueada por rate limit  
alteração de e-mail  
login de admin  
bloqueio de usuário

---

## **31\. Mensagens do Sistema**

## **31.1 Link expirado**

Este link expirou.  
Solicite um novo link de ativação ou redefinição de senha.

Botão:

Solicitar novo link

---

## **31.2 Link já usado**

Este link já foi usado.  
Se precisar acessar novamente, use a opção de login ou redefinição de senha.

---

## **31.3 Conta bloqueada**

Não foi possível acessar sua conta.  
Entre em contato com o suporte.

Não dizer:

Sua conta foi bloqueada pelo admin.

---

## **31.4 Ativação concluída**

Senha criada com sucesso.  
Você já pode acessar sua área de membros.

Botão:

Entrar

---

## **32\. FAQ Público**

## **32.1 Minha senha antiga funciona?**

Não. A nova plataforma exige a criação de uma nova senha por segurança.

## **32.2 Perdi meu acesso?**

Não. Seu acesso vitalício às planilhas continua garantido.  
Você só precisa ativar sua conta na nova área de membros.

## **32.3 Não recebi o e-mail.**

Acesse a página Ativar Acesso e informe o e-mail usado na compra.  
Se estiver cadastrado, enviaremos um novo link.

## **32.4 O Assistente IA Pro está incluso?**

O Assistente GPT básico continua incluso no seu acesso vitalício.  
O Assistente IA Pro dentro da plataforma é um recurso novo com assinatura anual.

---

## **33\. Fluxo Visual Resumido**

Cliente antigo  
↓  
Recebe link  
↓  
Cria senha  
↓  
Escolhe perfil  
↓  
Entra no dashboard  
↓  
Acessa planilhas  
↓  
Vê Assistente Pro com cadeado  
↓  
Pode assinar R$50/ano

---

## **34\. Checklist de Validação**

## **34.1 Cliente importado**

* recebe link;  
* cria senha;  
* activation\_status vira active;  
* acessa dashboard;  
* vê planilhas liberadas;  
* vê Assistente Pro bloqueado.

## **34.2 Link expirado**

* não permite criar senha;  
* mostra mensagem clara;  
* permite solicitar novo link.

## **34.3 Reset de senha**

* envia resposta neutra;  
* envia link se existir;  
* permite criar nova senha.

## **34.4 Admin**

* reenvia ativação;  
* envia reset;  
* não define senha manualmente;  
* altera e-mail com log.

## **34.5 Segurança**

* não expõe se e-mail existe;  
* não salva senha;  
* não usa senha padrão;  
* limita tentativas;  
* registra logs.

---

## **35\. O Que Fica Fora do MVP**

Não incluir no MVP:

login social com Google  
2FA  
SSO  
multiempresa  
permissões avançadas por equipe  
convite de múltiplos usuários por cliente

---

## **36\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Supabase Auth gerencia senha | Congelado |
| Não migrar senha antiga | Congelado |
| Cliente cria nova senha | Congelado |
| `/ativar-acesso` obrigatório | Congelado |
| Resposta pública sempre neutra | Congelado |
| Admin não define senha manualmente | Congelado |
| Reenvio de ativação pelo admin | Congelado |
| Rate limit obrigatório | Congelado |
| Log de ações sensíveis | Congelado |
| Sem senha padrão | Congelado |

---

## **37\. Frase Norteadora**

A autenticação do PsicoPlanilhas 2.0 deve ser simples e segura: clientes antigos são reativados por e-mail, criam uma nova senha por link seguro e mantêm acesso vitalício às planilhas, sem reaproveitar senha antiga ou depender do banco PHP morto.

