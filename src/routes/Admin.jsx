import { useEffect, useState, useRef, useMemo } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import Employees from "@/components/admin/Employees"
import EmployeeProfile from "@/components/admin/EmployeeProfile"
import Projects from "@/components/admin/Projects"
import IdCards from "@/components/admin/IdCards"
import Letters from "@/components/admin/Letters"
import Payroll from "@/components/admin/Payroll"
import Plan from "@/routes/Plan"
import Notes from "@/routes/Notes"
import Analytics from "@/components/admin/Analytics"
import Reports from "@/components/admin/Reports"
import NotificationCenter from "@/components/notifications/NotificationCenter"
import ChatApp from "@/components/chat/ChatApp"
import {
  Mail, Phone, Trash2, LogOut, Loader2, Inbox, Newspaper, ShieldCheck,
  Search, Sparkles, Plus, Eye, EyeOff, MapPin, CalendarDays, Users,
  ChevronLeft, ChevronRight, UserPlus, ShieldOff, Upload, X, Paperclip,
  Image, Edit, LayoutDashboard, MessageSquare, MessageCircle, FileText, Settings, Menu,
  Bell, TrendingUp, Clock, CheckCircle2, AlertCircle, MoreVertical,
  FolderKanban, IdCard, FileSignature, UserCircle, ClipboardList, StickyNote,
  Sun, Moon, Key, Save, Coins, Activity, ArrowUpRight, ShieldAlert,
  Compass, Layers, Zap, Check, Lock, ChevronDown, CheckCircle
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

const CATEGORIES = ["news", "career", "internship", "event"]

function slugify(v) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
}

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setIsAdmin(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const check = async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle()
        return !!data
      }
      let ok = await check()
      if (!ok) {
        await supabase.rpc("claim_initial_admin")
        ok = await check()
      }
      if (!cancelled) setIsAdmin(ok)
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  if (!ready) return (
    <div className="min-h-screen grid place-items-center bg-[#090b10] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 grid place-items-center animate-pulse">
          <ShieldCheck className="size-5 text-white" />
        </div>
        <Loader2 className="size-5 animate-spin text-amber-500" />
      </div>
    </div>
  )

  if (!session) return <AuthCard />
  if (isAdmin === null) return (
    <div className="min-h-screen grid place-items-center bg-[#090b10] text-white">
      <Loader2 className="size-6 animate-spin text-amber-500" />
    </div>
  )
  if (!isAdmin) return <NoAccess />
  return <Dashboard email={session.user.email ?? ""} userId={session.user.id} />
}

async function signOut() {
  await supabase.auth.signOut()
  window.location.assign("/admin")
}

function NoAccess() {
  return (
    <div className="relative min-h-screen grid place-items-center overflow-hidden bg-[#090b10] text-slate-100 p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl p-8 text-center shadow-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-lg">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Access Restricted</h1>
        <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
          This account is authenticated but not granted administrator privileges for Rama Command Suite.
        </p>
        <Button className="mt-8 rounded-xl h-11 px-6 bg-white/10 hover:bg-white/15 text-white border border-white/10 font-medium" onClick={signOut}>
          <LogOut className="mr-2 size-4" /> Sign In Different Account
        </Button>
      </div>
    </div>
  )
}

function AuthCard() {
  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email: email.trim(), password })
        : supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { 
              emailRedirectTo: `${window.location.origin}/admin`,
              emailConfirm: true,
            },
          })
    const { error } = await fn
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(mode === "signin" ? "Signed in" : "Account created")
  }

  return (
    <div className="relative min-h-screen grid place-items-center overflow-hidden bg-[#090b10] text-slate-100 p-4">
      {/* Dynamic ambient backdrops */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 size-[36rem] rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-600/15 to-indigo-600/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 size-[28rem] rounded-full bg-indigo-500/10 blur-[120px]" />
      
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/85 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between">
          <div className="grid size-13 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-500/30">
            <ShieldCheck className="size-7" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-widest">
            <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
            Enterprise
          </div>
        </div>

        <h1 className="mt-7 text-2xl font-bold tracking-tight text-white">Rama Executive Suite</h1>
        <p className="mt-1.5 text-sm text-slate-400">High-assurance administrative gateway.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Corporate Email</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="h-11 rounded-xl bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/60 focus:ring-amber-500/30" 
              placeholder="executive@rama.com" 
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Access Secret</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              minLength={8} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="h-11 rounded-xl bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/60 focus:ring-amber-500/30" 
              placeholder="••••••••••••" 
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-amber-500/25 transition-all duration-300 hover:shadow-amber-500/40 hover:-translate-y-0.5" 
            disabled={busy}
          >
            {busy ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Authenticating…</>
            ) : mode === "signin" ? (
              "Sign In to Console"
            ) : (
              "Initialize Administrator"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-xs font-medium text-slate-400 hover:text-amber-400 transition-colors"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "First-time deployment? Create system admin" : "Return to credentials sign in"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ email, userId }) {
  const qc = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [globalSearch, setGlobalSearch] = useState("")
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const { isDark, toggleTheme } = useTheme()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem("rama_admin_read_notifs_" + userId)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem("rama_admin_dismissed_notifs_" + userId)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Data queries
  const { data: messages = [] } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: posts = [] } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: employees = [] } = useQuery({
    queryKey: ["admin-employees-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, status, department, full_name, salary")
      if (error) return []
      return data || []
    },
  })

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-projects-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, status, budget")
      if (error) return []
      return data || []
    },
  })

  const { data: adminTasks = [] } = useQuery({
    queryKey: ["admin-all-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) return []
      return data || []
    },
  })

  // Notifications aggregation
  const notifications = useMemo(() => {
    const list = []
    messages?.forEach((m) => {
      list.push({
        id: `msg-${m.id}`,
        type: "message",
        title: `Message from ${m.full_name || m.name || "Client"}`,
        description: m.subject ? `${m.subject}: ${m.message}` : m.message,
        sender: `${m.full_name || m.name || "Client"} (${m.email || ""})`,
        created_at: m.created_at,
        priority: !m.is_read ? "high" : "normal",
        isRead: m.is_read || readNotificationIds.includes(`msg-${m.id}`),
        actionTab: "messages",
        actionLabel: "View Messages",
      })
    })

    adminTasks?.forEach((t) => {
      const isUrgent = t.priority === "urgent" || t.priority === "high"
      if (t.status !== "done" && t.status !== "completed") {
        list.push({
          id: `task-${t.id}`,
          type: "task",
          title: `Task: ${t.title}`,
          description: `Priority: ${t.priority} • Status: ${t.status?.replace("_", " ")}${t.due_date ? ` • Due: ${new Date(t.due_date).toLocaleDateString()}` : ""}`,
          created_at: t.created_at,
          priority: isUrgent ? "urgent" : "normal",
          isRead: readNotificationIds.includes(`task-${t.id}`),
          actionTab: "projects",
          actionLabel: "Open Projects",
        })
      }
    })

    return list.filter((n) => !dismissedNotificationIds.includes(n.id))
  }, [messages, adminTasks, readNotificationIds, dismissedNotificationIds])

  const totalUnreadNotifications = useMemo(() => {
    return notifications.filter((n) => !readNotificationIds.includes(n.id) && !n.isRead).length
  }, [notifications, readNotificationIds])

  const handleMarkNotificationRead = (id) => {
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, id]))
      try {
        localStorage.setItem("rama_admin_read_notifs_" + userId, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const handleMarkAllNotificationsRead = () => {
    const allIds = notifications.map((n) => n.id)
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]))
      try {
        localStorage.setItem("rama_admin_read_notifs_" + userId, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const handleDismissNotification = (id) => {
    setDismissedNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, id]))
      try {
        localStorage.setItem("rama_admin_dismissed_notifs_" + userId, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const handleClearAllNotifications = () => {
    const allIds = notifications.map((n) => n.id)
    setDismissedNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]))
      try {
        localStorage.setItem("rama_admin_dismissed_notifs_" + userId, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Security credentials updated")
      setChangePasswordOpen(false)
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: passwordForm.currentPassword,
    })
    if (signInError) {
      toast.error("Current password verification failed")
      return
    }
    changePasswordMutation.mutate({ newPassword: passwordForm.newPassword })
  }

  const unreadMessagesCount = messages?.filter((m) => !m.is_read).length ?? 0
  const publishedPostsCount = posts?.filter((p) => p.published).length ?? 0
  const activeEmployeesCount = employees?.filter((e) => e.status === "active").length || employees?.length || 0
  const activeProjectsCount = projects?.filter((p) => p.status === "active").length || projects?.length || 0

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0d14] text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-300">
      
      {/* ─── SIDEBAR ─── */}
      <aside className={`${sidebarOpen ? 'w-68' : 'w-20'} relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border-r border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#0e121c]/95 backdrop-blur-2xl hidden lg:flex z-30 shadow-sm`}>
        
        {/* Brand Header */}
        <div className="h-18 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-white/[0.07]">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="size-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white grid place-items-center flex-shrink-0 shadow-md shadow-amber-500/25 ring-2 ring-amber-500/20">
              <ShieldCheck className="size-5" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-base text-slate-900 dark:text-white">RAMA</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">PRO</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 tracking-wide font-medium">Enterprise Suite</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          <SidebarNavGroup title="Command" sidebarOpen={sidebarOpen}>
            <SidebarNavBtn 
              icon={LayoutDashboard} 
              label="Overview" 
              active={activeTab === "dashboard"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("dashboard")} 
            />
            <SidebarNavBtn 
              icon={TrendingUp} 
              label="Analytics" 
              active={activeTab === "analytics"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("analytics")} 
            />
            <SidebarNavBtn 
              icon={FileText} 
              label="Reports" 
              active={activeTab === "reports"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("reports")} 
            />
          </SidebarNavGroup>

          <SidebarNavGroup title="Communications" sidebarOpen={sidebarOpen}>
            <SidebarNavBtn 
              icon={MessageCircle} 
              label="Team Live Chat" 
              active={activeTab === "chat"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("chat")} 
            />
            <SidebarNavBtn 
              icon={Bell} 
              label="Notifications" 
              badge={totalUnreadNotifications} 
              active={activeTab === "notifications"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("notifications")} 
            />
            <SidebarNavBtn 
              icon={MessageSquare} 
              label="Inquiries" 
              badge={unreadMessagesCount} 
              active={activeTab === "messages"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("messages")} 
            />
          </SidebarNavGroup>

          <SidebarNavGroup title="Human Capital" sidebarOpen={sidebarOpen}>
            <SidebarNavBtn 
              icon={Users} 
              label="Employees" 
              active={activeTab === "employees"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("employees")} 
            />
            <SidebarNavBtn 
              icon={Coins} 
              label="Payroll & Compensation" 
              active={activeTab === "payroll"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("payroll")} 
            />
            <SidebarNavBtn 
              icon={UserCircle} 
              label="Employee Directory" 
              active={activeTab === "employee-profile"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("employee-profile")} 
            />
            <SidebarNavBtn 
              icon={IdCard} 
              label="Smart ID Cards" 
              active={activeTab === "idcards"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("idcards")} 
            />
            <SidebarNavBtn 
              icon={FileSignature} 
              label="Official Letters" 
              active={activeTab === "letters"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("letters")} 
            />
          </SidebarNavGroup>

          <SidebarNavGroup title="Operations" sidebarOpen={sidebarOpen}>
            <SidebarNavBtn 
              icon={FolderKanban} 
              label="Projects & Tasks" 
              active={activeTab === "projects"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("projects")} 
            />
            <SidebarNavBtn 
              icon={Newspaper} 
              label="Press & Posts" 
              active={activeTab === "posts"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("posts")} 
            />
            <SidebarNavBtn 
              icon={ClipboardList} 
              label="Roadmap & Plans" 
              active={activeTab === "plans"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("plans")} 
            />
            <SidebarNavBtn 
              icon={StickyNote} 
              label="Executive Notes" 
              active={activeTab === "notes"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("notes")} 
            />
          </SidebarNavGroup>

          <SidebarNavGroup title="System" sidebarOpen={sidebarOpen}>
            <SidebarNavBtn 
              icon={Users} 
              label="Access Control (Admins)" 
              active={activeTab === "admins"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("admins")} 
            />
            <SidebarNavBtn 
              icon={Settings} 
              label="Security & Settings" 
              active={activeTab === "settings"} 
              sidebarOpen={sidebarOpen} 
              onClick={() => setActiveTab("settings")} 
            />
          </SidebarNavGroup>
        </nav>

        {/* Sidebar Footer - User status & Quick controls */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.07] bg-slate-100/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 rounded-xl ring-2 ring-amber-500/30 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl">
                {email?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Master Admin</span>
                </div>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="size-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" 
              onClick={signOut} 
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT VIEWPORT ─── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Global Glass Topbar */}
        <header className="h-18 px-5 lg:px-8 border-b border-slate-200/80 dark:border-white/[0.07] bg-white/80 dark:bg-[#0c1018]/80 backdrop-blur-xl flex items-center justify-between flex-shrink-0 z-20 transition-colors">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex size-9 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              title="Toggle Sidebar"
            >
              <Menu className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden size-9 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <Menu className="size-5" />
            </Button>

            {/* Global Breadcrumb / Status */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <span>Console</span>
                <span>/</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium capitalize">
                  {activeTab === "employee-profile" ? "Employee Directory" : activeTab.replace("-", " ")}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight capitalize leading-none mt-1">
                {activeTab === "employee-profile" ? "Employee Profile" : activeTab.replace("-", " ")}
              </h2>
            </div>
          </div>

          {/* Quick Action Hub on Topbar */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick Link pills */}
            <div className="hidden xl:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
              <button 
                onClick={() => setActiveTab("dashboard")} 
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab("employees")} 
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${activeTab === 'employees' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Staff
              </button>
              <button 
                onClick={() => setActiveTab("payroll")} 
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${activeTab === 'payroll' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Payroll
              </button>
              <button 
                onClick={() => setActiveTab("projects")} 
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${activeTab === 'projects' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Projects
              </button>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="size-9 rounded-xl border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-300 transition-colors"
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
            </Button>

            {/* Notification Bell with Ping */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setNotificationsOpen(true)}
              className="relative size-9 rounded-xl border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-300 transition-colors"
              title="Notifications"
            >
              <Bell className="size-4" />
              {totalUnreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 size-4.5 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
                  {totalUnreadNotifications}
                </span>
              )}
            </Button>

            {/* Environment Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production Live</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Stage */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-8 py-6 space-y-6">
          
          {/* Executive KPI Metric Banner (shown on Dashboard or as top quick insight) */}
          {activeTab === "dashboard" && (
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-white/10">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 size-80 rounded-full bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      System Operational • 99.98%
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    Welcome to Rama Executive Hub
                  </h1>
                  <p className="mt-1 text-sm text-slate-300 max-w-xl">
                    Unified platform control for corporate payroll, workforce management, official documents, communications, and projects.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button 
                    onClick={() => setActiveTab("letters")} 
                    className="h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-lg shadow-amber-500/25 transition-all"
                  >
                    <FileSignature className="mr-2 size-4" /> Generate Letter
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("payroll")} 
                    variant="outline" 
                    className="h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white border-white/20 backdrop-blur"
                  >
                    <Coins className="mr-2 size-4" /> Manage Payroll
                  </Button>
                </div>
              </div>

              {/* Quick stats mini row */}
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Staff</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-white">{activeEmployeesCount}</p>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <ArrowUpRight className="size-3" /> Team verified
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Projects</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-white">{activeProjectsCount}</p>
                  <span className="text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
                    <Activity className="size-3" /> Under execution
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Client Inquiries</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-white">{messages?.length || 0}</p>
                  <span className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5">
                    {unreadMessagesCount} unread
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Published Posts</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-white">{publishedPostsCount}</p>
                  <span className="text-[11px] text-teal-400 flex items-center gap-1 mt-0.5">
                    Live on Portal
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar (Visible when not on dashboard for fast cross-app reference) */}
          {activeTab !== "dashboard" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <QuickKpiCard 
                label="Total Staff" 
                value={activeEmployeesCount} 
                icon={Users} 
                color="indigo"
                onClick={() => setActiveTab("employees")}
              />
              <QuickKpiCard 
                label="Active Projects" 
                value={activeProjectsCount} 
                icon={FolderKanban} 
                color="amber"
                onClick={() => setActiveTab("projects")}
              />
              <QuickKpiCard 
                label="Unread Messages" 
                value={unreadMessagesCount} 
                icon={Mail} 
                color="rose"
                onClick={() => setActiveTab("messages")}
              />
              <QuickKpiCard 
                label="Pending Tasks" 
                value={adminTasks.filter(t => t.status !== "done" && t.status !== "completed").length} 
                icon={ClipboardList} 
                color="emerald"
                onClick={() => setActiveTab("projects")}
              />
            </div>
          )}

          {/* Tab Content Display */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            
            {/* 1. OVERVIEW DASHBOARD */}
            <TabsContent value="dashboard" className="space-y-6">
              
              {/* Quick Launch Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickLaunchCard 
                  title="Human Resources" 
                  desc="Employee roster, contracts & payroll records" 
                  icon={Users} 
                  gradient="from-blue-600 to-indigo-600"
                  onClick={() => setActiveTab("employees")}
                />
                <QuickLaunchCard 
                  title="Official Letters" 
                  desc="Issue verified PDF certificates & letters with QR" 
                  icon={FileSignature} 
                  gradient="from-amber-500 to-orange-600"
                  onClick={() => setActiveTab("letters")}
                />
                <QuickLaunchCard 
                  title="Projects & Roadmap" 
                  desc="Milestones, deliverables & collaborative boards" 
                  icon={FolderKanban} 
                  gradient="from-emerald-500 to-teal-600"
                  onClick={() => setActiveTab("projects")}
                />
                <QuickLaunchCard 
                  title="Inquiries & Leads" 
                  desc="Review and reply to incoming messages" 
                  icon={Inbox} 
                  gradient="from-purple-500 to-pink-600"
                  badge={unreadMessagesCount}
                  onClick={() => setActiveTab("messages")}
                />
              </div>

              {/* Split View: Analytics preview & Recent Activity */}
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Inquiries & Actions */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Recent Inquiries Card */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent Client Inquiries</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Direct messages submitted through the public portal</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("messages")} className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        View All <ArrowUpRight className="ml-1 size-3.5" />
                      </Button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                      {messages?.slice(0, 4).map((msg) => (
                        <div key={msg.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="size-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-bold text-xs grid place-items-center flex-shrink-0">
                              {(msg.full_name || msg.name || "U").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{msg.full_name || msg.name}</p>
                                {!msg.is_read && (
                                  <span className="size-2 rounded-full bg-amber-500 flex-shrink-0" title="Unread" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{msg.message}</p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(msg.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {!messages?.length && (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No messages received yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Tasks snippet */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Operational Tasks</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">High-priority deliverables under monitoring</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("projects")} className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Manage Projects <ArrowUpRight className="ml-1 size-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {adminTasks.slice(0, 4).map((task) => (
                        <div key={task.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`size-2.5 rounded-full flex-shrink-0 ${task.status === 'completed' || task.status === 'done' ? 'bg-emerald-500' : task.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                              <p className="text-[11px] text-slate-400 capitalize">{task.status?.replace('_', ' ')} • Priority: {task.priority}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize border-slate-200 dark:border-white/10">
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                      {!adminTasks.length && (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No tasks logged yet. Tasks created in Projects will show here.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right 1 Col: Quick Links & Security info */}
                <div className="space-y-6">
                  {/* System Status card */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] p-6 shadow-sm">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Enterprise Services</h3>
                    <div className="space-y-3.5">
                      <ServiceStatusItem name="PostgreSQL Database" status="Operational" ping="18ms" />
                      <ServiceStatusItem name="Storage & Documents" status="Operational" ping="24ms" />
                      <ServiceStatusItem name="Auth & Security ACL" status="Secured" ping="Active" />
                      <ServiceStatusItem name="Realtime WebSockets" status="Connected" ping="12ms" />
                    </div>
                  </div>

                  {/* Quick Shortcuts */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm mb-2">
                      <Sparkles className="size-4" />
                      <span>Executive Productivity</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      Create verified documents, generate official staff ID badges with QR validation, and run payroll calculations in seconds.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        onClick={() => setActiveTab("letters")} 
                        variant="outline" 
                        className="w-full justify-start text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-medium"
                      >
                        <FileSignature className="mr-2 size-3.5 text-amber-500" /> Issue Official Letter
                      </Button>
                      <Button 
                        onClick={() => setActiveTab("idcards")} 
                        variant="outline" 
                        className="w-full justify-start text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-medium"
                      >
                        <IdCard className="mr-2 size-3.5 text-blue-500" /> Generate Employee ID Card
                      </Button>
                      <Button 
                        onClick={() => setActiveTab("payroll")} 
                        variant="outline" 
                        className="w-full justify-start text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-medium"
                      >
                        <Coins className="mr-2 size-3.5 text-emerald-500" /> Export Monthly Payslips
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </TabsContent>

            {/* 2. LIVE CHAT */}
            <TabsContent value="chat" className="space-y-4">
              <ChatApp currentUserId={userId} userEmail={email} userRole="admin" />
            </TabsContent>

            {/* 3. NOTIFICATIONS */}
            <TabsContent value="notifications" className="space-y-4">
              <NotificationCenter 
                isFullPage 
                notifications={notifications} 
                readIds={readNotificationIds} 
                onMarkAsRead={handleMarkNotificationRead} 
                onMarkAllAsRead={handleMarkAllNotificationsRead} 
                onDismiss={handleDismissNotification} 
                onClearAll={handleClearAllNotifications} 
                onNavigate={(tab) => setActiveTab(tab)} 
                userType="admin" 
              />
            </TabsContent>

            {/* 4. INQUIRIES & MESSAGES */}
            <TabsContent value="messages" className="space-y-4">
              <Messages />
            </TabsContent>

            {/* 5. POSTS & PRESS */}
            <TabsContent value="posts" className="space-y-4">
              <Posts />
            </TabsContent>

            {/* 6. EMPLOYEES */}
            <TabsContent value="employees" className="space-y-4">
              <Employees />
            </TabsContent>

            {/* 7. PAYROLL */}
            <TabsContent value="payroll" className="space-y-4">
              <Payroll />
            </TabsContent>

            {/* 8. EMPLOYEE PROFILE */}
            <TabsContent value="employee-profile" className="space-y-4">
              <EmployeeProfile />
            </TabsContent>

            {/* 9. PROJECTS */}
            <TabsContent value="projects" className="space-y-4">
              <Projects />
            </TabsContent>

            {/* 10. ID CARDS */}
            <TabsContent value="idcards" className="space-y-4">
              <IdCards />
            </TabsContent>

            {/* 11. LETTERS */}
            <TabsContent value="letters" className="space-y-4">
              <Letters />
            </TabsContent>

            {/* 12. PLANS */}
            <TabsContent value="plans" className="space-y-4">
              <Plan />
            </TabsContent>

            {/* 13. NOTES */}
            <TabsContent value="notes" className="space-y-4">
              <Notes />
            </TabsContent>

            {/* 14. ADMINS MANAGEMENT */}
            <TabsContent value="admins" className="space-y-4">
              <Admins currentUserId={userId} />
            </TabsContent>

            {/* 15. ANALYTICS */}
            <TabsContent value="analytics" className="space-y-4">
              <Analytics />
            </TabsContent>

            {/* 16. REPORTS */}
            <TabsContent value="reports" className="space-y-4">
              <Reports />
            </TabsContent>

            {/* 17. SETTINGS */}
            <TabsContent value="settings" className="space-y-6">
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-white/[0.06] mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security & Environment Preferences</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Admin credential management & interface themes</p>
                  </div>
                  <Button 
                    onClick={() => setChangePasswordOpen(true)}
                    className="rounded-xl h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-md shadow-amber-500/20"
                  >
                    <Key className="mr-2 size-4" /> Change Password
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      <Mail className="size-4" />
                      <span>Account Email</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{email}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="size-3.5" /> Identity Verified
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      <span>Assigned Role</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">System Administrator</p>
                    <p className="text-xs text-slate-400 mt-1">Full Root & Modification privileges</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <Sun className="size-4 text-amber-500" />
                        <span>Interface Appearance</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {isDark ? "Dark OLED Mode" : "High-Contrast Light"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={toggleTheme} className="rounded-xl h-8 px-3 text-xs">
                      {isDark ? <Sun className="mr-1.5 size-3.5 text-amber-400" /> : <Moon className="mr-1.5 size-3.5" />}
                      Switch
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </main>
      </div>

      {/* ─── NOTIFICATION CENTER MODAL ─── */}
      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        readIds={readNotificationIds}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onDismiss={handleDismissNotification}
        onClearAll={handleClearAllNotifications}
        onNavigate={(tab) => {
          setActiveTab(tab)
          setNotificationsOpen(false)
        }}
        userType="admin"
      />

      {/* ─── MOBILE DRAWER MENU ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#0c1018] shadow-2xl flex flex-col border-r border-slate-200 dark:border-white/10">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 grid place-items-center text-white shadow-md">
                  <ShieldCheck className="size-5" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">RAMA Console</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="size-8">
                <X className="size-4" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {[
                { id: "dashboard", label: "Overview", icon: LayoutDashboard },
                { id: "analytics", label: "Analytics", icon: TrendingUp },
                { id: "reports", label: "Reports", icon: FileText },
                { id: "chat", label: "Live Team Chat", icon: MessageCircle },
                { id: "messages", label: "Inquiries", icon: MessageSquare, badge: unreadMessagesCount },
                { id: "notifications", label: "Notifications", icon: Bell, badge: totalUnreadNotifications },
                { id: "employees", label: "Employees", icon: Users },
                { id: "payroll", label: "Payroll & Salary", icon: Coins },
                { id: "employee-profile", label: "Employee Profile", icon: UserCircle },
                { id: "idcards", label: "ID Badges", icon: IdCard },
                { id: "letters", label: "Official Letters", icon: FileSignature },
                { id: "projects", label: "Projects & Tasks", icon: FolderKanban },
                { id: "posts", label: "Posts & News", icon: Newspaper },
                { id: "plans", label: "Roadmaps", icon: ClipboardList },
                { id: "notes", label: "Notes", icon: StickyNote },
                { id: "admins", label: "Admin Access", icon: Users },
                { id: "settings", label: "Settings", icon: Settings },
              ].map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </nav>

            <div className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400 truncate max-w-[170px]">{email}</span>
              <Button variant="ghost" size="icon" onClick={signOut} className="size-8 text-rose-500">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHANGE PASSWORD DIALOG ─── */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#0f1420] border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="size-5 text-amber-500" /> Change Administrator Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                className="mt-1.5 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={8}
                className="mt-1.5 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={8}
                className="mt-1.5 h-10 rounded-xl"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={changePasswordMutation.isPending}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium"
              >
                {changePasswordMutation.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Updating...</>
                ) : (
                  <><Check className="mr-2 size-4" /> Save Password</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SIDEBAR & DASHBOARD PRESENTATIONAL PRIMITIVES
───────────────────────────────────────────────────────────── */

function SidebarNavGroup({ title, sidebarOpen, children }) {
  return (
    <div className="space-y-1">
      {sidebarOpen ? (
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none mb-1.5">
          {title}
        </p>
      ) : (
        <div className="my-2 border-t border-slate-200/80 dark:border-white/[0.08]" />
      )}
      {children}
    </div>
  )
}

function SidebarNavBtn({ icon: Icon, label, active, badge, sidebarOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
      }`}
      title={!sidebarOpen ? label : undefined}
    >
      <Icon className={`size-4.5 flex-shrink-0 transition-transform duration-200 ${active ? 'scale-105' : 'group-hover:scale-110'}`} />
      {sidebarOpen && <span className="flex-1 text-left truncate">{label}</span>}
      {badge !== undefined && badge > 0 && sidebarOpen && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          active ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

function QuickKpiCard({ label, value, icon: Icon, color, onClick }) {
  const colorMap = {
    indigo: "from-blue-500 to-indigo-600 text-indigo-500",
    amber: "from-amber-500 to-orange-600 text-amber-500",
    rose: "from-rose-500 to-pink-600 text-rose-500",
    emerald: "from-emerald-500 to-teal-600 text-emerald-500",
  }
  return (
    <div 
      onClick={onClick}
      className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
      </div>
      <div className={`size-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] grid place-items-center ${colorMap[color].split(" ")[2]}`}>
        <Icon className="size-4.5" />
      </div>
    </div>
  )
}

function QuickLaunchCard({ title, desc, icon: Icon, gradient, badge, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group relative p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className={`size-11 rounded-2xl bg-gradient-to-tr ${gradient} text-white grid place-items-center shadow-lg mb-4 group-hover:scale-105 transition-transform`}>
        <Icon className="size-5.5" />
      </div>
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">{title}</h4>
        {badge > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
            {badge} new
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{desc}</p>
    </div>
  )
}

function ServiceStatusItem({ name, status, ping }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{status}</span>
        <span className="text-[10px] text-slate-400 font-mono">({ping})</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MESSAGES SUB-COMPONENT (INQUIRIES)
───────────────────────────────────────────────────────────── */

function Messages() {
  const qc = useQueryClient()
  const [q, setQ] = useState("")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [page, setPage] = useState(1)
  const perPage = 8

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  async function toggleRead(id, is_read) {
    const { error } = await supabase.from("contact_messages").update({ is_read }).eq("id", id)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ["admin-messages"] })
  }

  async function remove(id) {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success("Message deleted")
    qc.invalidateQueries({ queryKey: ["admin-messages"] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const term = q.trim().toLowerCase()
  const list = data.filter(
    (m) =>
      (!onlyUnread || !m.is_read) &&
      (!term ||
        (m.full_name || m.name || "").toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.message || "").toLowerCase().includes(term)),
  )
  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const current = Math.min(page, pages)
  const paged = list.slice((current - 1) * perPage, current * perPage)

  return (
    <div className="space-y-5">
      {/* Search and Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] shadow-sm">
        <div className="relative flex-1 min-w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search inquiries by sender, email or keywords…"
            className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={onlyUnread ? "default" : "outline"}
            className={`rounded-xl h-10 text-xs font-semibold ${
              onlyUnread 
                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                : "border-slate-200 dark:border-white/10"
            }`}
            onClick={() => { setOnlyUnread((v) => !v); setPage(1); }}
          >
            <Mail className="mr-2 size-3.5" /> {onlyUnread ? "Viewing Unread" : "Filter Unread"}
          </Button>
          <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-xs font-semibold text-slate-600 dark:text-slate-300">
            {list.length} Inquir{list.length === 1 ? "y" : "ies"}
          </div>
        </div>
      </div>

      {!list.length && (
        <EmptyState icon={Inbox} title="No inquiries found" hint="No customer or visitor messages meet the current filter criteria." />
      )}

      {/* Grid of Messages */}
      <div className="grid gap-3.5">
        {paged.map((m) => {
          const senderName = m.full_name || m.name || "Client"
          return (
            <div 
              key={m.id} 
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-[#0f1420] shadow-sm hover:shadow-md ${
                !m.is_read 
                  ? 'border-amber-500/50 bg-amber-500/[0.02] dark:border-amber-500/30' 
                  : 'border-slate-200/80 dark:border-white/[0.07]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`size-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                  !m.is_read ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-md shadow-amber-500/20' : 'bg-slate-400 dark:bg-slate-700'
                }`}>
                  {senderName.slice(0, 2).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{senderName}</h4>
                      {!m.is_read && (
                        <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.2 border-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="size-3" />
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 hover:text-amber-500 transition-colors">
                        <Mail className="size-3.5" /> {m.email}
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 hover:text-amber-500 transition-colors">
                        <Phone className="size-3.5" /> {m.phone}
                      </a>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-white/[0.02] p-3.5 rounded-xl border border-slate-100 dark:border-white/[0.04]">
                    {m.message}
                  </p>

                  <div className="flex items-center justify-end gap-2 mt-3 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-xl h-8 text-xs border-slate-200 dark:border-white/10"
                      onClick={() => toggleRead(m.id, !m.is_read)}
                    >
                      {m.is_read ? <EyeOff className="mr-1.5 size-3.5" /> : <Eye className="mr-1.5 size-3.5" />}
                      {m.is_read ? "Mark Unread" : "Mark Read"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="rounded-xl h-8 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() => remove(m.id)}
                    >
                      <Trash2 className="mr-1.5 size-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination controls */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-9 text-xs"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft className="size-3.5 mr-1" /> Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n === current ? "default" : "outline"}
                className={`size-9 rounded-xl text-xs font-semibold ${
                  n === current ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''
                }`}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-9 text-xs"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Next <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ADMINS MANAGEMENT SUB-COMPONENT
───────────────────────────────────────────────────────────── */

function Admins({ currentUserId }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admins")
      if (error) throw error
      return data ?? []
    },
  })

  async function add(e) {
    e.preventDefault()
    const value = email.trim()
    if (!value) return
    setBusy(true)
    const { data: result, error } = await supabase.rpc("add_admin_by_email", { _email: value })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (result === "not_found") {
      toast.error("No account with that email yet — ask them to register at /admin first.")
      return
    }
    if (result === "already_admin") {
      toast.info("That account is already an admin.")
      return
    }
    toast.success("Administrator privileges granted")
    setEmail("")
    qc.invalidateQueries({ queryKey: ["admin-admins"] })
  }

  async function revoke(userId) {
    const { data: result, error } = await supabase.rpc("remove_admin", { _user_id: userId })
    if (error) {
      toast.error(error.message)
      return
    }
    if (result === "self") {
      toast.error("You cannot revoke your own admin access.")
      return
    }
    toast.success("Administrator access revoked")
    qc.invalidateQueries({ queryKey: ["admin-admins"] })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Form card */}
      <form onSubmit={add} className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] shadow-sm space-y-4 h-fit">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white grid place-items-center shadow-md">
            <UserPlus className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Grant Admin Access</h3>
            <p className="text-xs text-slate-400">Authorize executive operators</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Prerequisite:</strong> The user must first register an account on the /admin portal screen before granting privileges here.
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="a-email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">User Corporate Email</Label>
          <Input 
            id="a-email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="h-10 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-xs" 
            placeholder="colleague@rama.com" 
            required
          />
        </div>

        <Button 
          type="submit" 
          className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md shadow-amber-500/20" 
          disabled={busy}
        >
          {busy ? (
            <><Loader2 className="mr-2 size-4 animate-spin" /> Authorizing...</>
          ) : (
            <><UserPlus className="mr-2 size-4" /> Grant Full Privileges</>
          )}
        </Button>
      </form>

      {/* Admin List */}
      <div className="space-y-3.5">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-amber-500" />
          </div>
        )}

        {!isLoading && !data?.length && (
          <EmptyState icon={Users} title="No administrators listed" hint="Add an admin using the form on the left." />
        )}

        {data?.map((a) => {
          const isSelf = a.user_id === currentUserId
          return (
            <div key={a.user_id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-sm grid place-items-center flex-shrink-0 shadow-md shadow-amber-500/20">
                  {(a.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{a.email}</p>
                    {isSelf && (
                      <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.2 border-0">
                        You (Active Session)
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Granted: {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {!isSelf && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl h-8 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                  onClick={() => revoke(a.user_id)}
                >
                  <ShieldOff className="mr-1.5 size-3.5" /> Revoke Access
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   POSTS & PRESS SUB-COMPONENT
───────────────────────────────────────────────────────────── */

function Posts() {
  const qc = useQueryClient()
  const coverInputRef = useRef(null)
  const filesInputRef = useRef(null)
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("news")
  const [excerpt, setExcerpt] = useState("")
  const [body, setBody] = useState("")
  const [location, setLocation] = useState("")
  const [deadline, setDeadline] = useState("")
  const [published, setPublished] = useState(true)
  const [busy, setBusy] = useState(false)
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [attachedFiles, setAttachedFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  async function uploadFile(file, path) {
    const { data, error } = await supabase.storage.from("posts").upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(data.path)
    return publicUrl
  }

  async function handleCoverImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `covers/${fileName}`
      const url = await uploadFile(file, path)
      setCoverImageUrl(url)
      setCoverImageFile(file)
      toast.success("Cover image uploaded")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleAttachedFilesUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const path = `attachments/${fileName}`
        const url = await uploadFile(file, path)
        urls.push(url)
      }
      setAttachedFiles([...attachedFiles, ...urls])
      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  function removeAttachedFile(url) {
    setAttachedFiles(attachedFiles.filter(f => f !== url))
  }

  function startEdit(post) {
    setEditingId(post.id)
    setTitle(post.title)
    setCategory(post.category)
    setExcerpt(post.excerpt || "")
    setBody(post.body)
    setLocation(post.location || "")
    setDeadline(post.deadline || "")
    setPublished(post.published)
    setCoverImageUrl(post.cover_image_url || "")
    setAttachedFiles(post.attached_files || [])
    setCoverImageFile(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle("")
    setCategory("news")
    setExcerpt("")
    setBody("")
    setLocation("")
    setDeadline("")
    setPublished(true)
    setCoverImageUrl("")
    setCoverImageFile(null)
    setAttachedFiles([])
    if (coverInputRef.current) coverInputRef.current.value = ""
    if (filesInputRef.current) filesInputRef.current.value = ""
  }

  async function create(e) {
    e.preventDefault()
    if (title.trim().length < 3 || body.trim().length < 10) {
      toast.error("Add a title and body text")
      return
    }
    setBusy(true)
    if (editingId) {
      const { error } = await supabase.from("posts").update({
        title: title.trim(),
        category,
        excerpt: excerpt.trim() || null,
        body: body.trim(),
        location: location.trim() || null,
        deadline: deadline || null,
        published,
        cover_image_url: coverImageUrl || null,
        attached_files: attachedFiles.length > 0 ? attachedFiles : null,
      }).eq("id", editingId)
      setBusy(false)
      if (error) { toast.error(error.message); return }
      toast.success("Post updated")
      cancelEdit()
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from("posts").insert({
        title: title.trim(),
        slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        excerpt: excerpt.trim() || null,
        body: body.trim(),
        location: location.trim() || null,
        deadline: deadline || null,
        published,
        author_id: userData.user?.id ?? null,
        cover_image_url: coverImageUrl || null,
        attached_files: attachedFiles.length > 0 ? attachedFiles : null,
      })
      setBusy(false)
      if (error) { toast.error(error.message); return }
      toast.success("Post published to live portal")
      setTitle(""); setExcerpt(""); setBody(""); setLocation(""); setDeadline("")
      setCoverImageUrl(""); setCoverImageFile(null); setAttachedFiles([])
      if (coverInputRef.current) coverInputRef.current.value = ""
      if (filesInputRef.current) filesInputRef.current.value = ""
    }
    qc.invalidateQueries({ queryKey: ["admin-posts"] })
    qc.invalidateQueries({ queryKey: ["public-posts"] })
  }

  async function togglePublished(id, value) {
    const { error } = await supabase.from("posts").update({ published: value }).eq("id", id)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ["admin-posts"] })
    qc.invalidateQueries({ queryKey: ["public-posts"] })
  }

  async function remove(id) {
    const { error } = await supabase.from("posts").delete().eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success("Post deleted")
    qc.invalidateQueries({ queryKey: ["admin-posts"] })
    qc.invalidateQueries({ queryKey: ["public-posts"] })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      {/* Editor sidebar card */}
      <form onSubmit={create} className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] shadow-sm space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white grid place-items-center shadow-md">
              <Plus className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{editingId ? "Edit Article" : "Create New Article"}</h3>
              <p className="text-xs text-slate-400">Publish to public website</p>
            </div>
          </div>
          {editingId && (
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} className="text-xs">
              Cancel
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="p-title" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Headline / Title</Label>
            <Input 
              id="p-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              maxLength={160} 
              className="mt-1 h-10 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-xs" 
              placeholder="e.g. Rama Expands High-Speed Fiber In Infrastructure"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-cat" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</Label>
              <select
                id="p-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="p-loc" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</Label>
              <Input 
                id="p-loc" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                maxLength={120} 
                className="mt-1 h-10 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-xs"
                placeholder="HQ or City"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="p-excerpt" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Excerpt / Summary</Label>
            <Input 
              id="p-excerpt" 
              value={excerpt} 
              onChange={(e) => setExcerpt(e.target.value)} 
              maxLength={280} 
              className="mt-1 h-10 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-xs"
              placeholder="Brief introductory paragraph..."
            />
          </div>

          <div>
            <Label htmlFor="p-body" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Content Body</Label>
            <Textarea 
              id="p-body" 
              rows={5} 
              value={body} 
              onChange={(e) => setBody(e.target.value)} 
              className="mt-1 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-xs resize-none"
              placeholder="Write the full press release or announcement content..."
              required
            />
          </div>

          <div>
            <Label htmlFor="p-cover" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Featured Media Image</Label>
            <div className="mt-1">
              <Input
                id="p-cover"
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageUpload}
                disabled={uploading}
                className="h-10 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10"
              />
              {coverImageUrl && (
                <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 h-28">
                  <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 size-7 p-0 rounded-full"
                    onClick={() => { setCoverImageUrl(""); setCoverImageFile(null); if (coverInputRef.current) coverInputRef.current.value = "" }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
            <Label htmlFor="p-pub" className="text-xs font-medium cursor-pointer">Live Immediately</Label>
            <Switch id="p-pub" checked={published} onCheckedChange={setPublished} />
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md shadow-amber-500/20" 
            disabled={busy || uploading}
          >
            {busy || uploading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
            ) : editingId ? (
              <><CheckCircle2 className="mr-2 size-4" /> Save Article Changes</>
            ) : (
              <><Plus className="mr-2 size-4" /> Publish Announcement</>
            )}
          </Button>
        </div>
      </form>

      {/* Posts List */}
      <div className="space-y-3.5">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-amber-500" />
          </div>
        )}

        {!isLoading && !data?.length && (
          <EmptyState icon={Newspaper} title="No articles published" hint="Create articles and company announcements using the editor." />
        )}

        {data?.map((p) => (
          <div key={p.id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f1420] shadow-sm flex flex-col sm:flex-row items-start gap-4">
            {p.cover_image_url && (
              <div className="size-20 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-white/10">
                <img src={p.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="capitalize text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                  {p.category}
                </Badge>
                {p.published ? (
                  <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0 border-0">
                    Live
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                )}
                <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
                  <Clock className="size-3" />
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.title}</h4>
              {p.excerpt && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{p.excerpt}</p>}
              
              <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-xl h-8 text-xs border-slate-200 dark:border-white/10"
                  onClick={() => startEdit(p)}
                >
                  <Edit className="mr-1.5 size-3.5" /> Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="rounded-xl h-8 text-xs text-rose-500 hover:bg-rose-500/10"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="mr-1.5 size-3.5" /> Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
      <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-500 grid place-items-center mx-auto mb-3">
        <Icon className="size-7" />
      </div>
      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{hint}</p>
    </div>
  )
}
