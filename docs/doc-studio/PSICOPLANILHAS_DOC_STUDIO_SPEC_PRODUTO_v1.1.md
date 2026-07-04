# PsicoPlanilhas Doc Studio - Spec de Produto v1.1

Status: fonte unica de produto para discussao e execucao futura
Data: 2026-07-04
Produto: PsicoPlanilhas Doc Studio
Modelo comercial: vitalicio
Preco decidido: R$49,00
IA na v1: nao

---

## 1. Decisao Central

O produto se chama:

```txt
PsicoPlanilhas Doc Studio
```

Nao usar:

```txt
PsicoPlanilhas Doc Pro
```

Nesta decisao, Doc Studio nao e apenas nome interno. E o nome do produto vendido.

Modelo comercial:

```txt
R$49,00 vitalicio
```

Motivo:

```txt
produto barato
custo marginal baixo
boa entrada para a plataforma
vitrine para produtos recorrentes
sem risco de custo recorrente de IA
```

---

## 2. O Que O Produto E

O Doc Studio e um studio guiado para montar, copiar, imprimir e salvar documentos profissionais com visual premium.

Ele entrega:

```txt
modelos guiados
campos por secao
catalogo por profissao
busca
preview premium
cabecalho profissional vindo da Minha Conta
assinatura opcional
modo preto e branco
copia de texto
impressao / salvar PDF pelo navegador
rascunho local
```

Regra principal:

```txt
O sistema estrutura.
O profissional escreve.
O Doc Studio organiza e entrega bonito.
```

---

## 3. O Que Nao Entra Na v1

Nao entra na v1:

```txt
IA
API de IA
limite diario de IA
chat livre
geracao automatica de documento
historico em banco
DOCX
upload de PDF
editor tipo Canva
arrastar e soltar
```

IA pode virar depois:

```txt
mini esteira separada
upgrade recorrente
bonus limitado
produto complementar
```

Mas nao pertence ao core vitalicio de R$49.

---

## 4. Promessa Comercial

Promessa principal:

```txt
Crie documentos profissionais com modelos guiados, cabecalho personalizado e visual premium para copiar, imprimir ou salvar em PDF.
```

Promessa curta:

```txt
Documentos mais bonitos, claros e organizados em menos tempo.
```

Frase de governanca:

```txt
O PsicoPlanilhas Doc Studio auxilia na organizacao de documentos profissionais. Os textos devem ser revisados pelo profissional responsavel e nao substituem avaliacao, diagnostico, laudo ou orientacao tecnica especifica.
```

---

## 5. Publico

Publico inicial:

```txt
psicopedagogos
neuropsicopedagogos
psicologos
neuropsicologos
```

Expansao possivel por profissao:

```txt
fonoaudiologos
terapeutas ocupacionais
medicos
pediatras
outros profissionais
```

Regra:

```txt
o catalogo deve mudar conforme profession_category da Minha Conta.
```

---

## 6. Profissao Controla Catalogo

O campo central e:

```txt
profession_category
```

Valores ja existentes:

```txt
psicologo
psicopedagogo
neuropsicopedagogo
fonoaudiologo
terapeuta_ocupacional
medico
pediatra
outro
```

Comportamento desejado:

```txt
Psicologo(a) -> catalogo de Psicologia / Neuropsicologia
Psicopedagogo(a) -> catalogo de Psicopedagogia
Neuropsicopedagogo(a) -> catalogo de Neuropsicopedagogia
Fonoaudiologo(a) -> catalogo de Fonoaudiologia
Terapeuta Ocupacional -> catalogo de Terapia Ocupacional
```

Na v1, os catalogos principais sao:

```txt
Psicopedagogia / Neuropsicopedagogia
Psicologia / Neuropsicologia
```

Fono e TO podem ser preparados como linhas futuras sem prometer entrega imediata.

---

## 7. Cabecalho Profissional

O Doc Studio deve usar os dados ja existentes em Minha Conta:

```txt
display_name
gender
profession_category
credential_type
credential_number
```

Nao criar outro cadastro.

Saida esperada:

```txt
Nome de exibicao
Profissao flexionada · Credencial numero
```

Exemplo:

```txt
Ana Maria
Psicologa · CRP 09/45645
```

---

## 8. Catalogo v1

A v1 deve ter 30 documentos:

```txt
15 para Psicopedagogia / Neuropsicopedagogia
15 para Psicologia / Neuropsicologia
```

O objetivo nao e quantidade bruta.

O objetivo e:

```txt
documentos certos
bonitos
seguros
uteis
faceis de achar
```

---

## 9. Documentos v1 - Psicopedagogia / Neuropsicopedagogia

1. Anamnese psicopedagogica inicial
2. Entrevista com familia
3. Entrevista com aprendente
4. Entrevista com professor/escola
5. Observacao escolar
6. Observacao ludica
7. Registro de sessao psicopedagogica
8. Devolutiva psicopedagogica para familia
9. Devolutiva para escola
10. Relatorio de acompanhamento psicopedagogico
11. Relatorio de observacao escolar
12. Relatorio individual AEE
13. Plano de apoio escolar / PEI simplificado
14. Encaminhamento orientativo
15. Autorizacao / contrato / declaracao simples

---

## 10. Documentos v1 - Psicologia / Neuropsicologia

1. Anamnese psicologica adulto
2. Anamnese psicologica infantil/adolescente
3. Registro de atendimento e evolucao
4. Planejamento terapeutico inicial
5. Sintese psicologica descritiva
6. Relatorio psicologico estruturado CFP
7. Parecer psicologico orientativo
8. Encaminhamento psicologico
9. Devolutiva clinica em linguagem acessivel
10. Orientacao a familia/responsaveis
11. Contrato terapeutico
12. Autorizacao para atendimento de menor
13. Protocolo de atendimento online
14. Declaracao de comparecimento / recibo
15. TCLE simplificado

---

## 11. Regra Especial Para Psicologia

O documento "Relatorio psicologico estruturado CFP" entra na v1.

Ele precisa seguir estrutura propria:

```txt
identificacao
descricao da demanda
procedimento
analise
conclusao
rodape etico
```

Nao chamar texto solto de relatorio psicologico.

Nao entrar na v1:

```txt
laudo psicologico
laudo por transtorno
atestado complexo
parecer judicial
documento pericial
```

---

## 12. Quarentena

Ficam fora:

```txt
laudo pronto
laudo DSM/CID
questionario diagnostico
escala clinica
teste psicologico
instrumento proprietario
prova projetiva
prova operatoria protegida
material que prometa diagnostico de TEA
material que prometa diagnostico de TDAH
material que prometa diagnostico de dislexia
avaliacao de risco como material solto
```

Pode virar:

```txt
roteiro de observacao funcional
ficha de acompanhamento
relatorio descritivo
orientacao para familia
orientacao para escola
registro profissional
```

---

## 13. Experiencia Da Tela

Tela principal:

```txt
catalogo por profissao
busca de modelos
filtro simples por tipo
campos guiados
preview premium
aparencia simples
copiar
imprimir
```

Controles permitidos:

```txt
Mostrar cabecalho
Mostrar assinatura
Modo preto e branco
Cor principal
Fonte
Densidade
```

Evitar:

```txt
muitos botoes
varias formas de exportar
editor livre
menu complexo
opcoes demais
```

---

## 14. Pagamento E Acesso

Modelo:

```txt
R$49,00 vitalicio
```

Controle de acesso:

```txt
usuario comprador acessa Doc Studio
usuario sem compra ve oferta/bloqueio
sem assinatura recorrente na v1
sem custo recorrente de IA na v1
```

Pagamento, checkout e webhook entram em bloco tecnico separado.

---

## 15. Relacao Com Produtos Existentes

```txt
Flow organiza rotina e registros
Doc Studio monta documentos bonitos e guiados
Assistente IA Pro continua sendo produto/area de IA mais ampla
NeuroRastreio faz rastreios funcionais estruturados
produtos recorrentes ficam como upsell natural
```

Regra:

```txt
Doc Studio e produto de entrada e vitrine.
Nao deve carregar custo recorrente pesado.
```

---

## 16. Implementacao Atual Ja Feita

A branch de laboratorio refatorada ja entrega base valida:

```txt
rota /app/doc-studio
catalogo local
busca
filtro por tipo
preview premium
copia
impressao
rascunho local
cabecalho e assinatura
menu compacto apenas no modulo
testes
build aprovado
```

O que falta alinhar:

```txt
remover referencias a IA da v1
remover Doc Pro como nome do produto
trocar anual por vitalicio
expandir catalogo para 30 documentos
catalogo orientado por profession_category
confirmar Relatorio psicologico estruturado CFP
manter quarentena fora da vitrine
```

---

## 17. Decisoes Em Aberto

1. A rota fica `/app/doc-studio`? Recomendacao: sim.
2. Fono e TO aparecem ja na UI como linhas futuras ou ficam ocultas? Recomendacao: ocultas ate ter catalogo minimo.
3. O item "Autorizacao / contrato / declaracao simples" vira um modelo combinado ou tres modelos separados?
4. O catalogo v1 fica com 30 documentos ou entra com 20 e expande para 30?

---

## 18. Veredito

O caminho mais forte e:

```txt
Doc Studio vitalicio por R$49
sem IA na v1
catalogo inteligente por profissao
preview premium
documentos seguros
produto de entrada para vender recorrencia depois
```

O produto vence por utilidade, beleza, baixo atrito e custo baixo.
