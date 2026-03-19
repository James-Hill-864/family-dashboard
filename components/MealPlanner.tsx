'use client'
import { useState, useEffect, useCallback } from 'react'
import GroceryList from './GroceryList'

interface Member { id: string; name: string; emoji: string; color: string }
interface MealAssignment { id: string; member: Member }
interface Meal { id: string; day: number; mealType: string; name: string; notes?: string; assignments: MealAssignment[] }

type Ingredient = { amount: string; unit: string; name: string }
type Recipe = {
  id: string; title: string; description?: string; ingredients: string; instructions: string;
  prepTime?: number; cookTime?: number; servings?: number; category: string;
  imageUrl?: string; sourceUrl?: string; favorite: boolean; tags?: string;
  addedBy?: { id: string; name: string; color: string; emoji: string }
}
type RecipeForm = {
  title: string; description: string; category: string; servings: string; prepTime: string; cookTime: string
  ingredients: Ingredient[]; instructions: string[]; sourceUrl: string; imageUrl: string; tags: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }
const CAT_ICONS: Record<string, string> = { breakfast: '🍳', lunch: '🥗', dinner: '🍽️', dessert: '🍰', snack: '🍿', other: '🥘' }

const EMPTY_FORM: RecipeForm = {
  title: '', description: '', category: 'dinner', servings: '', prepTime: '', cookTime: '',
  ingredients: [{ amount: '', unit: '', name: '' }], instructions: [''], sourceUrl: '', imageUrl: '', tags: '',
}

function getSundayOfWeek(date = new Date()): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function recipeToForm(r: Recipe): RecipeForm {
  return {
    title: r.title, description: r.description || '', category: r.category,
    servings: r.servings?.toString() || '', prepTime: r.prepTime?.toString() || '', cookTime: r.cookTime?.toString() || '',
    ingredients: JSON.parse(r.ingredients || '[]'),
    instructions: JSON.parse(r.instructions || '[]'),
    sourceUrl: r.sourceUrl || '', imageUrl: r.imageUrl || '',
    tags: r.tags ? JSON.parse(r.tags).join(', ') : '',
  }
}

export default function MealPlanner() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [weekStart] = useState<Date>(getSundayOfWeek())
  const todayIdx = new Date().getDay()
  const [activeTab, setActiveTab] = useState<'planner' | 'recipes' | 'grocery'>('planner')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeCategory, setRecipeCategory] = useState('')
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null)
  const [recipeForm, setRecipeForm] = useState<RecipeForm>({ ...EMPTY_FORM })
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [discoveries, setDiscoveries] = useState<Array<{ title: string; url: string; snippet: string }>>([])
  const [discoverSearching, setDiscoverSearching] = useState(false)
  const [discoverImporting, setDiscoverImporting] = useState<string | null>(null)

  // Meal picker state
  const [pickerSlot, setPickerSlot] = useState<{ day: number; mealType: string } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerRecipes, setPickerRecipes] = useState<Recipe[]>([])
  const [customMealValue, setCustomMealValue] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/meals?weekStart=${weekStart.toISOString()}`)
    if (res.ok) setMeals(await res.json())
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const fetchRecipes = useCallback(async () => {
    const params = new URLSearchParams()
    if (recipeSearch) params.set('q', recipeSearch)
    if (recipeCategory) params.set('category', recipeCategory)
    const res = await fetch(`/api/recipes?${params}`)
    setRecipes(await res.json())
  }, [recipeSearch, recipeCategory])

  useEffect(() => { if (activeTab === 'recipes') fetchRecipes() }, [activeTab, fetchRecipes])

  // Picker recipe search
  useEffect(() => {
    if (!pickerSlot) return
    const params = new URLSearchParams()
    if (pickerSearch) params.set('q', pickerSearch)
    fetch(`/api/recipes?${params}`).then(r => r.json()).then(setPickerRecipes).catch(() => {})
  }, [pickerSlot, pickerSearch])

  const getMeal = (day: number, mealType: string) => meals.find(m => m.day === day && m.mealType === mealType)

  const assignMeal = async (day: number, mealType: string, name: string) => {
    const existing = getMeal(day, mealType)
    if (existing) {
      await fetch('/api/meals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: existing.id, name }) })
    } else {
      await fetch('/api/meals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart: weekStart.toISOString(), day, mealType, name }) })
    }
    setPickerSlot(null); setPickerSearch(''); setCustomMealValue(''); load()
  }

  const clearMeal = async (day: number, mealType: string) => {
    const meal = getMeal(day, mealType)
    if (meal) {
      await fetch(`/api/meals?id=${meal.id}`, { method: 'DELETE' })
      load()
    }
  }

  const toggleFavorite = async (r: Recipe) => {
    await fetch(`/api/recipes/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ favorite: !r.favorite }) })
    fetchRecipes()
    if (viewRecipe?.id === r.id) setViewRecipe({ ...r, favorite: !r.favorite })
  }

  const openRecipeForm = (recipe?: Recipe) => {
    if (recipe) {
      setEditingRecipe(recipe)
      setRecipeForm(recipeToForm(recipe))
    } else {
      setEditingRecipe(null)
      setRecipeForm({ ...EMPTY_FORM })
    }
    setShowRecipeForm(true)
  }

  const saveRecipe = async () => {
    if (!recipeForm.title.trim()) return
    const body = {
      ...recipeForm,
      servings: recipeForm.servings ? Number(recipeForm.servings) : null,
      prepTime: recipeForm.prepTime ? Number(recipeForm.prepTime) : null,
      cookTime: recipeForm.cookTime ? Number(recipeForm.cookTime) : null,
      tags: recipeForm.tags ? recipeForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }
    if (editingRecipe) {
      await fetch(`/api/recipes/${editingRecipe.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setShowRecipeForm(false); setEditingRecipe(null); setRecipeForm({ ...EMPTY_FORM }); fetchRecipes()
  }

  const importFromUrl = async () => {
    if (!importUrl.trim()) return
    setImporting(true)
    try {
      const res = await fetch('/api/recipes/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: importUrl.trim() }) })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Import failed'); return }
      setRecipeForm({
        title: data.title || '', description: data.description || '', category: data.category || 'dinner',
        servings: data.servings?.toString() || '', prepTime: data.prepTime?.toString() || '', cookTime: data.cookTime?.toString() || '',
        ingredients: data.ingredients?.length ? data.ingredients : [{ amount: '', unit: '', name: '' }],
        instructions: data.instructions?.length ? data.instructions : [''],
        sourceUrl: data.sourceUrl || importUrl.trim(), imageUrl: data.imageUrl || '', tags: '',
      })
      setEditingRecipe(null); setShowRecipeForm(true); setShowImport(false); setImportUrl('')
    } finally { setImporting(false) }
  }

  const addWeekGroceries = async () => {
    const res = await fetch('/api/meals/grocery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart: weekStart.toISOString() }) })
    const data = await res.json()
    if (data.unmatched?.length) {
      alert(`Added ${data.added} ingredients from ${data.matched} recipes.\n\nNo recipe found for: ${data.unmatched.join(', ')}`)
    } else {
      alert(`Added ${data.added} ingredients from ${data.matched} recipes.`)
    }
  }

  // Shared input styles
  const inputStyle = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none' } as const
  const smallInputStyle = { ...inputStyle, padding: '6px 8px', fontSize: 12 } as const

  return (
    <div className="h-full flex flex-col" style={{ overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a1d2e', flexShrink: 0 }}>
        <button onClick={() => setActiveTab('planner')} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: activeTab === 'planner' ? '#fff' : '#4a4d6a', borderBottom: activeTab === 'planner' ? '2px solid #3b82f6' : '2px solid transparent' }}>
          Meal Planner
        </button>
        <button onClick={() => setActiveTab('recipes')} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: activeTab === 'recipes' ? '#fff' : '#4a4d6a', borderBottom: activeTab === 'recipes' ? '2px solid #3b82f6' : '2px solid transparent' }}>
          Recipes
        </button>
        <button onClick={() => setActiveTab('grocery')} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: activeTab === 'grocery' ? '#fff' : '#4a4d6a', borderBottom: activeTab === 'grocery' ? '2px solid #3b82f6' : '2px solid transparent' }}>
          Grocery
        </button>
      </div>

      {/* ===== PLANNER TAB ===== */}
      {activeTab === 'planner' && (
        <div className="p-4 flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <div style={{ fontSize: '10px', color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meal Plan</div>
              <div className="text-white font-bold" style={{ fontSize: '15px', marginTop: '2px' }}>This Week</div>
            </div>
            <button onClick={addWeekGroceries} style={{ padding: '6px 12px', background: '#059669', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              🛒 Add Week&apos;s Groceries
            </button>
          </div>

          <div className="flex-1 overflow-auto" style={{ position: 'relative' }}>
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }} />
                  {DAYS.map((d, i) => (
                    <th key={d} className="text-center pb-2" style={{ fontSize: '11px', fontWeight: 700, color: i === todayIdx ? '#f43f5e' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(mealType => (
                  <tr key={mealType}>
                    <td className="pr-2 align-middle" style={{ paddingBottom: '6px' }}>
                      <div className="flex items-center gap-1">
                        <span style={{ fontSize: '14px' }}>{MEAL_ICONS[mealType]}</span>
                        <span className="capitalize" style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>{mealType.slice(0, 3)}</span>
                      </div>
                    </td>
                    {DAYS.map((_, dayIdx) => {
                      const meal = getMeal(dayIdx, mealType)
                      const isToday = dayIdx === todayIdx
                      const isPickerOpen = pickerSlot?.day === dayIdx && pickerSlot?.mealType === mealType
                      return (
                        <td key={dayIdx} className="align-middle" style={{ padding: '2px 2px 6px', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <button
                              onClick={() => { setPickerSlot(isPickerOpen ? null : { day: dayIdx, mealType }); setPickerSearch(''); setCustomMealValue(meal?.name || '') }}
                              className="w-full text-center rounded-xl"
                              style={{
                                fontSize: '11px', padding: '4px 2px',
                                background: meal ? (isToday ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)') : 'transparent',
                                border: meal && isToday ? '1px solid rgba(244,63,94,0.25)' : '1px solid transparent',
                                color: meal ? (isToday ? '#fda4af' : 'var(--text)') : 'var(--text-3)',
                                fontWeight: meal ? 500 : 400, cursor: 'pointer',
                              }}
                            >
                              {meal?.name || '—'}
                            </button>
                            {meal && (
                              <button onClick={() => clearMeal(dayIdx, mealType)}
                                style={{ fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                            )}
                          </div>

                          {/* Recipe Picker Popover */}
                          {isPickerOpen && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, zIndex: 50,
                              width: 220, background: '#0f1220', border: '1px solid #2a2d3e', borderRadius: 8,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden',
                            }}>
                              <input autoFocus value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                                placeholder="Search recipes..."
                                style={{ width: '100%', ...smallInputStyle, borderRadius: 0, border: 'none', borderBottom: '1px solid #2a2d3e', boxSizing: 'border-box' }} />
                              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                                {pickerRecipes.slice(0, 8).map(r => (
                                  <button key={r.id} onClick={() => assignMeal(dayIdx, mealType, r.title)}
                                    style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderBottom: '1px solid #1a1d2e', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14 }}>{CAT_ICONS[r.category] || '🥘'}</span>
                                    <div>
                                      <div style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{r.title}</div>
                                      <div style={{ fontSize: 9, color: '#6b7280' }}>{r.category}{r.cookTime ? ` · ${r.cookTime}min` : ''}</div>
                                    </div>
                                  </button>
                                ))}
                                {pickerRecipes.length === 0 && <div style={{ padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>No recipes found</div>}
                              </div>
                              <div style={{ padding: 6, borderTop: '1px solid #2a2d3e', display: 'flex', gap: 4 }}>
                                <input value={customMealValue} onChange={e => setCustomMealValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && customMealValue.trim()) assignMeal(dayIdx, mealType, customMealValue.trim()) }}
                                  placeholder="Custom meal..."
                                  style={{ flex: 1, ...smallInputStyle, fontSize: 10, padding: '4px 6px' }} />
                                <button onClick={() => { if (customMealValue.trim()) assignMeal(dayIdx, mealType, customMealValue.trim()) }}
                                  style={{ padding: '4px 8px', background: '#3b82f6', border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, cursor: 'pointer' }}>Set</button>
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== RECIPES TAB ===== */}
      {activeTab === 'recipes' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Search + Actions */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexShrink: 0 }}>
            <input value={recipeSearch} onChange={e => { setRecipeSearch(e.target.value); setDiscoveries([]) }}
              onKeyDown={async e => {
                if (e.key === 'Enter' && recipeSearch.trim()) {
                  setDiscoverSearching(true)
                  fetch(`/api/recipes/discover?q=${encodeURIComponent(recipeSearch.trim())}`).then(r => r.json()).then(setDiscoveries).catch(() => {}).finally(() => setDiscoverSearching(false))
                }
              }}
              placeholder="Search your recipes or press Enter to find new ones..."
              style={{ flex: 1, ...inputStyle, fontSize: 12, padding: '6px 10px' }} />
            <select value={recipeCategory} onChange={e => setRecipeCategory(e.target.value)}
              style={{ ...inputStyle, fontSize: 11, padding: '6px 6px', color: '#9ca3af', width: 60 }}>
              <option value="">All</option>
              {['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowImport(s => !s)} style={{ padding: '6px 8px', background: '#6366f1', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>URL</button>
            <button onClick={() => openRecipeForm()} style={{ padding: '6px 10px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
          </div>

          {/* Import URL bar */}
          {showImport && (
            <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6 }}>
              <input value={importUrl} onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') importFromUrl() }}
                placeholder="Paste recipe URL..."
                style={{ flex: 1, ...inputStyle, fontSize: 12, padding: '6px 10px' }} />
              <button onClick={importFromUrl} disabled={importing}
                style={{ padding: '6px 14px', background: '#6366f1', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: importing ? 0.5 : 1 }}>
                {importing ? '...' : 'Import'}
              </button>
            </div>
          )}

          {/* Web search results */}
          {discoveries.length > 0 && (
            <div style={{ padding: '0 12px 8px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Web Results — click to import</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                {discoveries.map(d => (
                  <button key={d.url} disabled={discoverImporting === d.url}
                    onClick={async () => {
                      setDiscoverImporting(d.url)
                      try {
                        const res = await fetch('/api/recipes/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: d.url }) })
                        const data = await res.json()
                        if (res.ok) {
                          setRecipeForm({
                            title: data.title || d.title, description: data.description || '', category: data.category || 'dinner',
                            servings: data.servings?.toString() || '', prepTime: data.prepTime?.toString() || '', cookTime: data.cookTime?.toString() || '',
                            ingredients: data.ingredients?.length ? data.ingredients : [{ amount: '', unit: '', name: '' }],
                            instructions: data.instructions?.length ? data.instructions : [''],
                            sourceUrl: data.sourceUrl || d.url, imageUrl: data.imageUrl || '', tags: '',
                          })
                          setEditingRecipe(null); setShowRecipeForm(true); setDiscoveries([])
                        } else { alert(data.error || 'Could not import this recipe') }
                      } finally { setDiscoverImporting(null) }
                    }}
                    style={{
                      padding: '6px 10px', borderRadius: 6, background: '#0f1220', border: '1px solid #1a1d2e',
                      cursor: 'pointer', textAlign: 'left', opacity: discoverImporting === d.url ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{d.title}</div>
                      {d.snippet && <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{d.snippet}</div>}
                    </div>
                    <span style={{ fontSize: 9, color: '#059669', flexShrink: 0 }}>{discoverImporting === d.url ? '...' : 'Import'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {discoverSearching && <div style={{ padding: '0 12px 8px', fontSize: 11, color: '#6b7280' }}>Searching the web...</div>}

          {/* Recipe grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
            {recipes.length === 0 && <div style={{ gridColumn: '1/-1', color: '#4a4d6a', fontSize: 13, textAlign: 'center', paddingTop: 24 }}>No recipes yet. Add your first!</div>}
            {recipes.map(r => (
              <div key={r.id} onClick={() => setViewRecipe(r)} style={{ background: '#0f1220', border: '1px solid #1a1d2e', borderRadius: 8, padding: 12, cursor: 'pointer', position: 'relative' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{CAT_ICONS[r.category] || '🥘'}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {r.prepTime || r.cookTime ? `${(r.prepTime || 0) + (r.cookTime || 0)} min` : ''} {r.servings ? `· ${r.servings} servings` : ''}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); toggleFavorite(r) }}
                  style={{ position: 'absolute', top: 8, right: 8, fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  {r.favorite ? '❤️' : '🤍'}
                </button>
              </div>
            ))}
          </div>

          {/* View Recipe Modal */}
          {viewRecipe && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
              onClick={() => setViewRecipe(null)}>
              <div style={{ background: '#0f1220', border: '1px solid #1e293b', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{viewRecipe.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {viewRecipe.category} {viewRecipe.prepTime || viewRecipe.cookTime ? `· ${(viewRecipe.prepTime || 0) + (viewRecipe.cookTime || 0)} min` : ''} {viewRecipe.servings ? `· ${viewRecipe.servings} servings` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={() => toggleFavorite(viewRecipe)}
                      style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      {viewRecipe.favorite ? '❤️' : '🤍'}
                    </button>
                    <button onClick={async () => { await fetch(`/api/recipes/${viewRecipe.id}/grocery`, { method: 'POST' }); alert('Added to grocery list!') }}
                      style={{ padding: '6px 12px', background: '#059669', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Grocery</button>
                    <button onClick={() => { openRecipeForm(viewRecipe); setViewRecipe(null) }}
                      style={{ padding: '6px 10px', background: '#1e40af', border: 'none', borderRadius: 6, color: '#93c5fd', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => { fetch(`/api/recipes/${viewRecipe.id}`, { method: 'DELETE' }); setViewRecipe(null); fetchRecipes() }}
                      style={{ padding: '6px 10px', background: '#7f1d1d', border: 'none', borderRadius: 6, color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                    <button onClick={() => setViewRecipe(null)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #374151', borderRadius: 6, color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
                <div style={{ overflow: 'auto', padding: '16px 20px' }}>
                  {viewRecipe.description && <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>{viewRecipe.description}</p>}
                  <h4 style={{ color: '#e2e8f0', fontSize: 14, margin: '0 0 10px' }}>Ingredients</h4>
                  <ul style={{ margin: '0 0 20px', paddingLeft: 18 }}>
                    {(JSON.parse(viewRecipe.ingredients || '[]') as Ingredient[]).map((ing, i) => (
                      <li key={i} style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 4 }}>{ing.amount} {ing.unit} {ing.name}</li>
                    ))}
                  </ul>
                  <h4 style={{ color: '#e2e8f0', fontSize: 14, margin: '0 0 10px' }}>Instructions</h4>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    {(JSON.parse(viewRecipe.instructions || '[]') as string[]).map((step, i) => (
                      <li key={i} style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{step}</li>
                    ))}
                  </ol>
                  {viewRecipe.sourceUrl && <a href={viewRecipe.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 16, color: '#60a5fa', fontSize: 12 }}>Source →</a>}
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Recipe Modal */}
          {showRecipeForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
              onClick={() => { setShowRecipeForm(false); setEditingRecipe(null) }}>
              <div style={{ background: '#0f1220', border: '1px solid #1e293b', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{editingRecipe ? 'Edit Recipe' : 'Add Recipe'}</span>
                  <button onClick={() => { setShowRecipeForm(false); setEditingRecipe(null) }} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                <div style={{ overflow: 'auto', padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
                    <input value={recipeForm.title} onChange={e => setRecipeForm(f => ({ ...f, title: e.target.value }))} placeholder="Recipe title *" style={inputStyle} />
                    <select value={recipeForm.category} onChange={e => setRecipeForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, color: '#9ca3af' }}>
                      {['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <textarea value={recipeForm.description} onChange={e => setRecipeForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)"
                    rows={2} style={{ width: '100%', ...inputStyle, resize: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Prep (min)</div>
                      <input type="number" value={recipeForm.prepTime} onChange={e => setRecipeForm(f => ({ ...f, prepTime: e.target.value }))} placeholder="0" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Cook (min)</div>
                      <input type="number" value={recipeForm.cookTime} onChange={e => setRecipeForm(f => ({ ...f, cookTime: e.target.value }))} placeholder="0" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Servings</div>
                      <input type="number" value={recipeForm.servings} onChange={e => setRecipeForm(f => ({ ...f, servings: e.target.value }))} placeholder="0" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Ingredients</div>
                    {recipeForm.ingredients.map((ing, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr auto', gap: 6, marginBottom: 6 }}>
                        <input value={ing.amount} onChange={e => { const arr = [...recipeForm.ingredients]; arr[i] = { ...arr[i], amount: e.target.value }; setRecipeForm(f => ({ ...f, ingredients: arr })) }} placeholder="Amt" style={smallInputStyle} />
                        <input value={ing.unit} onChange={e => { const arr = [...recipeForm.ingredients]; arr[i] = { ...arr[i], unit: e.target.value }; setRecipeForm(f => ({ ...f, ingredients: arr })) }} placeholder="Unit" style={smallInputStyle} />
                        <input value={ing.name} onChange={e => { const arr = [...recipeForm.ingredients]; arr[i] = { ...arr[i], name: e.target.value }; setRecipeForm(f => ({ ...f, ingredients: arr })) }} placeholder="Ingredient" style={smallInputStyle} />
                        <button onClick={() => { const arr = recipeForm.ingredients.filter((_, j) => j !== i); setRecipeForm(f => ({ ...f, ingredients: arr.length ? arr : [{ amount: '', unit: '', name: '' }] })) }}
                          style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => setRecipeForm(f => ({ ...f, ingredients: [...f.ingredients, { amount: '', unit: '', name: '' }] }))}
                      style={{ fontSize: 12, color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ Add ingredient</button>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Instructions</div>
                    {recipeForm.instructions.map((step, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 12, color: '#6b7280', paddingTop: 8 }}>{i + 1}.</span>
                        <textarea value={step} onChange={e => { const arr = [...recipeForm.instructions]; arr[i] = e.target.value; setRecipeForm(f => ({ ...f, instructions: arr })) }}
                          rows={2} placeholder={`Step ${i + 1}`} style={{ ...smallInputStyle, resize: 'none' }} />
                        <button onClick={() => { const arr = recipeForm.instructions.filter((_, j) => j !== i); setRecipeForm(f => ({ ...f, instructions: arr.length ? arr : [''] })) }}>
                          <span style={{ color: '#6b7280', fontSize: 16, cursor: 'pointer' }}>✕</span>
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setRecipeForm(f => ({ ...f, instructions: [...f.instructions, ''] }))}
                      style={{ fontSize: 12, color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ Add step</button>
                  </div>
                  <input value={recipeForm.sourceUrl} onChange={e => setRecipeForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="Source URL (optional)"
                    style={{ width: '100%', ...inputStyle, fontSize: 12, boxSizing: 'border-box', marginBottom: 8 }} />
                  <input value={recipeForm.tags} onChange={e => setRecipeForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma separated, optional)"
                    style={{ width: '100%', ...inputStyle, fontSize: 12, boxSizing: 'border-box', marginBottom: 16 }} />
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #1e293b', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowRecipeForm(false); setEditingRecipe(null) }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #374151', borderRadius: 6, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveRecipe} style={{ padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {editingRecipe ? 'Save Changes' : 'Save Recipe'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== GROCERY TAB ===== */}
      {activeTab === 'grocery' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <GroceryList />
        </div>
      )}
    </div>
  )
}
