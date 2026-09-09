import { useState, useMemo } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Plus, X, CheckCircle2, Circle, Trash2, Edit2, StickyNote,
  Search, Pin, Copy, Check, CheckSquare, Sparkles, Filter, Grid3X3,
  List, Calendar, ArrowUpDown, ChevronRight, PanelLeftClose, PanelLeft,
  Folder, Star, Clock, AlertCircle, Eye
} from "lucide-react"

// Color palettes for notes
const COLOR_CONFIG = {
  yellow: {
    name: "Yellow",
    card: "bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:border-amber-300 dark:hover:border-amber-700",
    header: "text-amber-900 dark:text-amber-200",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    swatch: "bg-amber-400 dark:bg-amber-500",
    dot: "bg-amber-400",
    accent: "text-amber-600 dark:text-amber-400",
    progress: "bg-amber-500",
  },
  blue: {
    name: "Blue",
    card: "bg-sky-50/90 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60 hover:border-sky-300 dark:hover:border-sky-700",
    header: "text-sky-900 dark:text-sky-200",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    swatch: "bg-sky-400 dark:bg-sky-500",
    dot: "bg-sky-400",
    accent: "text-sky-600 dark:text-sky-400",
    progress: "bg-sky-500",
  },
  green: {
    name: "Green",
    card: "bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-300 dark:hover:border-emerald-700",
    header: "text-emerald-900 dark:text-emerald-200",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    swatch: "bg-emerald-400 dark:bg-emerald-500",
    dot: "bg-emerald-400",
    accent: "text-emerald-600 dark:text-emerald-400",
    progress: "bg-emerald-500",
  },
  purple: {
    name: "Purple",
    card: "bg-purple-50/90 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 hover:border-purple-300 dark:hover:border-purple-700",
    header: "text-purple-900 dark:text-purple-200",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    swatch: "bg-purple-400 dark:bg-purple-500",
    dot: "bg-purple-400",
    accent: "text-purple-600 dark:text-purple-400",
    progress: "bg-purple-500",
  },
  red: {
    name: "Red / Coral",
    card: "bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 hover:border-rose-300 dark:hover:border-rose-700",
    header: "text-rose-900 dark:text-rose-200",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    swatch: "bg-rose-400 dark:bg-rose-500",
    dot: "bg-rose-400",
    accent: "text-rose-600 dark:text-rose-400",
    progress: "bg-rose-500",
  },
  orange: {
    name: "Orange",
    card: "bg-orange-50/90 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/60 hover:border-orange-300 dark:hover:border-orange-700",
    header: "text-orange-900 dark:text-orange-200",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    swatch: "bg-orange-400 dark:bg-orange-500",
    dot: "bg-orange-400",
    accent: "text-orange-600 dark:text-orange-400",
    progress: "bg-orange-500",
  },
  pink: {
    name: "Pink",
    card: "bg-pink-50/90 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800/60 hover:border-pink-300 dark:hover:border-pink-700",
    header: "text-pink-900 dark:text-pink-200",
    badge: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    swatch: "bg-pink-400 dark:bg-pink-500",
    dot: "bg-pink-400",
    accent: "text-pink-600 dark:text-pink-400",
    progress: "bg-pink-500",
  },
  gray: {
    name: "Slate",
    card: "bg-slate-100/90 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
    header: "text-slate-900 dark:text-slate-100",
    badge: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    swatch: "bg-slate-400 dark:bg-slate-500",
    dot: "bg-slate-400",
    accent: "text-slate-600 dark:text-slate-400",
    progress: "bg-slate-500",
  },
}

export default function Notes() {
  const qc = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState("all") // 'all', 'pinned', 'with-todos', 'recent', or color name
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState("grid") // 'grid' | 'list'
  const [sortBy, setSortBy] = useState("newest") // 'newest' | 'oldest' | 'title'
  
  const [createNoteOpen, setCreateNoteOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  const [noteDetailOpen, setNoteDetailOpen] = useState(false)

  // Quick form for new note
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    color: "yellow",
    pinned: false,
    initialTodos: "",
  })

  // Local state for pinned notes (supports localStorage caching if not stored in DB)
  const [pinnedMap, setPinnedMap] = useState(() => {
    try {
      const saved = localStorage.getItem("rama_pinned_notes")
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const togglePinLocal = (noteId) => {
    setPinnedMap((prev) => {
      const next = { ...prev, [noteId]: !prev[noteId] }
      try {
        localStorage.setItem("rama_pinned_notes", JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // 1. Fetch all notes
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) {
        console.warn("Could not fetch notes from Supabase:", error)
        return []
      }
      return data ?? []
    },
  })

  // 2. Fetch all todos for summary cards
  const { data: allTodos = [] } = useQuery({
    queryKey: ["all-note-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("note_todos")
        .select("*")
        .order("created_at", { ascending: true })
      if (error) {
        console.warn("Could not fetch note_todos:", error)
        return []
      }
      return data ?? []
    },
  })

  // Map todos by note_id
  const todosByNoteId = useMemo(() => {
    const map = {}
    allTodos.forEach((todo) => {
      if (!map[todo.note_id]) map[todo.note_id] = []
      map[todo.note_id].push(todo)
    })
    return map
  }, [allTodos])

  // Create Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async (formData) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: newNote, error } = await supabase
        .from("notes")
        .insert({
          title: formData.title.trim(),
          content: formData.content.trim(),
          color: formData.color || "yellow",
          created_by: user?.id || null,
        })
        .select()
        .single()
      
      if (error) throw error

      if (formData.pinned && newNote?.id) {
        togglePinLocal(newNote.id)
      }

      // Add initial todos if provided (separated by newlines)
      if (formData.initialTodos?.trim() && newNote?.id) {
        const todoLines = formData.initialTodos
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)

        if (todoLines.length > 0) {
          const rows = todoLines.map((title) => ({
            note_id: newNote.id,
            title,
            completed: false,
          }))
          await supabase.from("note_todos").insert(rows)
        }
      }

      return newNote
    },
    onSuccess: () => {
      toast.success("Note created successfully!")
      qc.invalidateQueries({ queryKey: ["notes"] })
      qc.invalidateQueries({ queryKey: ["all-note-todos"] })
      setCreateNoteOpen(false)
      setNoteForm({ title: "", content: "", color: "yellow", pinned: false, initialTodos: "" })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create note")
    },
  })

  // Delete Note Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("notes").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Note deleted")
      qc.invalidateQueries({ queryKey: ["notes"] })
      qc.invalidateQueries({ queryKey: ["all-note-todos"] })
      if (selectedNote && noteDetailOpen) {
        setNoteDetailOpen(false)
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete note")
    },
  })

  // Quick Toggle Todo from Card
  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase.from("note_todos").update({ completed }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-note-todos"] })
      qc.invalidateQueries({ queryKey: ["note-todos"] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update task")
    },
  })

  // Copy Note content helper
  const copyNoteToClipboard = (note) => {
    const noteTodos = todosByNoteId[note.id] || []
    let text = `${note.title}\n`
    if (note.content) text += `\n${note.content}\n`
    if (noteTodos.length > 0) {
      text += `\nChecklist:\n`
      noteTodos.forEach((t) => {
        text += `${t.completed ? "[✓]" : "[ ]"} ${t.title}\n`
      })
    }
    navigator.clipboard.writeText(text.trim())
    toast.success("Copied note to clipboard!")
  }

  // Filter and Sort notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const noteTodos = todosByNoteId[note.id] || []
      const isPinned = Boolean(pinnedMap[note.id] || note.pinned)
      const hasTodos = noteTodos.length > 0
      
      // Filter by selection
      if (selectedFilter === "pinned" && !isPinned) return false
      if (selectedFilter === "with-todos" && !hasTodos) return false
      if (selectedFilter === "recent") {
        const created = new Date(note.created_at)
        const daysDiff = (Date.now() - created.getTime()) / (1000 * 3600 * 24)
        if (daysDiff > 7) return false
      }
      if (Object.keys(COLOR_CONFIG).includes(selectedFilter)) {
        if (note.color !== selectedFilter) return false
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = note.title?.toLowerCase().includes(query)
        const matchContent = note.content?.toLowerCase().includes(query)
        const matchTodo = noteTodos.some((t) => t.title?.toLowerCase().includes(query))
        if (!matchTitle && !matchContent && !matchTodo) return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "")
      // newest default
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [notes, selectedFilter, searchQuery, sortBy, pinnedMap, todosByNoteId])

  // Split into pinned and unpinned for nice layout
  const pinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => Boolean(pinnedMap[n.id] || n.pinned))
  }, [filteredNotes, pinnedMap])

  const otherNotes = useMemo(() => {
    return filteredNotes.filter((n) => !Boolean(pinnedMap[n.id] || n.pinned))
  }, [filteredNotes, pinnedMap])

  // Sidebar Counts
  const counts = useMemo(() => {
    const total = notes.length
    const pinned = notes.filter((n) => Boolean(pinnedMap[n.id] || n.pinned)).length
    const withTodos = notes.filter((n) => (todosByNoteId[n.id]?.length || 0) > 0).length
    const totalTodosCount = allTodos.length
    const completedTodosCount = allTodos.filter((t) => t.completed).length

    const byColor = {}
    Object.keys(COLOR_CONFIG).forEach((c) => {
      byColor[c] = notes.filter((n) => n.color === c).length
    })

    return { total, pinned, withTodos, totalTodosCount, completedTodosCount, byColor }
  }, [notes, pinnedMap, todosByNoteId, allTodos])

  const openNoteDetail = (note) => {
    setSelectedNote(note)
    setNoteDetailOpen(true)
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] rounded-2xl overflow-hidden bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl">
      {/* ----------------- NOTES SIDEBAR ----------------- */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-16"
        } transition-all duration-300 bg-slate-50/90 dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 select-none`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20">
              <StickyNote className="size-5" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h2 className="font-semibold text-sm text-slate-900 dark:text-white truncate">Notes Hub</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{counts.total} notes recorded</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
          </Button>
        </div>

        {/* Sidebar Create Button */}
        <div className="p-3">
          <Button
            onClick={() => setCreateNoteOpen(true)}
            className={`w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 transition-all ${
              !sidebarOpen ? "p-0 justify-center" : "justify-start"
            }`}
          >
            <Plus className="size-4 shrink-0" />
            {sidebarOpen && <span className="ml-2 font-medium">New Note</span>}
          </Button>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div className="space-y-1">
            {sidebarOpen && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Views
              </p>
            )}

            <SidebarNavItem
              icon={Folder}
              label="All Notes"
              count={counts.total}
              active={selectedFilter === "all"}
              onClick={() => setSelectedFilter("all")}
              sidebarOpen={sidebarOpen}
            />

            <SidebarNavItem
              icon={Star}
              label="Pinned Notes"
              count={counts.pinned}
              active={selectedFilter === "pinned"}
              onClick={() => setSelectedFilter("pinned")}
              sidebarOpen={sidebarOpen}
              iconColor="text-amber-500"
            />

            <SidebarNavItem
              icon={CheckSquare}
              label="With Checklists"
              count={counts.withTodos}
              active={selectedFilter === "with-todos"}
              onClick={() => setSelectedFilter("with-todos")}
              sidebarOpen={sidebarOpen}
              iconColor="text-emerald-500"
            />

            <SidebarNavItem
              icon={Clock}
              label="Recent (7 Days)"
              active={selectedFilter === "recent"}
              onClick={() => setSelectedFilter("recent")}
              sidebarOpen={sidebarOpen}
              iconColor="text-sky-500"
            />
          </div>

          {/* Color Palettes Section */}
          <div className="space-y-1">
            {sidebarOpen && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
                <span>Color Tags</span>
                <span className="text-[10px] font-normal text-slate-400">Filter</span>
              </p>
            )}

            {Object.entries(COLOR_CONFIG).map(([colorKey, cfg]) => {
              const count = counts.byColor[colorKey] || 0
              const isActive = selectedFilter === colorKey
              return (
                <button
                  key={colorKey}
                  onClick={() => setSelectedFilter(isActive ? "all" : colorKey)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-300 dark:ring-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title={cfg.name}
                >
                  <span className={`size-3 rounded-full shrink-0 ${cfg.swatch} ring-2 ring-white dark:ring-slate-900 shadow-sm`} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left truncate">{cfg.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar Footer Stats */}
        {sidebarOpen && counts.totalTodosCount > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Tasks Progress
              </span>
              <span>
                {counts.completedTodosCount} / {counts.totalTodosCount}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${counts.totalTodosCount ? (counts.completedTodosCount / counts.totalTodosCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </aside>

      {/* ----------------- MAIN NOTES WORKSPACE ----------------- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
        {/* Top Action Bar */}
        <header className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {selectedFilter === "all" && "All Notes"}
                {selectedFilter === "pinned" && "Pinned Notes ⭐"}
                {selectedFilter === "with-todos" && "Checklists & Tasks 📋"}
                {selectedFilter === "recent" && "Recent Notes (7 Days) 🕒"}
                {COLOR_CONFIG[selectedFilter] && `${COLOR_CONFIG[selectedFilter].name} Notes`}
                <Badge variant="outline" className="text-xs font-semibold ml-2">
                  {filteredNotes.length}
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize thoughts, manage checklist todos, and customize notes
              </p>
            </div>
          </div>

          {/* Search, Sort, and View Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search notes or tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-sm">
              <button
                onClick={() => setSortBy("newest")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === "newest" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                }`}
                title="Sort by Newest"
              >
                Newest
              </button>
              <button
                onClick={() => setSortBy("title")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === "title" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                }`}
                title="Sort Alphabetically"
              >
                A-Z
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-400"
                }`}
                title="Grid View"
              >
                <Grid3X3 className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "list" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-400"
                }`}
                title="List View"
              >
                <List className="size-4" />
              </button>
            </div>

            {/* Primary New Note Action */}
            <Button
              size="sm"
              onClick={() => setCreateNoteOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20"
            >
              <Plus className="mr-1.5 size-4" /> Add Note
            </Button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
          {notesLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="size-8 animate-spin text-amber-500 mb-3" />
              <p className="text-sm font-medium">Loading your notes and checklists...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-12 text-center shadow-sm border border-slate-200 dark:border-slate-800 max-w-md mx-auto my-12">
              <div className="size-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-500 grid place-items-center mx-auto mb-4">
                <StickyNote className="size-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No notes found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {searchQuery
                  ? `No results matching "${searchQuery}". Try a different keyword.`
                  : selectedFilter !== "all"
                  ? "No notes found in this category or color filter."
                  : "Start by writing down your ideas, checklist items, or important reminders."}
              </p>
              <Button
                onClick={() => {
                  if (searchQuery || selectedFilter !== "all") {
                    setSearchQuery("")
                    setSelectedFilter("all")
                  } else {
                    setCreateNoteOpen(true)
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-md"
              >
                {searchQuery || selectedFilter !== "all" ? "Clear Filters" : <><Plus className="mr-2 size-4" /> Create First Note</>}
              </Button>
            </div>
          ) : (
            <>
              {/* Pinned Notes Section */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Star className="size-3.5 text-amber-500 fill-amber-500" />
                    <span>Pinned Notes ({pinnedNotes.length})</span>
                  </div>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
                        : "flex flex-col gap-3"
                    }
                  >
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isPinned={true}
                        todos={todosByNoteId[note.id] || []}
                        viewMode={viewMode}
                        onOpen={() => openNoteDetail(note)}
                        onDelete={() => deleteNoteMutation.mutate(note.id)}
                        onTogglePin={() => togglePinLocal(note.id)}
                        onCopy={() => copyNoteToClipboard(note)}
                        onToggleTodo={(todoId, completed) =>
                          toggleTodoMutation.mutate({ id: todoId, completed })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Notes Section */}
              {otherNotes.length > 0 && (
                <div className="space-y-3">
                  {pinnedNotes.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">
                      <Folder className="size-3.5" />
                      <span>Other Notes ({otherNotes.length})</span>
                    </div>
                  )}
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
                        : "flex flex-col gap-3"
                    }
                  >
                    {otherNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isPinned={false}
                        todos={todosByNoteId[note.id] || []}
                        viewMode={viewMode}
                        onOpen={() => openNoteDetail(note)}
                        onDelete={() => deleteNoteMutation.mutate(note.id)}
                        onTogglePin={() => togglePinLocal(note.id)}
                        onCopy={() => copyNoteToClipboard(note)}
                        onToggleTodo={(todoId, completed) =>
                          toggleTodoMutation.mutate({ id: todoId, completed })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ----------------- CREATE NOTE DIALOG ----------------- */}
      <Dialog open={createNoteOpen} onOpenChange={setCreateNoteOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              Create New Note
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Add a colorful note with optional checklist tasks
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!noteForm.title.trim()) return
              createNoteMutation.mutate(noteForm)
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <Label htmlFor="create-note-title" className="text-xs font-semibold">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-note-title"
                placeholder="e.g. Project brainstorm, Server setup checklist..."
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                required
                autoFocus
                className="mt-1 font-medium bg-slate-50 dark:bg-slate-800 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="create-note-content" className="text-xs font-semibold">
                Content / Notes
              </Label>
              <Textarea
                id="create-note-content"
                placeholder="Write your note details, markdown links, or ideas here..."
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                rows={3}
                className="mt-1 bg-slate-50 dark:bg-slate-800 rounded-xl resize-none"
              />
            </div>

            <div>
              <Label htmlFor="create-note-todos" className="text-xs font-semibold flex items-center justify-between">
                <span>Checklist Tasks (Optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">One item per line</span>
              </Label>
              <Textarea
                id="create-note-todos"
                placeholder="Task 1&#10;Task 2&#10;Task 3"
                value={noteForm.initialTodos}
                onChange={(e) => setNoteForm({ ...noteForm, initialTodos: e.target.value })}
                rows={3}
                className="mt-1 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl font-mono"
              />
            </div>

            {/* Color Swatches */}
            <div>
              <Label className="text-xs font-semibold block mb-2">Color Theme</Label>
              <div className="flex gap-2.5 flex-wrap">
                {Object.entries(COLOR_CONFIG).map(([colorKey, cfg]) => (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setNoteForm({ ...noteForm, color: colorKey })}
                    className={`size-8 rounded-full transition-transform flex items-center justify-center ${cfg.swatch} ${
                      noteForm.color === colorKey
                        ? "ring-4 ring-amber-500/40 scale-110 shadow-md"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    title={cfg.name}
                  >
                    {noteForm.color === colorKey && <Check className="size-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Pin to top checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pin-on-create"
                checked={noteForm.pinned}
                onChange={(e) => setNoteForm({ ...noteForm, pinned: e.target.checked })}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <Label htmlFor="pin-on-create" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                <Star className="size-3.5 text-amber-500" />
                Pin to top of workspace
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setCreateNoteOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createNoteMutation.isPending || !noteForm.title.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/20"
              >
                {createNoteMutation.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                ) : (
                  <><Plus className="mr-2 size-4" /> Create Note</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------- NOTE DETAIL & TASK MANAGER DIALOG ----------------- */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          open={noteDetailOpen}
          isPinned={Boolean(pinnedMap[selectedNote.id] || selectedNote.pinned)}
          onOpenChange={setNoteDetailOpen}
          onTogglePin={() => togglePinLocal(selectedNote.id)}
          onDeleteNote={() => deleteNoteMutation.mutate(selectedNote.id)}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Subcomponent: Sidebar Nav Item
// -------------------------------------------------------------
function SidebarNavItem({ icon: Icon, label, count, active, onClick, sidebarOpen, iconColor = "text-slate-500" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
        active
          ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-semibold"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
      }`}
      title={label}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-white" : iconColor}`} />
      {sidebarOpen && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                active ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {count}
            </span>
          )}
        </>
      )}
    </button>
  )
}

// -------------------------------------------------------------
// Subcomponent: Note Card (Rich Color, Checklist Preview, Actions)
// -------------------------------------------------------------
function NoteCard({ note, isPinned, todos, viewMode, onOpen, onDelete, onTogglePin, onCopy, onToggleTodo }) {
  const colorCfg = COLOR_CONFIG[note.color] || COLOR_CONFIG.yellow
  const completedCount = todos.filter((t) => t.completed).length
  const totalTodos = todos.length
  const progressPercent = totalTodos > 0 ? Math.round((completedCount / totalTodos) * 100) : 0

  const formattedDate = useMemo(() => {
    if (!note.created_at) return ""
    try {
      const date = new Date(note.created_at)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    } catch {
      return ""
    }
  }, [note.created_at])

  if (viewMode === "list") {
    return (
      <div
        onClick={onOpen}
        className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between gap-4 ${colorCfg.card}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin()
            }}
            className="text-slate-400 hover:text-amber-500 shrink-0 transition-colors"
            title={isPinned ? "Unpin Note" : "Pin Note"}
          >
            <Star className={`size-4 ${isPinned ? "text-amber-500 fill-amber-500" : ""}`} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-sm truncate ${colorCfg.header}`}>{note.title}</h3>
              {note.color && (
                <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${colorCfg.badge}`}>
                  {colorCfg.name}
                </Badge>
              )}
            </div>
            {note.content && (
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">{note.content}</p>
            )}
          </div>
        </div>

        {/* List Right Meta */}
        <div className="flex items-center gap-3 shrink-0">
          {totalTodos > 0 && (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
              <CheckSquare className="size-3.5 text-emerald-500" />
              {completedCount}/{totalTodos} ({progressPercent}%)
            </span>
          )}

          <span className="text-xs text-slate-400 hidden sm:inline">{formattedDate}</span>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" onClick={onCopy} title="Copy note">
              <Copy className="size-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={onDelete} title="Delete note">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Grid Mode Card
  return (
    <div
      onClick={onOpen}
      className={`group relative p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between min-h-[220px] ${colorCfg.card}`}
    >
      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 ${colorCfg.badge}`}>
            {colorCfg.name}
          </Badge>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onTogglePin}
              className={`p-1.5 rounded-lg transition-colors ${
                isPinned
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100"
              }`}
              title={isPinned ? "Unpin Note" : "Pin Note"}
            >
              <Star className={`size-4 ${isPinned ? "fill-amber-500" : ""}`} />
            </button>

            <button
              onClick={onCopy}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy Note Text"
            >
              <Copy className="size-3.5" />
            </button>

            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete Note"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Note Title */}
        <h3 className={`font-bold text-base leading-snug mb-1.5 line-clamp-2 ${colorCfg.header}`}>
          {note.title}
        </h3>

        {/* Note Content */}
        {note.content && (
          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
            {note.content}
          </p>
        )}

        {/* Interactive Checklist Preview */}
        {totalTodos > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CheckSquare className="size-3 text-emerald-500" />
                Checklist ({completedCount}/{totalTodos})
              </span>
              <span>{progressPercent}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${colorCfg.progress}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* First 2 items preview with quick toggle */}
            <div className="space-y-1 pt-1" onClick={(e) => e.stopPropagation()}>
              {todos.slice(0, 2).map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => onToggleTodo(todo.id, !todo.completed)}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40 p-1 rounded-md transition-colors cursor-pointer"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="size-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className={`truncate text-[11px] ${todo.completed ? "line-through text-slate-400" : ""}`}>
                    {todo.title}
                  </span>
                </div>
              ))}
              {totalTodos > 2 && (
                <p className="text-[10px] text-slate-400 italic pl-1">
                  +{totalTodos - 2} more tasks...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/40 dark:border-slate-800/40">
        <span className="flex items-center gap-1">
          <Calendar className="size-3 text-slate-400" />
          {formattedDate}
        </span>

        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
          View & Edit <ChevronRight className="size-3" />
        </span>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Subcomponent: Note Detail Modal (Edit Note, Add/Delete Todos)
// -------------------------------------------------------------
function NoteDetailModal({ note, open, isPinned, onOpenChange, onTogglePin, onDeleteNote }) {
  const qc = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: note.title,
    content: note.content || "",
    color: note.color || "yellow",
  })
  const [newTodoTitle, setNewTodoTitle] = useState("")

  // Query todos specifically for this note with fallback
  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: ["note-todos", note.id],
    queryFn: async () => {
      // Direct table query for 100% reliability
      const { data, error } = await supabase
        .from("note_todos")
        .select("*")
        .eq("note_id", note.id)
        .order("created_at", { ascending: true })

      if (error) {
        console.warn("Could not fetch note_todos:", error)
        return []
      }
      return data ?? []
    },
    enabled: open,
  })

  // Update Note Mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("notes").update(data).eq("id", note.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Note saved successfully")
      qc.invalidateQueries({ queryKey: ["notes"] })
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update note")
    },
  })

  // Add Todo Mutation
  const addTodoMutation = useMutation({
    mutationFn: async (title) => {
      const { error } = await supabase.from("note_todos").insert({
        note_id: note.id,
        title: title.trim(),
        completed: false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewTodoTitle("")
      qc.invalidateQueries({ queryKey: ["note-todos", note.id] })
      qc.invalidateQueries({ queryKey: ["all-note-todos"] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add task")
    },
  })

  // Toggle Todo Mutation
  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase.from("note_todos").update({ completed }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["note-todos", note.id] })
      qc.invalidateQueries({ queryKey: ["all-note-todos"] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update task")
    },
  })

  // Delete Todo Mutation
  const deleteTodoMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("note_todos").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["note-todos", note.id] })
      qc.invalidateQueries({ queryKey: ["all-note-todos"] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete task")
    },
  })

  // Clear Completed Todos
  const clearCompletedTodosMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("note_todos")
        .delete()
        .eq("note_id", note.id)
        .eq("completed", true)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Completed tasks cleared")
      qc.invalidateQueries({ queryKey: ["note-todos", note.id] })
      qc.invalidateQueries({ queryKey: ["all-note-todos"] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to clear completed tasks")
    },
  })

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length
  const colorCfg = COLOR_CONFIG[editForm.color] || COLOR_CONFIG.yellow

  const handleAddTodo = (e) => {
    e.preventDefault()
    if (!newTodoTitle.trim()) return
    addTodoMutation.mutate(newTodoTitle)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateNoteMutation.mutate(editForm)
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label className="text-xs font-semibold">Title</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="font-bold text-lg mt-1 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Content</Label>
                    <Textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      rows={4}
                      className="mt-1 bg-slate-50 dark:bg-slate-800 rounded-xl resize-none text-sm"
                    />
                  </div>

                  {/* Color Palette Picker */}
                  <div>
                    <Label className="text-xs font-semibold block mb-1.5">Color Palette</Label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(COLOR_CONFIG).map(([colorKey, cfg]) => (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color: colorKey })}
                          className={`size-7 rounded-full transition-transform flex items-center justify-center ${cfg.swatch} ${
                            editForm.color === colorKey
                              ? "ring-4 ring-amber-500/40 scale-110"
                              : "hover:scale-105 opacity-80"
                          }`}
                          title={cfg.name}
                        >
                          {editForm.color === colorKey && <Check className="size-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={updateNoteMutation.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs"
                    >
                      {updateNoteMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`text-xs ${colorCfg.badge}`}>
                      {colorCfg.name}
                    </Badge>
                    {isPinned && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs">
                        ⭐ Pinned
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                    {note.title}
                  </DialogTitle>
                  {note.content && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Top Right Actions */}
            {!isEditing && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className={`size-8 ${isPinned ? "text-amber-500" : "text-slate-400"}`}
                  onClick={onTogglePin}
                  title={isPinned ? "Unpin Note" : "Pin Note"}
                >
                  <Star className={`size-4 ${isPinned ? "fill-amber-500" : ""}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  onClick={() => setIsEditing(true)}
                  title="Edit Note"
                >
                  <Edit2 className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={onDeleteNote}
                  title="Delete Note"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ----------------- CHECKLIST SECTION ----------------- */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="size-4 text-emerald-500" />
                Checklist Tasks ({completedCount}/{totalCount})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage tasks and tick them off as you go</p>
            </div>

            {completedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearCompletedTodosMutation.mutate()}
                disabled={clearCompletedTodosMutation.isPending}
                className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-7"
              >
                Clear completed
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          )}

          {/* Add Todo Input */}
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <Input
              placeholder="Add a new task (press Enter)..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 rounded-xl"
            />
            <Button
              type="submit"
              size="sm"
              disabled={addTodoMutation.isPending || !newTodoTitle.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0"
            >
              {addTodoMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </Button>
          </form>

          {/* Todo Items List */}
          {todosLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No tasks in this note yet. Add your first item above.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    todo.completed
                      ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTodoMutation.mutate({ id: todo.id, completed: !todo.completed })}
                    className="shrink-0 transition-transform active:scale-90"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="size-5 text-emerald-500" />
                    ) : (
                      <Circle className="size-5 text-slate-400 hover:text-emerald-500 transition-colors" />
                    )}
                  </button>

                  <span
                    className={`flex-1 text-xs select-text ${
                      todo.completed
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : "text-slate-900 dark:text-slate-100 font-medium"
                    }`}
                  >
                    {todo.title}
                  </span>

                  <button
                    type="button"
                    onClick={() => deleteTodoMutation.mutate(todo.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
