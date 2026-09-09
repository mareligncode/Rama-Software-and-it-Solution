import { useState, useRef } from "react"
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
import defaultLogo from "@/assets/logo.png"
import { 
  FileText, Plus, Edit, Trash2, Search, Loader2, 
  Send, Download, Eye, Copy, CheckCircle2, Clock, 
  AlertCircle, FileSignature, User, Building2, Upload, Palette,
  Image as ImageIcon, QrCode, Settings, Printer, Sparkles,
  Mail, Globe, Phone, MapPin, Check, ExternalLink
} from "lucide-react"

// Default sample template matching the user's reference image
const DEFAULT_PRESETS = [
  {
    name: "Job Offer Letter (Executive)",
    type: "hire",
    subject: "JOB OFFER LETTER",
    body: `Dear {{recipient_name}},

We are delighted to offer you the position of {{job_title}} at {{company_name}}.

Your background, skill set, and enthusiasm align well with our company's vision. We believe you will contribute meaningfully to our initiatives and ongoing growth.

Position Details:
• Job Title: {{job_title}}
• Department: {{department}}
• Start Date: {{start_date}}
• Work Arrangement: Hybrid
• Compensation: Provided in accordance with company policy

In this role, you will assist in campaign execution, content coordination, and performance tracking across multiple platforms. Your contribution will support both strategic planning and day-to-day operations.

Please confirm your acceptance of this offer by signing and returning this document no later than {{acceptance_deadline}}.

We look forward to having you as part of our team and growing together in the future.`,
    variables: ["job_title", "department", "start_date", "acceptance_deadline"],
    header_color: "#071B3B",
    footer_color: "#071B3B",
    accent_color: "#0D3B8E",
    text_color: "#1E293B",
    background_color: "#FFFFFF",
    show_qr_code: true,
    show_company_info: true,
  },
  {
    name: "Official Promotion Letter",
    type: "promotion",
    subject: "PROMOTION LETTER",
    body: `Dear {{recipient_name}},

On behalf of {{company_name}}, we are thrilled to congratulate you on your promotion to the position of {{new_position}} within the {{department}} department, effective {{effective_date}}.

This promotion is in recognition of your exceptional commitment, outstanding contributions, and consistent high performance.

New Position Details:
• Title: {{new_position}}
• Department: {{department}}
• Reporting Manager: {{manager_name}}
• Effective Date: {{effective_date}}
• Updated Compensation: As per the executive compensation structure

We have full confidence in your abilities to lead and excel in this new role, and we look forward to your continued success.`,
    variables: ["new_position", "department", "effective_date", "manager_name"],
    header_color: "#071B3B",
    footer_color: "#071B3B",
    accent_color: "#0D3B8E",
    text_color: "#1E293B",
    background_color: "#FFFFFF",
    show_qr_code: true,
    show_company_info: true,
  }
]

export default function Letters() {
  const qc = useQueryClient()
  const printRef = useRef(null)
  const [activeTab, setActiveTab] = useState("templates")
  const [search, setSearch] = useState("")
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewContent, setPreviewContent] = useState({
    subject: "",
    body: "",
    recipient_name: "",
    recipient_address: "",
    recipient_city: "",
    recipient_country: "",
    recipient_email: "",
    recipient_phone: "",
    letter_date: "",
    reference_number: "",
  })
  
  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "custom",
    subject: "",
    body: "",
    variables: "[]",
    header_color: "#071B3B",
    footer_color: "#071B3B",
    accent_color: "#0D3B8E",
    text_color: "#1E293B",
    background_color: "#FFFFFF",
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
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("")

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
    reference_number: `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  })

  // Queries
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["letter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("letter_templates")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) {
        console.warn("Could not fetch letter_templates:", error)
        return []
      }
      return data ?? []
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
      if (error) {
        console.warn("Could not fetch generated_letters:", error)
        return []
      }
      return data ?? []
    },
  })

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, job_title, department")
        .eq("status", "active")
      if (error) {
        console.warn("Could not fetch employees:", error)
        return []
      }
      return data ?? []
    },
  })

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single()
      if (error && error.code !== 'PGRST116') {
        console.warn("Could not fetch company_settings:", error)
      }
      return data || {
        company_name: "RAMA SOFTWARE & IT SOLUTIONS",
        company_address: "123 Anywhere St., Any City, ST 12345",
        company_email: "hello@reallygreatsite.com",
        company_phone: "123-456-7890",
        company_website: "www.reallygreatsite.com",
        manager_name: "Daniel Marion",
        manager_title: "Head of Marketing",
      }
    },
  })

  // Mutations
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
      
      // Auto fill standard variables
      const mergedVariables = {
        recipient_name: data.recipient_name || (employee ? `${employee.first_name} ${employee.last_name}` : "Valued Candidate"),
        employee_name: employee ? `${employee.first_name} ${employee.last_name}` : data.recipient_name || "Employee",
        job_title: employee?.job_title || variablesData.job_title || "Digital Marketing Associate",
        department: employee?.department || variablesData.department || "Marketing & Communications",
        company_name: companySettings?.company_name || "RAMA SOFTWARE & IT SOLUTIONS",
        letter_date: data.letter_date || new Date().toLocaleDateString(),
        reference_number: data.reference_number || "REF-001",
        manager_name: companySettings?.manager_name || "Daniel Marion",
        manager_title: companySettings?.manager_title || "Head of Marketing",
        ...variablesData,
      }

      // Replace {{key}}
      Object.keys(mergedVariables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, "g")
        body = body.replace(regex, mergedVariables[key] || "")
        subject = subject.replace(regex, mergedVariables[key] || "")
      })

      const payload = {
        template_id: data.template_id,
        employee_id: data.employee_id || null,
        subject: subject,
        body: body,
        letter_type: template?.type || "custom",
        variables_data: mergedVariables,
        recipient_name: mergedVariables.recipient_name,
        recipient_address: data.recipient_address || "123 Anywhere St., Any City, ST 12345",
        recipient_city: data.recipient_city || "Any City",
        recipient_country: data.recipient_country || "ST 12345",
        recipient_email: data.recipient_email || "",
        recipient_phone: data.recipient_phone || "",
        letter_date: data.letter_date,
        reference_number: data.reference_number,
      }

      const { data: newLetter, error } = await supabase.from("generated_letters").insert(payload).select().single()
      if (error) throw error
      return newLetter
    },
    onSuccess: (newLetter) => {
      toast.success("Letter generated successfully!")
      qc.invalidateQueries({ queryKey: ["generated-letters"] })
      setGenerateDialogOpen(false)
      if (newLetter) {
        handlePreviewLetter(newLetter)
      }
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
      header_color: "#071B3B",
      footer_color: "#071B3B",
      accent_color: "#0D3B8E",
      text_color: "#1E293B",
      background_color: "#FFFFFF",
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
    setLogoPreviewUrl("")
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
      reference_number: `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    })
    setSelectedTemplate(null)
  }

  function applyPresetTemplate(preset) {
    setTemplateForm({
      ...templateForm,
      name: preset.name,
      type: preset.type,
      subject: preset.subject,
      body: preset.body,
      variables: JSON.stringify(preset.variables, null, 2),
      header_color: preset.header_color,
      footer_color: preset.footer_color,
      accent_color: preset.accent_color,
      text_color: preset.text_color,
      background_color: preset.background_color,
      show_qr_code: preset.show_qr_code,
      show_company_info: preset.show_company_info,
    })
    toast.success(`Loaded preset: ${preset.name}`)
  }

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const preview = URL.createObjectURL(file)
      setLogoPreviewUrl(preview)
      setTemplateForm(prev => ({ ...prev, company_logo_url: preview }))
    }
  }

  async function handleTemplateSubmit(e) {
    e.preventDefault()
    let logoUrl = templateForm.company_logo_url
    
    // Upload logo file to supabase storage if provided
    if (logoFile) {
      try {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `letter-logos/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('employees')
          .upload(fileName, logoFile, { upsert: true })
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('employees')
            .getPublicUrl(fileName)
          logoUrl = publicUrl
        }
      } catch (err) {
        console.warn("Logo upload fallback to direct data URL:", err)
      }
    }
    
    let parsedVariables = []
    try {
      parsedVariables = JSON.parse(templateForm.variables || "[]")
    } catch {
      parsedVariables = []
    }
    
    const payload = {
      ...templateForm,
      company_logo_url: logoUrl,
      variables: parsedVariables,
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
      header_color: template.header_color || "#071B3B",
      footer_color: template.footer_color || "#071B3B",
      accent_color: template.accent_color || "#0D3B8E",
      text_color: template.text_color || "#1E293B",
      background_color: template.background_color || "#FFFFFF",
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
    setLogoPreviewUrl(template.company_logo_url || "")
    setTemplateDialogOpen(true)
  }

  function handleDeleteTemplate(id) {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id)
    }
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
    const matched = templates?.find(t => t.id === letter.template_id) || DEFAULT_PRESETS[0]
    setSelectedTemplate(matched)
    setPreviewDialogOpen(true)
  }

  function handlePreviewTemplate(template) {
    setPreviewContent({
      subject: template.subject || "JOB OFFER LETTER",
      body: template.body
        .replace(/{{recipient_name}}/g, "Aisha Rahman")
        .replace(/{{company_name}}/g, companySettings?.company_name || "Impact Inc.")
        .replace(/{{job_title}}/g, "Digital Marketing Associate")
        .replace(/{{department}}/g, "Marketing & Communications")
        .replace(/{{start_date}}/g, "August 5, 2026")
        .replace(/{{acceptance_deadline}}/g, "July 30, 2026")
        .replace(/{{manager_name}}/g, companySettings?.manager_name || "Daniel Marion")
        .replace(/{{manager_title}}/g, companySettings?.manager_title || "Head of Marketing"),
      recipient_name: "Aisha Rahman",
      recipient_address: "123 Anywhere St., Any City, ST 12345",
      recipient_city: "Any City",
      recipient_country: "ST 12345",
      recipient_email: "aisha.rahman@example.com",
      recipient_phone: "+1 234 567 8900",
      letter_date: new Date().toISOString().split('T')[0],
      reference_number: "REF-2026-089",
    })
    setSelectedTemplate(template)
    setPreviewDialogOpen(true)
  }

  function handlePrintLetter() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error("Please allow popups to print letters")
      return
    }

    const printElement = document.getElementById("executive-letterhead-print")
    if (!printElement) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${previewContent.subject || 'Letter'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background-color: #f8fafc;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .letter-sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              box-sizing: border-box;
            }
            @media print {
              body {
                background: white;
              }
              .letter-sheet {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                min-height: 100vh !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="letter-sheet">
            ${printElement.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleCopyToClipboard() {
    const content = `${previewContent.subject}\n\nTo: ${previewContent.recipient_name}\nDate: ${previewContent.letter_date}\n\n${previewContent.body}`
    navigator.clipboard.writeText(content)
    toast.success("Letter text copied to clipboard!")
  }

  function handleDownloadHTML() {
    const printElement = document.getElementById("executive-letterhead-print")
    if (!printElement) return

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${previewContent.subject || 'Official Letter'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #f1f5f9; display: flex; justify-content: center; padding: 20px; font-family: sans-serif; }
    .page { width: 800px; background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; }
    @media print { body { padding: 0; background: white; } .page { box-shadow: none; border-radius: 0; width: 100%; } }
  </style>
</head>
<body>
  <div class="page">
    ${printElement.innerHTML}
  </div>
</body>
</html>
    `
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(previewContent.subject || 'letter').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Letter downloaded as HTML document!")
  }

  const allTemplatesList = templates && templates.length > 0 ? templates : DEFAULT_PRESETS

  const filteredTemplates = allTemplatesList.filter(template =>
    !search ||
    template.name?.toLowerCase().includes(search.toLowerCase()) ||
    template.type?.toLowerCase().includes(search.toLowerCase()) ||
    template.subject?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLetters = (generatedLetters || []).filter(letter =>
    !search ||
    letter.subject?.toLowerCase().includes(search.toLowerCase()) ||
    letter.letter_type?.toLowerCase().includes(search.toLowerCase()) ||
    letter.employee?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    letter.employee?.last_name?.toLowerCase().includes(search.toLowerCase())
  )

  const typeColors = {
    hire: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    termination: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    promotion: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    custom: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <FileSignature className="size-6" />
            </span>
            <h1 className="text-2xl font-bold">Executive Letters & Templates</h1>
          </div>
          <p className="text-sm text-slate-300">
            Generate and print branded job offers, appointment letters, and official agreements with custom logos
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Create Template Dialog */}
          <Dialog open={templateDialogOpen} onOpenChange={(open) => {
            setTemplateDialogOpen(open)
            if (!open) resetTemplateForm()
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-md">
                <Plus className="mr-2 size-4" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="size-5 text-blue-600" />
                  {editingTemplate ? "Edit Letter Template" : "Create Executive Letter Template"}
                </DialogTitle>
              </DialogHeader>

              {/* Presets Bar */}
              {!editingTemplate && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Quick Preset Layouts:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {DEFAULT_PRESETS.map((p, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => applyPresetTemplate(p)}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleTemplateSubmit} className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template_name" className="text-xs font-semibold">Template Name *</Label>
                    <Input
                      id="template_name"
                      placeholder="e.g. Job Offer Letter (Executive)"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template_type" className="text-xs font-semibold">Template Type</Label>
                    <Select value={templateForm.type} onValueChange={(value) => setTemplateForm({ ...templateForm, type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hire">Hire / Job Offer</SelectItem>
                        <SelectItem value="promotion">Promotion Letter</SelectItem>
                        <SelectItem value="termination">Termination Letter</SelectItem>
                        <SelectItem value="warning">Warning Letter</SelectItem>
                        <SelectItem value="custom">Custom Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="template_subject" className="text-xs font-semibold">Letter Title / Subject *</Label>
                  <Input
                    id="template_subject"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    placeholder="e.g. JOB OFFER LETTER"
                    required
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label htmlFor="template_body" className="text-xs font-semibold">Letter Content / Body *</Label>
                  <Textarea
                    id="template_body"
                    value={templateForm.body}
                    onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                    placeholder="Use {{recipient_name}}, {{job_title}}, {{department}}, {{start_date}} for variables"
                    required
                    className="mt-1 min-h-[200px] font-sans text-sm leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tip: Bullet points starting with • or - will format into clean structured detail lists.
                  </p>
                </div>

                {/* Logo & Branding */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Palette className="size-4 text-blue-600" /> Header Logo & Geometry Theme
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <Label className="text-xs font-semibold">Upload Company Logo</Label>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="text-xs"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, or SVG with transparent background recommended</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="size-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white grid place-items-center overflow-hidden p-2 shadow-sm">
                        <img
                          src={logoPreviewUrl || templateForm.company_logo_url || defaultLogo}
                          alt="Company Logo Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">Live Logo Preview</p>
                        <p className="text-[11px] text-slate-500">Displays on top-right of the letterhead</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div>
                      <Label className="text-xs">Corner Geometry Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={templateForm.header_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, header_color: e.target.value, footer_color: e.target.value })}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <span className="text-xs font-mono">{templateForm.header_color}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Letter Title Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={templateForm.accent_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, accent_color: e.target.value })}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <span className="text-xs font-mono">{templateForm.accent_color}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Body Text Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={templateForm.text_color}
                          onChange={(e) => setTemplateForm({ ...templateForm, text_color: e.target.value })}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <span className="text-xs font-mono">{templateForm.text_color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    {createTemplateMutation.isPending || updateTemplateMutation.isPending ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                    ) : (
                      editingTemplate ? "Update Template" : "Save Template"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Generate Letter Button & Dialog */}
          <Dialog open={generateDialogOpen} onOpenChange={(open) => {
            setGenerateDialogOpen(open)
            if (!open) resetGenerateForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
                <Send className="mr-2 size-4" /> Generate Letter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Send className="size-5 text-blue-600" />
                  Generate Executive Letter
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={(e) => {
                e.preventDefault()
                if (!generateForm.template_id) {
                  toast.error("Please select a letter template")
                  return
                }
                generateLetterMutation.mutate(generateForm)
              }} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Select Template *</Label>
                    <Select value={generateForm.template_id} onValueChange={(value) => {
                      setGenerateForm({ ...generateForm, template_id: value })
                      setSelectedTemplate(allTemplatesList.find(t => t.id === value || t.name === value))
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTemplatesList.map((t, idx) => (
                          <SelectItem key={t.id || idx} value={t.id || t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Associate Active Employee (Optional)</Label>
                    <Select value={generateForm.employee_id} onValueChange={(value) => {
                      const emp = employees?.find(e => e.id === value)
                      setGenerateForm(prev => ({
                        ...prev,
                        employee_id: value,
                        recipient_name: emp ? `${emp.first_name} ${emp.last_name}` : prev.recipient_name,
                        recipient_email: emp?.email || prev.recipient_email,
                      }))
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select employee or manual" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} ({emp.job_title || 'Staff'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Recipient Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Recipient Full Name *</Label>
                      <Input
                        placeholder="e.g. Aisha Rahman"
                        value={generateForm.recipient_name}
                        onChange={(e) => setGenerateForm({ ...generateForm, recipient_name: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Letter Date</Label>
                      <Input
                        type="date"
                        value={generateForm.letter_date}
                        onChange={(e) => setGenerateForm({ ...generateForm, letter_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Recipient Address</Label>
                    <Input
                      placeholder="e.g. 123 Anywhere St., Any City, ST 12345"
                      value={generateForm.recipient_address}
                      onChange={(e) => setGenerateForm({ ...generateForm, recipient_address: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Reference Number</Label>
                      <Input
                        value={generateForm.reference_number}
                        onChange={(e) => setGenerateForm({ ...generateForm, reference_number: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Recipient Email</Label>
                      <Input
                        type="email"
                        placeholder="candidate@example.com"
                        value={generateForm.recipient_email}
                        onChange={(e) => setGenerateForm({ ...generateForm, recipient_email: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    disabled={generateLetterMutation.isPending}
                  >
                    {generateLetterMutation.isPending ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Send className="mr-2 size-4" /> Generate & Preview</>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <TabsTrigger value="templates" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <FileText className="mr-2 size-4" /> Templates ({filteredTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="letters" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <FileSignature className="mr-2 size-4" /> Generated Letters ({filteredLetters.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search templates or letters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-800 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {templatesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template, idx) => (
                <div
                  key={template.id || idx}
                  className="group bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge className={typeColors[template.type] || typeColors.custom}>
                        {template.type}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          onClick={() => handlePreviewTemplate(template)}
                          title="Preview Letter Template"
                        >
                          <Eye className="size-4" />
                        </Button>
                        {template.id && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                              onClick={() => handleEditTemplate(template)}
                              title="Edit Template"
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              onClick={() => handleDeleteTemplate(template.id)}
                              title="Delete Template"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5 group-hover:text-blue-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                      Title: {template.subject}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed font-sans">
                      {template.body}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Executive Letterhead Theme
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                      onClick={() => {
                        setGenerateForm(prev => ({ ...prev, template_id: template.id || template.name }))
                        setSelectedTemplate(template)
                        setGenerateDialogOpen(true)
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Generated Letters Tab */}
        <TabsContent value="letters" className="space-y-4">
          {lettersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-blue-500" />
            </div>
          ) : filteredLetters.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm max-w-md mx-auto my-8">
              <FileSignature className="size-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">No Generated Letters Yet</h3>
              <p className="text-xs text-slate-500 mb-4">Click "Generate Letter" above to create official branded documents for candidates or employees.</p>
              <Button onClick={() => setGenerateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Send className="mr-2 size-4" /> Generate First Letter
              </Button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Letter Subject</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date / Reference</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLetters.map((letter) => (
                    <TableRow key={letter.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => handlePreviewLetter(letter)}>
                      <TableCell className="font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        {letter.subject}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-blue-500" />
                          <span className="font-medium">{letter.recipient_name || (letter.employee ? `${letter.employee.first_name} ${letter.employee.last_name}` : 'Unknown')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[letter.letter_type] || ""}>
                          {letter.letter_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <p className="text-slate-800 dark:text-slate-200">{letter.letter_date ? new Date(letter.letter_date).toLocaleDateString() : 'N/A'}</p>
                          {letter.reference_number && <p className="text-slate-400 font-mono text-[10px]">{letter.reference_number}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => handlePreviewLetter(letter)}>
                            <Eye className="size-3.5" /> View & Print
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------------------ */}
      {/* EXECUTIVE LETTER PREVIEW & PRINT DIALOG (MATCHING EXACT ATTACHED DESIGN) */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-slate-900/90 text-white border-slate-700 p-6 rounded-3xl backdrop-blur-xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-700">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <Sparkles className="size-5 text-blue-400" />
                Executive Letterhead Preview
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Pixel-perfect layout with top/bottom geometric accents, uploaded branding, and clean typography
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyToClipboard} className="bg-slate-800 text-white border-slate-600 hover:bg-slate-700 h-8 text-xs">
                <Copy className="mr-1.5 size-3.5" /> Copy Text
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadHTML} className="bg-slate-800 text-white border-slate-600 hover:bg-slate-700 h-8 text-xs">
                <Download className="mr-1.5 size-3.5" /> Download HTML
              </Button>
              <Button size="sm" onClick={handlePrintLetter} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs shadow-md">
                <Printer className="mr-1.5 size-3.5" /> Print / Save as PDF
              </Button>
            </div>
          </DialogHeader>

          {/* Letter Canvas Container */}
          <div className="py-6 flex justify-center bg-slate-950/60 rounded-2xl p-4 overflow-x-auto">
            {/* The Print Sheet Target */}
            <div id="executive-letterhead-print" className="w-full max-w-[760px]">
              <ExecutiveLetterhead
                template={selectedTemplate}
                content={previewContent}
                companySettings={companySettings}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// -----------------------------------------------------------------------------
// EXECUTIVE LETTERHEAD COMPONENT
// Faithfully matching the provided visual reference with geometric accents & branding
// -----------------------------------------------------------------------------
function ExecutiveLetterhead({ template, content, companySettings }) {
  const brandLogo = template?.company_logo_url || companySettings?.company_logo_url || defaultLogo
  const companyName = companySettings?.company_name || "RAMA SOFTWARE & IT SOLUTIONS"
  const companyAddress = companySettings?.company_address || "123 Anywhere St., Any City, ST 12345"
  const companyEmail = companySettings?.company_email || "hello@reallygreatsite.com"
  const companyPhone = companySettings?.company_phone || "123-456-7890"
  const companyWebsite = companySettings?.company_website || companySettings?.website || "www.reallygreatsite.com"
  const signerName = companySettings?.manager_name || "Daniel Marion"
  const signerTitle = companySettings?.manager_title || "Head of Marketing"

  // Parse body text into structured paragraphs and bullet items
  const bodyLines = (content.body || "").split("\n")

  return (
    <div
      className="relative w-full bg-white text-slate-800 rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col justify-between font-sans selection:bg-blue-100"
      style={{
        minHeight: "1050px",
        backgroundColor: template?.background_color || "#FFFFFF",
      }}
    >
      {/* ---------------- TOP HEADER GEOMETRY ---------------- */}
      <div className="relative w-full flex items-start justify-between pt-6 px-8">
        {/* Top-Left Midnight Blue Geometric Block with Slanted Tech Accent Stripes */}
        <div className="absolute -top-1 -left-1 w-64 h-24 pointer-events-none">
          <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Main Deep Navy Polygon */}
            <path
              d="M0 0 H180 L130 90 H0 Z"
              fill={template?.header_color || "#071B3B"}
            />
            {/* Slanted Accent Stripes */}
            <g transform="translate(70, 15)">
              <rect x="0" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#CBD5E1" />
              <rect x="14" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#CBD5E1" />
              <rect x="28" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#38BDF8" />
              <rect x="42" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#0284C7" />
            </g>
          </svg>
        </div>

        {/* Spacer for left geometry */}
        <div className="w-48 h-16 shrink-0" />

        {/* Top-Right Company Logo and Address */}
        <div className="flex items-center gap-4 text-right z-10">
          <div>
            <h2 className="font-extrabold text-base tracking-tight text-slate-900">
              {companyName}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              {companyAddress}
            </p>
          </div>

          <div className="size-14 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center p-1.5 overflow-hidden shrink-0">
            <img
              src={brandLogo}
              alt="Company Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* ---------------- MAIN LETTER CONTENT ---------------- */}
      <div className="px-12 py-4 space-y-6 flex-1">
        {/* Centered Bold Letter Title */}
        <div className="text-center pt-2 pb-3">
          <h1
            className="text-2xl sm:text-3xl font-black tracking-wide uppercase"
            style={{ color: template?.accent_color || "#0D3B8E" }}
          >
            {content.subject || "JOB OFFER LETTER"}
          </h1>
        </div>

        {/* Recipient & Date Meta */}
        <div className="flex items-start justify-between text-xs text-slate-800 leading-relaxed pt-2">
          <div>
            <p className="font-bold text-slate-900 text-sm">To:</p>
            <p className="font-bold text-slate-900 text-sm">{content.recipient_name || "Aisha Rahman"}</p>
            <p className="text-slate-600">{content.recipient_address || "123 Anywhere St., Any City, ST 12345"}</p>
            {content.recipient_city && (
              <p className="text-slate-600">
                {[content.recipient_city, content.recipient_country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="font-semibold text-slate-900 text-sm">
              {content.letter_date
                ? new Date(content.letter_date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : new Date().toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
            </p>
            {content.reference_number && (
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{content.reference_number}</p>
            )}
          </div>
        </div>

        {/* Letter Body */}
        <div
          className="text-xs sm:text-[13px] leading-relaxed text-slate-700 space-y-3.5 pt-2"
          style={{ color: template?.text_color || "#1E293B" }}
        >
          {bodyLines.map((line, idx) => {
            const trimmed = line.trim()
            if (!trimmed) {
              return <div key={idx} className="h-1.5" />
            }

            // If line is a bullet item (e.g. • Job Title: ...)
            if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
              const cleanBulletText = trimmed.replace(/^[•\-\*]\s*/, "")
              const parts = cleanBulletText.split(":")
              return (
                <div key={idx} className="flex items-start gap-2 pl-4 py-0.5">
                  <span className="size-1.5 rounded-full bg-blue-700 mt-2 shrink-0" />
                  <p className="leading-snug">
                    {parts.length > 1 ? (
                      <>
                        <strong className="text-slate-900">{parts[0]}:</strong>
                        <span>{parts.slice(1).join(":")}</span>
                      </>
                    ) : (
                      cleanBulletText
                    )}
                  </p>
                </div>
              )
            }

            // If line is a section heading like "Position Details:"
            if (trimmed.endsWith(":") && trimmed.length < 35) {
              return (
                <p key={idx} className="font-bold text-slate-900 pt-1">
                  {trimmed}
                </p>
              )
            }

            return (
              <p key={idx} className="text-justify leading-relaxed">
                {trimmed}
              </p>
            )
          })}
        </div>

        {/* ---------------- SIGN-OFF BLOCK ---------------- */}
        <div className="pt-6 flex justify-end">
          <div className="w-56 text-left space-y-1">
            <p className="text-xs font-semibold text-slate-800">Sincerely,</p>
            
            {/* Realistic Stylized Signature Graphic */}
            <div className="h-12 py-1">
              <svg viewBox="0 0 160 45" className="h-full w-auto text-slate-800 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 32 C25 15, 30 10, 45 28 C55 38, 65 12, 75 25 C85 35, 95 18, 110 30 C125 40, 135 20, 150 25" />
                <path d="M35 22 L85 18" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="border-t border-slate-300 pt-1.5">
              <p className="text-xs font-bold text-slate-900 leading-tight">{signerName}</p>
              <p className="text-[11px] text-slate-600 leading-tight">{signerTitle}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{companyName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- BOTTOM FOOTER GEOMETRY & CONTACTS ---------------- */}
      <div className="relative w-full flex items-end justify-between pb-6 px-8 mt-4">
        {/* Bottom-Left Contact Information with Icons */}
        <div className="space-y-1 text-[11px] text-slate-600 font-medium z-10 pl-2">
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 text-blue-700 shrink-0" />
            <span>{companyEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="size-3.5 text-blue-700 shrink-0" />
            <span>{companyWebsite}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 text-blue-700 shrink-0" />
            <span>{companyPhone}</span>
          </div>
        </div>

        {/* Bottom-Right Midnight Blue Geometric Block with Slanted Tech Accent Stripes */}
        <div className="absolute -bottom-1 -right-1 w-64 h-24 pointer-events-none">
          <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Slanted Accent Stripes */}
            <g transform="translate(10, 55)">
              <rect x="0" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#CBD5E1" />
              <rect x="14" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#CBD5E1" />
              <rect x="28" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#38BDF8" />
              <rect x="42" y="0" width="8" height="14" rx="2" transform="skewX(-28)" fill="#0284C7" />
            </g>
            {/* Main Deep Navy Polygon */}
            <path
              d="M60 0 H240 V90 H110 Z"
              fill={template?.footer_color || "#071B3B"}
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
