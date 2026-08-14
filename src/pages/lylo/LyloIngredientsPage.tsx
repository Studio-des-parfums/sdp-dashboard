import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/lylo/Button";
import { Input } from "../../components/ui/lylo/Input";
import { Label } from "../../components/ui/lylo/Label";
import { Modal } from "../../components/ui/lylo/Modal";

type Ingredient = {
  id: number;
  name: string;
  type: "top" | "heart" | "base";
  category: string | null;
  language: string;
  description: string | null;
  intensity: string | null;
  allergens: string[] | null;
  box_sets: string[] | null;
  is_active: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  top: "Tête",
  heart: "Cœur",
  base: "Fond",
};

const TYPE_COLORS: Record<string, string> = {
  top: "bg-blue-500/10 text-blue-600",
  heart: "bg-pink-500/10 text-pink-400",
  base: "bg-amber-500/10 text-amber-600",
};

function emptyForm() {
  return {
    name: "",
    type: "top" as "top" | "heart" | "base",
    category: "",
    language: "fr",
    description: "",
    intensity: "",
    allergens: "",
    box_sets: [] as string[],
  };
}

/**
 * Champ "tags" : on tape un nom puis Entrée pour l'ajouter, chaque tag affiché
 * au-dessus avec une croix pour le supprimer. Propose en autocomplete les noms
 * déjà utilisés ailleurs (évite les doublons/fautes de frappe), et permet d'en
 * saisir un nouveau si non trouvé.
 */
function TagInput({
  values,
  onChange,
  suggestions,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (!values.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...values, tag]);
    }
    setDraft("");
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !values.some((v) => v.toLowerCase() === s.toLowerCase()) &&
      s.toLowerCase().includes(draft.trim().toLowerCase())
  );

  return (
    <div className="relative">
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {values.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-gray-200/60 px-2 py-0.5 text-xs text-gray-700">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-gray-500 hover:text-gray-900"
                aria-label={`Retirer ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(draft);
          } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
            removeTag(values[values.length - 1]);
          }
        }}
        placeholder={placeholder}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-md">
          {filteredSuggestions.map((s) => (
            <button
              type="button"
              key={s}
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getBackendBaseUrl() {
  // Les ingrédients sont désormais stockés dans la base générale du dashboard SDP
  // (partagés entre tous les projets), et non plus dans la base propre à Lylo.
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').trim();
  return base ? base.replace(/\/+$/, "") : "";
}

async function apiFetch(path: string, init?: RequestInit) {
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${details}`);
  }
  if (res.status === 204) return null;
  return (await res.json()) as unknown;
}

export default function LyloIngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("fr");
  const [typeFilter, setTypeFilter] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm());

  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm());

  async function refresh() {
    setError(null);
    setIsBusy(true);
    try {
      const params = new URLSearchParams({ active_only: "false" });
      if (langFilter) params.set("language", langFilter);
      if (typeFilter) params.set("type", typeFilter);
      const data = await apiFetch(`/ingredients?${params}`);
      setIngredients(Array.isArray(data) ? (data as Ingredient[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, [langFilter, typeFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) =>
      `${i.name} ${i.category ?? ""} ${i.description ?? ""}`.toLowerCase().includes(q)
    );
  }, [ingredients, search]);

  function parseAllergens(raw: string): string[] | null {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : null;
  }

  // Coffrets déjà utilisés sur d'autres ingrédients, proposés en autocomplete.
  const boxSetSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const ing of ingredients) {
      for (const bs of ing.box_sets ?? []) set.add(bs);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ingredients]);

  async function createIngredient() {
    if (!createForm.name.trim()) return;
    setIsBusy(true);
    try {
      await apiFetch("/ingredients", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          type: createForm.type,
          category: createForm.category.trim() || null,
          language: createForm.language,
          description: createForm.description.trim() || null,
          intensity: createForm.intensity.trim() || null,
          allergens: parseAllergens(createForm.allergens),
          box_sets: createForm.box_sets.length > 0 ? createForm.box_sets : null,
        }),
      });
      setIsCreateOpen(false);
      setCreateForm(emptyForm());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  function openDetail(ing: Ingredient) {
    setSelected(ing);
    setEditForm({
      name: ing.name,
      type: ing.type,
      category: ing.category ?? "",
      language: ing.language,
      description: ing.description ?? "",
      intensity: ing.intensity ?? "",
      allergens: ing.allergens ? ing.allergens.join(", ") : "",
      box_sets: ing.box_sets ?? [],
    });
    setIsDetailOpen(true);
  }

  async function saveDetail() {
    if (!selected || !editForm.name.trim()) return;
    setIsBusy(true);
    try {
      await apiFetch(`/ingredients/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          type: editForm.type,
          category: editForm.category.trim() || null,
          language: editForm.language,
          description: editForm.description.trim() || null,
          intensity: editForm.intensity.trim() || null,
          allergens: parseAllergens(editForm.allergens),
          is_active: selected.is_active,
          box_sets: editForm.box_sets.length > 0 ? editForm.box_sets : null,
        }),
      });
      setIsDetailOpen(false);
      setSelected(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleActive(ing: Ingredient) {
    setIsBusy(true);
    try {
      await apiFetch(`/ingredients/${ing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !ing.is_active }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteIngredient() {
    if (!selected) return;
    if (!window.confirm(`Supprimer l'ingrédient "${selected.name}" ?`)) return;
    setIsBusy(true);
    try {
      await apiFetch(`/ingredients/${selected.id}`, { method: "DELETE" });
      setIsDetailOpen(false);
      setSelected(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsBusy(false);
    }
  }

  function FormFields({ form, setForm }: { form: ReturnType<typeof emptyForm>; setForm: (f: ReturnType<typeof emptyForm>) => void }) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ing_name">Nom *</Label>
          <Input id="ing_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Bergamote fraîche" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ing_type">Type *</Label>
          <select id="ing_type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "top" | "heart" | "base" })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900">
            <option value="top">Note de tête</option>
            <option value="heart">Note de cœur</option>
            <option value="base">Note de fond</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ing_lang">Langue *</Label>
          <select id="ing_lang" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ing_category">Catégorie</Label>
          <Input id="ing_category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="adult, enfant…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ing_intensity">Intensité</Label>
          <select id="ing_intensity" value={form.intensity} onChange={(e) => setForm({ ...form, intensity: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900">
            <option value="">— Non renseignée —</option>
            <option value="legere">Légère</option>
            <option value="moyenne">Moyenne</option>
            <option value="forte">Forte</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ing_desc">Description olfactive</Label>
          <Input id="ing_desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Note agrumée, fraîche et lumineuse…" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ing_allergens">
            Allergènes <span className="text-gray-700 font-normal">(séparés par des virgules — laisser vide = IA raisonne seule)</span>
          </Label>
          <Input id="ing_allergens" value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} placeholder="limonène, linalool, géraniol…" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ing_box_sets">
            Coffrets <span className="text-gray-700 font-normal">(Entrée pour ajouter)</span>
          </Label>
          <TagInput
            values={form.box_sets}
            onChange={(box_sets) => setForm({ ...form, box_sets })}
            suggestions={boxSetSuggestions}
            placeholder="Découverte, Prestige…"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-gray-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Ingrédients</h2>
            <p className="mt-1 text-sm text-gray-500">
              Notes olfactives utilisées par l'IA pour générer les formules de parfum.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="">Toutes langues</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
              <option value="">Tous types</option>
              <option value="top">Tête</option>
              <option value="heart">Cœur</option>
              <option value="base">Fond</option>
            </select>
            <Button variant="primary" onClick={() => { setCreateForm(emptyForm()); setIsCreateOpen(true); }}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ajouter
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/20 px-6 py-4">
          <div className="text-sm font-semibold text-gray-900">
            Ingrédients <span className="text-gray-600">({filtered.length})</span>
          </div>
          <div className="w-72">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Intensité</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Allergènes</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Coffrets</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    {isBusy ? "Chargement..." : "Aucun ingrédient."}
                  </td>
                </tr>
              )}
              {filtered.map((ing) => (
                <tr key={ing.id} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => openDetail(ing)}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{ing.name}</p>
                    {ing.description && <p className="text-xs text-gray-600 truncate max-w-xs">{ing.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[ing.type]}`}>
                      {TYPE_LABELS[ing.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ing.category || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{ing.intensity || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ing.allergens ? (
                      <span className="text-orange-600">{ing.allergens.length} renseigné{ing.allergens.length > 1 ? "s" : ""}</span>
                    ) : (
                      <span className="text-gray-700 italic">IA raisonne</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ing.box_sets && ing.box_sets.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {ing.box_sets.map((bs) => (
                          <span key={bs} className="rounded-full bg-gray-200/60 px-2 py-0.5 text-xs text-gray-700">
                            {bs}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-700 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(ing); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        ing.is_active ? "bg-green-500/10 text-green-400 hover:bg-green-800" : "bg-orange-500/10 text-orange-400 hover:bg-orange-800"
                      }`}
                    >
                      {ing.is_active ? "Actif" : "Inactif"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal création */}
      <Modal open={isCreateOpen} title="Nouvel ingrédient" onClose={() => setIsCreateOpen(false)} maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={createIngredient} disabled={isBusy || !createForm.name.trim()}>Créer</Button>
          </>
        }
      >
        <FormFields form={createForm} setForm={setCreateForm} />
      </Modal>

      {/* Modal détail */}
      <Modal open={isDetailOpen && !!selected} title={selected ? `Ingrédient — ${selected.name}` : ""} onClose={() => { setIsDetailOpen(false); setSelected(null); }} maxWidthClassName="max-w-2xl"
        footer={
          selected ? (
            <>
              <Button variant="danger" onClick={deleteIngredient}>Supprimer</Button>
              <div className="flex-1" />
              <Button onClick={() => { setIsDetailOpen(false); setSelected(null); }}>Fermer</Button>
              <Button variant="primary" onClick={saveDetail} disabled={isBusy || !editForm.name.trim()}>Enregistrer</Button>
            </>
          ) : null
        }
      >
        {selected && <FormFields form={editForm} setForm={setEditForm} />}
      </Modal>
    </div>
  );
}
