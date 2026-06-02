# **PSICOPLANILHAS\_UX\_UI\_SPEC\_v0.1**

## **1\. Objetivo do Documento**

Definir a experiência visual e funcional do PsicoPlanilhas 2.0.

A interface deve ser simples, limpa e comercial.

O usuário precisa entender rapidamente:

1. Onde estão as planilhas.  
2. Onde está o Assistente GPT incluso.  
3. O que é o Assistente IA Pro pago.  
4. Quais outros produtos podem ajudá-lo.  
5. Se o Assistente Pro está liberado ou bloqueado.

---

## **2\. Princípio Central de UX**

O PsicoPlanilhas 2.0 não deve parecer um sistema complexo.

Deve parecer:

Uma área de membros simples, organizada e confiável.

A experiência ideal:

Login  
↓  
Dashboard limpo  
↓  
Acesso às planilhas  
↓  
Oferta clara do Assistente IA Pro  
↓  
Vídeo-banners segmentados  
↓  
Compra de produtos extras

---

## **3\. Estilo Visual**

## **3.1 Direção visual**

A interface deve seguir estes princípios:

* limpa;  
* clara;  
* leve;  
* moderna;  
* com bastante espaço em branco;  
* cards grandes;  
* poucos botões por tela;  
* hierarquia visual óbvia;  
* sem poluição de cores;  
* sem excesso de texto.

## **3.2 Sensação desejada**

A plataforma deve transmitir:

* organização;  
* confiança;  
* praticidade;  
* apoio profissional;  
* tecnologia simples;  
* ferramenta pronta para uso.

## **3.3 Sensação proibida**

A plataforma não deve parecer:

* sistema clínico pesado;  
* prontuário;  
* app de avaliação;  
* software hospitalar;  
* painel complexo;  
* marketplace poluído;  
* tela cheia de anúncios.

---

## **4\. Estrutura Geral de Navegação**

## **4.1 Menu do Cliente**

Menu lateral ou superior:

Dashboard  
Minhas Planilhas  
Assistente GPT  
Assistente IA Pro  
Tutoriais  
Outros Produtos  
Minha Conta  
Sair

## **4.2 Menu do Admin**

Dashboard  
Clientes  
Planilhas  
Produtos  
Vídeo-Banners  
Assinaturas  
Relatórios IA  
E-mails  
Configurações  
Sair

---

## **5\. Login**

## **5.1 Rota**

/login

## **5.2 Elementos**

A tela de login deve ter:

* logo PsicoPlanilhas;  
* e-mail;  
* senha;  
* botão entrar;  
* link “Esqueci minha senha”;  
* texto curto de suporte;  
* visual limpo.

## **5.3 Texto base**

Acesse sua área de membros PsicoPlanilhas.

## **5.4 Campos**

E-mail  
Senha

## **5.5 Botões**

Entrar  
Esqueci minha senha

---

## **6\. Primeiro Acesso**

## **6.1 Objetivo**

Identificar o perfil profissional do usuário para personalizar os vídeo-banners.

## **6.2 Tela**

Após o primeiro login, se profile\_type \= unknown, mostrar:

Qual é o seu perfil principal?

Opções:

Psicólogo(a)  
Psicopedagogo(a) / Neuropsicopedagogo(a)  
Atuo nas duas áreas  
Prefiro responder depois

## **6.3 Regra**

Se o usuário escolher:

| Escolha | Salvar como |
| ----- | ----- |
| Psicólogo(a) | psychologist |
| Psicopedagogo(a) / Neuropsicopedagogo(a) | psychopedagogue |
| Atuo nas duas áreas | both |
| Prefiro responder depois | unknown |

## **6.4 Importante**

Essa tela não deve bloquear o acesso às planilhas.

Se o usuário pular, ele segue para o dashboard.

---

## **7\. Dashboard do Cliente**

## **7.1 Rota**

/app

## **7.2 Objetivo**

Ser a tela principal da área de membros.

Deve entregar 3 coisas:

1. Acesso rápido às planilhas.  
2. Oferta clara do Assistente IA Pro.  
3. Vitrine segmentada dos outros produtos.

---

## **8\. Layout do Dashboard**

Ordem recomendada:

1\. Boas-vindas  
2\. Card principal: Minhas Planilhas  
3\. Vídeo-banner fixo: Assistente IA Pro  
4\. Vídeo-banner segmentado por perfil  
5\. Produtos recomendados  
6\. Aviso de uso responsável

---

## **9\. Bloco de Boas-vindas**

## **9.1 Texto**

Olá, \[Nome\].  
Bem-vindo(a) à sua área PsicoPlanilhas.

## **9.2 Subtexto**

Acesse suas planilhas, use o assistente incluso e conheça ferramentas para acelerar sua rotina profissional.

## **9.3 Regras**

* Não usar texto longo.  
* Não colocar aviso jurídico no topo.  
* Não colocar muitos botões.

---

## **10\. Card Principal — Minhas Planilhas**

## **10.1 Posição**

Deve aparecer logo no início do dashboard.

## **10.2 Conteúdo**

Minhas Planilhas  
Acesse as planilhas liberadas no seu pacote vitalício.

## **10.3 Botão**

Acessar Planilhas

## **10.4 Elementos visuais**

* ícone de planilha;  
* número de planilhas disponíveis;  
* status “Acesso vitalício”;  
* botão destacado.

## **10.5 Exemplo**

Minhas Planilhas  
100 planilhas liberadas no seu acesso vitalício.

\[Acessar Planilhas\]

---

## **11\. Vídeo-Banner Fixo — Assistente IA Pro**

## **11.1 Objetivo**

Vender a assinatura anual de R$50.

## **11.2 Público**

Todos os usuários.

## **11.3 Posição**

Logo após o card “Minhas Planilhas”.

## **11.4 Estados possíveis**

O banner muda conforme o status do usuário:

| Estado | Exibição |
| ----- | ----- |
| Nunca comprou | Oferta com cadeado |
| Ativo | Acesso liberado |
| Vencido | Renovação |
| Cancelado | Reativação |

---

## **12\. Assistente IA Pro — Estado Bloqueado**

## **12.1 Texto**

Assistente IA Pro  
Gere relatórios estruturados com IA usando os dados das suas planilhas.

🔒 Bloqueado  
Assine por R$50/ano para liberar o acesso.

## **12.2 Botões**

Assistir vídeo  
Assinar por R$50/ano

## **12.3 Visual**

* banner horizontal;  
* thumb do vídeo;  
* ícone de cadeado;  
* botão principal de assinatura.

---

## **13\. Assistente IA Pro — Estado Ativo**

## **13.1 Texto**

Assistente IA Pro ativo  
Você pode gerar relatórios diretamente pela plataforma.

## **13.2 Mostrar**

Acesso ativo até: \[data\]

## **13.3 Botões**

Abrir Assistente  
Ver histórico

---

## **14\. Assistente IA Pro — Estado Vencido**

## **14.1 Texto**

Sua assinatura do Assistente IA Pro expirou.  
Renove por R$50/ano para voltar a gerar relatórios.

## **14.2 Botões**

Renovar agora  
Assistir vídeo

## **14.3 Visual**

* cadeado visível;  
* tom claro, sem assustar;  
* CTA direto.

---

## **15\. Vídeo-Banner para Psicólogos**

## **15.1 Público**

Usuários com:

profile\_type \= psychologist  
profile\_type \= both

## **15.2 Objetivo**

Apresentar produtos voltados para psicólogos.

Exemplos:

* Axis TCC;  
* ferramentas de relatórios;  
* produtos clínicos;  
* NeuroRastreio, quando aplicável;  
* Assistente IA Pro.

## **15.3 Texto base**

Soluções para Psicólogos  
Conheça ferramentas para organizar atendimentos, relatórios, TCC e processos clínicos.

## **15.4 Botões**

Assistir vídeo  
Ver produtos

---

## **16\. Vídeo-Banner para Psicopedagogos**

## **16.1 Público**

Usuários com:

profile\_type \= psychopedagogue  
profile\_type \= both

## **16.2 Objetivo**

Apresentar produtos voltados para psicopedagogos e neuropsicopedagogos.

Exemplos:

* PsicoBook;  
* NeuroRastreio;  
* ABA Simples;  
* PEI;  
* materiais de aprendizagem;  
* Assistente IA Pro.

## **16.3 Texto base**

Soluções para Psicopedagogos  
Conheça ferramentas para avaliações, relatórios, PEI, aprendizagem e acompanhamento.

## **16.4 Botões**

Assistir vídeo  
Ver produtos

---

## **17\. Regras dos Vídeo-Banners**

## **17.1 Os vídeos não devem ficar abertos**

O dashboard deve mostrar banners, não players abertos.

Fluxo:

Usuário vê banner  
↓  
Clica em "Assistir vídeo"  
↓  
Abre modal com vídeo

## **17.2 Benefício**

Isso evita:

* poluição visual;  
* excesso de informação;  
* lentidão;  
* distração;  
* sensação de anúncio exagerado.

## **17.3 Regra**

Nunca exibir 3 vídeos abertos na mesma tela.

---

## **18\. Modal de Vídeo**

## **18.1 Elementos**

O modal deve conter:

* título;  
* vídeo incorporado;  
* botão de fechar;  
* CTA abaixo do vídeo.

## **18.2 Exemplo**

Assistente IA Pro  
\[vídeo\]

\[Assinar por R$50/ano\]

## **18.3 Regras**

* Não abrir em nova aba, salvo exceção técnica.  
* Não usar autoplay.  
* Não esconder botão de fechar.  
* Não colocar formulário dentro do modal.

---

## **19\. Área “Minhas Planilhas”**

## **19.1 Rota**

/app/planilhas

## **19.2 Objetivo**

Mostrar todas as planilhas liberadas.

## **19.3 Layout**

* busca no topo;  
* filtro por categoria;  
* cards de planilha;  
* aviso de uso responsável no rodapé.

## **19.4 Card de planilha**

Campos:

Imagem  
Nome  
Categoria  
Descrição curta  
Botão Acessar Planilha  
Botão Ver Tutorial

## **19.5 Exemplo**

SNAP-IV  
Apoio para organização e cálculo dos dados.

\[Acessar Planilha\]  
\[Ver Tutorial\]

---

## **20\. Aviso Obrigatório nas Planilhas**

O aviso deve aparecer:

1. no rodapé da página de planilhas;  
2. no modal de abertura de planilha;  
3. opcionalmente no primeiro acesso.

Texto:

Esta planilha é um recurso de apoio operacional.  
Ela agiliza cálculos, organização e visualização dos dados.  
O uso correto exige o manual original do instrumento.  
Não substitui avaliação profissional, teste original, manual ou interpretação clínica.

---

## **21\. Modal antes de abrir planilha**

## **21.1 Quando usar**

Ao clicar em “Acessar Planilha”, pode abrir um modal rápido.

## **21.2 Texto**

Antes de abrir:  
use esta planilha sempre junto ao manual original do instrumento.  
Ela serve como apoio operacional para agilizar cálculos e organização dos dados.

## **21.3 Botões**

Abrir Planilha  
Cancelar

## **21.4 Regra**

Esse modal pode aparecer apenas uma vez por sessão para não irritar o usuário.

---

## **22\. Assistente GPT Incluso**

## **22.1 Rota**

/app/assistente-gpt

## **22.2 Objetivo**

Dar acesso ao GPT Builder externo incluso no pacote vitalício.

## **22.3 Texto**

Assistente GPT incluso  
Este assistente ajuda você a estruturar relatórios a partir dos dados das planilhas.  
Ele é um apoio textual e não substitui sua análise profissional.

## **22.4 Botão**

Abrir Assistente GPT

## **22.5 Observação**

O Assistente GPT incluso não salva histórico dentro da plataforma.

---

## **23\. Assistente IA Pro**

## **23.1 Rota**

/app/assistente-pro

## **23.2 Se bloqueado**

Mostrar:

* cadeado;  
* vídeo-banner;  
* benefícios;  
* preço;  
* botão de assinatura.

Texto:

Assistente IA Pro bloqueado.  
Assine por R$50/ano para gerar relatórios diretamente pela plataforma.

## **23.3 Se ativo**

Mostrar:

* formulário de geração;  
* histórico;  
* data de vencimento;  
* orientações.

## **23.4 Se vencido**

Mostrar:

* cadeado;  
* data de vencimento;  
* botão de renovação.

---

## **24\. Formulário do Assistente IA Pro**

## **24.1 Campos MVP**

Nome do avaliado  
Idade  
Tipo de relatório  
Dados ou observações  
Upload de print/imagem  
Objetivo do relatório

## **24.2 Botão**

Gerar relatório

## **24.3 Resultado**

Após gerar, mostrar:

Relatório gerado  
Copiar texto  
Salvar no histórico  
Gerar nova versão

## **24.4 Regra**

O botão “Gerar relatório” só funciona se o usuário tiver assinatura ativa.

---

## **25\. Histórico de Relatórios**

## **25.1 Rota**

Pode ficar dentro de:

/app/assistente-pro

Ou como aba:

/app/assistente-pro/historico

## **25.2 Card de histórico**

Campos:

Título  
Tipo de relatório  
Data  
Botão Ver  
Botão Copiar

---

## **26\. Área “Outros Produtos”**

## **26.1 Rota**

/app/produtos

## **26.2 Objetivo**

Vender produtos complementares.

## **26.3 Filtros**

Todos  
Para Psicólogos  
Para Psicopedagogos

## **26.4 Card de produto**

Campos:

Imagem  
Nome  
Público  
Descrição curta  
Botão Ver detalhes  
Botão Comprar/Conhecer

## **26.5 Regras**

* Não mostrar cards demais no dashboard.  
* Dashboard mostra poucos produtos.  
* Página “Outros Produtos” pode mostrar todos.

---

## **27\. Minha Conta**

## **27.1 Rota**

/app/minha-conta

## **27.2 Campos**

Mostrar:

Nome  
E-mail  
Perfil profissional  
Status do acesso vitalício  
Status do Assistente IA Pro  
Data de vencimento do Assistente IA Pro

## **27.3 Ações**

Alterar perfil profissional  
Alterar senha  
Sair

---

## **28\. Admin Dashboard**

## **28.1 Rota**

/admin

## **28.2 Cards principais**

Clientes totais  
Clientes com Assistente Pro ativo  
Assinaturas vencidas  
Planilhas cadastradas  
Banners ativos  
Relatórios gerados

## **28.3 Regra**

O admin deve ser operacional, não bonito demais.

Prioridade:

encontrar cliente  
ver vencimento  
editar acesso  
editar links  
editar banners

---

## **29\. Admin Clientes**

## **29.1 Rota**

/admin/clientes

## **29.2 Tabela**

Colunas:

Nome  
E-mail  
Perfil  
Acesso vitalício  
Assistente Pro  
Vencimento  
Último login  
Status  
Ações

## **29.3 Ações**

Editar  
Resetar senha  
Ativar Assistente  
Definir vencimento  
Bloquear

---

## **30\. Admin Planilhas**

## **30.1 Rota**

/admin/planilhas

## **30.2 Função**

Cadastrar e editar links das planilhas.

Campos:

Nome  
Categoria  
Descrição  
Imagem  
Link Google Sheets  
Link Tutorial  
Status  
Ordem

---

## **31\. Admin Vídeo-Banners**

## **31.1 Rota**

/admin/banners

## **31.2 Campos**

Título  
Subtítulo  
Público  
Posição  
Imagem  
URL do vídeo  
Texto do botão principal  
URL do botão principal  
Texto do botão secundário  
URL do botão secundário  
Status  
Ordem

## **31.3 Banners obrigatórios**

Assistente IA Pro  
Produtos para Psicólogos  
Produtos para Psicopedagogos

---

## **32\. Admin Assinaturas**

## **32.1 Rota**

/admin/assinaturas

## **32.2 Tabela**

Cliente  
E-mail  
Plano  
Status  
Início  
Vencimento  
Fonte  
Ações

## **32.3 Ações**

Ativar  
Renovar  
Cancelar  
Alterar vencimento

---

## **33\. Estados Visuais do Cadeado**

## **33.1 Nunca comprou**

🔒 Assistente IA Pro bloqueado  
Assine por R$50/ano.

## **33.2 Vencido**

🔒 Assinatura vencida  
Renove para voltar a usar.

## **33.3 Ativo**

✅ Assistente IA Pro ativo até \[data\]

## **33.4 Admin/manual**

✅ Acesso liberado manualmente até \[data\]

---

## **34\. Microcopy**

## **34.1 Botões principais**

Acessar Planilhas  
Abrir Assistente GPT  
Assinar por R$50/ano  
Renovar Assistente  
Assistir vídeo  
Ver produtos

## **34.2 Evitar**

Não usar:

Diagnosticar  
Aplicar teste  
Gerar laudo automático  
Resultado oficial  
Substitui manual  
Avaliação completa

## **34.3 Usar**

Usar:

Apoio operacional  
Organizar dados  
Agilizar cálculos  
Estruturar relatório  
Revisão profissional  
Manual original

---

## **35\. Mobile**

## **35.1 Regra**

A plataforma deve funcionar bem em celular.

## **35.2 Prioridades no mobile**

Ordem:

Minhas Planilhas  
Assistente IA Pro  
Assistente GPT  
Produtos recomendados  
Menu

## **35.3 Banners no mobile**

* virar card vertical;  
* imagem no topo;  
* texto curto;  
* botão grande;  
* vídeo em modal.

---

## **36\. Regra Contra Poluição**

O dashboard não pode ter mais de:

1 card principal de planilhas  
1 banner do Assistente Pro  
1 ou 2 banners segmentados  
3 produtos recomendados

Se precisar mostrar mais, usar a página “Outros Produtos”.

---

## **37\. Fluxo Principal do Cliente Antigo**

Login  
↓  
Dashboard  
↓  
Vê acesso vitalício ativo  
↓  
Acessa planilhas  
↓  
Vê Assistente GPT incluso  
↓  
Vê Assistente IA Pro bloqueado  
↓  
Assiste vídeo-banner  
↓  
Assina R$50/ano ou vê outros produtos

---

## **38\. Fluxo do Cliente com Assistente Pro Ativo**

Login  
↓  
Dashboard  
↓  
Vê Assistente IA Pro ativo  
↓  
Clica em Abrir Assistente  
↓  
Preenche dados  
↓  
Gera relatório  
↓  
Salva histórico

---

## **39\. Fluxo do Cliente com Assistente Vencido**

Login  
↓  
Dashboard  
↓  
Vê cadeado  
↓  
Mensagem de assinatura vencida  
↓  
Clica em Renovar  
↓  
Pagamento  
↓  
Acesso liberado por mais 1 ano

---

## **40\. Decisões Congeladas**

| Decisão | Status |
| ----- | ----- |
| Dashboard limpo | Congelado |
| Vídeos em formato banner/modal | Congelado |
| 3 vídeo-banners principais | Congelado |
| Assistente IA Pro no topo | Congelado |
| Segmentação por perfil | Congelado |
| Planilhas em cards simples | Congelado |
| Modal de aviso antes da planilha | Congelado |
| Cadeado visual para Assistente Pro | Congelado |
| Mobile simples | Congelado |
| Página separada para produtos extras | Congelado |

---

## **41\. Frase Norteadora de UX**

O usuário deve entrar, encontrar suas planilhas em segundos, entender que o Assistente IA Pro é um upgrade anual e ver produtos relevantes para sua área sem sentir que está em uma tela poluída de anúncios.

