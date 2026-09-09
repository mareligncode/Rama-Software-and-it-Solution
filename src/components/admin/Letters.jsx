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
  AlertCircle, FileSignature, User, Building2, Upload, Palette,
  Image as ImageIcon, QrCode, Settings
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
    header_color: "#1e40af",
    footer_color: "#1e40af",
    accent_color: "#3b82f6",
    text_color: "#1f2937",
    background_color: "#ffffff",
    company_logo_url: "",
    show_qr_code: true,
    qr_code_content: "",
    show_company_info: true,
    header_text: "",
    footer_text: "",
    font_family: "Arial",
    font_size: 12,
    margin_top: 40,
    margin_bottom: 40,
    margin_left: 40,
    margin_right: 40,
  })

  const [logoFile, setLogoFile] = useState(null)

  const [generateForm, setGenerateForm] = useState({
    template_id: "",
    employee_id: "",
    variables_data: "{}",
    recipient_name: "",
    recipient_address: "",
    recipient_city: "",
    recipient_country: "",
    recipient_email: "",
    recipient_phone: "",
    letter_date: new Date().toISOString().split('T')[0],
    reference_number: "",
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
        recipient_name: data.recipient_name,
        recipient_address: data.recipient_address,
        recipient_city: data.recipient_city,
        recipient_country: data.recipient_country,
        recipient_email: data.recipient_email,
        recipient_phone: data.recipient_phone,
        letter_date: data.letter_date,
        reference_number: data.reference_number,
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
      header_color: "#1e40af",
      footer_color: "#1e40af",
      accent_color: "#3b82f6",
      text_color: "#1f2937",
      background_color: "#ffffff",
      company_logo_url: "",
      show_qr_code: true,
      qr_code_content: "",
      show_company_info: true,
      header_text: "",
      footer_text: "",
      font_family: "Arial",
      font_size: 12,
      margin_top: 40,
      margin_bottom: 40,
      margin_left: 40,
      margin_right: 40,
    })
    setLogoFile(null)
    setEditingTemplate(null)
  }

  function resetGenerateForm() {
    setGenerateForm({
      template_id: "",
      employee_id: "",
      variables_data: "{}",
      recipient_name: "",
      recipient_address: "",
      recipient_city: "",
      recipient_country: "",
      recipient_email: "",
      recipient_phone: "",
      letter_date: new Date().toISOString().split('T')[0],
      reference_number: "",
    })
    setSelectedTemplate(null)
  }

  async function handleTemplateSubmit(e) {
    e.preventDefault()
    
    let logoUrl = templateForm.company_logo_url
    
    // Upload logo file if provided
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `letter-logos/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('employees')
        .upload(fileName, logoFile)
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error(`Failed to upload logo: ${uploadError.message}`)
        return
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('employees')
        .getPublicUrl(fileName)
      
      logoUrl = publicUrl
    }
    
    // Parse variables with error handling
    let parsedVariables
    try {
      parsedVariables = JSON.parse(templateForm.variables || "[]")
    } catch (error) {
      toast.error("Invalid JSON format in Variables field. Please use format: [\"variable1\", \"variable2\"]")
      return
    }
    
    const payload = {
      ...templateForm,
      company_logo_url: logoUrl,
      variables: parsedVariables,
    }
    
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...payload })
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
      header_color: template.header_color || "#1e40af",
      footer_color: template.footer_color || "#1e40af",
      accent_color: template.accent_color || "#3b82f6",
      text_color: template.text_color || "#1f2937",
      background_color: template.background_color || "#ffffff",
      company_logo_url: template.company_logo_url || "",
      show_qr_code: template.show_qr_code !== undefined ? template.show_qr_code : true,
      qr_code_content: template.qr_code_content || "",
      show_company_info: template.show_company_info !== undefined ? template.show_company_info : true,
      header_text: template.header_text || "",
      footer_text: template.footer_text || "",
      font_family: template.font_family || "Arial",
      font_size: template.font_size || 12,
      margin_top: template.margin_top || 40,
      margin_bottom: template.margin_bottom || 40,
      margin_left: template.margin_left || 40,
      margin_right: template.margin_right || 40,
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
    setPreviewContent({ 
      subject: letter.subject, 
      body: letter.body,
      recipient_name: letter.recipient_name,
      recipient_address: letter.recipient_address,
      recipient_city: letter.recipient_city,
      recipient_country: letter.recipient_country,
      recipient_email: letter.recipient_email,
      recipient_phone: letter.recipient_phone,
      letter_date: letter.letter_date,
      reference_number: letter.reference_number,
    })
    setSelectedTemplate(templates?.find(t => t.id === letter.template_id))
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTemplateSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="size-4" /> Basic Information
                  </h3>
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
                </div>

                {/* Branding & Colors */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette className="size-4" /> Branding & Colors
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="header_color">Header Color</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="header_color"
                          type="color"
                          value={templateForm.header_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, header_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={templateForm.header_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, header_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="footer_color">Footer Color</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="footer_color"
                          type="color"
                          value={templateForm.footer_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, footer_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={templateForm.footer_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, footer_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="accent_color">Accent Color</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="accent_color"
                          type="color"
                          value={templateForm.accent_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, accent_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={templateForm.accent_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, accent_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="text_color">Text Color</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="text_color"
                          type="color"
                          value={templateForm.text_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, text_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={templateForm.text_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, text_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="background_color">Background Color</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="background_color"
                          type="color"
                          value={templateForm.background_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, background_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={templateForm.background_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, background_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Header & Footer */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="size-4" /> Header & Footer
                  </h3>
                  <div>
                    <Label htmlFor="header_text">Header Text</Label>
                    <Input
                      id="header_text"
                      value={templateForm.header_text}
                      onChange={(e) => setTemplateForm({ ...templateForm, header_text: e.target.value })}
                      placeholder="Custom header text"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="footer_text">Footer Text</Label>
                    <Input
                      id="footer_text"
                      value={templateForm.footer_text}
                      onChange={(e) => setTemplateForm({ ...templateForm, footer_text: e.target.value })}
                      placeholder="Custom footer text"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Logo & QR Code */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="size-4" /> Logo & QR Code
                  </h3>
                  <div>
                    <Label htmlFor="company_logo">Company Logo</Label>
                    <div className="mt-1.5">
                      <Input
                        id="company_logo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                        className="cursor-pointer"
                      />
                    </div>
                    {templateForm.company_logo_url && (
                      <div className="mt-2">
                        <img 
                          src={templateForm.company_logo_url} 
                          alt="Company Logo Preview" 
                          className="h-20 w-auto rounded border"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show_qr_code"
                        checked={templateForm.show_qr_code}
                        onChange={(e) => setTemplateForm({ ...templateForm, show_qr_code: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="show_qr_code" className="text-sm">Show QR Code</Label>
                    </div>
                  </div>
                  {templateForm.show_qr_code && (
                    <div>
                      <Label htmlFor="qr_code_content">QR Code Link/Content</Label>
                      <Input
                        id="qr_code_content"
                        value={templateForm.qr_code_content}
                        onChange={(e) => setTemplateForm({ ...templateForm, qr_code_content: e.target.value })}
                        placeholder="https://example.com or text for QR code"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Enter a URL or text. The QR code will be clickable if it's a URL.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show_company_info"
                        checked={templateForm.show_company_info}
                        onChange={(e) => setTemplateForm({ ...templateForm, show_company_info: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="show_company_info" className="text-sm">Show Company Info</Label>
                    </div>
                  </div>
                </div>

                {/* Typography & Layout */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="size-4" /> Typography & Layout
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="font_family">Font Family</Label>
                      <Select value={templateForm.font_family} onValueChange={(value) => setTemplateForm({ ...templateForm, font_family: value })}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Verdana">Verdana</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="font_size">Font Size (px)</Label>
                      <Input
                        id="font_size"
                        type="number"
                        value={templateForm.font_size}
                        onChange={(e) => setTemplateForm({ ...templateForm, font_size: parseInt(e.target.value) || 12 })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="margin_top">Margin Top (px)</Label>
                      <Input
                        id="margin_top"
                        type="number"
                        value={templateForm.margin_top}
                        onChange={(e) => setTemplateForm({ ...templateForm, margin_top: parseInt(e.target.value) || 40 })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="margin_bottom">Margin Bottom (px)</Label>
                      <Input
                        id="margin_bottom"
                        type="number"
                        value={templateForm.margin_bottom}
                        onChange={(e) => setTemplateForm({ ...templateForm, margin_bottom: parseInt(e.target.value) || 40 })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="margin_left">Margin Left (px)</Label>
                      <Input
                        id="margin_left"
                        type="number"
                        value={templateForm.margin_left}
                        onChange={(e) => setTemplateForm({ ...templateForm, margin_left: parseInt(e.target.value) || 40 })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="margin_right">Margin Right (px)</Label>
                      <Input
                        id="margin_right"
                        type="number"
                        value={templateForm.margin_right}
                        onChange={(e) => setTemplateForm({ ...templateForm, margin_right: parseInt(e.target.value) || 40 })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Letter</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGenerateLetter} className="space-y-6">
                {/* Template & Employee Selection */}
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

                {/* Recipient Details */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="size-4" /> Recipient Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recipient_name">Recipient Name</Label>
                      <Input
                        id="recipient_name"
                        value={generateForm.recipient_name}
                        onChange={(e) => setGenerateForm({ ...generateForm, recipient_name: e.target.value })}
                        placeholder="Full name of recipient"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reference_number">Reference Number</Label>
                      <Input
                        id="reference_number"
                        value={generateForm.reference_number}
                        onChange={(e) => setGenerateForm({ ...generateForm, reference_number: e.target.value })}
                        placeholder="REF-001"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="recipient_address">Address</Label>
                    <Input
                      id="recipient_address"
                      value={generateForm.recipient_address}
                      onChange={(e) => setGenerateForm({ ...generateForm, recipient_address: e.target.value })}
                      placeholder="Street address"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recipient_city">City</Label>
                      <Input
                        id="recipient_city"
                        value={generateForm.recipient_city}
                        onChange={(e) => setGenerateForm({ ...generateForm, recipient_city: e.target.value })}
                        placeholder="City"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="recipient_country">Country</Label>
                      <Input
                        id="recipient_country"
                        value={generateForm.recipient_country}
                        onChange={(e) => setGenerateForm({ ...generateForm, recipient_country: e.target.value })}
                        placeholder="Country"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recipient_email">Email</Label>
                      <Input
                        id="recipient_email"
                        type="email"
                        value={generateForm.recipient_email}
                        onChange={(e) => setGenerateForm({ ...generateForm, recipient_email: e.target.value })}
                        placeholder="email@example.com"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="recipient_phone">Phone</Label>
                      <Input
                        id="recipient_phone"
                        value={generateForm.recipient_phone}
                        onChange={(e) => setGenerateForm({ ...generateForm, recipient_phone: e.target.value })}
                        placeholder="+1 234 567 890"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="letter_date">Letter Date</Label>
                    <Input
                      id="letter_date"
                      type="date"
                      value={generateForm.letter_date}
                      onChange={(e) => setGenerateForm({ ...generateForm, letter_date: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Custom Variables */}
                {selectedTemplate && selectedTemplate.variables?.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">Custom Variables</h3>
                    <p className="text-xs text-slate-500">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Letter Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className="rounded-lg p-8 border"
              style={{
                backgroundColor: selectedTemplate?.background_color || '#ffffff',
                color: selectedTemplate?.text_color || '#1f2937',
                fontFamily: selectedTemplate?.font_family || 'Arial',
                fontSize: `${selectedTemplate?.font_size || 12}px`,
                marginTop: `${selectedTemplate?.margin_top || 40}px`,
                marginBottom: `${selectedTemplate?.margin_bottom || 40}px`,
                marginLeft: `${selectedTemplate?.margin_left || 40}px`,
                marginRight: `${selectedTemplate?.margin_right || 40}px`,
              }}
            >
              {/* Header */}
              <div 
                className="mb-6 pb-4 border-b"
                style={{ 
                  borderColor: selectedTemplate?.header_color || '#1e40af',
                  backgroundColor: selectedTemplate?.header_color || '#1e40af',
                  color: '#ffffff',
                  padding: '16px',
                  borderRadius: '8px',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedTemplate?.company_logo_url && (
                      <img 
                        src={selectedTemplate.company_logo_url} 
                        alt="Company Logo" 
                        className="h-16 w-auto"
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-bold">{companySettings?.company_name || 'Company Name'}</h2>
                      {selectedTemplate?.header_text && (
                        <p className="text-sm opacity-90">{selectedTemplate.header_text}</p>
                      )}
                    </div>
                  </div>
                  {selectedTemplate?.show_qr_code && (
                    <div className="text-right">
                      {selectedTemplate?.qr_code_content && selectedTemplate.qr_code_content.startsWith('http') ? (
                        <a 
                          href={selectedTemplate.qr_code_content} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <QrCode className="size-12" />
                        </a>
                      ) : (
                        <QrCode className="size-12" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h4 className="font-semibold mb-2" style={{ color: selectedTemplate?.accent_color || '#3b82f6' }}>
                  To:
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{previewContent.recipient_name || 'Recipient Name'}</p>
                  {previewContent.recipient_address && <p>{previewContent.recipient_address}</p>}
                  {(previewContent.recipient_city || previewContent.recipient_country) && (
                    <p>{[previewContent.recipient_city, previewContent.recipient_country].filter(Boolean).join(', ')}</p>
                  )}
                  {previewContent.recipient_email && <p>{previewContent.recipient_email}</p>}
                  {previewContent.recipient_phone && <p>{previewContent.recipient_phone}</p>}
                </div>
              </div>

              {/* Letter Details */}
              <div className="mb-6 text-sm">
                <div className="flex justify-between mb-4">
                  <div>
                    <p className="text-slate-500">Date:</p>
                    <p className="font-medium">{previewContent.letter_date ? new Date(previewContent.letter_date).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                  </div>
                  {previewContent.reference_number && (
                    <div className="text-right">
                      <p className="text-slate-500">Reference:</p>
                      <p className="font-medium">{previewContent.reference_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <h3 className="text-lg font-semibold mb-4" style={{ color: selectedTemplate?.accent_color || '#3b82f6' }}>
                {previewContent.subject}
              </h3>

              {/* Body */}
              <div className="whitespace-pre-wrap leading-relaxed mb-6">
                {previewContent.body}
              </div>

              {/* Footer */}
              {selectedTemplate?.show_company_info && (
                <div 
                  className="mt-8 pt-4 border-t"
                  style={{ 
                    borderColor: selectedTemplate?.footer_color || '#1e40af',
                    backgroundColor: selectedTemplate?.footer_color || '#1e40af',
                    color: '#ffffff',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold mb-2">Contact Information</p>
                      <p>{companySettings?.company_address || 'Company Address'}</p>
                      <p>{companySettings?.company_phone || 'Phone'}</p>
                      <p>{companySettings?.company_email || 'Email'}</p>
                      {companySettings?.website && <p>{companySettings.website}</p>}
                    </div>
                    <div>
                      <p className="font-semibold mb-2">Company Details</p>
                      {companySettings?.manager_name && (
                        <p>Manager: {companySettings.manager_name}</p>
                      )}
                      {companySettings?.company_tax_id && (
                        <p>Tax ID: {companySettings.company_tax_id}</p>
                      )}
                      {companySettings?.company_registration_number && (
                        <p>Reg No: {companySettings.company_registration_number}</p>
                      )}
                    </div>
                  </div>
                  {selectedTemplate?.footer_text && (
                    <p className="mt-4 text-center text-sm opacity-90">{selectedTemplate.footer_text}</p>
                  )}
                </div>
              )}
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
