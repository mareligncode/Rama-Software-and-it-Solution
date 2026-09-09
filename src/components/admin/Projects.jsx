import { useState } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FolderKanban, Plus, Edit, Trash2, Search, Loader2, 
  Calendar, DollarSign, Building2, CheckCircle2, Clock, 
  AlertCircle, MoreVertical, ChevronDown, ChevronRight
} from "lucide-react"

export default function Projects() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [expandedProjects, setExpandedProjects] = useState({})
  
  const [projectForm, setProjectForm] = useState({
    project_code: "",
    name: "",
    description: "",
    client_name: "",
    start_date: "",
    end_date: "",
    budget: "",
    status: "planning",
    priority: "medium",
  })

  const [taskForm, setTaskForm] = useState({
    project_id: "",
    title: "",
    description: "",
    assigned_to: "",
    status: "todo",
    priority: "medium",
    due_date: "",
    estimated_hours: "",
    actual_hours: "",
  })

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .eq("status", "active")
      if (error) throw error
      return data
    },
  })

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("projects").insert(data)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Project created successfully")
      qc.invalidateQueries({ queryKey: ["projects"] })
      setDialogOpen(false)
      resetProjectForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("projects").update(data).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Project updated successfully")
      qc.invalidateQueries({ queryKey: ["projects"] })
      setDialogOpen(false)
      resetProjectForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("projects").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Project deleted successfully")
      qc.invalidateQueries({ queryKey: ["projects"] })
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("tasks").insert(data)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Task created successfully")
      qc.invalidateQueries({ queryKey: ["tasks"] })
      setTaskDialogOpen(false)
      resetTaskForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("tasks").update(data).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Task updated successfully")
      qc.invalidateQueries({ queryKey: ["tasks"] })
      setTaskDialogOpen(false)
      resetTaskForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Task deleted successfully")
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function resetProjectForm() {
    setProjectForm({
      project_code: "",
      name: "",
      description: "",
      client_name: "",
      start_date: "",
      end_date: "",
      budget: "",
      status: "planning",
      priority: "medium",
    })
    setEditingProject(null)
  }

  function resetTaskForm() {
    setTaskForm({
      project_id: "",
      title: "",
      description: "",
      assigned_to: "",
      status: "todo",
      priority: "medium",
      due_date: "",
      estimated_hours: "",
      actual_hours: "",
    })
    setEditingTask(null)
  }

  function handleProjectSubmit(e) {
    e.preventDefault()
    const payload = {
      ...projectForm,
      budget: projectForm.budget ? parseFloat(projectForm.budget) : null,
      start_date: projectForm.start_date || null,
      end_date: projectForm.end_date || null,
    }

    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data: payload })
    } else {
      createProjectMutation.mutate(payload)
    }
  }

  function handleTaskSubmit(e) {
    e.preventDefault()
    const payload = {
      ...taskForm,
      estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null,
      actual_hours: taskForm.actual_hours ? parseFloat(taskForm.actual_hours) : null,
      due_date: taskForm.due_date || null,
      assigned_to: taskForm.assigned_to || null,
    }

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: payload })
    } else {
      createTaskMutation.mutate(payload)
    }
  }

  function handleEditProject(project) {
    setEditingProject(project)
    setProjectForm({
      project_code: project.project_code || "",
      name: project.name || "",
      description: project.description || "",
      client_name: project.client_name || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      budget: project.budget?.toString() || "",
      status: project.status || "planning",
      priority: project.priority || "medium",
    })
    setDialogOpen(true)
  }

  function handleEditTask(task) {
    setEditingTask(task)
    setTaskForm({
      project_id: task.project_id || "",
      title: task.title || "",
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      due_date: task.due_date || "",
      estimated_hours: task.estimated_hours?.toString() || "",
      actual_hours: task.actual_hours?.toString() || "",
    })
    setTaskDialogOpen(true)
  }

  function handleDeleteProject(id) {
    if (confirm("Are you sure you want to delete this project? All associated tasks will also be deleted.")) {
      deleteProjectMutation.mutate(id)
    }
  }

  function handleDeleteTask(id) {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(id)
    }
  }

  function toggleProjectExpand(projectId) {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  function getProjectTasks(projectId) {
    return tasks?.filter(task => task.project_id === projectId) || []
  }

  const filteredProjects = projects?.filter(project =>
    !search ||
    project.name?.toLowerCase().includes(search.toLowerCase()) ||
    project.project_code?.toLowerCase().includes(search.toLowerCase()) ||
    project.client_name?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const statusColors = {
    planning: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    on_hold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const priorityColors = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const taskStatusColors = {
    todo: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <FolderKanban className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Project & Task Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""} • {tasks?.length || 0} task{tasks?.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 h-10 w-64 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetProjectForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 size-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project_code">Project Code *</Label>
                    <Input
                      id="project_code"
                      value={projectForm.project_code}
                      onChange={(e) => setProjectForm({ ...projectForm, project_code: e.target.value })}
                      placeholder="PRJ001"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={projectForm.status} onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name</Label>
                    <Input
                      id="client_name"
                      value={projectForm.client_name}
                      onChange={(e) => setProjectForm({ ...projectForm, client_name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={projectForm.priority} onValueChange={(value) => setProjectForm({ ...projectForm, priority: value })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending || updateProjectMutation.isPending ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                    ) : (
                      editingProject ? "Update Project" : "Create Project"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
              <FolderKanban className="size-10 text-purple-500" />
            </div>
            <p className="mt-4 font-semibold text-slate-900 dark:text-white">No projects found</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create your first project to get started</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const projectTasks = getProjectTasks(project.id)
            const isExpanded = expandedProjects[project.id]
            const completedTasks = projectTasks.filter(t => t.status === 'completed').length
            const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0

            return (
              <div key={project.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
                {/* Project Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => toggleProjectExpand(project.id)}
                        className="mt-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="size-5 text-slate-500" /> : <ChevronRight className="size-5 text-slate-500" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{project.name}</h3>
                          <Badge className={statusColors[project.status] || ""}>
                            {project.status}
                          </Badge>
                          <Badge className={priorityColors[project.priority] || ""}>
                            {project.priority}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400 mb-2">
                          <span className="flex items-center gap-1.5 font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">
                            {project.project_code}
                          </span>
                          {project.client_name && (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="size-4 text-blue-500" /> {project.client_name}
                            </span>
                          )}
                          {project.start_date && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="size-4 text-green-500" /> {new Date(project.start_date).toLocaleDateString()}
                            </span>
                          )}
                          {project.budget && (
                            <span className="flex items-center gap-1.5">
                              <DollarSign className="size-4 text-emerald-500" /> {project.budget.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {projectTasks.length > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                              <span>Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {project.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => {
                        setTaskForm({ ...taskForm, project_id: project.id })
                        setTaskDialogOpen(true)
                      }} className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                        <Plus className="mr-2 size-4" /> Add Task
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEditProject(project)} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                        <Edit className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteProject(project.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-5 bg-slate-50 dark:bg-slate-900/30">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500" />
                        Tasks ({projectTasks.length})
                      </h4>
                      {completedTasks > 0 && (
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {completedTasks} completed
                        </span>
                      )}
                    </div>

                    {projectTasks.length === 0 ? (
                      <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                          <CheckCircle2 className="size-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">No tasks yet. Click "Add Task" to create one.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {projectTasks.map((task) => {
                          const assignee = employees?.find(e => e.id === task.assigned_to)
                          return (
                            <div key={task.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h5 className="font-medium text-slate-900 dark:text-white">{task.title}</h5>
                                    <Badge className={taskStatusColors[task.status] || ""}>
                                      {task.status}
                                    </Badge>
                                    <Badge className={priorityColors[task.priority] || ""}>
                                      {task.priority}
                                    </Badge>
                                  </div>
                                  
                                  {task.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2 line-clamp-2">{task.description}</p>
                                  )}

                                  <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                                    {assignee && (
                                      <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                        <CheckCircle2 className="size-3.5 text-blue-500" /> {assignee.first_name} {assignee.last_name}
                                      </span>
                                    )}
                                    {task.due_date && (
                                      <span className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                                        <Calendar className="size-3.5 text-orange-500" /> {new Date(task.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {task.estimated_hours && (
                                      <span className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                                        <Clock className="size-3.5 text-purple-500" /> {task.estimated_hours}h est.
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                  <Button size="sm" variant="ghost" onClick={() => handleEditTask(task)} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                    <Edit className="size-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteTask(task.id)}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => {
        setTaskDialogOpen(open)
        if (!open) resetTaskForm()
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div>
              <Label htmlFor="task_title">Task Title *</Label>
              <Input
                id="task_title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="task_description">Description</Label>
              <Textarea
                id="task_description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task_status">Status</Label>
                <Select value={taskForm.status} onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task_priority">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task_assigned_to">Assigned To</Label>
                <Select value={taskForm.assigned_to} onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to: value })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task_due_date">Due Date</Label>
                <Input
                  id="task_due_date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task_estimated_hours">Estimated Hours</Label>
                <Input
                  id="task_estimated_hours"
                  type="number"
                  value={taskForm.estimated_hours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="task_actual_hours">Actual Hours</Label>
                <Input
                  id="task_actual_hours"
                  type="number"
                  value={taskForm.actual_hours}
                  onChange={(e) => setTaskForm({ ...taskForm, actual_hours: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
              >
                {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                ) : (
                  editingTask ? "Update Task" : "Create Task"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
