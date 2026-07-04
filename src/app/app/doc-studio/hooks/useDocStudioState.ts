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
  ReportProfile,
  TemplateKey,
} from '../types';
import {
  colorOptions,
  getDefaultFieldsForTemplate,
  getFirstTemplateForLine,
  getLineTitle,
  initialDraft,
  lineFromProfile,
  lineOptions,
  templates,
} from '../templates';
import { getTemplatesForLine } from '../template-catalog';
import { buildHeader, getHeaderMissingItems, getProfessionalSignature } from '../lib/profile';
import { composePlainText } from '../lib/copy';
import { clearDraft, loadDraft, saveDraft } from '../lib/storage';

function nowIso(): string {
  return new Date().toISOString();
}

export function useDocStudioState() {
  const [profile, setProfile] = useState<ReportProfile | null>(null);
  const [line, setLine] = useState<LineKey>('psychopedagogy');
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
      if (!restoredDraftRef.current) {
        const preferredLine = lineFromProfile(data as ReportProfile | null);
        const preferredTemplate = getFirstTemplateForLine(preferredLine);
        setLine(preferredLine);
        setTemplateKey(preferredTemplate.id);
      }
      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const templatesForActiveLine = useMemo(() => getTemplatesForLine(line), [line]);

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === templateKey && template.line === line) ??
      templatesForActiveLine[0] ??
      templates[0],
    [line, templateKey, templatesForActiveLine],
  );

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
        templateKey: selectedTemplate.id,
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
    selectedTemplate.id,
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

  const updateLine = useCallback((nextLine: LineKey) => {
    setLine(nextLine);
    const nextTemplate = getFirstTemplateForLine(nextLine);
    setTemplateKey(nextTemplate.id);
    setFields((current) => ({ ...current, documentPurpose: nextTemplate.defaultPurpose }));
  }, []);

  const handleClearDraft = useCallback(() => {
    skipNextDraftSaveRef.current = true;
    setDraftStatus(clearDraft() ? 'cleared' : 'unavailable');

    setFields(getDefaultFieldsForTemplate(selectedTemplate));
    setLine(selectedTemplate.line);
    setTemplateKey(selectedTemplate.id);
    setPrimaryColor(colorOptions[0].value);
    setFontStyle('editorial');
    setBlackAndWhite(false);
    setDensity('comfortable');
    setShowHeader(true);
    setShowSignature(false);
  }, [selectedTemplate]);

  const handleCopy = useCallback(async () => {
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
  const activeLine = lineOptions.find((option) => option.key === line) ?? lineOptions[0];

  return {
    // dados
    profile,
    loadingProfile,
    // seleção
    line,
    templateKey,
    selectedTemplate,
    templatesForActiveLine,
    lineOptions,
    activeLine,
    lineTitle: getLineTitle(line),
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
    updateLine,
    updateTemplate,
    handleCopy,
    handlePrint,
    handleClearDraft,
  };
}

export type DocStudioState = ReturnType<typeof useDocStudioState>;
