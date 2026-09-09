import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  IdCard, Download, Printer, Search, Loader2, Building2, 
  Mail, Phone, MapPin, Calendar, User, Briefcase
} from "lucide-react"
import QRCode from "qrcode.react"

export default function IdCards() {
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [search, setSearch] = useState("")

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

  function handleDownload() {
    const element = document.getElementById("id-card-preview")
    if (element) {
      // Create a simple download by opening in new tab
      const printWindow = window.open("", "_blank")
      printWindow.document.write(`
        <html>
          <head>
            <title>ID Card - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            ${element.outerHTML}
          </body>
        </html>
      `)
      printWindow.document.close()
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
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-2 size-4" /> Download
                  </Button>
                  <Button onClick={handlePrint}>
                    <Printer className="mr-2 size-4" /> Print
                  </Button>
                </div>
              </div>

              <div id="id-card-preview" className="flex justify-center">
                <IdCardComponent employee={selectedEmployee} companySettings={companySettings} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function IdCardComponent({ employee, companySettings }) {
  const cardStyle = {
    backgroundColor: companySettings?.id_card_background_color || '#ffffff',
    color: companySettings?.id_card_text_color || '#000000',
    accentColor: companySettings?.id_card_accent_color || '#2563eb',
  }

  return (
    <div 
      className="w-[350px] h-[550px] rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none print:border print:border-black"
      style={{ backgroundColor: cardStyle.backgroundColor }}
    >
      {/* Header with accent */}
      <div 
        className="h-32 relative"
        style={{ backgroundColor: cardStyle.accentColor }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {companySettings?.company_logo_url ? (
            <img 
              src={companySettings.company_logo_url} 
              alt="Company Logo" 
              className="h-20 object-contain"
            />
          ) : (
            <div className="text-white text-center">
              <Building2 className="size-12 mx-auto mb-2" />
              <p className="font-bold text-xl">{companySettings?.company_name || 'Rama Software'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="px-6 -mt-12 relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 shadow-lg overflow-hidden bg-white">
            {employee.profile_image_url ? (
              <img 
                src={employee.profile_image_url} 
                alt={`${employee.first_name} ${employee.last_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-3xl font-bold">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </div>
            )}
          </div>

          <h3 className="mt-4 text-xl font-bold text-center" style={{ color: cardStyle.color }}>
            {employee.first_name} {employee.last_name}
          </h3>
          <p className="text-sm font-medium mt-1" style={{ color: cardStyle.accentColor }}>
            {employee.job_title}
          </p>
          {employee.department && (
            <Badge className="mt-2" style={{ backgroundColor: cardStyle.accentColor + '20', color: cardStyle.accentColor }}>
              {employee.department}
            </Badge>
          )}
        </div>
      </div>

      {/* Employee Details */}
      <div className="px-6 mt-6 space-y-3" style={{ color: cardStyle.color }}>
        <div className="flex items-center gap-3 text-sm">
          <User className="size-4 flex-shrink-0" style={{ color: cardStyle.accentColor }} />
          <div>
            <p className="text-xs opacity-70">Employee ID</p>
            <p className="font-semibold font-mono">{employee.employee_id || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Briefcase className="size-4 flex-shrink-0" style={{ color: cardStyle.accentColor }} />
          <div>
            <p className="text-xs opacity-70">Department</p>
            <p className="font-semibold">{employee.department || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Calendar className="size-4 flex-shrink-0" style={{ color: cardStyle.accentColor }} />
          <div>
            <p className="text-xs opacity-70">Hire Date</p>
            <p className="font-semibold">{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        {employee.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 flex-shrink-0" style={{ color: cardStyle.accentColor }} />
            <div className="truncate">
              <p className="text-xs opacity-70">Email</p>
              <p className="font-semibold truncate">{employee.email}</p>
            </div>
          </div>
        )}

        {employee.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="size-4 flex-shrink-0" style={{ color: cardStyle.accentColor }} />
            <div>
              <p className="text-xs opacity-70">Phone</p>
              <p className="font-semibold">{employee.phone}</p>
            </div>
          </div>
        )}

        {employee.city && (
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="size-4 flex-shrink-0" style={{ color: cardStyle.accentColor }} />
            <div>
              <p className="text-xs opacity-70">Location</p>
              <p className="font-semibold">{employee.city}, {employee.country}</p>
            </div>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="px-6 mt-6 flex justify-center">
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <QRCode 
            value={JSON.stringify({
              id: employee.employee_id,
              name: `${employee.first_name} ${employee.last_name}`,
              email: employee.email,
              company: companySettings?.company_name || 'Rama Software'
            })}
            size={100}
            level="H"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-3 text-center border-t" style={{ borderColor: cardStyle.color + '20' }}>
        <p className="text-xs font-medium" style={{ color: cardStyle.color, opacity: 0.7 }}>
          {companySettings?.company_name || 'Rama Software'}
        </p>
        {companySettings?.website && (
          <p className="text-xs" style={{ color: cardStyle.color, opacity: 0.5 }}>
            {companySettings.website}
          </p>
        )}
      </div>
    </div>
  )
}
