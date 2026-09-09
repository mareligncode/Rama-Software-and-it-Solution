import { useState, useRef } from "react"
import React from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { 
  IdCard, Download, Printer, Search, Loader2, Building2, 
  Mail, Phone, MapPin, Calendar, User, Briefcase, Image as ImageIcon,
  Settings, Palette
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import html2canvas from "html2canvas"

export default function IdCards() {
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [search, setSearch] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [customizationDialogOpen, setCustomizationDialogOpen] = useState(false)
  const cardRef = useRef(null)
  
  const [customization, setCustomization] = useState({
    background_color: '#ffffff',
    text_color: '#000000',
    accent_color: '#2563eb',
    background_style: 'solid',
    font_family: 'sans-serif',
    header_height: '144',
    qr_code_size: 90,
    border_radius: 16,
    card_width: 350,
    card_height: 550,
    show_phone: true,
    show_department: true,
    font_size: 'normal',
  })

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
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

  // Initialize customization from company settings
  React.useEffect(() => {
    if (companySettings) {
      setCustomization({
        background_color: companySettings.id_card_background_color || '#ffffff',
        text_color: companySettings.id_card_text_color || '#000000',
        accent_color: companySettings.id_card_accent_color || '#2563eb',
        background_style: 'solid',
        font_family: companySettings.id_card_font_family || 'sans-serif',
        font_size: companySettings.id_card_font_size || 'normal',
        qr_code_size: companySettings.id_card_qr_code_size || 90,
        border_radius: companySettings.id_card_border_radius || 16,
        card_width: companySettings.id_card_card_width || 350,
        card_height: companySettings.id_card_card_height || 550,
        header_height: companySettings.id_card_header_height || 144,
        show_phone: companySettings.id_card_show_phone !== false,
        show_department: companySettings.id_card_show_department !== false,
      })
    }
  }, [companySettings])

  const qc = useQueryClient()

  const saveCustomizationMutation = useMutation({
    mutationFn: async (settings) => {
      const { error } = await supabase
        .from("company_settings")
        .update({
          id_card_background_color: settings.background_color,
          id_card_text_color: settings.text_color,
          id_card_accent_color: settings.accent_color,
          id_card_font_family: settings.font_family,
          id_card_font_size: settings.font_size,
          id_card_qr_code_size: settings.qr_code_size,
          id_card_border_radius: settings.border_radius,
          id_card_card_width: settings.card_width,
          id_card_card_height: settings.card_height,
          id_card_header_height: settings.header_height,
          id_card_show_phone: settings.show_phone,
          id_card_show_department: settings.show_department,
        })
        .eq("id", companySettings?.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Customization saved successfully")
      qc.invalidateQueries({ queryKey: ["company-settings"] })
      setCustomizationDialogOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const filteredEmployees = employees?.filter(emp =>
    !search ||
    emp.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(search.toLowerCase())
  ) || []

  function handlePrint() {
    window.print()
  }

  async function handleDownload() {
    if (!cardRef.current) return
    
    setDownloading(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      })
      
      const link = document.createElement('a')
      link.download = `id-card-${selectedEmployee?.employee_id || selectedEmployee?.first_name}-${selectedEmployee?.last_name}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      toast.success("ID card downloaded successfully")
    } catch (error) {
      toast.error("Failed to download ID card")
      console.error(error)
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #id-card-preview, #id-card-preview * {
            visibility: visible;
          }
          #id-card-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          @page {
            size: auto;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 text-white">
            <IdCard className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Employee ID Cards</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generate and print professional ID cards for employees
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Employee Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 lg:sticky lg:top-28 space-y-4">
          <div>
            <Label htmlFor="search">Search Employee</Label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className="pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No employees found
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    selectedEmployee?.id === employee.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 bg-gradient-to-br from-blue-500 to-indigo-500">
                      <AvatarFallback className="text-white font-semibold text-sm">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {employee.job_title}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ID Card Preview */}
        <div className="space-y-4">
          {!selectedEmployee ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
              <IdCard className="mx-auto size-16 text-slate-400" />
              <p className="mt-4 font-semibold text-slate-900 dark:text-white">Select an Employee</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Choose an employee from the list to generate their ID card
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    ID Card Preview
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={customizationDialogOpen} onOpenChange={setCustomizationDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Palette className="mr-2 size-4" /> Customize
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Customize ID Card</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="bg-color">Background Color</Label>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Input
                                id="bg-color"
                                type="color"
                                value={customization.background_color}
                                onChange={(e) => setCustomization({ ...customization, background_color: e.target.value })}
                                className="w-20 h-10 p-1"
                              />
                              <Input
                                value={customization.background_color}
                                onChange={(e) => setCustomization({ ...customization, background_color: e.target.value })}
                                className="flex-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="text-color">Text Color</Label>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Input
                                id="text-color"
                                type="color"
                                value={customization.text_color}
                                onChange={(e) => setCustomization({ ...customization, text_color: e.target.value })}
                                className="w-20 h-10 p-1"
                              />
                              <Input
                                value={customization.text_color}
                                onChange={(e) => setCustomization({ ...customization, text_color: e.target.value })}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="accent-color">Accent Color</Label>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Input
                              id="accent-color"
                              type="color"
                              value={customization.accent_color}
                              onChange={(e) => setCustomization({ ...customization, accent_color: e.target.value })}
                              className="w-20 h-10 p-1"
                            />
                            <Input
                              value={customization.accent_color}
                              onChange={(e) => setCustomization({ ...customization, accent_color: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="font-family">Font Family</Label>
                            <Select value={customization.font_family} onValueChange={(value) => setCustomization({ ...customization, font_family: value })}>
                              <SelectTrigger className="mt-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sans-serif">Sans Serif</SelectItem>
                                <SelectItem value="serif">Serif</SelectItem>
                                <SelectItem value="monospace">Monospace</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="font-size">Font Size</Label>
                            <Select value={customization.font_size} onValueChange={(value) => setCustomization({ ...customization, font_size: value })}>
                              <SelectTrigger className="mt-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="qr-size">QR Code Size</Label>
                            <Input
                              id="qr-size"
                              type="number"
                              value={customization.qr_code_size}
                              onChange={(e) => setCustomization({ ...customization, qr_code_size: parseInt(e.target.value) || 90 })}
                              min="60"
                              max="120"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="border-radius">Border Radius</Label>
                            <Input
                              id="border-radius"
                              type="number"
                              value={customization.border_radius}
                              onChange={(e) => setCustomization({ ...customization, border_radius: parseInt(e.target.value) || 16 })}
                              min="0"
                              max="32"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="header-height">Header Height</Label>
                            <Input
                              id="header-height"
                              type="number"
                              value={customization.header_height}
                              onChange={(e) => setCustomization({ ...customization, header_height: parseInt(e.target.value) || 144 })}
                              min="100"
                              max="200"
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="card-width">Card Width</Label>
                            <Input
                              id="card-width"
                              type="number"
                              value={customization.card_width}
                              onChange={(e) => setCustomization({ ...customization, card_width: parseInt(e.target.value) || 350 })}
                              min="300"
                              max="400"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="card-height">Card Height</Label>
                            <Input
                              id="card-height"
                              type="number"
                              value={customization.card_height}
                              onChange={(e) => setCustomization({ ...customization, card_height: parseInt(e.target.value) || 550 })}
                              min="400"
                              max="700"
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="show-phone"
                              checked={customization.show_phone}
                              onChange={(e) => setCustomization({ ...customization, show_phone: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="show-phone" className="cursor-pointer">Show Phone Number</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="show-department"
                              checked={customization.show_department}
                              onChange={(e) => setCustomization({ ...customization, show_department: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="show-department" className="cursor-pointer">Show Department</Label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCustomizationDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => saveCustomizationMutation.mutate(customization)}
                          disabled={saveCustomizationMutation.isPending}
                        >
                          {saveCustomizationMutation.isPending ? (
                            <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {/* <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                    {downloading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Downloading...</>
                    ) : (
                      <><ImageIcon className="mr-2 size-4" /> Download Image</>
                    )}
                  </Button> */}
                  <Button onClick={handlePrint}>
                    <Printer className="mr-2 size-4" /> Print
                  </Button>
                </div>
              </div>

              <div id="id-card-preview" className="flex justify-center">
                <IdCardComponent employee={selectedEmployee} companySettings={companySettings} customization={customization} ref={cardRef} />
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

const IdCardComponent = React.forwardRef(({ employee, companySettings, customization }, ref) => {
  const cardStyle = {
    backgroundColor: customization?.background_color || companySettings?.id_card_background_color || '#ffffff',
    color: customization?.text_color || companySettings?.id_card_text_color || '#000000',
    accentColor: customization?.accent_color || companySettings?.id_card_accent_color || '#2563eb',
    fontFamily: customization?.font_family || 'sans-serif',
    fontSize: customization?.font_size === 'small' ? '0.875rem' : customization?.font_size === 'large' ? '1.125rem' : '1rem',
    qrCodeSize: customization?.qr_code_size || 90,
    borderRadius: customization?.border_radius || 16,
    cardWidth: customization?.card_width || 350,
    cardHeight: customization?.card_height || 550,
    headerHeight: customization?.header_height || 144,
    showPhone: customization?.show_phone !== false,
    showDepartment: customization?.show_department !== false,
  }

  return (
    <div 
      ref={ref}
      className="shadow-2xl overflow-hidden relative print:shadow-none print:border print:border-black"
      style={{ 
        backgroundColor: cardStyle.backgroundColor,
        fontFamily: cardStyle.fontFamily,
        width: `${cardStyle.cardWidth}px`,
        height: `${cardStyle.cardHeight}px`,
        borderRadius: `${cardStyle.borderRadius}px`,
        fontSize: cardStyle.fontSize
      }}
    >
      {/* Decorative top pattern with company name */}
      <div 
        className="relative overflow-hidden"
        style={{ 
          height: `${cardStyle.headerHeight}px`,
          background: `linear-gradient(135deg, ${cardStyle.accentColor} 0%, ${cardStyle.accentColor}dd 100%)`
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5" />
        
        {/* Company Name in Header */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-white text-center">
            <p className="font-bold text-xl tracking-wide">{companySettings?.company_name || 'Rama IT Solution'}</p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="px-6 -mt-14 relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-28 h-28 rounded-full border-4 shadow-xl overflow-hidden bg-white">
            {employee.profile_image_url ? (
              <img 
                src={employee.profile_image_url} 
                alt={`${employee.first_name} ${employee.last_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl font-bold">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </div>
            )}
          </div>

          <h3 className="mt-4 text-xl font-bold text-center" style={{ color: cardStyle.color }}>
            {employee.first_name} {employee.last_name}
          </h3>
          <p className="text-sm font-semibold mt-1 uppercase tracking-wide" style={{ color: cardStyle.accentColor }}>
            {employee.job_title}
          </p>
          {cardStyle.showDepartment && employee.department && (
            <div className="mt-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ 
              backgroundColor: cardStyle.accentColor + '15', 
              color: cardStyle.accentColor 
            }}>
              {employee.department}
            </div>
          )}
        </div>
      </div>

      {/* Employee Details with QR Code */}
      <div className="px-6 mt-6 flex gap-4">
        <div className="flex-1 space-y-2.5" style={{ color: cardStyle.color }}>
          <div className="flex items-center gap-3 text-sm">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: cardStyle.accentColor + '15' }}>
              <User className="size-4" style={{ color: cardStyle.accentColor }} />
            </div>
            <div className="flex-1">
              <p className="text-xs opacity-60 uppercase tracking-wider">Employee ID</p>
              <p className="font-semibold font-mono">{employee.employee_id || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: cardStyle.accentColor + '15' }}>
              <Briefcase className="size-4" style={{ color: cardStyle.accentColor }} />
            </div>
            <div className="flex-1">
              <p className="text-xs opacity-60 uppercase tracking-wider">Department</p>
              <p className="font-semibold">{employee.department || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: cardStyle.accentColor + '15' }}>
              <Calendar className="size-4" style={{ color: cardStyle.accentColor }} />
            </div>
            <div className="flex-1">
              <p className="text-xs opacity-60 uppercase tracking-wider">Hire Date</p>
              <p className="font-semibold">{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          {cardStyle.showPhone && employee.phone && (
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: cardStyle.accentColor + '15' }}>
                <Phone className="size-4" style={{ color: cardStyle.accentColor }} />
              </div>
              <div className="flex-1">
                <p className="text-xs opacity-60 uppercase tracking-wider">Phone</p>
                <p className="font-semibold">{employee.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* QR Code on the right */}
        <div className="flex flex-col justify-center">
          <div className="bg-white p-2 rounded-xl shadow-lg border-2" style={{ borderColor: cardStyle.accentColor + '30' }}>
            <QRCodeSVG 
              value="https://ramaitsolution.com/"
              size={cardStyle.qrCodeSize}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4 text-center" style={{ 
        backgroundColor: cardStyle.accentColor + '08',
        borderTop: `1px solid ${cardStyle.accentColor}20`
      }}>
      </div>
    </div>
  )
})
