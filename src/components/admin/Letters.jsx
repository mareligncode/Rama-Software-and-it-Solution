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
  FileText, Plus, Edit, Trash2, Search, Loader2, 
  Send, Download, Eye, Copy, CheckCircle2, Clock, 
  AlertCircle, FileSignature, User, Building2
} from "lucide-react"

export default function Letters() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState("templates")
  const [search, setSearch] = useState("")
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewContent, setPreviewContent] = useState("")
  
  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "custom",
    subject: "",
    body: "",
    variables: "[]",
  })

  const [generateForm, setGenerateForm] = useState({
    template_id: "",
    employee_id: "",
    variables_data: "{}",
  })

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["letter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("letter_templates")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: generatedLetters, isLoading: lettersLoading } = useQuery({
    queryKey: ["generated-letters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_letters")
        .select(`
          *,
          employee:employees(first_name, last_name, email)
        `)
        .order("generated_at", { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, job_title, department")
        .eq("status", "active")
      if (error) throw error
      return data
    },
  })

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single()
      if (error) throw error
      return data
    },
  })

  const createTemplateMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("letter_templates").insert(data)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Template created successfully")
      qc.invalidateQueries({ queryKey: ["letter-templates"] })
      setTemplateDialogOpen(false)
      resetTemplateForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("letter_templates").update(data).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Template updated successfully")
      qc.invalidateQueries({ queryKey: ["letter-templates"] })
      setTemplateDialogOpen(false)
      resetTemplateForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("letter_templates").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Template deleted successfully")
      qc.invalidateQueries({ queryKey: ["letter-templates"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const generateLetterMutation = useMutation({
    mutationFn: async (data) => {
      const template = templates?.find(t => t.id === data.template_id)
      const employee = employees?.find(e => e.id === data.employee_id)
      const variablesData = JSON.parse(data.variables_data || "{}")
      
      let body = template?.body || ""
      let subject = template?.subject || ""
      
      // Replace variables
      Object.keys(variablesData).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        body = body.replace(regex, variablesData[key])
        subject = subject.replace(regex, variablesData[key])
      })
      
      // Auto-fill common employee data
      if (employee) {
        const employeeData = {
          employee_name: `${employee.first_name} ${employee.last_name}`,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          job_title: employee.job_title,
          department: employee.department,
        }
        
        Object.keys(employeeData).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g')
          body = body.replace(regex, employeeData[key] || "")
          subject = subject.replace(regex, employeeData[key] || "")
        })
      }
      
      // Auto-fill company data
      if (companySettings) {
        const companyData = {
          company_name: companySettings.company_name,
          company_address: companySettings.company_address,
          company_phone: companySettings.company_phone,
          company_email: companySettings.company_email,
          website: companySettings.website,
        }
        
        Object.keys(companyData).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g')
          body = body.replace(regex, companyData[key] || "")
          subject = subject.replace(regex, companyData[key] || "")
        })
      }
      
      const payload = {
        template_id: data.template_id,
        employee_id: data.employee_id,
        letter_type: template?.type || "custom",
        subject,
        body,
        variables_data: data.variables_data,
      }
      
      const { error } = await supabase.from("generated_letters").insert(payload)
      if (error) throw error
      
      return { subject, body }
    },
    onSuccess: (result) => {
      toast.success("Letter generated successfully")
      qc.invalidateQueries({ queryKey: ["generated-letters"] })
      setGenerateDialogOpen(false)
      setPreviewContent(result)
      setPreviewDialogOpen(true)
      resetGenerateForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function resetTemplateForm() {
    setTemplateForm({
      name: "",
      type: "custom",
      subject: "",
      body: "",
      variables: "[]",
    })
    setEditingTemplate(null)
  }

  function resetGenerateForm() {
    setGenerateForm({
      template_id: "",
      employee_id: "",
      variables_data: "{}",
    })
    setSelectedTemplate(null)
  }

  function handleTemplateSubmit(e) {
    e.preventDefault()
    const payload = {
      ...templateForm,
      variables: JSON.parse(templateForm.variables || "[]"),
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: payload })
    } else {
      createTemplateMutation.mutate(payload)
    }
  }

  function handleEditTemplate(template) {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name || "",
      type: template.type || "custom",
      subject: template.subject || "",
      body: template.body || "",
      variables: JSON.stringify(template.variables || [], null, 2),
    })
    setTemplateDialogOpen(true)
  }

  function handleDeleteTemplate(id) {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id)
    }
  }

  function handleGenerateLetter(e) {
    e.preventDefault()
    generateLetterMutation.mutate(generateForm)
  }

  function handlePreviewLetter(letter) {
    setPreviewContent({ subject: letter.subject, body: letter.body })
    setPreviewDialogOpen(true)
  }

  function handleCopyToClipboard() {
    const content = `${previewContent.subject}\n\n${previewContent.body}`
    navigator.clipboard.writeText(content)
    toast.success("Letter copied to clipboard")
  }

  function handleDownloadLetter() {
    const content = `${previewContent.subject}\n\n${previewContent.body}`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `letter-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Letter downloaded")
  }

  const filteredTemplates = templates?.filter(template =>
    !search ||
    template.name?.toLowerCase().includes(search.toLowerCase()) ||
    template.type?.toLowerCase().includes(search.toLowerCase()) ||
    template.subject?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const filteredLetters = generatedLetters?.filter(letter =>
    !search ||
    letter.subject?.toLowerCase().includes(search.toLowerCase()) ||
    letter.letter_type?.toLowerCase().includes(search.toLowerCase()) ||
    letter.employee?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    letter.employee?.last_name?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const typeColors = {
    hire: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    termination: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    promotion: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    custom: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <FileSignature className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Letter Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage letter templates and generate official letters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-10 h-10 w-64 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>

          <Dialog open={templateDialogOpen} onOpenChange={(open) => {
            setTemplateDialogOpen(open)
            if (!open) resetTemplateForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="mr-2 size-4" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template_name">Template Name *</Label>
                    <Input
                      id="template_name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template_type">Type</Label>
                    <Select value={templateForm.type} onValueChange={(value) => setTemplateForm({ ...templateForm, type: value })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hire">Hire Letter</SelectItem>
                        <SelectItem value="termination">Termination Letter</SelectItem>
                        <SelectItem value="promotion">Promotion Letter</SelectItem>
                        <SelectItem value="warning">Warning Letter</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="template_subject">Subject *</Label>
                  <Input
                    id="template_subject"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    placeholder="Use {{variable_name}} for dynamic content"
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="template_body">Body *</Label>
                  <Textarea
                    id="template_body"
                    value={templateForm.body}
                    onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                    placeholder="Use {{variable_name}} for dynamic content. Available: employee_name, job_title, department, company_name, etc."
                    required
                    className="mt-1.5 min-h-[200px]"
                  />
                </div>

                <div>
                  <Label htmlFor="template_variables">Variables (JSON array)</Label>
                  <Textarea
                    id="template_variables"
                    value={templateForm.variables}
                    onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })}
                    placeholder='["employee_name", "job_title", "start_date"]'
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    List of custom variables that can be replaced when generating the letter
                  </p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    {createTemplateMutation.isPending || updateTemplateMutation.isPending ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                    ) : (
                      editingTemplate ? "Update Template" : "Create Template"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={generateDialogOpen} onOpenChange={(open) => {
            setGenerateDialogOpen(open)
            if (!open) resetGenerateForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Send className="mr-2 size-4" /> Generate Letter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Letter</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGenerateLetter} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="generate_template">Template *</Label>
                    <Select value={generateForm.template_id} onValueChange={(value) => {
                      setGenerateForm({ ...generateForm, template_id: value })
                      setSelectedTemplate(templates?.find(t => t.id === value))
                    }}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.filter(t => t.is_active).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="generate_employee">Employee *</Label>
                    <Select value={generateForm.employee_id} onValueChange={(value) => setGenerateForm({ ...generateForm, employee_id: value })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.first_name} {employee.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedTemplate && selectedTemplate.variables?.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Custom Variables</Label>
                    <p className="text-xs text-slate-500 mb-3">
                      Enter values for the custom variables defined in the template
                    </p>
                    <div className="space-y-3">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable}>
                          <Label htmlFor={`var_${variable}`} className="text-sm capitalize">
                            {variable.replace(/_/g, " ")}
                          </Label>
                          <Input
                            id={`var_${variable}`}
                            onChange={(e) => {
                              const currentData = JSON.parse(generateForm.variables_data || "{}")
                              currentData[variable] = e.target.value
                              setGenerateForm({ ...generateForm, variables_data: JSON.stringify(currentData) })
                            }}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={generateLetterMutation.isPending}
                  >
                    {generateLetterMutation.isPending ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Send className="mr-2 size-4" /> Generate Letter</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="templates" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <FileText className="mr-2 size-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="letters" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <FileSignature className="mr-2 size-4" /> Generated Letters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        No templates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge className={typeColors[template.type] || ""}>
                            {template.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {template.variables?.length || 0} variable{template.variables?.length !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                        <TableCell>
                          {template.is_active ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="size-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditTemplate(template)}>
                              <Edit className="size-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteTemplate(template.id)}>
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
          )}
        </TabsContent>

        <TabsContent value="letters" className="space-y-4">
          {lettersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Generated At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLetters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                        No generated letters found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLetters.map((letter) => (
                      <TableRow key={letter.id}>
                        <TableCell className="font-medium max-w-xs truncate">{letter.subject}</TableCell>
                        <TableCell>
                          <Badge className={typeColors[letter.letter_type] || ""}>
                            {letter.letter_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="size-4 text-slate-400" />
                            {letter.employee ? (
                              <span>{letter.employee.first_name} {letter.employee.last_name}</span>
                            ) : (
                              <span className="text-slate-500">Unknown</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="size-4" />
                            {new Date(letter.generated_at).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handlePreviewLetter(letter)}>
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Letter Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">{previewContent.subject}</h3>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {previewContent.body}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleCopyToClipboard}>
                <Copy className="mr-2 size-4" /> Copy to Clipboard
              </Button>
              <Button onClick={handleDownloadLetter}>
                <Download className="mr-2 size-4" /> Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
