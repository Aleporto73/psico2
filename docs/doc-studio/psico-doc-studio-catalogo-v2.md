# PsicoPlanilhas Doc Studio - Catalogo v2

Status: fonte executavel das fichas do Doc Studio.
Produto: PsicoPlanilhas Doc Studio.
IA na v1: nao.

Este catalogo define os documentos, campos, hints, skeletons, secoes e rodapes que devem orientar a criacao do `Template[]` final.

Regra: este arquivo decide o conteudo das fichas. A spec hibrida final decide produto, UX e seguranca.

---

## 1. Campo-base reutilizavel

| Campo | Tipo | Hint |
|---|---|---|
| `subject_name` | text | Nome completo ou como a pessoa prefere ser identificada. |
| `subject_age` | text | Idade ou faixa etaria. Ex.: 7 anos, adolescente, adulto. |
| `document_date` | date/text | Data do atendimento, entrevista ou emissao. |
| `start_time` | text | Horario de inicio. Ex.: 14:00. |
| `end_time` | text | Horario de termino. Ex.: 14:50. |
| `purpose` | textarea | Para que serve o documento. Ex.: apresentar a escola, registrar acompanhamento, orientar familia. |
| `demand_context` | textarea | Por que a pessoa procurou o atendimento e quem solicitou o documento. |
| `procedures` | textarea | Entrevistas, observacoes, atendimentos ou instrumentos utilizados. |
| `observations` | textarea | O que foi observado, sem rotulos diagnosticos. |
| `strengths` | textarea | Recursos, potencialidades, interesses e respostas positivas. |
| `attention_points` | textarea | Pontos que precisam de apoio, sem patologizar. |
| `recommendations` | textarea | Orientacoes praticas, possiveis e coerentes com o contexto. |
| `next_steps` | textarea | Proximos passos ou combinados. |
| `family_guidance` | textarea | Orientacoes para familia/responsaveis. |
| `school_guidance` | textarea | Orientacoes para escola/equipe pedagogica. |
| `authorization_scope` | textarea | O que esta sendo autorizado e em qual periodo/contexto. |
| `payment_description` | textarea | Servico, valor, data e forma de pagamento. |

---

## 2. Skeletons-base seguros

Skeleton e estrutura de exemplo com lacunas. Nunca deve trazer conclusao clinica pronta.

### Declaracao

```txt
Declaro, para os devidos fins, que ___ esteve presente em atendimento no dia ___, das ___ as ___.
```

### Encaminhamento

```txt
Encaminho ___ para avaliacao/atendimento em ___, tendo em vista ___.
```

### Relatorio descritivo

```txt
Durante o acompanhamento, entre ___ e ___, observou-se ___.
Como recomendacoes, indica-se ___.
```

### Devolutiva

```txt
Este documento resume observacoes realizadas em ___ e apresenta orientacoes para ___.
```

### PEI / plano

```txt
Objetivo geral: ___.
Meta: ___.
Estrategia: ___.
Reavaliacao em: ___.
```

---

## 3. Universais ativos

### 3.1 `universal_blank_document`

**Titulo:** Documento em branco
**Status:** active
**Profissoes:** todas
**documentKind:** formal_document
**riskLevel:** low

**Essenciais:** `subject_name`, `purpose`, `observations`
**Opcionais:** `document_date`, `recommendations`, `next_steps`

**Secoes:**

1. Identificacao
2. Finalidade
3. Conteudo livre
4. Observacoes complementares

**Skeleton:** vazio por padrao. Pode inserir estrutura generica:

```txt
Finalidade: ___.
Conteudo: ___.
Observacoes: ___.
```

**Rodape etico:** Documento livre preenchido pela profissional. O sistema nao emite conclusao tecnica, diagnostico ou laudo.

---

### 3.2 `universal_attendance_statement`

**Titulo:** Declaracao de comparecimento
**Status:** active
**Profissoes:** todas
**documentKind:** formal_document
**riskLevel:** low

**Essenciais:** `subject_name`, `document_date`, `start_time`, `end_time`
**Opcionais:** `purpose`

**Secoes:**

1. Declaracao
2. Finalidade administrativa

**Skeleton:**

```txt
Declaro, para os devidos fins, que ___ esteve presente em atendimento no dia ___, das ___ as ___.
```

**Rodape etico:** Declaracao de comparecimento sem conteudo clinico, diagnostico, sintomas ou detalhes do atendimento.

---

### 3.3 `universal_referral`

**Titulo:** Encaminhamento profissional
**Status:** active
**Profissoes:** todas
**documentKind:** referral
**riskLevel:** medium

**Essenciais:** `subject_name`, `purpose`, `demand_context`, `recommendations`
**Opcionais:** `observations`, `next_steps`

**Secoes:**

1. Identificacao
2. Motivo do encaminhamento
3. Observacoes relevantes
4. Recomendacao de continuidade

**Skeleton:**

```txt
Encaminho ___ para avaliacao/atendimento em ___, tendo em vista ___.
```

**Rodape etico:** Encaminhamento orientativo. Nao constitui diagnostico, laudo ou conclusao clinica automatica.

---

### 3.4 `universal_payment_receipt`

**Titulo:** Recibo / declaracao de pagamento
**Status:** active
**Profissoes:** todas
**documentKind:** formal_document
**riskLevel:** low

**Essenciais:** `subject_name`, `payment_description`, `document_date`
**Opcionais:** `purpose`

**Secoes:**

1. Identificacao
2. Descricao do pagamento
3. Data e observacoes administrativas

**Skeleton:**

```txt
Declaro o recebimento de ___ referente a ___, realizado em ___.
```

**Rodape etico:** Documento administrativo. Nao descreve condicao clinica, sintomas ou diagnostico.

---

### 3.5 `universal_service_agreement`

**Titulo:** Contrato / termo de prestacao de servico
**Status:** active
**Profissoes:** todas
**documentKind:** formal_document
**riskLevel:** medium

**Essenciais:** `subject_name`, `purpose`, `authorization_scope`, `recommendations`
**Opcionais:** `document_date`, `next_steps`

**Secoes:**

1. Identificacao das partes
2. Objeto do servico
3. Combinados de atendimento
4. Responsabilidades
5. Cancelamento e comunicacao

**Skeleton:**

```txt
Este termo registra a prestacao de servico de ___, com objetivo de ___, conforme combinados entre as partes.
```

**Rodape etico:** Modelo administrativo simplificado. Nao substitui orientacao juridica quando necessaria.

---

### 3.6 `universal_simple_authorization`

**Titulo:** Autorizacao simples
**Status:** active
**Profissoes:** todas
**documentKind:** formal_document
**riskLevel:** low

**Essenciais:** `subject_name`, `authorization_scope`, `document_date`
**Opcionais:** `purpose`, `next_steps`

**Secoes:**

1. Identificacao
2. Objeto da autorizacao
3. Validade / periodo
4. Assinatura

**Skeleton:**

```txt
Autorizo ___ a realizar ___ no periodo de ___, para a finalidade de ___.
```

**Rodape etico:** Autorizacao administrativa. Nao inclui dados sensiveis alem do necessario.

---

### 3.7 `universal_simplified_tcle`

**Titulo:** TCLE simplificado
**Status:** active
**Profissoes:** todas
**documentKind:** formal_document
**riskLevel:** medium

**Essenciais:** `subject_name`, `purpose`, `authorization_scope`, `recommendations`
**Opcionais:** `document_date`, `next_steps`

**Secoes:**

1. Objetivo
2. Procedimentos
3. Sigilo e limites
4. Consentimento
5. Assinatura

**Skeleton:**

```txt
Declaro que fui informado(a) sobre ___, seus objetivos e limites, e autorizo ___.
```

**Rodape etico:** Termo simplificado. Deve ser adaptado pela profissional conforme servico, publico e exigencias aplicaveis.

---

## 4. Psicopedagogia / Neuropsicopedagogia

Regra de linguagem: educacional, funcional e descritiva. Nao usar CID, DSM, laudo, diagnostico ou conclusao clinica.

### 4.1 `psychoped_initial_anamnesis`

**Titulo:** Anamnese psicopedagogica inicial
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `subject_age`, `demand_context`, `family_guidance`
**Opcionais:** `school_guidance`, `observations`, `strengths`, `attention_points`, `next_steps`
**Secoes:** Identificacao; motivo da procura; historico escolar; rotina; desenvolvimento; expectativas da familia; proximos passos.
**Skeleton:** `A familia relata que ___ procura apoio devido a ___. Na rotina escolar, observa-se ___.`
**Rodape etico:** Registro inicial psicopedagogico. Nao constitui avaliacao diagnostica ou laudo.

### 4.2 `psychoped_family_interview`

**Titulo:** Entrevista com familia
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `demand_context`, `observations`, `family_guidance`
**Opcionais:** `strengths`, `attention_points`, `recommendations`, `next_steps`
**Secoes:** Contexto familiar; rotina; historico escolar; percepcao da familia; potencialidades; combinados.
**Skeleton:** `Na entrevista com a familia, foram levantadas informacoes sobre ___, rotina de ___ e demandas percebidas em ___.`
**Rodape etico:** Registro de entrevista, sem conclusao diagnostica.

### 4.3 `psychoped_learner_interview`

**Titulo:** Entrevista com aprendente
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `subject_age`, `observations`, `strengths`
**Opcionais:** `attention_points`, `recommendations`, `next_steps`
**Secoes:** Apresentacao; percepcao sobre escola; interesses; dificuldades percebidas; recursos; proximos passos.
**Skeleton:** `Durante a entrevista, ___ relatou perceber facilidade em ___ e necessidade de apoio em ___.`
**Rodape etico:** Registro da escuta do aprendente, sem rotulos clinicos.

### 4.4 `psychoped_teacher_interview`

**Titulo:** Entrevista com professor/escola
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `demand_context`, `school_guidance`, `observations`
**Opcionais:** `strengths`, `attention_points`, `recommendations`, `next_steps`
**Secoes:** Contexto escolar; desempenho observado; participacao; estrategias ja usadas; demandas da escola; combinados.
**Skeleton:** `A escola informa que ___ apresenta ___ em contexto de sala, com melhores respostas quando ___.`
**Rodape etico:** Registro escolar descritivo, sem diagnostico.

### 4.5 `psychoped_school_observation_form`

**Titulo:** Observacao escolar
**documentKind:** record
**riskLevel:** low
**Essenciais:** `subject_name`, `document_date`, `observations`, `attention_points`
**Opcionais:** `strengths`, `school_guidance`, `recommendations`, `next_steps`
**Secoes:** Contexto observado; participacao; interacao; organizacao; leitura/escrita/calculo quando pertinente; orientacoes.
**Skeleton:** `Na observacao escolar realizada em ___, observou-se ___ durante ___.`
**Rodape etico:** Observacao situada. Nao substitui avaliacao ampla.

### 4.6 `psychoped_play_observation`

**Titulo:** Observacao ludica
**documentKind:** record
**riskLevel:** low
**Essenciais:** `subject_name`, `document_date`, `observations`, `strengths`
**Opcionais:** `attention_points`, `recommendations`, `next_steps`
**Secoes:** Atividade proposta; engajamento; interacao; estrategias usadas; potencialidades; pontos de apoio.
**Skeleton:** `Na atividade ludica ___, observou-se que ___ respondeu melhor quando ___.`
**Rodape etico:** Observacao ludica descritiva. Nao e prova projetiva nem avaliacao diagnostica.

### 4.7 `psychoped_session_record`

**Titulo:** Registro de sessao psicopedagogica
**documentKind:** record
**riskLevel:** low
**Essenciais:** `subject_name`, `document_date`, `purpose`, `observations`
**Opcionais:** `strengths`, `attention_points`, `recommendations`, `next_steps`
**Secoes:** Objetivo da sessao; atividades; respostas observadas; estrategias; combinados.
**Skeleton:** `Na sessao de ___, foi trabalhado ___, com observacoes sobre ___.`
**Rodape etico:** Registro de acompanhamento, sem conclusao diagnostica.

### 4.8 `psychoped_family_feedback`

**Titulo:** Devolutiva psicopedagogica para familia
**documentKind:** family_orientation
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `observations`, `recommendations`
**Opcionais:** `strengths`, `attention_points`, `family_guidance`, `next_steps`
**Secoes:** Objetivo; observacoes principais; potencialidades; pontos de apoio; orientacoes para casa; proximos passos.
**Skeleton:** `Este documento resume observacoes realizadas em ___ e apresenta orientacoes para a familia apoiar ___.`
**Rodape etico:** Devolutiva orientativa. Nao constitui diagnostico clinico.

### 4.9 `psychoped_school_feedback`

**Titulo:** Devolutiva psicopedagogica para escola
**documentKind:** school_orientation
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `observations`, `school_guidance`
**Opcionais:** `strengths`, `attention_points`, `recommendations`, `next_steps`
**Secoes:** Objetivo; observacoes educacionais; necessidades de apoio; orientacoes para escola; acompanhamento.
**Skeleton:** `Para o contexto escolar, recomenda-se observar ___ e favorecer ___ por meio de ___.`
**Rodape etico:** Documento educacional orientativo, sem diagnostico.

### 4.10 `psychoped_followup_report`

**Titulo:** Relatorio de acompanhamento psicopedagogico
**documentKind:** school_orientation
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `demand_context`, `observations`, `recommendations`
**Opcionais:** `procedures`, `strengths`, `attention_points`, `next_steps`
**Secoes:** Identificacao; demanda; acompanhamento realizado; observacoes; orientacoes; conclusao descritiva.
**Skeleton:** `Durante o acompanhamento, entre ___ e ___, observou-se ___. Como recomendacoes, indica-se ___.`
**Rodape etico:** Relatorio descritivo psicopedagogico. Nao configura laudo ou diagnostico.

### 4.11 `psychoped_school_observation_report`

**Titulo:** Relatorio de observacao escolar
**documentKind:** school_orientation
**riskLevel:** medium
**Essenciais:** `subject_name`, `document_date`, `observations`, `school_guidance`
**Opcionais:** `demand_context`, `strengths`, `attention_points`, `recommendations`
**Secoes:** Motivo; contexto observado; participacao; aprendizagem; interacoes; orientacoes.
**Skeleton:** `A observacao escolar teve como objetivo ___. No contexto observado, ___ apresentou ___.`
**Rodape etico:** Relatorio de observacao situada, sem conclusao diagnostica.

### 4.12 `psychoped_aee_support_report`

**Titulo:** Relatorio individual para AEE / apoio escolar
**documentKind:** formal_document
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `observations`, `school_guidance`, `recommendations`
**Opcionais:** `demand_context`, `strengths`, `attention_points`, `next_steps`
**Secoes:** Identificacao; objetivo; necessidades educacionais observadas; recursos; orientacoes; acompanhamento.
**Skeleton:** `Este relatorio organiza informacoes para apoio escolar/AEE, considerando ___ e recomendando ___.`
**Rodape etico:** Documento de apoio educacional. Nao substitui avaliacao clinica, laudo ou diagnostico.

### 4.13 `psychoped_simplified_pei`

**Titulo:** Plano de apoio escolar / PEI simplificado
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `purpose`, `strengths`, `recommendations`, `next_steps`
**Opcionais:** `attention_points`, `school_guidance`, `family_guidance`
**Secoes:** Objetivo geral; metas; estrategias; recursos; responsaveis; reavaliacao.
**Skeleton:** `Objetivo geral: ___. Meta: ___. Estrategia: ___. Reavaliacao em ___.`
**Rodape etico:** Plano de apoio educacional, ajustavel conforme contexto escolar.

### 4.14 `psychoped_orientative_referral`

**Titulo:** Encaminhamento profissional/orientativo
**documentKind:** referral
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `demand_context`, `recommendations`
**Opcionais:** `observations`, `attention_points`, `next_steps`
**Secoes:** Identificacao; motivo; observacoes educacionais; encaminhamento; orientacoes.
**Skeleton:** `Encaminho ___ para avaliacao/atendimento em ___, tendo em vista ___.`
**Rodape etico:** Encaminhamento orientativo, sem fechamento diagnostico.

---

## 5. Psicologia / Neuropsicologia

Regra de linguagem: tecnica, descritiva e cuidadosa. Relatorio psicologico estruturado deve respeitar a estrutura exigida pela CFP 06/2019. Nao gerar diagnostico automatico.

### 5.1 `psych_adult_anamnesis`

**Titulo:** Anamnese psicologica adulto
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `subject_age`, `demand_context`, `purpose`
**Opcionais:** `observations`, `procedures`, `strengths`, `attention_points`, `next_steps`
**Secoes:** Identificacao; demanda; historico; rotina; rede de apoio; objetivos; combinados.
**Skeleton:** `A pessoa buscou atendimento em razao de ___, relatando historico de ___ e objetivo de ___.`
**Rodape etico:** Registro de anamnese. Nao constitui relatorio, laudo ou diagnostico.

### 5.2 `psych_child_adolescent_anamnesis`

**Titulo:** Anamnese psicologica infantil/adolescente
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `subject_age`, `demand_context`, `family_guidance`
**Opcionais:** `school_guidance`, `observations`, `strengths`, `attention_points`, `next_steps`
**Secoes:** Identificacao; responsaveis; demanda; desenvolvimento; escola; rotina; combinados.
**Skeleton:** `Os responsaveis relatam que ___ buscou atendimento devido a ___.`
**Rodape etico:** Registro inicial para organizacao do atendimento, sem conclusao diagnostica.

### 5.3 `psych_session_evolution_record`

**Titulo:** Registro de atendimento e evolucao
**documentKind:** record
**riskLevel:** low
**Essenciais:** `subject_name`, `document_date`, `purpose`, `observations`
**Opcionais:** `attention_points`, `recommendations`, `next_steps`
**Secoes:** Objetivo do atendimento; temas trabalhados; observacoes; intervencoes; combinados.
**Skeleton:** `No atendimento de ___, foram trabalhados aspectos relacionados a ___, com combinados de ___.`
**Rodape etico:** Registro profissional interno/descritivo, conforme responsabilidade da profissional.

### 5.4 `psych_initial_therapeutic_plan`

**Titulo:** Planejamento terapeutico inicial
**documentKind:** structured_form
**riskLevel:** low
**Essenciais:** `subject_name`, `demand_context`, `purpose`, `recommendations`
**Opcionais:** `strengths`, `attention_points`, `next_steps`
**Secoes:** Demanda; objetivos iniciais; focos de trabalho; frequencia; criterios de revisao; combinados.
**Skeleton:** `O planejamento inicial tem como foco ___, com objetivos de ___ e revisao prevista para ___.`
**Rodape etico:** Plano inicial flexivel, sujeito a revisao conforme evolucao do acompanhamento.

### 5.5 `psych_descriptive_followup_summary`

**Titulo:** Sintese descritiva de acompanhamento psicologico
**documentKind:** formal_document
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `demand_context`, `observations`, `recommendations`
**Opcionais:** `procedures`, `strengths`, `attention_points`, `next_steps`
**Secoes:** Finalidade; contexto; acompanhamento; observacoes; orientacoes; fechamento descritivo.
**Skeleton:** `Durante o acompanhamento, observou-se ___. As orientacoes propostas foram ___.`
**Rodape etico:** Sintese descritiva. Nao constitui laudo, diagnostico ou documento pericial.

### 5.6 `psych_structured_report_cfp`

**Titulo:** Relatorio psicologico estruturado
**documentKind:** psychological_report
**riskLevel:** restricted
**Essenciais:** `subject_name`, `purpose`, `demand_context`, `procedures`, `observations`
**Opcionais:** `recommendations`, `next_steps`
**Secoes obrigatorias:** Identificacao; descricao da demanda; procedimento; analise; conclusao.
**Skeleton:** nao oferecer skeleton. Apenas estrutura em branco.
**Rodape etico:** Documento psicologico de responsabilidade exclusiva da profissional signataria, devendo observar a normativa vigente do CFP. O sistema nao gera diagnostico, laudo ou conclusao automatica.

### 5.7 `psych_written_orientation`

**Titulo:** Orientacao psicologica por escrito
**documentKind:** formal_document
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `observations`, `recommendations`
**Opcionais:** `demand_context`, `family_guidance`, `next_steps`
**Secoes:** Finalidade; contexto; orientacoes; limites; proximos passos.
**Skeleton:** `Com base no acompanhamento realizado, seguem orientacoes gerais sobre ___, considerando ___.`
**Rodape etico:** Orientacao escrita, sem carater pericial ou diagnostico.

### 5.8 `psych_referral`

**Titulo:** Encaminhamento psicologico
**documentKind:** referral
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `demand_context`, `recommendations`
**Opcionais:** `observations`, `next_steps`
**Secoes:** Identificacao; motivo; observacoes; encaminhamento; orientacoes.
**Skeleton:** `Encaminho ___ para avaliacao/atendimento em ___, considerando ___.`
**Rodape etico:** Encaminhamento profissional, sem fechamento diagnostico automatico.

### 5.9 `psych_accessible_clinical_feedback`

**Titulo:** Devolutiva clinica em linguagem acessivel
**documentKind:** family_orientation
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `observations`, `recommendations`
**Opcionais:** `strengths`, `attention_points`, `family_guidance`, `next_steps`
**Secoes:** Objetivo; observacoes em linguagem acessivel; recursos; pontos de apoio; orientacoes.
**Skeleton:** `Este documento resume, em linguagem acessivel, observacoes do acompanhamento de ___ e orientacoes para ___.`
**Rodape etico:** Devolutiva orientativa. Nao substitui documento psicologico formal quando exigido.

### 5.10 `psych_family_guidance`

**Titulo:** Orientacao a familia/responsaveis
**documentKind:** family_orientation
**riskLevel:** low
**Essenciais:** `subject_name`, `purpose`, `family_guidance`, `recommendations`
**Opcionais:** `observations`, `attention_points`, `next_steps`
**Secoes:** Contexto; orientacoes principais; manejo cotidiano; sinais para procurar apoio; proximos passos.
**Skeleton:** `Para apoiar ___ no cotidiano, recomenda-se ___.`
**Rodape etico:** Orientacao familiar geral, sem diagnostico ou prescricoes automaticas.

### 5.11 `psych_therapeutic_contract`

**Titulo:** Contrato terapeutico
**documentKind:** formal_document
**riskLevel:** low
**Essenciais:** `subject_name`, `purpose`, `authorization_scope`, `recommendations`
**Opcionais:** `document_date`, `next_steps`
**Secoes:** Identificacao; objeto; frequencia; sigilo; faltas; honorarios; aceite.
**Skeleton:** `Este contrato estabelece os combinados para atendimento psicologico de ___, conforme ___.`
**Rodape etico:** Modelo administrativo simplificado. Deve ser adaptado pela profissional.

### 5.12 `psych_minor_care_authorization`

**Titulo:** Autorizacao para atendimento de menor
**documentKind:** formal_document
**riskLevel:** low
**Essenciais:** `subject_name`, `authorization_scope`, `document_date`
**Opcionais:** `purpose`, `next_steps`
**Secoes:** Identificacao do menor; responsavel; autorizacao; periodo; assinatura.
**Skeleton:** `Autorizo o atendimento de ___ por ___, no periodo de ___.`
**Rodape etico:** Autorizacao administrativa para atendimento, sem conteudo clinico.

### 5.13 `psych_online_care_protocol`

**Titulo:** Protocolo de atendimento online
**documentKind:** formal_document
**riskLevel:** low
**Essenciais:** `subject_name`, `purpose`, `authorization_scope`, `recommendations`
**Opcionais:** `next_steps`
**Secoes:** Canal de atendimento; privacidade; condicoes tecnicas; urgencia/emergencia; combinados.
**Skeleton:** `O atendimento online ocorrera por ___, observando privacidade, combinados e limites de ___.`
**Rodape etico:** Protocolo operacional. Deve respeitar as normas aplicaveis ao atendimento online.

### 5.14 `psych_attendance_statement`

**Titulo:** Declaracao de comparecimento
**documentKind:** formal_document
**riskLevel:** low
**Essenciais:** `subject_name`, `document_date`, `start_time`, `end_time`
**Opcionais:** `purpose`
**Secoes:** Declaracao; finalidade administrativa.
**Skeleton:** `Declaro que ___ compareceu a atendimento psicologico no dia ___, das ___ as ___.`
**Rodape etico:** Declaracao sem conteudo clinico.

### 5.15 `psych_simplified_tcle`

**Titulo:** TCLE simplificado
**documentKind:** formal_document
**riskLevel:** medium
**Essenciais:** `subject_name`, `purpose`, `authorization_scope`, `recommendations`
**Opcionais:** `document_date`, `next_steps`
**Secoes:** Objetivo; procedimentos; sigilo; limites; consentimento.
**Skeleton:** `Declaro estar ciente dos objetivos e limites do acompanhamento de ___ e autorizo ___.`
**Rodape etico:** Termo simplificado, adaptavel conforme contexto e responsabilidade profissional.

---

## 6. Expansoes draft

Estas linhas aparecem como separadas no produto, mas podem ficar em preparacao ate haver revisao profissional suficiente.

### 6.1 `fono_report`

**Titulo:** Relatorio fonoaudiologico
**Status:** draft
**documentKind:** formal_document
**riskLevel:** medium
**Campos-base:** `subject_name`, `subject_age`, `purpose`, `procedures`, `observations`, `recommendations`
**Nota:** CID/CIF somente se digitado pela profissional e com lembrete de anuencia escrita.

### 6.2 `fono_home_school_guidance`

**Titulo:** Orientacoes fonoaudiologicas para casa e escola
**Status:** draft
**documentKind:** family_orientation
**riskLevel:** low
**Campos-base:** `subject_name`, `purpose`, `observations`, `family_guidance`, `school_guidance`

### 6.3 `fono_screening`

**Titulo:** Triagem fonoaudiologica
**Status:** draft
**documentKind:** structured_form
**riskLevel:** medium
**Campos-base:** `subject_name`, `subject_age`, `demand_context`, `observations`, `recommendations`

### 6.4 `ot_report`

**Titulo:** Relatorio de Terapia Ocupacional
**Status:** draft
**documentKind:** formal_document
**riskLevel:** medium
**Campos-base:** `subject_name`, `purpose`, `demand_context`, `observations`, `recommendations`

### 6.5 `ot_avd_routine_guidance`

**Titulo:** Orientacoes para casa, rotina e AVD
**Status:** draft
**documentKind:** family_orientation
**riskLevel:** low
**Campos-base:** `subject_name`, `purpose`, `observations`, `family_guidance`, `next_steps`

### 6.6 `ot_therapeutic_plan`

**Titulo:** Plano terapeutico de Terapia Ocupacional
**Status:** draft
**documentKind:** structured_form
**riskLevel:** medium
**Campos-base:** `subject_name`, `demand_context`, `purpose`, `recommendations`, `next_steps`

### 6.7 `pediatric_parent_guidance`

**Titulo:** Orientacoes aos pais
**Status:** draft
**documentKind:** family_orientation
**riskLevel:** medium
**Campos-base:** `subject_name`, `subject_age`, `purpose`, `family_guidance`, `next_steps`
**Nota:** sem dose, medicacao, CID ou conduta automatica.

### 6.8 `pediatric_referral`

**Titulo:** Encaminhamento pediatrico
**Status:** draft
**documentKind:** referral
**riskLevel:** medium
**Campos-base:** `subject_name`, `subject_age`, `purpose`, `demand_context`, `recommendations`
**Nota:** sem diagnostico automatico.

---

## 7. Regras de conversao para Template[]

Cada ficha deve virar um objeto `Template` com:

- `id`
- `title`
- `status`
- `professionCategories`
- `documentKind`
- `riskLevel`
- `essentialFields`
- `optionalFields`
- `sections`
- `searchTerms`
- `ethicalFooter`
- `skeleton`

Campos `hint` devem ficar no schema do campo, nao no texto final.

---

## 8. Testes minimos esperados

1. IDs sem duplicacao.
2. Todos os universais aparecem para todas as profissoes.
3. Psicologia mostra universais + Psicologia.
4. Psicopedagogia mostra universais + Psicopedagogia.
5. Neuropsicopedagogia mostra universais + Neuropsicopedagogia.
6. Fono/TO/Pediatria mostram universais + placeholder da profissao se drafts nao estiverem ativos.
7. Hint nao aparece em copiar/imprimir.
8. Skeleton nao aparece em documento restrito.
9. Trava anti-diagnostico roda em texto digitado e skeleton.
10. Declaracao nao aceita texto clinico sem aviso.
