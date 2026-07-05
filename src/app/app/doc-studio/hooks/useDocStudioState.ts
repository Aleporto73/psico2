'use client';

// Doc Studio — hook de orquestração: concentra estado, efeitos e ações da tela,
// para que page.tsx seja apenas montagem. Lógica pura vive em ../lib e ../templates.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type {
  CopyState,
  Density,
  DocStudioDraft,
  DraftFieldKey,
  DraftFields,
  DraftStatus,
  FontStyle,
  LineKey,
  ProfessionCategory,
  ReportProfile,
  TemplateKey,
} from '../types';
import {
  catalogForCategory,
  categoryFromProfile,
  colorOptions,
  getDefaultFieldsForTemplate,
  getFirstTemplateForLine,
  getProfessionCategoryOption,
  initialDraft,
  professionCategoryOptions,
  templates,
} from '../templates';
import { getTemplatesForCategory, getTemplatesForLine } from '../template-catalog';
import { buildHeader, getHeaderMissingItems, getProfessionalSignature } from '../lib/profile';
import { composePlainText } from '../lib/copy';
import { clearDraft, loadDraft, saveDraft } from '../lib/storage';

function nowIso(): string {
  return new Date().toISOString();
}

export function useDocStudioState() {
  const [profile, setProfile] = useState<ReportProfile | null>(null);
  const [line, setLine] = useState<LineKey>('psychopedagogy');
  // Categoria = eixo de UI (profession_category). Inicia em 'psicopedagogo' para casar
  // com a linha default ('psychopedagogy') antes do perfil carregar; o perfil corrige.
  const [category, setCategory] = useState<ProfessionCategory>('psicopedagogo');
  const [templateKey, setTemplateKey] = useState<TemplateKey>('family-feedback');
  const [fields, setFields] = useState<DraftFields>(initialDraft);
  const [primaryColor, setPrimaryColor] = useState(colorOptions[0].value);
  const [fontStyle, setFontStyle] = useState<FontStyle>('editorial');
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [density, setDensity] = useState<Density>('comfortable');
  const [showHeader, setShowHeader] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const restoredDraftRef = useRef(false);
  const skipNextDraftSaveRef = useRef(false);

  // 1) Hidratação do rascunho local (uma vez).
  useEffect(() => {
    const storedDraft = loadDraft(nowIso());
    restoredDraftRef.current = Boolean(storedDraft);

    const restoreTimer = window.setTimeout(() => {
      if (storedDraft) {
        setLine(storedDraft.line);
        setTemplateKey(storedDraft.templateKey);
        setFields(storedDraft.fields);
        setPrimaryColor(storedDraft.primaryColor);
        setFontStyle(storedDraft.fontStyle);
        setBlackAndWhite(storedDraft.blackAndWhite);
        setDensity(storedDraft.density);
        setShowHeader(storedDraft.showHeader);
        setShowSignature(storedDraft.showSignature);
        setDraftStatus('restored');
      } else {
        setDraftStatus('saved');
      }
      setHasHydratedDraft(true);
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
    };
  }, []);

  // 2) Carrega o perfil profissional (leitura somente).
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        if (isMounted) setLoadingProfile(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('profile_type, display_name, gender, profession_category, credential_type, credential_number')
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      setProfile((data as ReportProfile | null) ?? null);
      // Categoria reflete sempre a profissão do usuário (mesmo com rascunho restaurado).
      const nextCategory = categoryFromProfile(data as ReportProfile | null);
      setCategory(nextCategory);
      if (!restoredDraftRef.current) {
        const catalog = catalogForCategory(nextCategory);
        if (catalog) {
          const preferredTemplate = getFirstTemplateForLine(catalog);
          setLine(catalog);
          setTemplateKey(preferredTemplate.id);
        }
        // Categoria sem catálogo (fono/TO/médico/pediatra/outro): mantém line/template
        // default; o catálogo exibe o estado "em preparação". Sem fallback silencioso.
      }
      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const templatesForActiveLine = useMemo(() => getTemplatesForLine(line), [line]);

  // Categoria sem catálogo (fono/TO/médico/pediatra/outro) => nenhum template
  // selecionado: a página inteira entra em estado vazio, sem renderizar documento antigo.
  const hasTemplateCatalog = catalogForCategory(category) !== null;

  const selectedTemplate = useMemo(
    () =>
      hasTemplateCatalog
        ? (templates.find((template) => template.id === templateKey && template.line === line) ??
          templatesForActiveLine[0] ??
          templates[0])
        : null,
    [hasTemplateCatalog, line, templateKey, templatesForActiveLine],
  );

  const hasSelectedTemplate = selectedTemplate !== null;

  const header = useMemo(() => buildHeader(profile), [profile]);
  const headerMissingItems = useMemo(() => getHeaderMissingItems(profile), [profile]);
  const signature = useMemo(() => getProfessionalSignature(profile), [profile]);
  const hasIncompleteHeader = showHeader && !loadingProfile && headerMissingItems.length > 0;
  const hasIncompleteSignature = showSignature && !loadingProfile && signature.missingItems.length > 0;

  // 3) Salva o rascunho (debounced) após hidratar.
  useEffect(() => {
    if (!hasHydratedDraft) return;

    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    const saveTimer = window.setTimeout(() => {
      const draft: DocStudioDraft = {
        schemaVersion: 1,
        line,
        templateKey: selectedTemplate?.id ?? templateKey,
        fields,
        primaryColor,
        fontStyle,
        density,
        blackAndWhite,
        showHeader,
        showSignature,
        updatedAt: nowIso(),
      };

      setDraftStatus(saveDraft(draft) ? 'saved' : 'unavailable');
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [
    blackAndWhite,
    density,
    fields,
    fontStyle,
    hasHydratedDraft,
    line,
    primaryColor,
    selectedTemplate?.id,
    templateKey,
    showHeader,
    showSignature,
  ]);

  const updateField = useCallback((key: DraftFieldKey, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  }, []);

  const updateTemplate = useCallback((nextTemplateKey: TemplateKey) => {
    const nextTemplate = templates.find((template) => template.id === nextTemplateKey) ?? templates[0];
    setTemplateKey(nextTemplate.id);
    setLine(nextTemplate.line);
    setFields((current) => ({ ...current, documentPurpose: nextTemplate.defaultPurpose }));
  }, []);

  const updateCategory = useCallback((nextCategory: ProfessionCategory) => {
    setCategory(nextCategory);
    const catalog = catalogForCategory(nextCategory);
    // Linha em preparação: mantém o documento atual; o catálogo mostra o placeholder.
    if (!catalog) return;
    const nextTemplate = getFirstTemplateForLine(catalog);
    setLine(catalog);
    setTemplateKey(nextTemplate.id);
    setFields((current) => ({ ...current, documentPurpose: nextTemplate.defaultPurpose }));
  }, []);

  const handleClearDraft = useCallback(() => {
    skipNextDraftSaveRef.current = true;
    setDraftStatus(clearDraft() ? 'cleared' : 'unavailable');

    setFields(selectedTemplate ? getDefaultFieldsForTemplate(selectedTemplate) : initialDraft);
    if (selectedTemplate) {
      setLine(selectedTemplate.line);
      setTemplateKey(selectedTemplate.id);
    }
    setPrimaryColor(colorOptions[0].value);
    setFontStyle('editorial');
    setBlackAndWhite(false);
    setDensity('comfortable');
    setShowHeader(true);
    setShowSignature(false);
  }, [selectedTemplate]);

  const handleCopy = useCallback(async () => {
    if (!selectedTemplate) return;
    const text = composePlainText(profile, selectedTemplate, fields, showHeader, showSignature);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        try {
          textArea.value = text;
          textArea.setAttribute('readonly', '');
          textArea.style.position = 'fixed';
          textArea.style.top = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          if (!document.execCommand('copy')) throw new Error('Copy command was not accepted.');
        } finally {
          textArea.parentNode?.removeChild(textArea);
        }
      }
      setCopyState('success');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2400);
    }
  }, [profile, selectedTemplate, fields, showHeader, showSignature]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const activeColor = blackAndWhite ? '#111111' : primaryColor;
  const activeCategory = getProfessionCategoryOption(category);
  const templatesForActiveCategory = getTemplatesForCategory(category);

  return {
    // dados
    profile,
    loadingProfile,
    // seleção
    line,
    category,
    templateKey,
    selectedTemplate,
    hasSelectedTemplate,
    hasTemplateCatalog,
    templatesForActiveLine,
    templatesForActiveCategory,
    professionCategoryOptions,
    activeCategory,
    // campos
    fields,
    updateField,
    // aparência
    primaryColor,
    setPrimaryColor,
    fontStyle,
    setFontStyle,
    density,
    setDensity,
    blackAndWhite,
    setBlackAndWhite,
    showHeader,
    setShowHeader,
    showSignature,
    setShowSignature,
    colorOptions,
    activeColor,
    // derivados de perfil
    header,
    signature,
    headerMissingItems,
    hasIncompleteHeader,
    hasIncompleteSignature,
    // status
    copyState,
    draftStatus,
    // ações
    updateCategory,
    updateTemplate,
    handleCopy,
    handlePrint,
    handleClearDraft,
  };
}

export type DocStudioState = ReturnType<typeof useDocStudioState>;
