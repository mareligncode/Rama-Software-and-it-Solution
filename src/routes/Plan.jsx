import { useState } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Plus, Calendar, CheckCircle2, Clock, Package, DollarSign,
  TrendingUp, FileText, Settings, X, Edit2, Trash2,
} from "lucide-react"

export default function Plan() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState("daily")
  const [createPlanOpen, setCreatePlanOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [planDetailOpen, setPlanDetailOpen] = useState(false)
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    plan_type: "daily",
    start_date: "",
    end_date: "",
  })

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["plans", activeTab],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_plans_by_type", { _plan_type: activeTab })
      if (error) throw error
      return data ?? []
    },
  })

  const createPlanMutation = useMutation({
    mutationFn: async (data) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from("plans").insert({
        ...data,
        created_by: user?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Plan created successfully")
      qc.invalidateQueries({ queryKey: ["plans"] })
      setCreatePlanOpen(false)
      setPlanForm({ title: "", description: "", plan_type: activeTab, start_date: "", end_date: "" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deletePlanMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("plans").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Plan deleted successfully")
      qc.invalidateQueries({ queryKey: ["plans"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCreatePlan = (e) => {
    e.preventDefault()
    createPlanMutation.mutate(planForm)
  }

  const openPlanDetail = (plan) => {
    setSelectedPlan(plan)
    setPlanDetailOpen(true)
  }

  const statusColors = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-red-950">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Plan Management</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage your daily, monthly, yearly, and custom plans</p>
          </div>
          <Button onClick={() => setCreatePlanOpen(true)}>
            <Plus className="mr-2 size-4" /> Create Plan
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
            <TabsTrigger value="daily" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <Calendar className="mr-2 size-4" /> Daily Plans
            </TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <TrendingUp className="mr-2 size-4" /> Monthly Plans
            </TabsTrigger>
            <TabsTrigger value="yearly" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <FileText className="mr-2 size-4" /> Yearly Plans
            </TabsTrigger>
            <TabsTrigger value="custom" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <Settings className="mr-2 size-4" /> Custom Plans
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {plansLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-slate-400" />
              </div>
            ) : !plans?.length ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center shadow-sm border border-slate-200 dark:border-slate-700">
                <FileText className="size-12 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No {activeTab} plans</h3>
                <p className="text-slate-500 dark:text-slate-400">Create your first {activeTab} plan to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPlanDetail(plan)}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.title}</h3>
                      <Badge className={statusColors[plan.status] || statusColors.active}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{plan.description || "No description"}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      {plan.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(plan.start_date).toLocaleDateString()}
                        </span>
                      )}
                      {plan.end_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(plan.end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Plan Dialog */}
        <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="mt-1.5"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={planForm.start_date}
                    onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={planForm.end_date}
                    onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreatePlanOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPlanMutation.isPending}>
                  {createPlanMutation.isPending ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Creating...</>
                  ) : (
                    <><Plus className="mr-2 size-4" /> Create Plan</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Plan Detail Dialog */}
        {selectedPlan && (
          <PlanDetail
            plan={selectedPlan}
            open={planDetailOpen}
            onOpenChange={setPlanDetailOpen}
          />
        )}
      </div>
    </div>
  )
}

function PlanDetail({ plan, open, onOpenChange }) {
  const qc = useQueryClient()
  const [activeDetailTab, setActiveDetailTab] = useState("todos")
  const [createTodoOpen, setCreateTodoOpen] = useState(false)
  const [createInventoryOpen, setCreateInventoryOpen] = useState(false)
  const [todoForm, setTodoForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
  })
  const [inventoryForm, setInventoryForm] = useState({
    item_name: "",
    description: "",
    quantity: 0,
    unit: "",
    cost_per_unit: 0,
  })

  const { data: todos, isLoading: todosLoading } = useQuery({
    queryKey: ["plan-todos", plan.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_plan_todos", { _plan_id: plan.id })
      if (error) throw error
      return data ?? []
    },
    enabled: open,
  })

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["plan-inventory", plan.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_plan_inventory", { _plan_id: plan.id })
      if (error) throw error
      return data ?? []
    },
    enabled: open,
  })

  const createTodoMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("plan_todos").insert({
        ...data,
        plan_id: plan.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Todo added successfully")
      qc.invalidateQueries({ queryKey: ["plan-todos"] })
      setCreateTodoOpen(false)
      setTodoForm({ title: "", description: "", due_date: "", priority: "medium" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const createInventoryMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("plan_inventory").insert({
        ...data,
        plan_id: plan.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Inventory item added successfully")
      qc.invalidateQueries({ queryKey: ["plan-inventory"] })
      setCreateInventoryOpen(false)
      setInventoryForm({ item_name: "", description: "", quantity: 0, unit: "", cost_per_unit: 0 })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase.from("plan_todos").update({ completed }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-todos"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteTodoMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("plan_todos").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Todo deleted successfully")
      qc.invalidateQueries({ queryKey: ["plan-todos"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("plan_inventory").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Inventory item deleted successfully")
      qc.invalidateQueries({ queryKey: ["plan-inventory"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCreateTodo = (e) => {
    e.preventDefault()
    createTodoMutation.mutate(todoForm)
  }

  const handleCreateInventory = (e) => {
    e.preventDefault()
    createInventoryMutation.mutate(inventoryForm)
  }

  const priorityColors = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    medium: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    urgent: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  }

  const inventoryStatusColors = {
    available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    reserved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    used: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    low_stock: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const completedTodos = todos?.filter(t => t.completed).length ?? 0
  const totalTodos = todos?.length ?? 0
  const progress = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0
  const totalInventoryCost = inventory?.reduce((sum, item) => sum + (item.total_cost || 0), 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{plan.title}</DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {plan.plan_type}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{progress}%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{inventory?.length ?? 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Inventory Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <DollarSign className="size-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">${totalInventoryCost.toLocaleString()}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Cost</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="todos" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <CheckCircle2 className="mr-2 size-4" /> Todos
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <Package className="mr-2 size-4" /> Inventory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">Todo List</h3>
              <Button size="sm" onClick={() => setCreateTodoOpen(true)}>
                <Plus className="mr-2 size-4" /> Add Todo
              </Button>
            </div>
            {todosLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </div>
            ) : !todos?.length ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center shadow-sm border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="size-8 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No todos yet. Add your first todo item.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todos.map((todo) => (
                  <div key={todo.id} className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 ${todo.completed ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTodoMutation.mutate({ id: todo.id, completed: !todo.completed })}
                        className={`mt-1 size-5 rounded border-2 flex items-center justify-center transition-colors ${
                          todo.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-green-500'
                        }`}
                      >
                        {todo.completed && <CheckCircle2 className="size-3" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${todo.completed ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {todo.title}
                          </p>
                          <Badge className={priorityColors[todo.priority] || priorityColors.medium}>
                            {todo.priority}
                          </Badge>
                        </div>
                        {todo.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{todo.description}</p>
                        )}
                        {todo.due_date && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Due: {new Date(todo.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => deleteTodoMutation.mutate(todo.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">Inventory</h3>
              <Button size="sm" onClick={() => setCreateInventoryOpen(true)}>
                <Plus className="mr-2 size-4" /> Add Item
              </Button>
            </div>
            {inventoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </div>
            ) : !inventory?.length ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center shadow-sm border border-slate-200 dark:border-slate-700">
                <Package className="size-8 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No inventory items yet. Add your first item.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventory.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900 dark:text-white">{item.item_name}</p>
                          <Badge className={inventoryStatusColors[item.status] || inventoryStatusColors.available}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                          <span>Qty: {item.quantity} {item.unit}</span>
                          <span>Cost: ${item.cost_per_unit}/unit</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            Total: ${item.total_cost?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => deleteInventoryMutation.mutate(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Todo Dialog */}
        <Dialog open={createTodoOpen} onOpenChange={setCreateTodoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Todo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTodo} className="space-y-4">
              <div>
                <Label htmlFor="todo-title">Title</Label>
                <Input
                  id="todo-title"
                  value={todoForm.title}
                  onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="todo-description">Description</Label>
                <Textarea
                  id="todo-description"
                  value={todoForm.description}
                  onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                  className="mt-1.5"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="todo-due_date">Due Date</Label>
                  <Input
                    id="todo-due_date"
                    type="date"
                    value={todoForm.due_date}
                    onChange={(e) => setTodoForm({ ...todoForm, due_date: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="todo-priority">Priority</Label>
                  <select
                    id="todo-priority"
                    value={todoForm.priority}
                    onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg border border-input bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateTodoOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTodoMutation.isPending}>
                  {createTodoMutation.isPending ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Adding...</>
                  ) : (
                    <><Plus className="mr-2 size-4" /> Add Todo</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Inventory Dialog */}
        <Dialog open={createInventoryOpen} onOpenChange={setCreateInventoryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInventory} className="space-y-4">
              <div>
                <Label htmlFor="item-name">Item Name</Label>
                <Input
                  id="item-name"
                  value={inventoryForm.item_name}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, item_name: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="item-description">Description</Label>
                <Textarea
                  id="item-description"
                  value={inventoryForm.description}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, description: e.target.value })}
                  className="mt-1.5"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item-quantity">Quantity</Label>
                  <Input
                    id="item-quantity"
                    type="number"
                    value={inventoryForm.quantity}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: parseFloat(e.target.value) || 0 })}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="item-unit">Unit</Label>
                  <Input
                    id="item-unit"
                    value={inventoryForm.unit}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                    placeholder="e.g., pcs, kg, liters"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="item-cost">Cost per Unit</Label>
                <Input
                  id="item-cost"
                  type="number"
                  step="0.01"
                  value={inventoryForm.cost_per_unit}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  required
                  className="mt-1.5"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateInventoryOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInventoryMutation.isPending}>
                  {createInventoryMutation.isPending ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Adding...</>
                  ) : (
                    <><Plus className="mr-2 size-4" /> Add Item</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
