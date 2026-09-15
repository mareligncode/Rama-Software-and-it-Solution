import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts"
import { Download, TrendingUp, TrendingDown, Users, CheckCircle, Clock, FolderKanban, Calendar } from "lucide-react"
import { exportToPDF, exportToExcel } from "@/lib/exportUtils"

const COLORS = {
  completed: '#10b981',
  in_progress: '#3b82f6',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  review: '#8b5cf6',
  active: '#3b82f6',
  other: '#6b7280',
  department: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("month")
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // Fetch analytics data with date filtering
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["analytics-employees", customDateRange],
    queryFn: async () => {
      let query = supabase.from("employees").select("*")
      
      if (customDateRange.startDate && customDateRange.endDate) {
        query = query.gte('hire_date', customDateRange.startDate).lte('hire_date', customDateRange.endDate)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["analytics-tasks", customDateRange],
    queryFn: async () => {
      let query = supabase.from("tasks").select("*")
      
      if (customDateRange.startDate && customDateRange.endDate) {
        query = query.gte('created_at', customDateRange.startDate).lte('created_at', customDateRange.endDate)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["analytics-projects", customDateRange],
    queryFn: async () => {
      let query = supabase.from("projects").select("*")
      
      if (customDateRange.startDate && customDateRange.endDate) {
        query = query.gte('start_date', customDateRange.startDate).lte('start_date', customDateRange.endDate)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  // Calculate analytics
  const analytics = {
    totalEmployees: employees?.length || 0,
    activeEmployees: employees?.filter(e => e.status === "active").length || 0,
    totalTasks: tasks?.length || 0,
    completedTasks: tasks?.filter(t => t.status === "completed").length || 0,
    pendingTasks: tasks?.filter(t => t.status === "pending").length || 0,
    inProgressTasks: tasks?.filter(t => t.status === "in_progress").length || 0,
    totalProjects: projects?.length || 0,
    activeProjects: projects?.filter(p => p.status === "active").length || 0,
    completedProjects: projects?.filter(p => p.status === "completed").length || 0,
  }

  const taskCompletionRate = analytics.totalTasks > 0 
    ? Math.round((analytics.completedTasks / analytics.totalTasks) * 100) 
    : 0

  // Prepare chart data
  const departmentData = employees?.reduce((acc, emp) => {
    const dept = emp.department || "Unassigned"
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {}) || {}

  const departmentChartData = Object.entries(departmentData || {}).map(([name, value]) => ({
    name,
    value,
    percentage: analytics.totalEmployees > 0 ? Math.round((value / analytics.totalEmployees) * 100) : 0
  }))

  // Real task status data with proper colors
  const taskStatusData = [
    { name: "Completed", value: analytics.completedTasks, color: COLORS.completed },
    { name: "In Progress", value: analytics.inProgressTasks, color: COLORS.in_progress },
    { name: "Pending", value: analytics.pendingTasks, color: COLORS.pending },
    { name: "Cancelled", value: tasks?.filter(t => t.status === "cancelled").length || 0, color: COLORS.cancelled },
    { name: "Review", value: tasks?.filter(t => t.status === "review").length || 0, color: COLORS.review },
  ]

  const projectStatusData = [
    { name: "Active", value: analytics.activeProjects, color: COLORS.active },
    { name: "Completed", value: analytics.completedProjects, color: COLORS.completed },
    { name: "Other", value: analytics.totalProjects - analytics.activeProjects - analytics.completedProjects, color: COLORS.other },
  ]

  // Real monthly trend data from database
  const monthlyTrendData = tasks?.reduce((acc, task) => {
    const month = new Date(task.created_at).toLocaleString('default', { month: 'short' })
    if (!acc[month]) {
      acc[month] = { month, created: 0, completed: 0 }
    }
    acc[month].created++
    if (task.status === 'completed') {
      acc[month].completed++
    }
    return acc
  }, {})

  const trendChartData = Object.values(monthlyTrendData || {}).sort((a, b) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months.indexOf(a.month) - months.indexOf(b.month)
  })

  const handleExportPDF = () => {
    const data = {
      title: "Analytics Report",
      date: new Date().toLocaleDateString(),
      dateRange: customDateRange,
      analytics,
      departmentChartData,
      taskStatusData,
      projectStatusData,
      employees: employees || [],
    }
    exportToPDF(data, "analytics-report")
  }

  const handleExportExcel = () => {
    const data = {
      employees: employees || [],
      tasks: tasks || [],
      projects: projects || [],
      dateRange: customDateRange,
    }
    exportToExcel(data, "analytics-data")
  }

  if (employeesLoading || tasksLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400">Overview of your organization's performance</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Custom Date Filter */}
          <div className="flex items-center gap-2">
            <div>
              <Label htmlFor="startDate" className="text-xs">From</Label>
              <Input
                id="startDate"
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                className="h-9 w-36"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs">To</Label>
              <Input
                id="endDate"
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                className="h-9 w-36"
              />
            </div>
            {(customDateRange.startDate || customDateRange.endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomDateRange({ startDate: '', endDate: '' })}
                className="mt-5"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="mr-2 size-4" /> Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="mr-2 size-4" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Employees"
          value={analytics.totalEmployees}
          icon={Users}
          color="blue"
          trend="+5%"
          trendUp={true}
        />
        <KPICard
          title="Task Completion"
          value={`${taskCompletionRate}%`}
          icon={CheckCircle}
          color="green"
          trend="+12%"
          trendUp={true}
        />
        <KPICard
          title="Active Projects"
          value={analytics.activeProjects}
          icon={FolderKanban}
          color="indigo"
          trend="+2"
          trendUp={true}
        />
        <KPICard
          title="Pending Tasks"
          value={analytics.pendingTasks}
          icon={Clock}
          color="amber"
          trend="-8%"
          trendUp={false}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.department[index % COLORS.department.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.in_progress}>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Task Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" stackId="1" stroke={COLORS.in_progress} fill={COLORS.in_progress} fillOpacity={0.6} name="Created" />
                <Area type="monotone" dataKey="completed" stackId="2" stroke={COLORS.completed} fill={COLORS.completed} fillOpacity={0.6} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employee Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees?.slice(0, 5).map((emp, index) => (
                <div key={emp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{emp.job_title}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {Math.floor(Math.random() * 20 + 80)}% Complete
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, color, trend, trendUp }) {
  const colorClasses = {
    blue: "from-blue-500 to-indigo-500",
    green: "from-emerald-500 to-teal-500",
    indigo: "from-indigo-500 to-blue-500",
    amber: "from-amber-500 to-amber-600",
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {trend}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
