# PsicoPlanilhas Doc Studio — Spec Híbrida Final v1

> Spec-mãe consolidada para implementação.  
> Junta o catálogo unificado, a revisão dos 30 modelos atuais e a especificação detalhada de campos, sem duplicar decisões.

---

## 1. Objetivo

O **PsicoPlanilhas Doc Studio** é um produto v1 sem IA para criar documentos profissionais guiados, copiar texto e imprimir/PDF com aparência premium.

**Preço planejado:** R$49 vitalício.  
**Público principal:** profissionais de saúde, educação e desenvolvimento, com atenção especial a usuárias 50+.  
**Tom de uso:** claro, calmo, seguro, com poucos campos visíveis por padrão.

---

## 2. Arquivos de Implementação

Esta spec trabalha com 3 arquivos:

| Arquivo | Função |
|---|---|
| `psico-doc-studio-spec-hibrida-final.md` | Decisões finais de produto, UX, segurança e migração. |
| `psico-doc-studio-template-schema.ts` | Tipos TypeScript reais para templates, campos, seções, risco e status. |
| `psico-doc-studio-templates-v1.ts` | Array `Template[]` com IDs padronizados e modelos v1. |

---

## 3. Regra Central

O sistema **organiza documentos**. Ele **não conclui clinicamente** pela profissional.

| Regra | Aplicação |
|---|---|
| Sem diagnóstico automático | Não gerar CID, DSM, laudo conclusivo, hipótese ou conclusão clínica. |
| Declaração simples | Apenas presença, data, horário e finalidade administrativa. |
| Relatório descritivo | Pode descrever contexto, observações, evolução e recomendações. |
| Documentos restritos | Parecer, laudo, atestado e receituário só como estrutura em branco/restrita. |
| Psicopedagogia/Neuropsicopedagogia | Linguagem educacional; sem CID, laudo ou diagnóstico clínico. |
| Fonoaudiologia | CID/CIF apenas se digitado pela profissional e com lembrete de anuência. |
| Medicina/Pediatria | Sem sugestão automática de medicação, dose, CID ou conduta. |

---

## 4. UX Obrigatória

### 4.1 Campos essenciais x opcionais

Todo template deve separar os campos em:

| Grupo | Regra |
|---|---|
| Essenciais | 3 a 5 campos visíveis por padrão. |
| Opcionais | Ficam atrás do botão **Adicionar mais detalhes**. |

Isso evita a parede de campos para usuárias 50+.

### 4.2 Fluxo interno do documento

1. Dados básicos
2. Contexto
3. Observações
4. Recomendações
5. Preview
6. Copiar / Imprimir

### 4.3 Botões

| Ação | Texto |
|---|---|
| Criar documento | Usar modelo |
| Salvar local | Salvar rascunho |
| Copiar | Copiar texto |
| Impressão | Imprimir / PDF |
| Limpar | Limpar campos |
| Mais campos | Adicionar mais detalhes |

---

## 5. Selos de Risco

Não usar vermelho. O selo informa, não assusta.

| riskLevel | Selo | Tooltip |
|---|---|---|
| `low` | Uso livre | Documento simples e seguro para o dia a dia. |
| `medium` | Requer cuidado | Descreve e orienta. Não emite diagnóstico; escreva com base no seu atendimento. |
| `restricted` | Requer avaliação | Depende de avaliação formal. O sistema oferece só a estrutura; o conteúdo é de sua responsabilidade. |

---

## 6. Trava Anti-Diagnóstico

### 6.1 Termos-gatilho

Checar em texto digitado pela usuária, com busca case-insensitive:

```txt
CID
CID-10
CID-11
CIF
DSM
DSM-5
DSM-V
diagnóstico de
diagnostico de
conclui-se o diagnóstico
laudo conclui
fecha diagnóstico
```

### 6.2 Comportamento

| documentKind | Comportamento |
|---|---|
| `psychological_report`, `family_orientation`, `school_orientation`, `record` | Exibir banner não-modal acima do preview. Não bloquear. |
| `formal_document` de declaração | Mostrar confirmação antes de salvar/copiar se houver termo clínico. |
| `referral` | Sem bloqueio. Pode haver hipótese ou motivo de encaminhamento digitado pela profissional. |
| `structured_form` | Sem aviso por padrão, pois pode ser registro interno. |

### 6.3 Texto do banner

```txt
Este modelo é descritivo e não emite diagnóstico. Se precisar registrar um código ou hipótese, faça isso com responsabilidade técnica, no documento adequado.
```

### 6.4 Regra extra para Fonoaudiologia

Se houver `CID` ou `CIF` em template de Fonoaudiologia:

```txt
Ao usar CID/CIF, inclua a anuência escrita do cliente no próprio documento, conforme norma profissional aplicável.
```

---

## 7. Catálogo V1 Canonical

### 7.1 Universais

| ID | Título | Status |
|---|---|---|
| `universal_blank_document` | Documento em branco | Ativo |
| `universal_attendance_statement` | Declaração de comparecimento | Ativo |
| `universal_referral` | Encaminhamento profissional | Ativo |
| `universal_payment_receipt` | Recibo / declaração de pagamento | Ativo |
| `universal_service_agreement` | Contrato / termo de prestação de serviço | Ativo |
| `universal_simple_authorization` | Autorização simples | Ativo |
| `universal_simplified_tcle` | TCLE simplificado | Ativo |

### 7.2 Psicopedagogia / Neuropsicopedagogia

| ID | Título | Status |
|---|---|---|
| `psychoped_initial_anamnesis` | Anamnese psicopedagógica inicial | Ativo |
| `psychoped_family_interview` | Entrevista com família | Ativo |
| `psychoped_learner_interview` | Entrevista com aprendente | Ativo |
| `psychoped_teacher_interview` | Entrevista com professor/escola | Ativo |
| `psychoped_school_observation_form` | Observação escolar | Ativo |
| `psychoped_play_observation` | Observação lúdica | Ativo |
| `psychoped_session_record` | Registro de sessão psicopedagógica | Ativo |
| `psychoped_family_feedback` | Devolutiva psicopedagógica para família | Ativo |
| `psychoped_school_feedback` | Devolutiva psicopedagógica para escola | Ativo |
| `psychoped_followup_report` | Relatório de acompanhamento psicopedagógico | Ativo |
| `psychoped_school_observation_report` | Relatório de observação escolar | Ativo |
| `psychoped_aee_support_report` | Relatório individual para AEE / apoio escolar | Ativo |
| `psychoped_simplified_pei` | Plano de apoio escolar / PEI simplificado | Ativo |
| `psychoped_orientative_referral` | Encaminhamento profissional/orientativo | Ativo, usa base universal |

### 7.3 Psicologia / Neuropsicologia

| ID | Título | Status |
|---|---|---|
| `psych_adult_anamnesis` | Anamnese psicológica adulto | Ativo |
| `psych_child_adolescent_anamnesis` | Anamnese psicológica infantil/adolescente | Ativo |
| `psych_session_evolution_record` | Registro de atendimento e evolução | Ativo |
| `psych_initial_therapeutic_plan` | Planejamento terapêutico inicial | Ativo |
| `psych_descriptive_followup_summary` | Síntese descritiva de acompanhamento psicológico | Ativo |
| `psych_structured_report_cfp` | Relatório psicológico estruturado | Ativo |
| `psych_written_orientation` | Orientação psicológica por escrito | Ativo, substitui o parecer comum |
| `psych_referral` | Encaminhamento psicológico | Ativo, usa base universal |
| `psych_accessible_clinical_feedback` | Devolutiva clínica em linguagem acessível | Ativo |
| `psych_family_guidance` | Orientação à família/responsáveis | Ativo |
| `psych_therapeutic_contract` | Contrato terapêutico | Ativo, usa base universal |
| `psych_minor_care_authorization` | Autorização para atendimento de menor | Ativo |
| `psych_online_care_protocol` | Protocolo de atendimento online | Ativo |
| `psych_attendance_statement` | Declaração de comparecimento | Ativo, usa base universal |
| `psych_simplified_tcle` | TCLE simplificado | Ativo, usa base universal |

### 7.4 Expansões

| ID | Título | Status |
|---|---|---|
| `fono_report` | Relatório fonoaudiológico | Draft/ativo quando Fono entrar |
| `fono_home_school_guidance` | Orientações fonoaudiológicas para casa e escola | Draft/ativo quando Fono entrar |
| `fono_screening` | Triagem fonoaudiológica | Draft/ativo quando Fono entrar |
| `ot_report` | Relatório de Terapia Ocupacional | Draft/ativo quando TO entrar |
| `ot_avd_routine_guidance` | Orientações para casa, rotina e AVD | Draft/ativo quando TO entrar |
| `ot_therapeutic_plan` | Plano terapêutico de Terapia Ocupacional | Draft/ativo quando TO entrar |
| `pediatric_parent_guidance` | Orientações aos pais | Draft/ativo quando Pediatria entrar |
| `pediatric_referral` | Encaminhamento pediátrico | Draft/ativo quando Pediatria entrar |

---

## 8. Migração dos 30 Atuais + 1 Oculto

| Modelo atual | Decisão |
|---|---|
| Anamnese psicopedagógica inicial | Mapear para `psychoped_initial_anamnesis`. |
| Entrevista com família | Mapear para `psychoped_family_interview`. |
| Entrevista com aprendente | Mapear para `psychoped_learner_interview`. |
| Entrevista com professor/escola | Mapear para `psychoped_teacher_interview`. |
| Observação escolar | Mapear para `psychoped_school_observation_form`. |
| Observação lúdica | Mapear para `psychoped_play_observation`. |
| Registro de sessão psicopedagógica | Mapear para `psychoped_session_record`. |
| Devolutiva psicopedagógica para família | Mapear para `psychoped_family_feedback`. |
| Devolutiva para escola | Renomear para `psychoped_school_feedback`. |
| Relatório de acompanhamento psicopedagógico | Mapear para `psychoped_followup_report`. |
| Relatório de observação escolar | Mapear para `psychoped_school_observation_report`. |
| Relatório individual AEE | Renomear para `psychoped_aee_support_report`. |
| Plano de apoio escolar / PEI simplificado | Mapear para `psychoped_simplified_pei`. |
| Encaminhamento orientativo | Mapear para `psychoped_orientative_referral` ou universal `universal_referral`. |
| Autorização / contrato / declaração simples | Dividir em autorização, contrato e declaração universal. |
| Anamnese psicológica adulto | Mapear para `psych_adult_anamnesis`. |
| Anamnese psicológica infantil/adolescente | Mapear para `psych_child_adolescent_anamnesis`. |
| Registro de atendimento e evolução | Mapear para `psych_session_evolution_record`. |
| Planejamento terapêutico inicial | Mapear para `psych_initial_therapeutic_plan`. |
| Síntese psicológica descritiva | Renomear para `psych_descriptive_followup_summary`. |
| Relatório psicológico estruturado CFP | Mapear para `psych_structured_report_cfp`. |
| Parecer psicológico orientativo | Não manter como parecer ativo. Substituir por `psych_written_orientation` ou ocultar. |
| Encaminhamento psicológico | Mapear para `psych_referral`. |
| Devolutiva clínica em linguagem acessível | Mapear para `psych_accessible_clinical_feedback`. |
| Orientação à família/responsáveis | Mapear para `psych_family_guidance`. |
| Contrato terapêutico | Mapear para `psych_therapeutic_contract`. |
| Autorização para atendimento de menor | Mapear para `psych_minor_care_authorization`. |
| Protocolo de atendimento online | Mapear para `psych_online_care_protocol`. |
| Declaração de comparecimento / recibo | Dividir em `psych_attendance_statement` e `universal_payment_receipt`. |
| TCLE simplificado | Mapear para `psych_simplified_tcle`. |
| `psychological-followup-summary` oculto | Manter oculto apenas se houver compatibilidade legada; caso contrário remover. |

---

## 9. Ordem Recomendada

### Lote 1 — Fundação

1. Implementar `psico-doc-studio-template-schema.ts`.
2. Implementar `psico-doc-studio-templates-v1.ts`.
3. Renderizar catálogo por `Template[]`.
4. Implementar campos essenciais/opcionais.
5. Implementar rodapé ético e cabeçalho profissional.
6. Implementar selos de risco.
7. Implementar trava anti-diagnóstico.

### Lote 2 — Migração dos atuais

1. Migrar IDs antigos para IDs novos.
2. Separar modelos misturados.
3. Ocultar/remover parecer psicológico comum.
4. Testar rascunho local.

### Lote 3 — Preview premium

1. Preview limpo.
2. Impressão/PDF.
3. Copiar texto.
4. Rascunho local.

---

## 10. Critério de Pronto

O produto está pronto para v1 quando:

- todos os templates ativos renderizam sem campos quebrados;
- cada template tem 3 a 5 campos essenciais;
- campos opcionais ficam recolhidos;
- preview impresso não parece formulário cru;
- declaração não permite conteúdo clínico sem aviso;
- parecer/laudo/atestado/receituário não aparecem como modelos comuns;
- `Template[]` não contém IDs duplicados;
- busca encontra por título, profissão e termos leigos.

