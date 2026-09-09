import { useEffect, useState } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Loader2, LogOut, LayoutDashboard, CheckCircle2, Clock, Calendar,
  User, Menu, Bell, TrendingUp, CheckCircle, FileText, Settings,
  Mail, Phone, MapPin, Building, Key, Save, StickyNote, Sun, Moon,
  Download, Eye,
} from "lucide-react"
import Notes from "@/routes/Notes"
import { useTheme } from "@/hooks/useTheme"

export default function EmployeeDashboard() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [isEmployee, setIsEmployee] = useState(null)
  const [employeeData, setEmployeeData] = useState(null)

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
      setIsEmployee(null)
      setEmployeeData(null)
      return
    }
    
    const checkEmployeeAccess = async () => {
      try {
        const { data: employeeData, error } = await supabase.rpc("get_employee_by_user", { _user_id: session.user.id })
        
        if (error) {
          console.error("Employee access check error:", error)
          setIsEmployee(false)
          setEmployeeData(null)
        } else if (!employeeData || employeeData.length === 0) {
          console.log("No employee found for user:", session.user.id)
          setIsEmployee(false)
          setEmployeeData(null)
        } else {
          console.log("Employee found:", employeeData[0])
          setIsEmployee(true)
          setEmployeeData(employeeData[0])
        }
      } catch (err) {
        console.error("Employee access check failed:", err)
        setIsEmployee(false)
        setEmployeeData(null)
      }
    }
    
    checkEmployeeAccess()
  }, [session])

  if (!ready) return <Center><Loader2 className="size-6 animate-spin text-muted-foreground" /></Center>
  if (!session) return <AuthCard />
  if (isEmployee === null) return <Center><Loader2 className="size-6 animate-spin text-muted-foreground" /></Center>
  if (!isEmployee) return <NoAccess />
  return <Dashboard employee={employeeData} email={session.user.email} userId={session.user.id} session={session} />
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
  window.location.assign("/employee")
}

function NoAccess() {
  return (
    <Center>
      <div className="card-lux rounded-3xl border border-border bg-card/80 p-8 text-center shadow-float backdrop-blur">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-primary-foreground">
          <User className="size-6" />
        </div>
        <h1 className="mt-5 font-display text-lg font-bold">No employee access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account is not linked to an employee profile. Please contact your administrator.
        </p>
        <Button className="mt-6" variant="outline" onClick={signOut}>Sign out</Button>
      </div>
    </Center>
  )
}

function AuthCard() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Signed in")
  }

  return (
    <Center>
      <div className="card-lux w-full rounded-3xl border border-border bg-card/80 p-8 shadow-float backdrop-blur">
        <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-primary-foreground shadow-glow">
          <User className="size-6" />
        </div>
        <h1 className="mt-5 font-display text-xl font-bold tracking-tight">Employee Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to access your dashboard</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input 
              id="email" 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="mt-1.5 w-full h-10 px-3 rounded-lg border border-input bg-background"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input 
              id="password" 
              type="password" 
              required minLength={8} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="mt-1.5 w-full h-10 px-3 rounded-lg border border-input bg-background"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
        </form>
      </div>
    </Center>
  )
}

function Dashboard({ employee, email, userId, session }) {
  const qc = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const { isDark, toggleTheme } = useTheme()
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    phone: "",
    address: "",
    city: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["employee-tasks", employee?.id],
    queryFn: async () => {
      if (!employee?.id) {
        console.log("No employee ID available")
        return []
      }
      try {
        const { data, error } = await supabase.rpc("get_employee_tasks", { _employee_id: employee.id })
        if (error) {
          console.error("Error fetching tasks:", error)
          throw error
        }
        console.log("Tasks loaded:", data)
        return data ?? []
      } catch (err) {
        console.error("Task fetch error:", err)
        return []
      }
    },
    enabled: !!employee?.id,
  })

  const { data: employeeDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ["employee-documents", employee?.id],
    queryFn: async () => {
      if (!employee?.id) {
        console.log("No employee ID available for documents")
        return []
      }
      try {
        const { data, error } = await supabase
          .from("employee_documents")
          .select("*")
          .eq("employee_id", employee.id)
          .order("uploaded_at", { ascending: false })
        if (error) {
          console.error("Error fetching documents:", error)
          throw error
        }
        console.log("Documents loaded:", data)
        return data ?? []
      } catch (err) {
        console.error("Document fetch error:", err)
        return []
      }
    },
    enabled: !!employee?.id,
  })

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      const { error } = await supabase.rpc("update_task_status", { _task_id: taskId, _status: status })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Task status updated")
      qc.invalidateQueries({ queryKey: ["employee-tasks"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", employee.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Profile updated successfully")
      qc.invalidateQueries({ queryKey: ["employee-tasks"] })
      setEditProfileOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

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

  const pendingTasks = tasks?.filter(t => t.status === 'pending').length ?? 0
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length ?? 0
  const completedTasks = tasks?.filter(t => t.status === 'completed').length ?? 0

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  }

  const priorityColors = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    medium: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    urgent: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  }

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(profileForm)
  }

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

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  function handleDownloadDocument(fileUrl, documentName) {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = documentName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleViewDocument(fileUrl) {
    window.open(fileUrl, '_blank')
  }

  const openEditProfile = () => {
    setProfileForm({
      phone: employee?.phone || "",
      address: employee?.address || "",
      city: employee?.city || "",
    })
    setEditProfileOpen(true)
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-red-950">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
              <User className="size-5" />
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-display text-sm font-bold leading-tight text-slate-900 dark:text-white">Employee Portal</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dashboard</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} sidebarOpen={sidebarOpen} />
          <NavItem icon={CheckCircle2} label="My Tasks" badge={pendingTasks} active={activeTab === "tasks"} onClick={() => setActiveTab("tasks")} sidebarOpen={sidebarOpen} />
          <NavItem icon={FileText} label="Documents" active={activeTab === "documents"} onClick={() => setActiveTab("documents")} sidebarOpen={sidebarOpen} />
          <NavItem icon={StickyNote} label="Notes" active={activeTab === "notes"} onClick={() => setActiveTab("notes")} sidebarOpen={sidebarOpen} />
          <NavItem icon={Settings} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} sidebarOpen={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 bg-gradient-to-br from-orange-500 to-red-500">
              <AvatarFallback className="text-white font-semibold">
                {employee?.first_name?.slice(0, 1) || email?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {employee?.first_name} {employee?.last_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{employee?.job_title || 'Employee'}</p>
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
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Welcome back, {employee?.first_name}
                </p>
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
              <Button variant="outline" size="icon" className="relative">
                <Bell className="size-5" />
                {pendingTasks > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">{pendingTasks}</span>
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
            <StatCard 
              icon={CheckCircle2} 
              label="Pending Tasks" 
              value={pendingTasks} 
              color="yellow"
            />
            <StatCard 
              icon={Clock} 
              label="In Progress" 
              value={inProgressTasks} 
              color="blue"
            />
            <StatCard 
              icon={CheckCircle} 
              label="Completed" 
              value={completedTasks} 
              color="green"
            />
            <StatCard 
              icon={TrendingUp} 
              label="Total Tasks" 
              value={tasks?.length ?? 0} 
              color="purple"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
              <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <LayoutDashboard className="mr-2 size-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <CheckCircle2 className="mr-2 size-4" /> My Tasks
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <FileText className="mr-2 size-4" /> Documents
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <StickyNote className="mr-2 size-4" /> Notes
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                <Settings className="mr-2 size-4" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Welcome to Your Dashboard</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  You have {pendingTasks} pending task{pendingTasks !== 1 ? 's' : ''} waiting for your attention.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-slate-400" />
                </div>
              ) : !tasks?.length ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                  <CheckCircle2 className="size-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No tasks assigned</h3>
                  <p className="text-slate-500 dark:text-slate-400">You don't have any tasks assigned to you yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{task.title}</h3>
                            <Badge className={priorityColors[task.priority] || priorityColors.medium}>
                              {task.priority}
                            </Badge>
                            <Badge className={statusColors[task.status] || statusColors.pending}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Created: {new Date(task.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                        {task.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => updateTaskStatusMutation.mutate({ taskId: task.id, status: 'in_progress' })}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <Clock className="mr-2 size-4" /> Start Task
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => updateTaskStatusMutation.mutate({ taskId: task.id, status: 'review' })}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <CheckCircle className="mr-2 size-4" /> Submit for Review
                          </Button>
                        )}
                        {task.status === 'review' && (
                          <Button
                            size="sm"
                            onClick={() => updateTaskStatusMutation.mutate({ taskId: task.id, status: 'completed' })}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <CheckCircle className="mr-2 size-4" /> Mark Complete
                          </Button>
                        )}
                        {task.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTaskStatusMutation.mutate({ taskId: task.id, status: 'in_progress' })}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <Clock className="mr-2 size-4" /> Reopen
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Documents</h2>
                {documentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-8 animate-spin text-slate-400" />
                  </div>
                ) : !employeeDocuments || employeeDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto size-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">Your documents will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employeeDocuments.map((doc) => (
                      <div key={doc.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText className="size-5 text-blue-500" />
                              <h3 className="font-medium text-slate-900 dark:text-white">{doc.document_name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {doc.document_type}
                              </Badge>
                            </div>
                            {doc.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{doc.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc.file_url)}
                              title="View document"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadDocument(doc.file_url, doc.document_name)}
                              title="Download document"
                            >
                              <Download className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Notes />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              {/* Profile Information */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile Information</h2>
                  <Button size="sm" onClick={openEditProfile}>
                    <Settings className="mr-2 size-4" /> Edit Profile
                  </Button>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="size-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                        <p className="font-medium text-slate-900 dark:text-white">{email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="size-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                        <p className="font-medium text-slate-900 dark:text-white">{employee?.phone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="size-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Department</p>
                        <p className="font-medium text-slate-900 dark:text-white">{employee?.department || "Not assigned"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="size-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Location</p>
                        <p className="font-medium text-slate-900 dark:text-white">{employee?.city || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Security</h2>
                  <Button size="sm" variant="outline" onClick={() => setChangePasswordOpen(true)}>
                    <Key className="mr-2 size-4" /> Change Password
                  </Button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Last login: {session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleString() : "Unknown"}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProfileOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 size-4" /> Save Changes</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' 
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

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    yellow: 'from-yellow-500 to-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20',
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
          Active
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}
