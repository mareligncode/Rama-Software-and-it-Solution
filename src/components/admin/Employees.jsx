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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, Plus, Edit, Trash2, Search, Upload, X, Loader2, 
  Mail, Phone, MapPin, Calendar, Building, DollarSign, 
  User, Briefcase, AlertCircle, CheckCircle2, FileText,
  Download, FolderOpen, Eye
} from "lucide-react"

export default function Employees() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false)
  const [selectedEmployeeForDocs, setSelectedEmployeeForDocs] = useState(null)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    hire_date: "",
    job_title: "",
    department: "",
    salary: "",
    address: "",
    city: "",
    country: "Ethiopia",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    status: "active",
    profile_image_url: "",
    user_id: "",
  })
  const [newDocument, setNewDocument] = useState({
    document_name: "",
    document_type: "other",
    description: "",
  })

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: authUsers } = useQuery({
    queryKey: ["auth-users"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.admin.listUsers()
      if (error) throw error
      return data.users
    },
  })

  const { data: employeeDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ["employee-documents", selectedEmployeeForDocs?.id],
    queryFn: async () => {
      if (!selectedEmployeeForDocs?.id) return []
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", selectedEmployeeForDocs.id)
        .order("uploaded_at", { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!selectedEmployeeForDocs?.id,
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check if employee_id already exists
      if (data.employee_id) {
        const { data: existing } = await supabase
          .from("employees")
          .select("employee_id")
          .eq("employee_id", data.employee_id)
          .single()
        
        if (existing) {
          throw new Error("Employee ID already exists. Please use a unique ID.")
        }
      }

      const { error } = await supabase.from("employees").insert(data)
      if (error) throw error

      // Assign employee role if user_id is provided
      if (data.user_id) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user_id,
          role: "employee"
        })
        if (roleError && !roleError.message.includes('duplicate key')) {
          console.error('Role assignment error:', roleError)
        }
      }
    },
    onSuccess: () => {
      toast.success("Employee created successfully")
      qc.invalidateQueries({ queryKey: ["employees"] })
      setDialogOpen(false)
      resetForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, previousUserId }) => {
      const { error } = await supabase.from("employees").update(data).eq("id", id)
      if (error) throw error

      // Handle role assignment when user_id changes
      if (previousUserId && previousUserId !== data.user_id) {
        // Remove employee role from previous user
        await supabase.from("user_roles").delete().eq("user_id", previousUserId).eq("role", "employee")
      }
      
      if (data.user_id && data.user_id !== previousUserId) {
        // Assign employee role to new user
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user_id,
          role: "employee"
        })
        if (roleError && !roleError.message.includes('duplicate key')) {
          console.error('Role assignment error:', roleError)
        }
      }
    },
    onSuccess: () => {
      toast.success("Employee updated successfully")
      qc.invalidateQueries({ queryKey: ["employees"] })
      setDialogOpen(false)
      resetForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("employees").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Employee deleted successfully")
      qc.invalidateQueries({ queryKey: ["employees"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ employeeId, file, documentData }) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${employeeId}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('employees')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('employees')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase.from("employee_documents").insert({
        employee_id: employeeId,
        document_name: documentData.document_name,
        document_type: documentData.document_type,
        file_url: publicUrl,
        file_size: file.size,
        description: documentData.description,
      })

      if (dbError) throw dbError
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully")
      qc.invalidateQueries({ queryKey: ["employee-documents", selectedEmployeeForDocs?.id] })
      setNewDocument({ document_name: "", document_type: "other", description: "" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId) => {
      const { error } = await supabase.from("employee_documents").delete().eq("id", documentId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Document deleted successfully")
      qc.invalidateQueries({ queryKey: ["employee-documents", selectedEmployeeForDocs?.id] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const uploadProfileImageMutation = useMutation({
    mutationFn: async ({ file, employeeId }) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `profiles/${employeeId || 'temp'}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('employees')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('employees')
        .getPublicUrl(fileName)

      return publicUrl
    },
    onSuccess: (publicUrl) => {
      setFormData({ ...formData, profile_image_url: publicUrl })
      toast.success("Profile image uploaded successfully")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function resetForm() {
    setFormData({
      employee_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      hire_date: "",
      job_title: "",
      department: "",
      salary: "",
      address: "",
      city: "",
      country: "Ethiopia",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      status: "active",
      profile_image_url: "",
      user_id: "",
    })
    setEditingEmployee(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...formData,
      salary: formData.salary ? parseFloat(formData.salary) : null,
      date_of_birth: formData.date_of_birth || null,
      hire_date: formData.hire_date || null,
      user_id: formData.user_id && formData.user_id !== "none" ? formData.user_id : null,
      profile_image_url: formData.profile_image_url || null,
    }

    if (editingEmployee) {
      updateMutation.mutate({ 
        id: editingEmployee.id, 
        data: payload,
        previousUserId: editingEmployee.user_id 
      })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleEdit(employee) {
    setEditingEmployee(employee)
    setFormData({
      employee_id: employee.employee_id || "",
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      date_of_birth: employee.date_of_birth || "",
      hire_date: employee.hire_date || "",
      job_title: employee.job_title || "",
      department: employee.department || "",
      salary: employee.salary?.toString() || "",
      address: employee.address || "",
      city: employee.city || "",
      country: employee.country || "Ethiopia",
      emergency_contact_name: employee.emergency_contact_name || "",
      emergency_contact_phone: employee.emergency_contact_phone || "",
      status: employee.status || "active",
      profile_image_url: employee.profile_image_url || "",
      user_id: employee.user_id || "",
    })
    setDialogOpen(true)
  }

  function handleDelete(id) {
    if (confirm("Are you sure you want to delete this employee?")) {
      deleteMutation.mutate(id)
    }
  }

  function handleProfileImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingProfile(true)
    uploadProfileImageMutation.mutate(
      { 
        file, 
        employeeId: editingEmployee?.id || formData.employee_id || 'temp'
      },
      {
        onSettled: () => {
          setUploadingProfile(false)
        }
      }
    )
  }

  function handleOpenDocuments(employee) {
    setSelectedEmployeeForDocs(employee)
    setDocumentsDialogOpen(true)
  }

  function handleDocumentUpload(e) {
    e.preventDefault()
    const fileInput = document.getElementById('document-file')
    const file = fileInput?.files?.[0]
    
    if (!file) {
      toast.error("Please select a file to upload")
      return
    }

    if (!newDocument.document_name) {
      toast.error("Please enter a document name")
      return
    }

    setUploading(true)
    uploadDocumentMutation.mutate(
      { 
        employeeId: selectedEmployeeForDocs.id, 
        file, 
        documentData: newDocument 
      },
      {
        onSettled: () => {
          setUploading(false)
          if (fileInput) fileInput.value = ''
        }
      }
    )
  }

  function handleDeleteDocument(documentId) {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate(documentId)
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredEmployees = employees?.filter(emp =>
    !search ||
    emp.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(search.toLowerCase())
  ) || []

  if (isLoading) {
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
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Employee Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="pl-10 h-10 w-64 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 size-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="EMP001"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Profile Image Upload */}
                <div className="border-t pt-4">
                  <Label>Profile Image</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {formData.profile_image_url ? (
                      <div className="relative">
                        <img 
                          src={formData.profile_image_url} 
                          alt="Profile" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute -top-2 -right-2 size-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                          onClick={() => setFormData({ ...formData, profile_image_url: "" })}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300">
                        <User className="size-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        disabled={uploadingProfile}
                        className="mt-0"
                      />
                      {uploadingProfile && (
                        <p className="text-xs text-slate-500 mt-1">Uploading...</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="job_title">Job Title *</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hire_date">Hire Date *</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salary">Salary</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergency_contact_name">Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Dashboard Access</p>
                  <div>
                    <Label htmlFor="user_id">Link to User Account (for Employee Dashboard)</Label>
                    <Select 
                      value={formData.user_id || "none"} 
                      onValueChange={(value) => setFormData({ ...formData, user_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select a user account to link" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No user account linked</SelectItem>
                        {authUsers?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email} {user.email === formData.email && "(matches employee email)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      Link this employee to a user account so they can access the employee dashboard. The user must have the same email as the employee.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                    ) : (
                      editingEmployee ? "Update Employee" : "Create Employee"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Employee</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Employee ID</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Job Title</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Department</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Hire Date</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Dashboard</TableHead>
              <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 bg-gradient-to-br from-blue-500 to-indigo-500">
                        {employee.profile_image_url ? (
                          <img src={employee.profile_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <AvatarFallback className="text-white font-semibold">
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Mail className="size-3" /> {employee.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{employee.employee_id || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Briefcase className="size-4 text-blue-500" /> {employee.job_title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Building className="size-4 text-purple-500" /> {employee.department || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Calendar className="size-4 text-green-500" /> {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={employee.status === "active" ? "default" : "secondary"}
                      className={
                        employee.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0"
                          : employee.status === "terminated"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0"
                      }
                    >
                      {employee.status === "active" && <CheckCircle2 className="size-3 mr-1" />}
                      {employee.status === "terminated" && <AlertCircle className="size-3 mr-1" />}
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.user_id ? (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                        <CheckCircle2 className="size-3 mr-1" /> Linked
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400 border-0">
                        Not Linked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenDocuments(employee)}>
                        <FolderOpen className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(employee)}>
                        <Edit className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(employee.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Documents Dialog */}
      <Dialog open={documentsDialogOpen} onOpenChange={(open) => {
        setDocumentsDialogOpen(open)
        if (!open) setSelectedEmployeeForDocs(null)
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Documents - {selectedEmployeeForDocs?.first_name} {selectedEmployeeForDocs?.last_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Upload Form */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 dark:text-white mb-3">Upload New Document</h3>
              <form onSubmit={handleDocumentUpload} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="document_name">Document Name *</Label>
                    <Input
                      id="document_name"
                      value={newDocument.document_name}
                      onChange={(e) => setNewDocument({ ...newDocument, document_name: e.target.value })}
                      placeholder="e.g., Employment Contract"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="document_type">Document Type</Label>
                    <Select value={newDocument.document_type} onValueChange={(value) => setNewDocument({ ...newDocument, document_type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cv">CV/Resume</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="id_card">ID Card</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="document-file">File *</Label>
                  <Input
                    id="document-file"
                    type="file"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                    placeholder="Optional description of the document"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="mr-2 size-4" /> Upload Document</>
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewDocument({ document_name: "", document_type: "other", description: "" })
                      const fileInput = document.getElementById('document-file')
                      if (fileInput) fileInput.value = ''
                    }}
                    disabled={uploading}
                  >
                    <Plus className="mr-2 size-4" /> Add Another
                  </Button>
                </div>
              </form>
            </div>

            {/* Documents List */}
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                Uploaded Documents ({employeeDocuments?.length || 0})
              </h3>
              
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-slate-400" />
                </div>
              ) : !employeeDocuments || employeeDocuments.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <FileText className="size-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{doc.document_name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.document_type}
                            </Badge>
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                          </div>
                          {doc.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url, '_blank')}>
                          <Eye className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url, '_blank')}>
                          <Download className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteDocument(doc.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
