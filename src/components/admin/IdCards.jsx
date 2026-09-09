import { useState, useRef } from "react"
import React from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  IdCard, Download, Printer, Search, Loader2, Building2, 
  Mail, Phone, MapPin, Calendar, User, Briefcase, Image as ImageIcon
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import html2canvas from "html2canvas"

export default function IdCards() {
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [search, setSearch] = useState("")
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef(null)

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
                  <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                    {downloading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Downloading...</>
                    ) : (
                      <><ImageIcon className="mr-2 size-4" /> Download Image</>
                    )}
                  </Button>
                  <Button onClick={handlePrint}>
                    <Printer className="mr-2 size-4" /> Print
                  </Button>
                </div>
              </div>

              <div id="id-card-preview" className="flex justify-center">
                <IdCardComponent employee={selectedEmployee} companySettings={companySettings} ref={cardRef} />
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

const IdCardComponent = React.forwardRef(({ employee, companySettings }, ref) => {
  const cardStyle = {
    backgroundColor: companySettings?.id_card_background_color || '#ffffff',
    color: companySettings?.id_card_text_color || '#000000',
    accentColor: companySettings?.id_card_accent_color || '#2563eb',
  }

  return (
    <div 
      ref={ref}
      className="w-[350px] h-[550px] rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none print:border print:border-black"
      style={{ backgroundColor: cardStyle.backgroundColor }}
    >
      {/* Decorative top pattern with company name */}
      <div 
        className="h-36 relative overflow-hidden"
        style={{ 
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
          {employee.department && (
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

          {employee.phone && (
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
          <div className="bg-white p-3 rounded-xl shadow-lg border-2" style={{ borderColor: cardStyle.accentColor + '30' }}>
            <QRCodeSVG 
              value="https://ramaitsolution.com/"
              size={90}
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
