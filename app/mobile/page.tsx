'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Member = { id: string; name: string; color: string; emoji: string; email?: string }
type CalEvent = {
  id: string; title: string; startTime: string; endTime: string; allDay: boolean
  type: string; color?: string; memberId: string; member?: Member
}
type Todo = { id: string; title: string; done: boolean; category: string; assigneeId?: string; assignee?: Member; dueDate?: string; recurring?: string }
type GroceryItem = { id: string; name: string; quantity?: string; unit?: string; category: string; checked: boolean }
type MealPlan = { id: string; day: number; mealType: string; name: string; weekStart: string }
type Announcement = { id: string; message: string; createdBy: string; priority: string; pinned: boolean }
type Recipe = { id: string; title: string; description?: string; ingredients: string; instructions: string; prepTime?: number; cookTime?: number; servings?: number; category: string; favorite: boolean; sourceUrl?: string }

type Tab = 'calendar' | 'tasks' | 'grocery' | 'meals' | 'more'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'calendar', icon: '📅', label: 'Calendar' },
  { id: 'tasks', icon: '✅', label: 'Tasks' },
  { id: 'grocery', icon: '🛒', label: 'Grocery' },
  { id: 'meals', icon: '🍽️', label: 'Meals' },
  { id: 'more', icon: '📢', label: 'More' },
]

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  container: { display:'flex', flexDirection:'column' as const, height:'100dvh', background:'#080b12', color:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', overflow:'hidden' },
  content: { flex:1, overflowY:'auto' as const, overflowX:'hidden' as const, position:'relative' as const },
  nav: { display:'flex', background:'#0a0d14', borderTop:'1px solid #1a1d2e', flexShrink:0, paddingBottom:'env(safe-area-inset-bottom)', minHeight:72 },
  navBtn: (active: boolean) => ({ flex:1, display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center', padding:'8px 4px 10px', background:'transparent', border:'none', cursor:'pointer', color: active ? '#3b82f6' : '#6b7280', minHeight:72, gap:3, WebkitTapHighlightColor:'transparent' }),
  navIcon: { fontSize:24, lineHeight:1 },
  navLabel: (active: boolean) => ({ fontSize:11, fontWeight:600 as const, color: active ? '#3b82f6' : '#6b7280', letterSpacing:'0.01em' }),
  header: { padding:'0 16px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, paddingTop:'env(safe-area-inset-top)', background:'#0a0d14', borderBottom:'1px solid #1a1d2e' },
  headerTitle: { fontSize:18, fontWeight:700, color:'#fff' },
  fab: { position:'fixed' as const, bottom:'calc(80px + env(safe-area-inset-bottom))', right:20, width:56, height:56, borderRadius:'50%', background:'#2563eb', border:'none', color:'#fff', fontSize:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 24px rgba(37,99,235,0.6)', zIndex:50, WebkitTapHighlightColor:'transparent' },
  input: { width:'100%', background:'#1a1d2e', border:'1px solid #2a2d3e', borderRadius:8, padding:'12px 14px', color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box' as const },
  btn: (variant: 'primary'|'secondary'|'danger') => ({
    padding:'12px 20px', borderRadius:8, border:'none', cursor:'pointer', fontSize:15, fontWeight:600,
    background: variant==='primary' ? '#3b82f6' : variant==='danger' ? '#dc2626' : '#1e293b',
    color: variant==='danger' ? '#fff' : '#fff',
  }),
  modal: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', flexDirection:'column' as const, justifyContent:'flex-end' },
  modalSheet: { background:'#0f1729', borderRadius:'16px 16px 0 0', maxHeight:'90dvh', overflow:'hidden', display:'flex', flexDirection:'column' as const },
  modalHeader: { padding:'16px 20px', borderBottom:'1px solid #1e293b', display:'flex', justifyContent:'space-between', alignItems:'center' },
  row: { display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid #1a1d2e', minHeight:56 },
  pill: (color: string) => ({ padding:'2px 8px', borderRadius:12, background:color+'22', color:color, fontSize:11, fontWeight:600 }),
}

// ─── Shared InstallPrompt ─────────────────────────────────────────────────────
function InstallPrompt() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
    const dismissed = localStorage.getItem('install-prompt-dismissed')
    if (!isStandalone && !dismissed) setShow(true)
  }, [])
  if (!show) return null
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  return (
    <div style={{ position:'fixed', bottom:72, left:16, right:16, background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:16, zIndex:100, boxShadow:'0 -4px 20px rgba(0,0,0,0.5)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontWeight:700, fontSize:15 }}>📲 Add to Home Screen</span>
        <button onClick={() => { setShow(false); localStorage.setItem('install-prompt-dismissed','1') }}
          style={{ background:'transparent', border:'none', color:'#6b7280', cursor:'pointer', fontSize:18 }}>✕</button>
      </div>
      <p style={{ color:'#94a3b8', fontSize:13, margin:'0 0 12px' }}>
        {isIOS ? 'Tap the Share button ⬆️ then "Add to Home Screen"' : 'Tap the menu ⋮ then "Add to Home Screen"'}
      </p>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => window.location.href='/install'}
          style={{ flex:1, padding:'10px', background:'#3b82f6', border:'none', borderRadius:8, color:'#fff', fontSize:14, cursor:'pointer' }}>
          View Instructions
        </button>
        <button onClick={() => { setShow(false); localStorage.setItem('install-prompt-dismissed','later') }}
          style={{ padding:'10px 14px', background:'transparent', border:'1px solid #334155', borderRadius:8, color:'#9ca3af', fontSize:14, cursor:'pointer' }}>
          Later
        </button>
      </div>
    </div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────
function CalendarTab() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const [form, setForm] = useState({ title:'', startTime:'', endTime:'', allDay:false, type:'personal', memberId:'', notes:'' })

  const load = useCallback(async () => {
    const [ev, mb] = await Promise.all([fetch('/api/events').then(r=>r.json()), fetch('/api/members').then(r=>r.json())])
    setEvents(ev); setMembers(mb)
  }, [])
  useEffect(() => { load() }, [load])

  // SSE updates
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('sse-update', handler)
    return () => window.removeEventListener('sse-update', handler)
  }, [load])

  const today = new Date(); today.setHours(0,0,0,0)
  const in30 = new Date(today); in30.setDate(in30.getDate()+30)
  const upcoming = events
    .map(e => ({ ...e, _start: new Date(e.startTime) }))
    .filter(e => e._start >= today && e._start <= in30)
    .sort((a,b) => +a._start - +b._start)

  // Month calendar
  const y = currentMonth.getFullYear(), m = currentMonth.getMonth()
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m+1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(Array.from({length:daysInMonth},(_,i)=>i+1))
  while (cells.length % 7) cells.push(null)

  const eventsByDay: Record<number,CalEvent[]> = {}
  events.forEach(e => {
    const d = new Date(e.startTime)
    if (d.getFullYear()===y && d.getMonth()===m) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(e)
    }
  })

  const saveEvent = async () => {
    if (!form.title.trim()) return
    const body = { ...form, memberId: form.memberId || members[0]?.id }
    if (editEvent) {
      await fetch(`/api/events/${editEvent.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    } else {
      await fetch('/api/events', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    }
    setShowAdd(false); setEditEvent(null)
    setForm({title:'',startTime:'',endTime:'',allDay:false,type:'personal',memberId:'',notes:''})
    load()
  }

  const openEdit = (e: CalEvent) => {
    setEditEvent(e)
    setForm({title:e.title, startTime:e.startTime.slice(0,16), endTime:e.endTime.slice(0,16), allDay:e.allDay, type:e.type, memberId:e.memberId, notes:''})
    setShowAdd(true)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Month mini-calendar */}
      <div style={{ padding:'10px 12px 6px', flexShrink:0, background:'#0a0d14', borderBottom:'1px solid #1a1d2e' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <button onClick={()=>setCurrentMonth(new Date(y,m-1,1))} style={{ width:40, height:40, borderRadius:10, background:'#1e293b', border:'none', color:'#fff', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          <span style={{ fontWeight:700, fontSize:15, color:'#fff' }}>{currentMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
          <button onClick={()=>setCurrentMonth(new Date(y,m+1,1))} style={{ width:40, height:40, borderRadius:10, background:'#1e293b', border:'none', color:'#fff', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} style={{fontSize:10,color:'#6b7280',fontWeight:600,padding:'3px 0'}}>{d}</div>)}
          {cells.map((day,i) => {
            const isToday = day && new Date(y,m,day).toDateString()===today.toDateString()
            const hasEvents = day && eventsByDay[day]?.length > 0
            return (
              <div key={i} style={{ padding:'5px 1px', fontSize:13, color: day ? (isToday?'#fff':'#cbd5e1') : 'transparent', background: isToday?'#3b82f6':'transparent', borderRadius:6, position:'relative', minHeight:28, display:'flex', alignItems:'center', justifyContent:'center', cursor: day ? 'pointer' : 'default' }}>
                {day}
                {hasEvents && <span style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background: isToday?'#fff':'#3b82f6', display:'block' }} />}
              </div>
            )
          })}
        </div>
      </div>
      {/* Upcoming events list */}
      <div style={{ flex:1, overflowY:'auto', borderTop:'1px solid #1a1d2e' }}>
        <div style={{ padding:'10px 16px 4px', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>Upcoming Events</div>
        {upcoming.length === 0 && <div style={{ padding:'24px 16px', color:'#4a4d6a', fontSize:14, textAlign:'center' }}>No upcoming events</div>}
        {upcoming.map(e => (
          <div key={e.id} onClick={() => openEdit(e)} style={{ ...S.row, cursor:'pointer' }}>
            <div style={{ width:4, height:40, borderRadius:2, background:e.color||e.member?.color||'#3b82f6', flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:14, color:'#fff', marginBottom:2 }}>{e.title}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>
                {new Date(e.startTime).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                {!e.allDay && ` · ${new Date(e.startTime).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}`}
              </div>
            </div>
            {e.member && <span style={{ fontSize:18 }}>{e.member.emoji}</span>}
          </div>
        ))}
      </div>
      {/* FAB */}
      <button style={S.fab} onClick={() => { setEditEvent(null); setForm({title:'',startTime:new Date().toISOString().slice(0,16),endTime:new Date().toISOString().slice(0,16),allDay:false,type:'personal',memberId:members[0]?.id||'',notes:''}); setShowAdd(true) }}>+</button>
      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={S.modal} onClick={()=>setShowAdd(false)}>
          <div style={S.modalSheet} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{fontSize:17,fontWeight:700}}>{editEvent?'Edit Event':'Add Event'}</span>
              <div style={{display:'flex',gap:8}}>
                {editEvent && <button onClick={async()=>{await fetch(`/api/events/${editEvent.id}`,{method:'DELETE'});setShowAdd(false);setEditEvent(null);load()}} style={{...S.btn('danger'),padding:'8px 14px',fontSize:13}}>Delete</button>}
                <button onClick={()=>setShowAdd(false)} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20}}>✕</button>
              </div>
            </div>
            <div style={{overflow:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Event title" style={S.input} />
              <select value={form.memberId} onChange={e=>setForm(f=>({...f,memberId:e.target.value}))} style={{...S.input}}>
                {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
              </select>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{...S.input,color:'#9ca3af'}}>
                {['personal','work','school','medical','birthday','holiday','other'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <label style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="checkbox" checked={form.allDay} onChange={e=>setForm(f=>({...f,allDay:e.target.checked}))} style={{width:18,height:18}} />
                <span style={{fontSize:15,color:'#cbd5e1'}}>All day</span>
              </label>
              {!form.allDay && <>
                <input type="datetime-local" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} style={{...S.input,colorScheme:'dark'}} />
                <input type="datetime-local" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} style={{...S.input,colorScheme:'dark'}} />
              </>}
              {form.allDay && <input type="date" value={form.startTime.slice(0,10)} onChange={e=>setForm(f=>({...f,startTime:e.target.value,endTime:e.target.value}))} style={{...S.input,colorScheme:'dark'}} />}
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #1e293b',display:'flex',gap:8}}>
              <button onClick={saveEvent} style={{...S.btn('primary'),flex:1}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────
function TasksTab() {
  const [subTab, setSubTab] = useState<'todo'|'chore'>('todo')
  const [todos, setTodos] = useState<Todo[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title:'', assigneeId:'', recurring:'' })

  const load = useCallback(async () => {
    const [td, mb] = await Promise.all([
      fetch(`/api/todos?category=${subTab}`).then(r=>r.json()),
      fetch('/api/members').then(r=>r.json()),
    ])
    setTodos(td); setMembers(mb)
  }, [subTab])
  useEffect(()=>{load()},[load])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('sse-update', handler)
    return () => window.removeEventListener('sse-update', handler)
  }, [load])

  const toggle = async (todo: Todo) => {
    await fetch(`/api/todos/${todo.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({done:!todo.done}) })
    load()
  }
  const add = async () => {
    if (!form.title.trim()) return
    await fetch('/api/todos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, category:subTab}) })
    setShowAdd(false); setForm({title:'',assigneeId:'',recurring:''}); load()
  }
  const del = async (id: string) => {
    await fetch(`/api/todos/${id}`, {method:'DELETE'}); load()
  }

  const active = todos.filter(t=>!t.done)
  const done = todos.filter(t=>t.done)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Sub-tab */}
      <div style={{display:'flex',borderBottom:'1px solid #1a1d2e',flexShrink:0}}>
        {(['todo','chore'] as const).map(t=>(
          <button key={t} onClick={()=>setSubTab(t)} style={{flex:1,padding:'12px',fontSize:14,fontWeight:600,background:'transparent',border:'none',cursor:'pointer',color:subTab===t?'#fff':'#4a4d6a',borderBottom:subTab===t?'2px solid #3b82f6':'2px solid transparent'}}>
            {t==='todo'?'To-Do':'Chores'}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {active.map(todo=>(
          <div key={todo.id} style={{...S.row,cursor:'pointer'}} onContextMenu={e=>{e.preventDefault();if(confirm('Delete this item?'))del(todo.id)}}>
            <button onClick={()=>toggle(todo)} style={{width:28,height:28,borderRadius:'50%',border:'2px solid #374151',background:'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}} />
            <div style={{flex:1}}>
              <div style={{fontSize:15,color:'#fff'}}>{todo.title}</div>
              {todo.dueDate && <div style={{fontSize:12,color:'#6b7280'}}>Due {new Date(todo.dueDate).toLocaleDateString()}</div>}
            </div>
            {todo.assignee && <span style={{fontSize:18}}>{todo.assignee.emoji}</span>}
          </div>
        ))}
        {done.length > 0 && (
          <>
            <div style={{padding:'8px 16px 4px',fontSize:11,fontWeight:700,color:'#4a4d6a',textTransform:'uppercase',letterSpacing:'0.05em'}}>Completed</div>
            {done.map(todo=>(
              <div key={todo.id} style={{...S.row,opacity:0.5,cursor:'pointer'}} onClick={()=>toggle(todo)}>
                <div style={{width:28,height:28,borderRadius:'50%',border:'2px solid #22c55e',background:'#22c55e22',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>✓</div>
                <div style={{fontSize:15,color:'#9ca3af',textDecoration:'line-through',flex:1}}>{todo.title}</div>
                {todo.assignee && <span style={{fontSize:18,opacity:0.5}}>{todo.assignee.emoji}</span>}
              </div>
            ))}
          </>
        )}
      </div>
      <button style={S.fab} onClick={()=>setShowAdd(true)}>+</button>
      {showAdd && (
        <div style={S.modal} onClick={()=>setShowAdd(false)}>
          <div style={S.modalSheet} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{fontSize:17,fontWeight:700}}>Add {subTab==='todo'?'To-Do':'Chore'}</span>
              <button onClick={()=>setShowAdd(false)} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Title" style={S.input} autoFocus />
              <select value={form.assigneeId} onChange={e=>setForm(f=>({...f,assigneeId:e.target.value}))} style={{...S.input,color:form.assigneeId?'#fff':'#6b7280'}}>
                <option value="">Assign to... (optional)</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
              </select>
              {subTab==='chore' && (
                <select value={form.recurring} onChange={e=>setForm(f=>({...f,recurring:e.target.value}))} style={{...S.input,color:'#9ca3af'}}>
                  <option value="">No recurrence</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #1e293b'}}>
              <button onClick={add} style={{...S.btn('primary'),width:'100%'}}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Grocery Tab ──────────────────────────────────────────────────────────────
function GroceryTab() {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', quantity:'', unit:'', category:'Produce' })
  // deletingId reserved for future swipe-to-delete UI
  const [_deletingId, _setDeletingId] = useState<string|null>(null)

  const load = useCallback(async () => {
    const data = await fetch('/api/grocery').then(r=>r.json())
    setItems(data)
  }, [])
  useEffect(()=>{load()},[load])
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('sse-update', handler)
    return () => window.removeEventListener('sse-update', handler)
  }, [load])

  const toggle = async (item: GroceryItem) => {
    await fetch(`/api/grocery/${item.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({checked:!item.checked}) })
    load()
  }
  const add = async () => {
    if (!form.name.trim()) return
    await fetch('/api/grocery', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    setShowAdd(false); setForm({name:'',quantity:'',unit:'',category:'Produce'}); load()
  }
  const clearChecked = async () => {
    await fetch('/api/grocery', {method:'DELETE'}); load()
  }

  const categories = Array.from(new Set(items.map(i=>i.category))).sort()
  const checkedCount = items.filter(i=>i.checked).length

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {checkedCount > 0 && (
        <div style={{padding:'8px 16px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={clearChecked} style={{fontSize:13,color:'#6b7280',background:'transparent',border:'1px solid #374151',borderRadius:6,padding:'6px 12px',cursor:'pointer'}}>
            Clear {checkedCount} checked
          </button>
        </div>
      )}
      <div style={{flex:1,overflowY:'auto'}}>
        {categories.map(cat => {
          const catItems = items.filter(i=>i.category===cat)
          return (
            <div key={cat}>
              <div style={{padding:'8px 16px 4px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em',background:'#0a0d14'}}>{cat}</div>
              {catItems.map(item=>(
                <div key={item.id} style={{...S.row, opacity:item.checked?0.5:1, cursor:'pointer', position:'relative', overflow:'hidden'}}
                  onClick={()=>toggle(item)}
                  onContextMenu={e=>{e.preventDefault();fetch(`/api/grocery/${item.id}`,{method:'DELETE'}).then(load)}}>
                  <div style={{width:26,height:26,borderRadius:6,border:item.checked?'none':'2px solid #374151',background:item.checked?'#22c55e':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                    {item.checked&&'✓'}
                  </div>
                  <div style={{flex:1}}>
                    <span style={{fontSize:15,color:item.checked?'#6b7280':'#fff',textDecoration:item.checked?'line-through':'none'}}>{item.name}</span>
                    {(item.quantity||item.unit) && <span style={{fontSize:12,color:'#6b7280',marginLeft:6}}>{item.quantity} {item.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
        {items.length===0 && <div style={{padding:'32px 16px',color:'#4a4d6a',textAlign:'center',fontSize:14}}>Grocery list is empty</div>}
      </div>
      <button style={S.fab} onClick={()=>setShowAdd(true)}>+</button>
      {showAdd && (
        <div style={S.modal} onClick={()=>setShowAdd(false)}>
          <div style={S.modalSheet} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{fontSize:17,fontWeight:700}}>Add Item</span>
              <button onClick={()=>setShowAdd(false)} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Item name" style={S.input} autoFocus />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <input value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="Qty" style={S.input} />
                <input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="Unit (lbs, oz…)" style={S.input} />
              </div>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...S.input,color:'#9ca3af'}}>
                {['Produce','Dairy','Meat','Bakery','Frozen','Canned','Snacks','Beverages','Household','Other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #1e293b'}}>
              <button onClick={add} style={{...S.btn('primary'),width:'100%'}}>Add to List</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Meals Tab ────────────────────────────────────────────────────────────────
function MealsTab() {
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<{day:number;mealType:string;existing?:MealPlan}|null>(null)
  const [editValue, setEditValue] = useState('')

  const getWeekStart = (offset: number) => {
    const d = new Date(); d.setHours(0,0,0,0)
    d.setDate(d.getDate() - d.getDay() + offset*7)
    return d
  }
  const weekStart = getWeekStart(weekOffset)

  const load = useCallback(async () => {
    const ws = weekStart.toISOString()
    const data = await fetch(`/api/meals?weekStart=${ws}`).then(r=>r.json())
    setMeals(data)
  }, [weekOffset])
  useEffect(()=>{load()},[load])

  const MEAL_TYPES = ['breakfast','lunch','dinner']
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const getMeal = (day: number, mealType: string) => meals.find(m=>m.day===day&&m.mealType===mealType)

  const save = async () => {
    if (!editing) return
    const _existing = editing.existing
    if (editValue.trim()) {
      await fetch('/api/meals', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        weekStart: weekStart.toISOString(), day: editing.day, mealType: editing.mealType, name: editValue.trim()
      })})
    }
    setEditing(null); setEditValue(''); load()
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Week nav */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',flexShrink:0,borderBottom:'1px solid #1a1d2e'}}>
        <button onClick={()=>setWeekOffset(w=>w-1)} style={{...S.btn('secondary'),padding:'8px 14px',fontSize:16}}>‹</button>
        <span style={{fontSize:14,fontWeight:700}}>
          {weekOffset===0?'This Week':weekOffset===1?'Next Week':weekOffset===-1?'Last Week':weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})}
        </span>
        <button onClick={()=>setWeekOffset(w=>w+1)} style={{...S.btn('secondary'),padding:'8px 14px',fontSize:16}}>›</button>
      </div>
      {/* Days list */}
      <div style={{flex:1,overflowY:'auto'}}>
        {DAYS.map((dayName,dayIdx)=>{
          const date = new Date(weekStart); date.setDate(date.getDate()+dayIdx)
          const isToday = date.toDateString()===new Date().toDateString()
          return (
            <div key={dayIdx} style={{borderBottom:'1px solid #1a1d2e'}}>
              <div style={{padding:'8px 16px 4px',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:700,color:isToday?'#3b82f6':'#9ca3af',minWidth:32}}>{dayName}</span>
                <span style={{fontSize:12,color:'#4a4d6a'}}>{date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                {isToday&&<span style={{fontSize:10,background:'#3b82f6',color:'#fff',padding:'1px 6px',borderRadius:8}}>Today</span>}
              </div>
              {MEAL_TYPES.map(mt=>{
                const meal = getMeal(dayIdx, mt)
                return (
                  <div key={mt} onClick={()=>{setEditing({day:dayIdx,mealType:mt,existing:meal});setEditValue(meal?.name||'')}}
                    style={{display:'flex',alignItems:'center',padding:'8px 16px 8px 24px',gap:10,cursor:'pointer',minHeight:44}}>
                    <span style={{fontSize:11,color:'#6b7280',width:60,textTransform:'capitalize'}}>{mt}</span>
                    <span style={{fontSize:14,color:meal?'#fff':'#374151',flex:1,fontStyle:meal?'normal':'italic'}}>
                      {meal?.name || 'tap to add…'}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      {editing && (
        <div style={S.modal} onClick={()=>setEditing(null)}>
          <div style={S.modalSheet} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{fontSize:17,fontWeight:700,textTransform:'capitalize'}}>{editing.mealType} · {DAYS[editing.day]}</span>
              <button onClick={()=>setEditing(null)} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{padding:'16px 20px'}}>
              <input value={editValue} onChange={e=>setEditValue(e.target.value)} placeholder="What's for dinner?" style={S.input} autoFocus
                onKeyDown={e=>e.key==='Enter'&&save()} />
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #1e293b',display:'flex',gap:8}}>
              <button onClick={save} style={{...S.btn('primary'),flex:1}}>Save</button>
              {editing.existing && <button onClick={async()=>{/* clear by saving empty */setEditValue('');save()}} style={{...S.btn('secondary'),padding:'12px 16px'}}>Clear</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── More Tab ─────────────────────────────────────────────────────────────────
function MoreTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [section, setSection] = useState<'announcements'|'recipes'|'notes'>('announcements')
  const [notes, setNotes] = useState<Array<{id:string;text:string;color:string;pinned:boolean}>>([])
  const [newNote, setNewNote] = useState('')
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false)
  const [annForm, setAnnForm] = useState({ message:'', createdBy:'', priority:'normal' })
  const [viewRecipe, setViewRecipe] = useState<Recipe|null>(null)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [showAddRecipe, setShowAddRecipe] = useState(false)
  const [recipeForm, setRecipeForm] = useState({ title:'', description:'', category:'dinner', servings:'', prepTime:'', cookTime:'', ingredients:[{amount:'',unit:'',name:''}], instructions:[''], sourceUrl:'', tags:'' })
  const wakeLockRef = useRef<WakeLockSentinel|null>(null)

  const load = useCallback(async () => {
    const [ann, rec, mb, nt] = await Promise.all([
      fetch('/api/announcements').then(r=>r.json()).catch(()=>[]),
      fetch('/api/recipes').then(r=>r.json()).catch(()=>[]),
      fetch('/api/members').then(r=>r.json()).catch(()=>[]),
      fetch('/api/notes').then(r=>r.json()).catch(()=>[]),
    ])
    setAnnouncements(ann); setRecipes(rec); setMembers(mb); setNotes(nt)
  }, [])
  useEffect(()=>{load()},[load])

  // Wake lock when viewing recipe
  useEffect(() => {
    if (viewRecipe && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => { wakeLockRef.current = lock }).catch(()=>{})
    } else if (!viewRecipe && wakeLockRef.current) {
      wakeLockRef.current.release().catch(()=>{}); wakeLockRef.current = null
    }
  }, [viewRecipe])

  const addAnnouncement = async () => {
    if (!annForm.message.trim()) return
    await fetch('/api/announcements', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...annForm, createdBy: annForm.createdBy || members[0]?.name || 'Family'}) })
    setShowAddAnnouncement(false); setAnnForm({message:'',createdBy:'',priority:'normal'}); load()
  }

  const addRecipe = async () => {
    if (!recipeForm.title.trim()) return
    await fetch('/api/recipes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
      ...recipeForm, servings:recipeForm.servings?Number(recipeForm.servings):null, prepTime:recipeForm.prepTime?Number(recipeForm.prepTime):null, cookTime:recipeForm.cookTime?Number(recipeForm.cookTime):null,
      tags: recipeForm.tags ? recipeForm.tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
    })})
    setShowAddRecipe(false); setRecipeForm({title:'',description:'',category:'dinner',servings:'',prepTime:'',cookTime:'',ingredients:[{amount:'',unit:'',name:''}],instructions:[''],sourceUrl:'',tags:''}); load()
  }

  const filteredRecipes = recipes.filter(r => !recipeSearch || r.title.toLowerCase().includes(recipeSearch.toLowerCase()))

  type Ingredient = { amount: string; unit: string; name: string }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Section toggle */}
      <div style={{display:'flex',borderBottom:'1px solid #1a1d2e',flexShrink:0}}>
        {(['announcements','recipes','notes'] as const).map(s=>(
          <button key={s} onClick={()=>setSection(s)} style={{flex:1,padding:'12px',fontSize:13,fontWeight:600,background:'transparent',border:'none',cursor:'pointer',color:section===s?'#fff':'#4a4d6a',borderBottom:section===s?'2px solid #3b82f6':'2px solid transparent',textTransform:'capitalize'}}>
            {s==='announcements'?'📢 Posts':s==='recipes'?'🍳 Recipes':'📝 Notes'}
          </button>
        ))}
      </div>

      {section === 'announcements' && (
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{padding:'12px 16px',display:'flex',justifyContent:'flex-end'}}>
            <button onClick={()=>setShowAddAnnouncement(true)} style={{...S.btn('primary'),padding:'8px 16px',fontSize:13}}>+ Post</button>
          </div>
          {announcements.length===0 && <div style={{padding:'32px 16px',color:'#4a4d6a',textAlign:'center',fontSize:14}}>No announcements</div>}
          {announcements.map(a=>(
            <div key={a.id} style={{...S.row,alignItems:'flex-start'}}>
              {a.pinned && <span style={{fontSize:16}}>📌</span>}
              <div style={{flex:1}}>
                <div style={{fontSize:15,color:'#fff',lineHeight:1.4}}>{a.message}</div>
                <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>{a.createdBy} {a.priority==='urgent'&&<span style={{color:'#ef4444',fontWeight:700}}>· URGENT</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'recipes' && (
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'12px 16px',display:'flex',gap:8,flexShrink:0}}>
            <input value={recipeSearch} onChange={e=>setRecipeSearch(e.target.value)} placeholder="Search recipes…" style={{...S.input,flex:1}} />
            <button onClick={()=>setShowAddRecipe(true)} style={{...S.btn('primary'),padding:'10px 14px',fontSize:13,flexShrink:0}}>+</button>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {filteredRecipes.length===0 && <div style={{padding:'32px 16px',color:'#4a4d6a',textAlign:'center',fontSize:14}}>No recipes yet</div>}
            {filteredRecipes.map(r=>(
              <div key={r.id} onClick={()=>setViewRecipe(r)} style={{...S.row,cursor:'pointer'}}>
                <span style={{fontSize:28,flexShrink:0}}>{r.category==='breakfast'?'🍳':r.category==='lunch'?'🥗':r.category==='dinner'?'🍽️':r.category==='dessert'?'🍰':r.category==='snack'?'🍿':'🥘'}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:600,color:'#fff'}}>{r.title}</div>
                  <div style={{fontSize:12,color:'#6b7280'}}>{r.category} {r.prepTime||r.cookTime?`· ${(r.prepTime||0)+(r.cookTime||0)} min`:''}</div>
                </div>
                <button onClick={async e=>{e.stopPropagation();await fetch(`/api/recipes/${r.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({favorite:!r.favorite})});load()}}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:20,padding:4}}>{r.favorite?'❤️':'🤍'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes section */}
      {section === 'notes' && (
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'12px 16px',display:'flex',gap:8,flexShrink:0}}>
            <input value={newNote} onChange={e=>setNewNote(e.target.value)}
              onKeyDown={async e=>{
                if(e.key==='Enter'&&newNote.trim()){
                  await fetch('/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:newNote.trim()})})
                  setNewNote('');load()
                }
              }}
              placeholder="Add a note..." style={{...S.input,flex:1}} />
            <button onClick={async()=>{
              if(!newNote.trim())return
              await fetch('/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:newNote.trim()})})
              setNewNote('');load()
            }} style={{...S.btn('primary'),padding:'10px 14px',fontSize:13,flexShrink:0}}>+</button>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {notes.length===0&&<div style={{padding:'32px 16px',color:'#4a4d6a',textAlign:'center',fontSize:14}}>No notes yet</div>}
            {notes.map(n=>(
              <div key={n.id} style={{...S.row,borderLeft:`3px solid ${n.color}`}}>
                <div style={{flex:1}}>
                  {n.pinned&&<span style={{fontSize:12,marginRight:4}}>📌</span>}
                  <span style={{fontSize:15,color:'#e2e8f0'}}>{n.text}</span>
                </div>
                <button onClick={async()=>{await fetch('/api/notes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:n.id,pinned:!n.pinned})});load()}}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:n.pinned?'#f59e0b':'#4a4d6a',padding:4}}>📌</button>
                <button onClick={async()=>{await fetch(`/api/notes?id=${n.id}`,{method:'DELETE'});load()}}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#6b7280',padding:4}}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Announcement Modal */}
      {showAddAnnouncement && (
        <div style={S.modal} onClick={()=>setShowAddAnnouncement(false)}>
          <div style={S.modalSheet} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{fontSize:17,fontWeight:700}}>Post Announcement</span>
              <button onClick={()=>setShowAddAnnouncement(false)} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
              <textarea value={annForm.message} onChange={e=>setAnnForm(f=>({...f,message:e.target.value}))} placeholder="What do you want to announce?" rows={4}
                style={{...S.input,resize:'none'}} autoFocus />
              <select value={annForm.createdBy||''} onChange={e=>setAnnForm(f=>({...f,createdBy:e.target.value}))} style={{...S.input,color:'#9ca3af'}}>
                <option value="">Posted by…</option>
                {members.map(m=><option key={m.id} value={m.name}>{m.emoji} {m.name}</option>)}
              </select>
              <select value={annForm.priority} onChange={e=>setAnnForm(f=>({...f,priority:e.target.value}))} style={{...S.input,color:'#9ca3af'}}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #1e293b'}}>
              <button onClick={addAnnouncement} style={{...S.btn('primary'),width:'100%'}}>Post</button>
            </div>
          </div>
        </div>
      )}

      {/* View Recipe */}
      {viewRecipe && (
        <div style={{...S.modal,justifyContent:'flex-start',paddingTop:'env(safe-area-inset-top)'}} onClick={()=>setViewRecipe(null)}>
          <div style={{...S.modalSheet,borderRadius:0,maxHeight:'100dvh'}} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div style={{flex:1}}>
                <div style={{fontSize:18,fontWeight:700,color:'#fff'}}>{viewRecipe.title}</div>
                <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{viewRecipe.category} {viewRecipe.prepTime||viewRecipe.cookTime?`· ${(viewRecipe.prepTime||0)+(viewRecipe.cookTime||0)} min`:''}{viewRecipe.servings?` · ${viewRecipe.servings} servings`:''}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async()=>{await fetch(`/api/recipes/${viewRecipe.id}/grocery`,{method:'POST'});alert('Added to grocery!')}} style={{...S.btn('primary'),padding:'8px 12px',fontSize:12}}>+ Grocery</button>
                <button onClick={()=>setViewRecipe(null)} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:22}}>✕</button>
              </div>
            </div>
            <div style={{overflow:'auto',padding:'16px 20px',flex:1}}>
              {viewRecipe.description && <p style={{color:'#9ca3af',fontSize:14,marginTop:0}}>{viewRecipe.description}</p>}
              <h3 style={{color:'#e2e8f0',fontSize:16,marginBottom:10}}>Ingredients</h3>
              <ul style={{margin:'0 0 24px',paddingLeft:20}}>
                {(JSON.parse(viewRecipe.ingredients||'[]') as Ingredient[]).map((ing,i)=>(
                  <li key={i} style={{color:'#cbd5e1',fontSize:16,marginBottom:8}}>{ing.amount} {ing.unit} {ing.name}</li>
                ))}
              </ul>
              <h3 style={{color:'#e2e8f0',fontSize:16,marginBottom:10}}>Instructions</h3>
              <ol style={{margin:0,paddingLeft:20}}>
                {(JSON.parse(viewRecipe.instructions||'[]') as string[]).map((step,i)=>(
                  <li key={i} style={{color:'#cbd5e1',fontSize:16,marginBottom:16,lineHeight:1.6}}>{step}</li>
                ))}
              </ol>
              {viewRecipe.sourceUrl && <a href={viewRecipe.sourceUrl} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',marginTop:16,color:'#60a5fa',fontSize:14}}>View Source →</a>}
            </div>
          </div>
        </div>
      )}

      {/* Add Recipe Modal */}
      {showAddRecipe && (
        <div style={S.modal} onClick={()=>setShowAddRecipe(false)}>
          <div style={{...S.modalSheet,maxHeight:'95dvh'}} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{fontSize:17,fontWeight:700}}>Add Recipe</span>
              <button onClick={()=>setShowAddRecipe(false)} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{overflow:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
              <input value={recipeForm.title} onChange={e=>setRecipeForm(f=>({...f,title:e.target.value}))} placeholder="Recipe title *" style={S.input} autoFocus />
              <select value={recipeForm.category} onChange={e=>setRecipeForm(f=>({...f,category:e.target.value}))} style={{...S.input,color:'#9ca3af'}}>
                {['breakfast','lunch','dinner','snack','dessert','other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={recipeForm.description} onChange={e=>setRecipeForm(f=>({...f,description:e.target.value}))} placeholder="Description (optional)" rows={2} style={{...S.input,resize:'none'}} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                <input type="number" value={recipeForm.prepTime} onChange={e=>setRecipeForm(f=>({...f,prepTime:e.target.value}))} placeholder="Prep min" style={S.input} />
                <input type="number" value={recipeForm.cookTime} onChange={e=>setRecipeForm(f=>({...f,cookTime:e.target.value}))} placeholder="Cook min" style={S.input} />
                <input type="number" value={recipeForm.servings} onChange={e=>setRecipeForm(f=>({...f,servings:e.target.value}))} placeholder="Servings" style={S.input} />
              </div>
              <div style={{fontSize:13,fontWeight:600,color:'#9ca3af'}}>Ingredients</div>
              {recipeForm.ingredients.map((ing,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr auto',gap:6}}>
                  <input value={ing.amount} onChange={e=>{const a=[...recipeForm.ingredients];a[i]={...a[i],amount:e.target.value};setRecipeForm(f=>({...f,ingredients:a}))}} placeholder="Amt" style={S.input} />
                  <input value={ing.unit} onChange={e=>{const a=[...recipeForm.ingredients];a[i]={...a[i],unit:e.target.value};setRecipeForm(f=>({...f,ingredients:a}))}} placeholder="Unit" style={S.input} />
                  <input value={ing.name} onChange={e=>{const a=[...recipeForm.ingredients];a[i]={...a[i],name:e.target.value};setRecipeForm(f=>({...f,ingredients:a}))}} placeholder="Name" style={S.input} />
                  <button onClick={()=>{const a=recipeForm.ingredients.filter((_,j)=>j!==i);setRecipeForm(f=>({...f,ingredients:a.length?a:[{amount:'',unit:'',name:''}]}))}} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:18,padding:'0 4px'}}>✕</button>
                </div>
              ))}
              <button onClick={()=>setRecipeForm(f=>({...f,ingredients:[...f.ingredients,{amount:'',unit:'',name:''}]}))} style={{color:'#3b82f6',background:'transparent',border:'none',cursor:'pointer',fontSize:14,textAlign:'left',padding:0}}>+ Ingredient</button>
              <div style={{fontSize:13,fontWeight:600,color:'#9ca3af'}}>Instructions</div>
              {recipeForm.instructions.map((step,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:6,alignItems:'flex-start'}}>
                  <span style={{fontSize:13,color:'#6b7280',paddingTop:14,width:20}}>{i+1}.</span>
                  <textarea value={step} onChange={e=>{const a=[...recipeForm.instructions];a[i]=e.target.value;setRecipeForm(f=>({...f,instructions:a}))}} placeholder={`Step ${i+1}`} rows={2} style={{...S.input,resize:'none'}} />
                  <button onClick={()=>{const a=recipeForm.instructions.filter((_,j)=>j!==i);setRecipeForm(f=>({...f,instructions:a.length?a:['']}))}}>
                    <span style={{color:'#6b7280',fontSize:18,cursor:'pointer'}}>✕</span>
                  </button>
                </div>
              ))}
              <button onClick={()=>setRecipeForm(f=>({...f,instructions:[...f.instructions,'']}))} style={{color:'#3b82f6',background:'transparent',border:'none',cursor:'pointer',fontSize:14,textAlign:'left',padding:0}}>+ Step</button>
              <input value={recipeForm.sourceUrl} onChange={e=>setRecipeForm(f=>({...f,sourceUrl:e.target.value}))} placeholder="Source URL (optional)" style={S.input} />
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #1e293b'}}>
              <button onClick={addRecipe} style={{...S.btn('primary'),width:'100%'}}>Save Recipe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Mobile Page ─────────────────────────────────────────────────────────
export default function MobilePage() {
  const [tab, setTab] = useState<Tab>('calendar')

  const TAB_TITLES: Record<Tab,string> = {
    calendar: 'Calendar', tasks: 'Tasks', grocery: 'Grocery List', meals: 'Meal Planner', more: 'More'
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.headerTitle}>{TAB_TITLES[tab]}</span>
        <span style={{fontSize:13,color:'#6b7280'}}>Hill Family</span>
      </div>

      {/* Tab Content */}
      <div style={S.content}>
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'grocery' && <GroceryTab />}
        {tab === 'meals' && <MealsTab />}
        {tab === 'more' && <MoreTab />}
      </div>

      {/* Bottom Nav */}
      <nav style={S.nav}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={S.navBtn(tab===t.id)}>
            <span style={S.navIcon}>{t.icon}</span>
            <span style={S.navLabel(tab===t.id)}>{t.label}</span>
          </button>
        ))}
      </nav>

      <InstallPrompt />
    </div>
  )
}
