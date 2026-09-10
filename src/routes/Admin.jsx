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
import Plan from "@/routes/Plan"
import Notes from "@/routes/Notes"
import NotificationCenter from "@/components/notifications/NotificationCenter"
import ChatApp from "@/components/chat/ChatApp"
import {
  Mail, Phone, Trash2, LogOut, Loader2, Inbox, Newspaper, ShieldCheck,
  Search, Sparkles, Plus, Eye, EyeOff, MapPin, CalendarDays, Users,
  ChevronLeft, ChevronRight, UserPlus, ShieldOff, Upload, X, Paperclip,
  Image, Edit, LayoutDashboard, MessageSquare, MessageCircle, FileText, Settings, Menu,
  Bell, TrendingUp, Clock, CheckCircle2, AlertCircle, MoreVertical,
  FolderKanban, IdCard, FileSignature, UserCircle, ClipboardList, StickyNote,
  Sun, Moon, Key, Save,
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

  if (!ready) return <Center><Loader2 className="size-6 animate-spin text-muted-foreground" /></Center>
  if (!session) return <AuthCard />
  if (isAdmin === null) return <Center><Loader2 className="size-6 animate-spin text-muted-foreground" /></Center>
  if (!isAdmin) return <NoAccess />
  return <Dashboard email={session.user.email ?? ""} userId={session.user.id} />
}

function Center({ children }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-52 right-0 size-[30rem] rounded-full bg-primary/20 blur-[130px]" />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  )
}

async function signOut() {
  await supabase.auth.signOut()
  window.location.assign("/admin")
}

function NoAccess() {
  return (
    <Center>
      <div className="card-lux rounded-3xl border border-border bg-card/80 p-8 text-center shadow-float backdrop-blur">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl brand-gradient text-primary-foreground">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="mt-5 font-display text-lg font-bold">No admin access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account is not authorised for the admin console.
        </p>
        <Button className="mt-6" variant="outline" onClick={signOut}>Sign out</Button>
      </div>
    </Center>
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
              emailConfirm: true, // Auto-confirm email for development
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
    <Center>
      <div className="card-lux w-full rounded-3xl border border-border bg-card/80 p-8 shadow-float backdrop-blur">
        <div className="grid size-12 place-items-center rounded-2xl brand-gradient text-primary-foreground shadow-glow">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="mt-5 font-display text-xl font-bold tracking-tight">Rama Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Authorised personnel only.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create admin account"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "First-time setup? Create the admin account" : "Already have an account? Sign in"}
        </button>
      </div>
    </Center>
  )
}

function Dashboard({ email, userId }) {
  const qc = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("messages")
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

  const { data: messages } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: posts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data
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

  // Dynamic notifications
  const notifications = useMemo(() => {
    const list = []
    
    // 1. Contact messages
    messages?.forEach((m) => {
      list.push({
        id: `msg-${m.id}`,
        type: "message",
        title: `Message from ${m.name || "Visitor"}`,
        description: m.subject ? `${m.subject}: ${m.message}` : m.message,
        sender: `${m.name || "Visitor"} (${m.email || ""})`,
        created_at: m.created_at,
        priority: !m.is_read ? "high" : "normal",
        isRead: m.is_read || readNotificationIds.includes(`msg-${m.id}`),
        actionTab: "messages",
        actionLabel: "View in Messages",
      })
    })

    // 2. Project tasks
    adminTasks?.forEach((t) => {
      const isUrgent = t.priority === "urgent" || t.priority === "high"
      if (t.status !== "done") {
        list.push({
          id: `task-${t.id}`,
          type: "task",
          title: `Task: ${t.title}`,
          description: `Priority: ${t.priority} • Status: ${t.status?.replace("_", " ")}${t.due_date ? ` • Due: ${new Date(t.due_date).toLocaleDateString()}` : ""}`,
          created_at: t.created_at,
          priority: isUrgent ? "urgent" : "normal",
          isRead: readNotificationIds.includes(`task-${t.id}`),
          actionTab: "projects",
          actionLabel: "View in Projects",
        })
      }
    })

    // Filter dismissed
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
      toast.success("Password changed successfully")
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

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: passwordForm.currentPassword,
    })
    
    if (signInError) {
      toast.error("Current password is incorrect")
      return
    }

    changePasswordMutation.mutate({ newPassword: passwordForm.newPassword })
  }

  const unread = messages?.filter((m) => !m.is_read).length ?? 0
  const published = posts?.filter((p) => p.published).length ?? 0

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col`}>        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
              <ShieldCheck className="size-5" />
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-display text-sm font-bold leading-tight text-slate-900 dark:text-white">Rama Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Console</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} sidebarOpen={sidebarOpen} />
          <NavItem icon={MessageCircle} label="Team Chat" active={activeTab === "chat"} onClick={() => setActiveTab("chat")} sidebarOpen={sidebarOpen} />
          <NavItem icon={Bell} label="Notifications" badge={totalUnreadNotifications} active={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} sidebarOpen={sidebarOpen} />
          <NavItem icon={MessageSquare} label="Messages" badge={unread} active={activeTab === "messages"} onClick={() => setActiveTab("messages")} sidebarOpen={sidebarOpen} />
          <NavItem icon={FileText} label="Posts" active={activeTab === "posts"} onClick={() => setActiveTab("posts")} sidebarOpen={sidebarOpen} />
          <NavItem icon={Users} label="Employees" active={activeTab === "employees"} onClick={() => setActiveTab("employees")} sidebarOpen={sidebarOpen} />
          <NavItem icon={UserCircle} label="Employee Profile" active={activeTab === "employee-profile"} onClick={() => setActiveTab("employee-profile")} sidebarOpen={sidebarOpen} />
          <NavItem icon={FolderKanban} label="Projects" active={activeTab === "projects"} onClick={() => setActiveTab("projects")} sidebarOpen={sidebarOpen} />
          <NavItem icon={IdCard} label="ID Cards" active={activeTab === "idcards"} onClick={() => setActiveTab("idcards")} sidebarOpen={sidebarOpen} />
          <NavItem icon={FileSignature} label="Letters" active={activeTab === "letters"} onClick={() => setActiveTab("letters")} sidebarOpen={sidebarOpen} />
          <NavItem icon={ClipboardList} label="Plans" active={activeTab === "plans"} onClick={() => setActiveTab("plans")} sidebarOpen={sidebarOpen} />
          <NavItem icon={StickyNote} label="Notes" active={activeTab === "notes"} onClick={() => setActiveTab("notes")} sidebarOpen={sidebarOpen} />
          <NavItem icon={Users} label="Admins" active={activeTab === "admins"} onClick={() => setActiveTab("admins")} sidebarOpen={sidebarOpen} />
          <NavItem icon={Settings} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} sidebarOpen={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 bg-gradient-to-br from-blue-500 to-indigo-500">
              <AvatarFallback className="text-white font-semibold">{email?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="size-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, Administrator</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5 text-slate-700" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setNotificationsOpen(true)}
                title="View Notifications"
              >
                <Bell className="size-5" />
                {totalUnreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold animate-pulse">{totalUnreadNotifications}</span>
                )}
              </Button>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 text-xs font-medium">
                <span className="size-2 bg-green-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <ModernStatCard 
              icon={Inbox} 
              label="Total Messages" 
              value={messages?.length ?? 0} 
              trend="+12%" 
              color="blue"
            />
            <ModernStatCard 
              icon={Mail} 
              label="Unread" 
              value={unread} 
              trend={unread > 0 ? "New" : "All caught up"} 
              color="red"
              accent
            />
            <ModernStatCard 
              icon={Newspaper} 
              label="Published Posts" 
              value={published} 
              trend="+5%" 
              color="green"
            />
            <ModernStatCard 
              icon={Users} 
              label="Active Admins" 
              value="3" 
              trend="Stable" 
              color="purple"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
              <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <MessageCircle className="mr-2 size-4" /> Team Chat
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <Bell className="mr-2 size-4" /> Notifications {totalUnreadNotifications > 0 && `(${totalUnreadNotifications})`}
              </TabsTrigger>
              <TabsTrigger value="messages" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <MessageSquare className="mr-2 size-4" /> Messages
              </TabsTrigger>
              <TabsTrigger value="posts" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <FileText className="mr-2 size-4" /> Posts
              </TabsTrigger>
              <TabsTrigger value="employees" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <Users className="mr-2 size-4" /> Employees
              </TabsTrigger>
              <TabsTrigger value="employee-profile" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <UserCircle className="mr-2 size-4" /> Employee Profile
              </TabsTrigger>
              <TabsTrigger value="projects" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <FolderKanban className="mr-2 size-4" /> Projects
              </TabsTrigger>
              <TabsTrigger value="idcards" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <IdCard className="mr-2 size-4" /> ID Cards
              </TabsTrigger>
              <TabsTrigger value="letters" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <FileSignature className="mr-2 size-4" /> Letters
              </TabsTrigger>
              <TabsTrigger value="plans" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <ClipboardList className="mr-2 size-4" /> Plans
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <StickyNote className="mr-2 size-4" /> Notes
              </TabsTrigger>
              <TabsTrigger value="admins" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <Users className="mr-2 size-4" /> Admins
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="space-y-4">
              <ChatApp currentUserId={userId} userEmail={email} userRole="admin" />
            </TabsContent>
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
            <TabsContent value="messages" className="space-y-4"><Messages /></TabsContent>
            <TabsContent value="posts" className="space-y-4"><Posts /></TabsContent>
            <TabsContent value="employees" className="space-y-4"><Employees /></TabsContent>
            <TabsContent value="employee-profile" className="space-y-4"><EmployeeProfile /></TabsContent>
            <TabsContent value="projects" className="space-y-4"><Projects /></TabsContent>
            <TabsContent value="idcards" className="space-y-4"><IdCards /></TabsContent>
            <TabsContent value="letters" className="space-y-4"><Letters /></TabsContent>
            <TabsContent value="plans" className="space-y-4"><Plan /></TabsContent>
            <TabsContent value="notes" className="space-y-4"><Notes /></TabsContent>
            <TabsContent value="admins" className="space-y-4"><Admins currentUserId={userId} /></TabsContent>
            <TabsContent value="dashboard" className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Dashboard Overview</h2>
                <p className="text-slate-500 dark:text-slate-400">Welcome to the Rama Admin Console. Use the navigation to manage your content.</p>
              </div>
            </TabsContent>
            <TabsContent value="settings" className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Security</h2>
                  <Button size="sm" variant="outline" onClick={() => setChangePasswordOpen(true)}>
                    <Key className="mr-2 size-4" /> Change Password
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Email:</span> {email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Role:</span> Administrator
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Notification Center Modal */}
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

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                className="mt-1.5"
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
                className="mt-1.5"
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
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Changing...</>
                ) : (
                  <><Key className="mr-2 size-4" /> Change Password</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, badge, sidebarOpen, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
      active 
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}>
      <Icon className="size-5" />
      {sidebarOpen && (
        <span className="flex-1 text-left text-sm font-medium">{label}</span>
      )}
      {badge !== undefined && badge > 0 && sidebarOpen && (
        <span className="size-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{badge}</span>
      )}
    </button>
  )
}

function ModernStatCard({ icon: Icon, label, value, trend, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20',
    red: 'from-red-500 to-red-600 bg-red-50 dark:bg-red-900/20',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20',
  }
  const currentColor = colorClasses[color] || colorClasses.blue

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${currentColor.split(' ').slice(0, 2).join(' ')} text-white`}>
          <Icon className="size-5" />
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
          <TrendingUp className="size-3" />
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card-lux relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div
          className={`grid size-9 place-items-center rounded-xl ${accent ? "brand-gradient text-primary-foreground" : "bg-muted text-foreground"}`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function Messages() {
  const qc = useQueryClient()
  const [q, setQ] = useState("")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [page, setPage] = useState(1)
  const perPage = 8
  const { data, isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
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

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-slate-400" /></div>
  if (!data?.length) return <EmptyState icon={Inbox} title="No messages yet" hint="Enquiries from the website contact form will appear here." />

  const term = q.trim().toLowerCase()
  const list = data.filter(
    (m) =>
      (!onlyUnread || !m.is_read) &&
      (!term ||
        m.full_name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.message.toLowerCase().includes(term)),
  )
  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const current = Math.min(page, pages)
  const paged = list.slice((current - 1) * perPage, current * perPage)

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search messages…"
            className="pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>
        <Button
          type="button"
          variant={onlyUnread ? "default" : "outline"}
          className={onlyUnread ? "bg-blue-600 hover:bg-blue-700" : ""}
          onClick={() => { setOnlyUnread((v) => !v); setPage(1); }}
        >
          <Mail className="mr-2 size-4" /> {onlyUnread ? "All Messages" : "Unread Only"}
        </Button>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-medium">{list.length}</span>
          <span>message{list.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {!list.length && <EmptyState icon={Search} title="No matching messages" hint="Try a different search term." />}

      {/* Messages Grid */}
      <div className="grid gap-4">
        {paged.map((m) => (
          <div key={m.id} className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border transition-all hover:shadow-md ${
            !m.is_read ? 'border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`size-12 rounded-full flex items-center justify-center font-semibold text-white ${
                !m.is_read ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
              }`}>
                {m.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{m.full_name}</h3>
                  {!m.is_read && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                      <span className="size-1.5 bg-blue-500 rounded-full mr-1.5" />
                      New
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
                  <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Mail className="size-4" />{m.email}
                  </a>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Phone className="size-4" />{m.phone}
                    </a>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Button 
                size="sm" 
                variant="outline" 
                className={m.is_read ? "" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"}
                onClick={() => toggleRead(m.id, !m.is_read)}
              >
                {m.is_read ? <EyeOff className="mr-2 size-4" /> : <Eye className="mr-2 size-4" />}
                {m.is_read ? "Mark as unread" : "Mark as read"}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" 
                onClick={() => remove(m.id)}
              >
                <Trash2 className="mr-2 size-4" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-10"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n === current ? "default" : "outline"}
                className={`size-10 ${n === current ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-10"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function Admins({ currentUserId }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)

  const { data, isLoading } = useQuery({
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
    toast.success("Admin access granted")
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
      toast.error("You cannot remove your own admin access.")
      return
    }
    toast.success("Admin access revoked")
    qc.invalidateQueries({ queryKey: ["admin-admins"] })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <form onSubmit={add} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 lg:sticky lg:top-28 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <UserPlus className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Add an admin</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Grant access to new administrators</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
              <strong>Note:</strong> The person must first create an account on the admin console sign-in screen. Then grant them access with their email below.
            </p>
          </div>
          
          <div>
            <Label htmlFor="a-email" className="text-sm font-medium">Email address</Label>
            <Input 
              id="a-email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="mt-1.5 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" 
              placeholder="colleague@company.com" 
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={busy}
          >
            {busy ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Granting...</>
            ) : (
              <><UserPlus className="mr-2 size-4" /> Grant admin access</>
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-slate-400" /></div>}
        {!isLoading && !data?.length && (
          <EmptyState icon={Users} title="No admins found" hint="Grant access to a registered account to get started." />
        )}
        {data?.map((a) => {
          const isSelf = a.user_id === currentUserId
          return (
            <div key={a.user_id} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-semibold text-white">
                  {(a.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{a.email}</p>
                    {isSelf && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                        <CheckCircle2 className="size-3 mr-1" /> You
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Admin since {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                {!isSelf && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => revoke(a.user_id)}
                  >
                    <ShieldOff className="mr-2 size-4" /> Revoke
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400">
        <Icon className="size-8" />
      </div>
      <p className="mt-6 font-semibold text-slate-900 dark:text-white text-lg">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{hint}</p>
    </div>
  )
}

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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data
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
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
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
      toast.error("Add a title and a longer body")
      return
    }
    setBusy(true)
    
    if (editingId) {
      // Update existing post
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
      // Create new post
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
      toast.success("Post published")
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
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <form onSubmit={create} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 lg:sticky lg:top-28 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
              <Plus className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{editingId ? "Edit post" : "New post"}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{editingId ? "Update existing content" : "Create new content"}</p>
            </div>
          </div>
          {editingId && (
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="p-title" className="text-sm font-medium">Title</Label>
            <Input 
              id="p-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              maxLength={160} 
              className="mt-1.5 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" 
              placeholder="Enter post.title..."
            />
          </div>
          
          <div>
            <Label htmlFor="p-cat" className="text-sm font-medium">Category</Label>
            <select
              id="p-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <Label htmlFor="p-excerpt" className="text-sm font-medium">Short summary</Label>
            <Input 
              id="p-excerpt" 
              value={excerpt} 
              onChange={(e) => setExcerpt(e.target.value)} 
              maxLength={280} 
              className="mt-1.5 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              placeholder="Brief description..."
            />
          </div>
          
          <div>
            <Label htmlFor="p-body" className="text-sm font-medium">Body</Label>
            <Textarea 
              id="p-body" 
              rows={6} 
              value={body} 
              onChange={(e) => setBody(e.target.value)} 
              className="mt-1.5 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 resize-none"
              placeholder="Write your content here..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-loc" className="text-sm font-medium">Location</Label>
              <Input 
                id="p-loc" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                maxLength={120} 
                className="mt-1.5 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                placeholder="City, Country"
              />
            </div>
            <div>
              <Label htmlFor="p-deadline" className="text-sm font-medium">Deadline</Label>
              <Input 
                id="p-deadline" 
                type="date" 
                value={deadline} 
                onChange={(e) => setDeadline(e.target.value)} 
                className="mt-1.5 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="p-cover" className="text-sm font-medium">Cover image</Label>
            <div className="mt-1.5">
              <div className="relative">
                <Input
                  id="p-cover"
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  disabled={uploading}
                  className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {coverImageUrl && (
                <div className="mt-3 relative">
                  <img src={coverImageUrl} alt="Cover preview" className="w-full h-32 object-cover rounded-lg" />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 size-8 p-0 rounded-full"
                    onClick={() => { setCoverImageUrl(""); setCoverImageFile(null); if (coverInputRef.current) coverInputRef.current.value = "" }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="p-files" className="text-sm font-medium">Attached files</Label>
            <div className="mt-1.5">
              <Input
                id="p-files"
                ref={filesInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
                onChange={handleAttachedFilesUpload}
                disabled={uploading}
                className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {attachedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachedFiles.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2">
                      <Paperclip className="size-4 text-slate-400" />
                      <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">{url.split('/').pop()}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        onClick={() => removeAttachedFile(url)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <Switch id="p-pub" checked={published} onCheckedChange={setPublished} />
            <Label htmlFor="p-pub" className="text-sm font-medium cursor-pointer">Publish immediately</Label>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={busy || uploading}
          >
            {busy || uploading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Processing...</>
            ) : editingId ? (
              <><CheckCircle2 className="mr-2 size-4" /> Update post</>
            ) : (
              <><Plus className="mr-2 size-4" /> Create post</>
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-slate-400" /></div>}
        {!isLoading && !data?.length && (
          <EmptyState icon={Newspaper} title="No posts yet" hint="Create your first news, career or internship update." />
        )}
        {data?.map((p) => (
          <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              {p.cover_image_url && (
                <div className="size-24 flex-shrink-0">
                  <img src={p.cover_image_url} alt="Cover" className="w-full h-full object-cover rounded-lg" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`capitalize ${
                    p.category === 'news' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    p.category === 'career' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    p.category === 'internship' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {p.category}
                  </Badge>
                  {p.published ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                      <CheckCircle2 className="size-3 mr-1" /> Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Draft
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{p.title}</h3>
                {p.excerpt && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{p.excerpt}</p>}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  {(p.location || p.deadline) && (
                    <>
                      {p.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {p.location}
                        </span>
                      )}
                      {p.deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {p.deadline}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            {p.attached_files && p.attached_files.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-2">
                  {p.attached_files.map((file, idx) => (
                    <a
                      key={idx}
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Paperclip className="size-3" />
                      {file.split('/').pop()}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={p.published} 
                  onCheckedChange={(v) => togglePublished(p.id, v)} 
                  className="data-[state=checked]:bg-blue-600"
                />
                <span className={`text-xs font-medium ${p.published ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {p.published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8"
                  onClick={() => startEdit(p)}
                >
                  <Edit className="mr-2 size-4" /> Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" 
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="mr-2 size-4" /> Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
