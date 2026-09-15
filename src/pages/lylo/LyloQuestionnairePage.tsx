import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/lylo/Button";
import { Input } from "../../components/ui/lylo/Input";
import { Label } from "../../components/ui/lylo/Label";
import { Modal } from "../../components/ui/lylo/Modal";

type Choice = {
  id: number;
  question_id: number;
  text: string;
  image_url: string | null;
  language: string;
};

type QuestionGroupMini = {
  id: number;
  name: string;
  is_active: boolean;
};

type Question = {
  id: number;
  text: string;
  language: string;
  is_active: boolean;
  choices: Choice[];
  groups: QuestionGroupMini[];
};

type QuestionGroup = {
  id: number;
  name: string;
  is_active: boolean;
  questions: Array<{
    id: number;
    text: string;
    language: string;
    is_active: boolean;
  }>;
};

type DraftChoice = {
  id: string;
  text: string;
  file: File | null;
  preview: string | null;
};

type SortMode = "text_asc" | "text_desc" | "choices_desc";

function getBackendBaseUrl() {
  const base = (import.meta.env.VITE_LYLO_API_URL || 'https://lylo-back-production.up.railway.app').trim();
  return base ? base.replace(/\/+$/, "") : "";
}

async function apiFetch(path: string, init?: RequestInit) {
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(init?.headers ?? {}),
      ...((init as RequestInit & { _skipContentType?: boolean })?._skipContentType
        ? {}
        : { "Content-Type": "application/json" }),
    },
  });
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${details}`);
  }
  if (res.status === 204) return null;
  return (await res.json()) as unknown;
}

async function apiFetchForm(path: string, formData: FormData) {
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "ngrok-skip-browser-warning": "true" },
    body: formData,
  });
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${details}`);
  }
  return (await res.json()) as unknown;
}

function sortQuestions(items: Question[], mode: SortMode) {
  const next = [...items];
  next.sort((a, b) => {
    if (mode === "choices_desc") {
      if (b.choices.length !== a.choices.length) return b.choices.length - a.choices.length;
      return a.text.localeCompare(b.text, "fr", { sensitivity: "base" });
    }
    if (mode === "text_desc") {
      return b.text.localeCompare(a.text, "fr", { sensitivity: "base" });
    }
    return a.text.localeCompare(b.text, "fr", { sensitivity: "base" });
  });
  return next;
}

export default function LyloQuestionnairePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langFilter, setLangFilter] = useState<"fr" | "en">("fr");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("text_asc");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newLang, setNewLang] = useState<"fr" | "en">("fr");
  const [newGroupIds, setNewGroupIds] = useState<number[]>([]);
  const [draftChoices, setDraftChoices] = useState<DraftChoice[]>([]);
  const [draftChoiceText, setDraftChoiceText] = useState("");

  const [selectedQ, setSelectedQ] = useState<Question | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const [newChoiceText, setNewChoiceText] = useState("");
  const [newChoiceLang, setNewChoiceLang] = useState<"fr" | "en">("fr");
  const [addingChoice, setAddingChoice] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupActive, setNewGroupActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingChoiceId, setUploadingChoiceId] = useState<number | null>(null);

  const [editingChoiceId, setEditingChoiceId] = useState<number | null>(null);
  const [editingChoiceText, setEditingChoiceText] = useState("");
  const [savingChoiceId, setSavingChoiceId] = useState<number | null>(null);

  const refreshQuestions = useCallback(async () => {
    const data = await apiFetch(`/catalog/questions?language=${langFilter}&active_only=false`);
    setQuestions(Array.isArray(data) ? (data as Question[]) : []);
  }, [langFilter]);

  const refreshGroups = useCallback(async () => {
    const data = await apiFetch("/catalog/question-groups?active_only=false");
    setGroups(Array.isArray(data) ? (data as QuestionGroup[]) : []);
  }, []);

  const refreshAll = useCallback(async () => {
    setError(null);
    setIsBusy(true);
    try {
      await Promise.all([refreshQuestions(), refreshGroups()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }, [refreshGroups, refreshQuestions]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.questions.some((question) => question.language === langFilter)),
    [groups, langFilter]
  );

  const selectedGroup = useMemo(
    () => visibleGroups.find((group) => group.id === selectedGroupId) ?? null,
    [selectedGroupId, visibleGroups]
  );

  const filteredQuestions = useMemo(() => {
    let items = [...questions];

    if (selectedGroupId !== null) {
      items = items.filter((q) => q.groups.some((group) => group.id === selectedGroupId));
    } else {
      items = [];
    }

    const query = search.trim().toLowerCase();
    if (query) {
      items = items.filter((q) => {
        const groupNames = q.groups.map((group) => group.name).join(" ");
        return `${q.text} ${groupNames}`.toLowerCase().includes(query);
      });
    }

    return sortQuestions(items, sortMode);
  }, [questions, search, selectedGroupId, sortMode]);

  useEffect(() => {
    if (visibleGroups.length === 0) {
      setSelectedGroupId(null);
      return;
    }
    if (!visibleGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(visibleGroups[0].id);
    }
  }, [selectedGroupId, visibleGroups]);

  function resetDraftChoices() {
    draftChoices.forEach((choice) => {
      if (choice.preview) URL.revokeObjectURL(choice.preview);
    });
    setDraftChoices([]);
    setDraftChoiceText("");
  }

  function resetCreateModal() {
    setIsCreateOpen(false);
    setNewText("");
    setNewGroupIds([]);
    resetDraftChoices();
  }

  function addDraftChoice() {
    if (!draftChoiceText.trim()) return;
    const id = crypto.randomUUID();
    setDraftChoices((prev) => [...prev, { id, text: draftChoiceText.trim(), file: null, preview: null }]);
    setDraftChoiceText("");
  }

  function removeDraftChoice(id: string) {
    setDraftChoices((prev) => {
      const choice = prev.find((c) => c.id === id);
      if (choice?.preview) URL.revokeObjectURL(choice.preview);
      return prev.filter((c) => c.id !== id);
    });
  }

  function setDraftChoiceFile(id: string, file: File) {
    setDraftChoices((prev) =>
      prev.map((choice) => {
        if (choice.id !== id) return choice;
        if (choice.preview) URL.revokeObjectURL(choice.preview);
        return { ...choice, file, preview: URL.createObjectURL(file) };
      })
    );
  }

  function toggleGroupSelection(groupId: number, selectedIds: number[], setter: (ids: number[]) => void) {
    setter(
      selectedIds.includes(groupId)
        ? selectedIds.filter((id) => id !== groupId)
        : [...selectedIds, groupId]
    );
  }

  async function createQuestion() {
    if (!newText.trim()) return;
    setIsBusy(true);
    try {
      const question = (await apiFetch("/catalog/questions", {
        method: "POST",
        body: JSON.stringify({
          text: newText.trim(),
          language: newLang,
          group_ids: newGroupIds,
        }),
      })) as Question;

      for (const draft of draftChoices) {
        if (!draft.text.trim()) continue;
        const created = (await apiFetch(`/catalog/questions/${question.id}/choices`, {
          method: "POST",
          body: JSON.stringify({ text: draft.text.trim(), language: newLang }),
        })) as Choice;
        if (draft.file) {
          const fd = new FormData();
          fd.append("file", draft.file);
          await apiFetchForm(`/catalog/choices/${created.id}/image`, fd);
        }
      }

      resetCreateModal();
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    setIsBusy(true);
    try {
      await apiFetch("/catalog/question-groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName.trim(), is_active: newGroupActive }),
      });
      setIsGroupModalOpen(false);
      setNewGroupName("");
      setNewGroupActive(true);
      await refreshGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleQuestionActive(question: Question) {
    setIsBusy(true);
    try {
      await apiFetch(`/catalog/questions/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !question.is_active }),
      });
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleGroupActive(group: QuestionGroup) {
    setIsBusy(true);
    try {
      await apiFetch(`/catalog/question-groups/${group.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !group.is_active }),
      });
      await refreshGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteGroup(group: QuestionGroup) {
    if (!window.confirm(`Supprimer le groupe "${group.name}" ? Les questions qui n'appartiennent à aucun autre groupe seront aussi supprimées.`)) return;
    setIsBusy(true);
    try {
      await apiFetch(`/catalog/question-groups/${group.id}`, { method: "DELETE" });
      if (selectedGroupId === group.id) setSelectedGroupId(null);
      setNewGroupIds((prev) => prev.filter((id) => id !== group.id));
      setSelectedGroupIds((prev) => prev.filter((id) => id !== group.id));
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteQuestion(question: Question) {
    if (!window.confirm(`Supprimer la question "${question.text}" et tous ses choix ?`)) return;
    setIsBusy(true);
    try {
      await apiFetch(`/catalog/questions/${question.id}`, { method: "DELETE" });
      setIsDetailOpen(false);
      setSelectedQ(null);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function saveQuestion() {
    if (!selectedQ || !editText.trim()) return;
    setIsBusy(true);
    try {
      const updated = (await apiFetch(`/catalog/questions/${selectedQ.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: editText.trim(), group_ids: selectedGroupIds }),
      })) as Question;
      setSelectedQ(updated);
      await refreshAll();
      setIsDetailOpen(false);
      setSelectedQ(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function addChoice() {
    if (!selectedQ || !newChoiceText.trim()) return;
    setAddingChoice(true);
    try {
      await apiFetch(`/catalog/questions/${selectedQ.id}/choices`, {
        method: "POST",
        body: JSON.stringify({ text: newChoiceText.trim(), language: newChoiceLang }),
      });
      setNewChoiceText("");
      const updated = await apiFetch(`/catalog/questions/${selectedQ.id}`);
      setSelectedQ(updated as Question);
      await refreshQuestions();
      await refreshGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setAddingChoice(false);
    }
  }

  function startEditChoice(choice: Choice) {
    setEditingChoiceId(choice.id);
    setEditingChoiceText(choice.text);
  }

  function cancelEditChoice() {
    setEditingChoiceId(null);
    setEditingChoiceText("");
  }

  async function saveEditChoice(choiceId: number) {
    const text = editingChoiceText.trim();
    if (!text) return;
    setSavingChoiceId(choiceId);
    try {
      await apiFetch(`/catalog/choices/${choiceId}`, {
        method: "PATCH",
        body: JSON.stringify({ text }),
      });
      if (selectedQ) {
        const updated = await apiFetch(`/catalog/questions/${selectedQ.id}`);
        setSelectedQ(updated as Question);
      }
      await refreshQuestions();
      await refreshGroups();
      setEditingChoiceId(null);
      setEditingChoiceText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSavingChoiceId(null);
    }
  }

  async function deleteChoice(choiceId: number) {
    setIsBusy(true);
    try {
      await apiFetch(`/catalog/choices/${choiceId}`, { method: "DELETE" });
      if (selectedQ) {
        const updated = await apiFetch(`/catalog/questions/${selectedQ.id}`);
        setSelectedQ(updated as Question);
      }
      await refreshQuestions();
      await refreshGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function uploadImage(choiceId: number, file: File) {
    setUploadingChoiceId(choiceId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiFetchForm(`/catalog/choices/${choiceId}/image`, formData);
      if (selectedQ) {
        const refreshed = await apiFetch(`/catalog/questions/${selectedQ.id}`);
        setSelectedQ(refreshed as Question);
      }
      await refreshQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploadingChoiceId(null);
    }
  }

  function openDetail(question: Question) {
    setSelectedQ(question);
    setEditText(question.text);
    setSelectedGroupIds(question.groups.map((group) => group.id));
    setNewChoiceText("");
    setNewChoiceLang(question.language as "fr" | "en");
    setEditingChoiceId(null);
    setEditingChoiceText("");
    setIsDetailOpen(true);
  }

  function questionCountForGroup(group: QuestionGroup) {
    return group.questions.filter((question) => question.language === langFilter).length;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-100 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Questionnaire</h2>
            <p className="mt-1 text-sm text-gray-500">
              Gérez les questions, leur rattachement à plusieurs groupes et l&apos;activation des groupes envoyés au front.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value as "fr" | "en")}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
            <Button
              variant="primary"
              onClick={() => {
                setNewLang(langFilter);
                setNewGroupIds(selectedGroupId === null ? [] : [selectedGroupId]);
                setIsCreateOpen(true);
              }}
              disabled={selectedGroupId === null}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ajouter une question
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="question_search">Recherche</Label>
            <Input
              id="question_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Question ou groupe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_mode">Tri</Label>
            <select
              id="sort_mode"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
            >
              <option value="text_asc">Texte A → Z</option>
              <option value="text_desc">Texte Z → A</option>
              <option value="choices_desc">Plus de choix d&apos;abord</option>
            </select>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/20 px-4 py-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Règle métier</p>
            <p className="mt-1">Un groupe peut contenir au maximum 12 questions. Le backend bloque le dépassement.</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/20 px-6 py-4">
            <div className="text-sm font-semibold text-gray-900">
              Groupes de questions <span className="text-gray-600">({visibleGroups.length})</span>
            </div>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100/60"
              title="Ajouter un groupe"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {visibleGroups.length === 0 && (
              <div className="px-6 py-8 text-sm text-gray-500">
                {isBusy ? "Chargement..." : "Aucun groupe disponible pour cette langue."}
              </div>
            )}
            {visibleGroups.map((group) => (
              <div
                key={group.id}
                className={`space-y-3 px-6 py-4 transition-colors ${
                  selectedGroupId === group.id ? "bg-indigo-600/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setSelectedGroupId(group.id)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">{group.name}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {questionCountForGroup(group)} question{questionCountForGroup(group) > 1 ? "s" : ""} · max 12
                    </p>
                  </button>
                  <button
                    onClick={() => toggleGroupActive(group)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      group.is_active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    }`}
                  >
                    {group.is_active ? "Actif" : "Inactif"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedGroupId === group.id && (
                    <span className="rounded-lg border border-indigo-500 bg-indigo-600/10 px-3 py-1 text-xs text-indigo-600">
                      Sélectionné
                    </span>
                  )}
                  <button
                    onClick={() => deleteGroup(group)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50/30"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <div className="border-b border-gray-200 bg-gray-50/20 px-6 py-4 text-sm font-semibold text-gray-900">
            {selectedGroup
              ? <>Questions du groupe <span className="text-gray-900">{selectedGroup.name}</span> <span className="text-gray-600">({filteredQuestions.length})</span></>
              : <>Questions <span className="text-gray-600">(0)</span></>
            }
          </div>
          <div className="divide-y divide-gray-200">
            {filteredQuestions.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                {isBusy ? "Chargement..." : selectedGroup ? "Aucune question dans ce groupe." : "Sélectionne un groupe pour voir ses questions."}
              </div>
            )}
            {filteredQuestions.map((question) => (
              <div key={question.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 cursor-pointer" onClick={() => openDetail(question)}>
                  <p className="text-sm font-medium text-gray-900">{question.text}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {question.choices.length} choix · {question.language.toUpperCase()}
                    {!question.is_active && <span className="ml-2 text-orange-500">· Inactive</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {question.groups.length === 0 ? (
                      <span className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] text-gray-600">Sans groupe</span>
                    ) : (
                      question.groups.map((group) => (
                        <span
                          key={group.id}
                          className={`rounded-full px-2.5 py-1 text-[11px] ${
                            group.is_active
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {group.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleQuestionActive(question)}
                  title={question.is_active ? "Désactiver" : "Activer"}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    question.is_active
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  }`}
                >
                  {question.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => openDetail(question)}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-100/60"
                >
                  Gérer
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={isGroupModalOpen}
        title="Nouveau groupe"
        onClose={() => {
          setIsGroupModalOpen(false);
          setNewGroupName("");
          setNewGroupActive(true);
        }}
        maxWidthClassName="max-w-lg"
        footer={
          <>
            <Button
              onClick={() => {
                setIsGroupModalOpen(false);
                setNewGroupName("");
                setNewGroupActive(true);
              }}
            >
              Annuler
            </Button>
            <Button variant="primary" onClick={createGroup} disabled={isBusy || !newGroupName.trim()}>
              {isBusy ? "Enregistrement..." : "Créer le groupe"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group_name">Nom du groupe</Label>
            <Input
              id="group_name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ex : Groupe été"
            />
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={newGroupActive}
              onChange={(e) => setNewGroupActive(e.target.checked)}
            />
            Groupe actif
          </label>
        </div>
      </Modal>

      <Modal
        open={isCreateOpen}
        title="Nouvelle question"
        onClose={resetCreateModal}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button onClick={resetCreateModal}>Annuler</Button>
            <Button variant="primary" onClick={createQuestion} disabled={isBusy || !newText.trim() || newGroupIds.length === 0}>
              {isBusy ? "Enregistrement..." : "Créer"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="q_text">Texte de la question</Label>
            <Input
              id="q_text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Ex : Quelle destination vous attire le plus ?"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="q_lang">Langue</Label>
              <select
                id="q_lang"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value as "fr" | "en")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Groupes</Label>
              <div className="max-h-36 space-y-2 overflow-auto rounded-lg border border-gray-200 p-3">
                {groups.length === 0 && <p className="text-sm text-gray-600">Créez un groupe avant d&apos;affecter la question.</p>}
                {groups.map((group) => (
                  <label key={group.id} className="flex items-center justify-between gap-3 text-sm text-gray-900">
                    <span>{group.name}</span>
                    <input
                      type="checkbox"
                      checked={newGroupIds.includes(group.id)}
                      onChange={() => toggleGroupSelection(group.id, newGroupIds, setNewGroupIds)}
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-700">Une question doit appartenir à au moins un groupe.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Choix de réponse</Label>

            {draftChoices.length > 0 && (
              <div className="space-y-2">
                {draftChoices.map((draft) => (
                  <div key={draft.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50/40">
                        {draft.preview ? (
                          <img src={draft.preview} alt={draft.text} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-dark/20">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="flex-1 min-w-0 break-words text-sm font-medium text-gray-900">{draft.text}</p>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`draft-file-${draft.id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDraftChoiceFile(draft.id, file);
                          e.target.value = "";
                        }}
                      />
                      <label
                        htmlFor={`draft-file-${draft.id}`}
                        className="cursor-pointer rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100/60"
                      >
                        {draft.preview ? "Changer image" : "+ Image"}
                      </label>
                      <button
                        onClick={() => removeDraftChoice(draft.id)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50/30"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={draftChoiceText}
                onChange={(e) => setDraftChoiceText(e.target.value)}
                placeholder="Texte du choix"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraftChoice();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={addDraftChoice} disabled={!draftChoiceText.trim()}>
                + Ajouter
              </Button>
            </div>
            <p className="text-xs text-gray-700">Vous pouvez ajouter autant de choix que nécessaire avant de créer.</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={isDetailOpen && !!selectedQ}
        title={selectedQ ? `Question #${selectedQ.id}` : ""}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedQ(null);
        }}
        maxWidthClassName="max-w-2xl"
        footer={
          selectedQ ? (
            <>
              <Button variant="danger" onClick={() => deleteQuestion(selectedQ)}>Supprimer</Button>
              <div className="flex-1" />
              <Button onClick={() => { setIsDetailOpen(false); setSelectedQ(null); }}>Fermer</Button>
              <Button variant="primary" onClick={saveQuestion} disabled={isBusy || !editText.trim() || selectedGroupIds.length === 0}>
                Enregistrer
              </Button>
            </>
          ) : null
        }
      >
        {selectedQ && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit_q_text">Texte de la question</Label>
              <Input id="edit_q_text" value={editText} onChange={(e) => setEditText(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Groupes affectés</Label>
              <div className="max-h-40 space-y-2 overflow-auto rounded-lg border border-gray-200 p-3">
                {groups.length === 0 && <p className="text-sm text-gray-600">Aucun groupe disponible.</p>}
                {groups.map((group) => (
                  <label key={group.id} className="flex items-center justify-between gap-3 text-sm text-gray-900">
                    <span className="flex items-center gap-2">
                      {group.name}
                      {!group.is_active && <span className="text-xs text-orange-600">(inactif)</span>}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={() => toggleGroupSelection(group.id, selectedGroupIds, setSelectedGroupIds)}
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-700">Une question doit rester liée à au moins un groupe.</p>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Choix ({selectedQ.choices.length})</h3>
              <div className="space-y-2">
                {selectedQ.choices.map((choice) => (
                  <div key={choice.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50/40">
                        {choice.image_url ? (
                          <img src={choice.image_url} alt={choice.text} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-dark/20">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {editingChoiceId === choice.id ? (
                          <Input
                            value={editingChoiceText}
                            onChange={(e) => setEditingChoiceText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void saveEditChoice(choice.id);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditChoice();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <p className="break-words text-sm font-medium text-gray-900">{choice.text}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-600">{choice.language.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2">
                      {editingChoiceId === choice.id ? (
                        <>
                          <button
                            onClick={cancelEditChoice}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100/60"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => saveEditChoice(choice.id)}
                            disabled={savingChoiceId === choice.id || !editingChoiceText.trim()}
                            className="rounded-lg border border-indigo-500 bg-indigo-600/10 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-600/20 disabled:opacity-50"
                          >
                            {savingChoiceId === choice.id ? "..." : "Enregistrer"}
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            ref={uploadingChoiceId === choice.id ? fileInputRef : undefined}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`file-${choice.id}`}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) await uploadImage(choice.id, file);
                              e.target.value = "";
                            }}
                          />
                          <label
                            htmlFor={`file-${choice.id}`}
                            className={`cursor-pointer rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100/60 ${
                              uploadingChoiceId === choice.id ? "opacity-50" : ""
                            }`}
                          >
                            {uploadingChoiceId === choice.id ? "Upload..." : choice.image_url ? "Changer image" : "+ Image"}
                          </label>
                          <button
                            onClick={() => startEditChoice(choice)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100/60"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => deleteChoice(choice.id)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50/30"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50/20 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Ajouter un choix</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newChoiceText}
                  onChange={(e) => setNewChoiceText(e.target.value)}
                  placeholder="Texte du choix"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addChoice();
                  }}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <select
                    value={newChoiceLang}
                    onChange={(e) => setNewChoiceLang(e.target.value as "fr" | "en")}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="fr">FR</option>
                    <option value="en">EN</option>
                  </select>
                  <Button
                    variant="primary"
                    onClick={addChoice}
                    disabled={addingChoice || !newChoiceText.trim()}
                    className="flex-1 sm:flex-none"
                  >
                    {addingChoice ? "..." : "Ajouter"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
