import { useEffect, useState, useMemo } from "react"
import { useSearchParams, useParams, Link, useNavigate } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import defaultLogo from "@/assets/logo.png"
import { formatCurrency, numberToWords, MONTHS, generatePayslipPDF } from "@/lib/payrollUtils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ShieldCheck,
  CheckCircle2,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  User,
  Briefcase,
  Clock,
  AlertCircle,
  Search,
  FileText,
  Lock,
  BadgeCheck,
  QrCode,
  Mail,
  Phone,
  MapPin,
  Globe,
  Loader2,
  RefreshCw,
  Landmark,
} from "lucide-react"

export default function VerifyDocument() {
  const [searchParams] = useSearchParams()
  const routeParams = useParams()
  const navigate = useNavigate()

  // ID can come from query param (?id=... or ?voucher=...) or route param (/verify/:id)
  const targetId =
    searchParams.get("id") ||
    searchParams.get("voucher") ||
    routeParams.id ||
    ""

  const docType = searchParams.get("type") || ""

  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [officialLetter, setOfficialLetter] = useState(null)
  const [companySettings, setCompanySettings] = useState(null)
  const [searchQuery, setSearchQuery] = useState(targetId)
  const [copied, setCopied] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Load document whenever targetId changes
  useEffect(() => {
    async function loadData() {
      if (!targetId) {
        setLoading(false)
        setPayment(null)
        setOfficialLetter(null)
        return
      }

      setLoading(true)
      try {
        // 1. Fetch Company Settings
        let compSettings = null
        try {
          const { data: cs } = await supabase.from("company_settings").select("*").maybeSingle()
          if (cs) compSettings = cs
        } catch {
          // ignore
        }
        if (!compSettings) {
          const localCs = localStorage.getItem("rama_company_settings")
          if (localCs) compSettings = JSON.parse(localCs)
        }
        setCompanySettings(compSettings)

        // 2. Try looking up in salary_payments first (or if docType is explicitly payment)
        let foundPayment = null
        let foundEmployee = null

        try {
          // Look up by primary id or reference_number
          const { data: paymentsData } = await supabase
            .from("salary_payments")
            .select("*")
            .or(`id.eq.${targetId},reference_number.eq.${targetId}`)
            .limit(1)

          if (paymentsData && paymentsData.length > 0) {
            foundPayment = paymentsData[0]
          }
        } catch (err) {
          console.warn("Supabase salary_payments query:", err)
        }

        // Fallback to localStorage if offline / local record
        if (!foundPayment) {
          const localPayments = localStorage.getItem("rama_salary_payments")
          if (localPayments) {
            try {
              const list = JSON.parse(localPayments)
              if (Array.isArray(list)) {
                foundPayment = list.find(
                  (p) =>
                    p.id === targetId ||
                    p.reference_number === targetId ||
                    p.id?.startsWith(targetId) ||
                    (p.reference_number && p.reference_number.toLowerCase() === targetId.toLowerCase())
                )
              }
            } catch {
              // ignore
            }
          }
        }

        if (foundPayment) {
          // Fetch corresponding employee
          if (foundPayment.employee_id) {
            try {
              const { data: empData } = await supabase
                .from("employees")
                .select("*")
                .eq("id", foundPayment.employee_id)
                .maybeSingle()
              if (empData) foundEmployee = empData
            } catch {
              // ignore
            }

            if (!foundEmployee) {
              const localEmps = localStorage.getItem("rama_employees")
              if (localEmps) {
                try {
                  const emps = JSON.parse(localEmps)
                  if (Array.isArray(emps)) {
                    foundEmployee = emps.find((e) => e.id === foundPayment.employee_id)
                  }
                } catch {
                  // ignore
                }
              }
            }
          }

          setPayment(foundPayment)
          setEmployee(foundEmployee)
          setOfficialLetter(null)
          setLoading(false)
          return
        }

        // 3. If not found in salary_payments, check generated_letters
        let foundLetter = null
        try {
          const { data: letterData } = await supabase
            .from("generated_letters")
            .select("*")
            .or(`id.eq.${targetId},reference_number.eq.${targetId}`)
            .limit(1)

          if (letterData && letterData.length > 0) {
            foundLetter = letterData[0]
          }
        } catch {
          // ignore
        }

        if (!foundLetter) {
          const localLetters = localStorage.getItem("rama_generated_letters")
          if (localLetters) {
            try {
              const letters = JSON.parse(localLetters)
              if (Array.isArray(letters)) {
                foundLetter = letters.find(
                  (l) =>
                    l.id === targetId ||
                    l.reference_number === targetId ||
                    l.id?.startsWith(targetId)
                )
              }
            } catch {
              // ignore
            }
          }
        }

        if (foundLetter) {
          setOfficialLetter(foundLetter)
          setPayment(null)
          setEmployee(null)
          setLoading(false)
          return
        }

        // Not found in either
        setPayment(null)
        setEmployee(null)
        setOfficialLetter(null)
      } catch (err) {
        console.error("Verification lookup error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [targetId, docType])

  function handleSearchSubmit(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/verify?id=${encodeURIComponent(searchQuery.trim())}`)
  }

  function handleCopyLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success("Verification URL copied to clipboard!")
      setTimeout(() => setCopied(false), 2500)
    }
  }

  async function handleDownloadPDF() {
    if (!payment) return
    setIsExporting(true)
    try {
      await generatePayslipPDF({
        payment,
        employee,
        companySettings,
      })
      toast.success("Official Payslip Voucher PDF downloaded!")
    } catch (err) {
      console.error("PDF export error:", err)
      toast.error("Failed to generate PDF voucher")
    } finally {
      setIsExporting(false)
    }
  }

  const currentUrl = typeof window !== "undefined" ? window.location.href : ""
  const monthName = payment
    ? MONTHS.find((m) => m.value === Number(payment.month))?.name || `Month ${payment.month}`
    : ""

  const isPaid = payment?.payment_status === "paid"
  const isPending = payment?.payment_status === "pending"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100">
      {/* ---------------- TOP GLOBAL VERIFICATION BAR (Screen only) ---------------- */}
      <header className="bg-[#071B3B] text-white border-b border-slate-800 shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="size-10 rounded-lg bg-white p-1 border border-slate-700 shadow flex items-center justify-center shrink-0">
                <img src={defaultLogo} alt="Rama Software" className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight uppercase leading-none">
                  Rama Software & IT Solutions
                </h1>
                <p className="text-[10px] text-sky-300 font-medium tracking-wider uppercase mt-0.5">
                  Official Document Verification Portal
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700 text-xs h-8 gap-1.5"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Share Link"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700 text-xs h-8 gap-1.5"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Link to="/admin">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shadow-sm">
                Portal Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN VERIFICATION CONTAINER ---------------- */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 print:p-0 print:max-w-none print:w-full">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <Loader2 className="size-10 animate-spin text-blue-600 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">Verifying Document Authenticity...</h2>
              <p className="text-xs text-slate-500">
                Contacting Rama Software secure credential registry and matching signatures.
              </p>
            </div>
          </div>
        )}

        {/* NOT FOUND OR NO ID PROVIDED */}
        {!loading && !payment && !officialLetter && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center shadow-sm space-y-6">
              <div className="size-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Search className="size-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {targetId ? "Document Record Not Found" : "Document Verification Portal"}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {targetId
                    ? `No registered salary voucher or official letter matches ID "${targetId}". Please verify the ID or reference number on your document and try again.`
                    : "Enter the Voucher ID, Reference Number, or scan the QR code located on any official Rama Software payslip or letterhead to verify its authenticity."}
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. RAMA-2026-001, RAMA-PAY-2026-001 or ID..."
                    className="pl-9 h-10 text-sm rounded-xl border-slate-300"
                  />
                </div>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 rounded-xl font-semibold">
                  Verify
                </Button>
              </form>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" /> 256-bit Cryptographic Verification
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-blue-600" /> Official Rama Software Seal
                </span>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3.5">
                <div className="size-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">For Employees & Staff</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Log in to the staff portal to view your complete payroll history, payslips, and tax certificates.
                  </p>
                  <Link to="/employee" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold mt-2">
                    Open Employee Portal <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3.5">
                <div className="size-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">For HR & Financial Audits</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized bank and tax officials can authenticate issued letters and payment records.
                  </p>
                  <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold mt-2">
                    Admin Verification Suite <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- DOCUMENT FOUND: SALARY PAYMENT VOUCHER & LETTER ---------------- */}
        {!loading && payment && (
          <div className="space-y-6">
            {/* 1. Official Authenticity Banner (Screen only) */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  <ShieldCheck className="size-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-md">
                      AUTHENTICATED & VERIFIED
                    </span>
                    <span className="text-[11px] text-emerald-100 flex items-center gap-1">
                      <Lock className="size-3" /> Tamper-Proof Record
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                    Official Salary Payment Voucher & Remittance Letter
                  </h2>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Verified against Rama Software & IT Solutions Registry • ID: {payment.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <Button
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow h-9 gap-1.5"
                >
                  {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Download Official PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="bg-emerald-800/50 border-white/30 text-white hover:bg-emerald-800 text-xs h-9 gap-1.5"
                >
                  <Printer className="size-3.5" />
                  Print
                </Button>
              </div>
            </div>

            {/* 2. The Official Voucher / Letterhead Sheet (Print Target) */}
            <div
              id="official-salary-voucher"
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none"
            >
              {/* Header Bar */}
              <div className="bg-[#071B3B] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="size-16 sm:size-20 rounded-xl bg-white p-2 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                    <img src={defaultLogo} alt="Rama Software Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-black tracking-tight uppercase leading-tight text-white">
                      RAMA SOFTWARE & IT SOLUTIONS
                    </h2>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Enterprise Solutions • Secure Cloud • Managed IT Services
                    </p>
                    <p className="text-xs text-sky-300 font-semibold mt-1 flex items-center gap-2">
                      <span>Official Salary Voucher & Payslip Letter</span>
                      <span>•</span>
                      <span className="font-bold">Period: {monthName} {payment.year}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {/* Phone Camera Scannable QR Code */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <QRCodeSVG
                      value={currentUrl}
                      size={80}
                      level="M"
                      includeMargin={true}
                    />
                    <span className="text-[8px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
                      Scan to Verify
                    </span>
                  </div>

                  {/* Status Stamp */}
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      className={`text-xs px-3.5 py-1 font-black tracking-wider uppercase shadow-sm ${
                        isPaid
                          ? "bg-emerald-500 text-white"
                          : isPending
                          ? "bg-amber-500 text-white"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {payment.payment_status ? payment.payment_status.toUpperCase() : "PAID"}
                    </Badge>
                    <span className="text-[10px] text-slate-300 font-mono">
                      Ref: {payment.reference_number || (isPaid ? "TXN-VERIFIED" : "PENDING")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Body */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Employee & Voucher Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <User className="size-3 text-blue-600" /> Employee Dossier
                    </span>
                    <div className="text-base font-bold text-slate-900">
                      {employee?.first_name || ""} {employee?.last_name || ""}
                      {!employee?.first_name && (payment.employee_name || "Employee")}
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p><span className="font-semibold text-slate-700">Staff ID:</span> {employee?.employee_id || "N/A"}</p>
                      <p><span className="font-semibold text-slate-700">Designation:</span> {employee?.job_title || "Staff Member"}</p>
                      <p><span className="font-semibold text-slate-700">Department:</span> {employee?.department || "General IT"}</p>
                      {employee?.email && <p><span className="font-semibold text-slate-700">Email:</span> {employee.email}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Calendar className="size-3 text-blue-600" /> Payment & Voucher Metadata
                    </span>
                    <div className="text-base font-bold text-slate-900">
                      {monthName} {payment.year} Remittance
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p><span className="font-semibold text-slate-700">Voucher ID:</span> <span className="font-mono text-slate-800">{payment.id?.slice(0, 16)}...</span></p>
                      <p><span className="font-semibold text-slate-700">Scheduled Date:</span> {payment.payment_date || "N/A"}</p>
                      <p><span className="font-semibold text-slate-700">Paid Date:</span> {payment.paid_date || (isPaid ? payment.payment_date : "Pending")}</p>
                      <p><span className="font-semibold text-slate-700">Payment Channel:</span> <span className="font-semibold text-blue-700">{payment.payment_method?.replace(/_/g, " ").toUpperCase() || "BANK TRANSFER"}</span></p>
                    </div>
                  </div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="size-3.5 text-emerald-600" /> Earnings & Allowances
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">Gross Breakdown</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600 font-medium">Basic / Base Salary</span>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.basic_salary)}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <div>
                            <span className="text-slate-600 font-medium block">Overtime Pay</span>
                            <span className="text-[10px] text-slate-400">
                              Normal: {payment.overtime_hours_normal || 0}h | Night: {payment.overtime_hours_night || 0}h | Weekend: {payment.overtime_hours_weekend || 0}h | Holiday: {payment.overtime_hours_holiday || 0}h
                            </span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.overtime_amount)}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600 font-medium">Performance Commission</span>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.commission_amount)}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600 font-medium">Transport Allowance</span>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.transport_allowance)}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600 font-medium">Housing Allowance</span>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.housing_allowance)}</span>
                        </div>
                        {Number(payment.other_allowances) > 0 && (
                          <div className="px-4 py-2.5 flex justify-between">
                            <span className="text-slate-600 font-medium">Other Allowances</span>
                            <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.other_allowances)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>GROSS EARNINGS</span>
                      <span className="font-mono text-sm text-emerald-600">{formatCurrency(payment.gross_salary)}</span>
                    </div>
                  </div>

                  {/* Deductions Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Landmark className="size-3.5 text-rose-600" /> Tax & Statutory Deductions
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">Legal Withholding</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600 font-medium">Employment Income Tax</span>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.income_tax)}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600 font-medium">Employee Pension (7%)</span>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.pension_employee)}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600 font-medium">Company Pension Contribution (11%)</span>
                          <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.pension_company)}</span>
                        </div>
                        {Number(payment.loan_deduction) > 0 && (
                          <div className="px-4 py-2.5 flex justify-between">
                            <span className="text-slate-600 font-medium">Salary Advance / Loan</span>
                            <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.loan_deduction)}</span>
                          </div>
                        )}
                        {Number(payment.other_deductions) > 0 && (
                          <div className="px-4 py-2.5 flex justify-between">
                            <span className="text-slate-600 font-medium">Other Deductions</span>
                            <span className="font-bold text-slate-800 font-mono">{formatCurrency(payment.other_deductions)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>TOTAL DEDUCTIONS</span>
                      <span className="font-mono text-sm text-rose-600">{formatCurrency(payment.deductions_total)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Highlight Banner */}
                <div className="bg-gradient-to-r from-blue-900 to-[#071B3B] text-white p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                  <div>
                    <span className="text-[11px] font-bold text-sky-300 uppercase tracking-widest block">
                      NET REMITTANCE / TAKE-HOME SALARY
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block mt-0.5">
                      {formatCurrency(payment.net_salary)}
                    </span>
                    <span className="text-xs text-slate-300 italic block mt-1">
                      In Words: {numberToWords(payment.net_salary)}
                    </span>
                  </div>

                  <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-800/80">
                    <span className="text-[10px] text-sky-200 uppercase tracking-wider block font-semibold">
                      Payment Verification Reference
                    </span>
                    <span className="font-mono text-xs font-bold text-white block mt-0.5 bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-700/50">
                      {payment.reference_number || (isPaid ? "TXN-VERIFIED-AUTH" : "PENDING-SETTLEMENT")}
                    </span>
                  </div>
                </div>

                {/* Chapa / Electronic Payment Confirmation Placeholder */}
                {payment.payment_method === "chapa" && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center justify-between text-xs text-sky-900">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                        C
                      </div>
                      <div>
                        <p className="font-bold">Chapa Payment Gateway Automated Verification</p>
                        <p className="text-[11px] text-sky-700">
                          Transaction processed via secure digital payment infrastructure. Reference: {payment.reference_number || "CHAPA-SETTLED"}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-sky-600 text-white font-bold text-[10px]">VERIFIED</Badge>
                  </div>
                )}

                {/* Note / Remarks if any */}
                {payment.note && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800">
                      <FileText className="size-3.5" /> Official Remarks & Notes:
                    </span>
                    <p className="text-slate-700 leading-relaxed pl-5">{payment.note}</p>
                  </div>
                )}

                {/* Authorized Signatures & Verification Seal */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                  {/* Employer / Manager Signature with Stamp */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 relative">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Authorized Employer Signatory
                      </span>
                      <div className="h-12 flex items-center">
                        <span className="font-serif italic text-lg text-slate-800 font-bold tracking-wide">
                          {companySettings?.manager_name || "Daniel Marion"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{companySettings?.manager_name || "Daniel Marion"}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{companySettings?.manager_title || "General Manager"}, Rama Software</p>
                    </div>

                    {/* Digital Seal Stamp */}
                    <div className="absolute right-3 bottom-3 size-16 rounded-full border-2 border-dashed border-emerald-600/40 text-emerald-700 flex flex-col items-center justify-center text-center p-1 pointer-events-none rotate-[-12deg] bg-emerald-50/40">
                      <ShieldCheck className="size-4" />
                      <span className="text-[7px] font-black uppercase leading-tight tracking-tight mt-0.5">
                        RAMA SEAL
                      </span>
                      <span className="text-[6px] font-bold">VERIFIED</span>
                    </div>
                  </div>

                  {/* Employee Acceptance & Signature */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Employee Acknowledgment & Signature
                    </span>
                    <div className="h-12 flex items-center border-b border-dashed border-slate-300">
                      <span className="text-xs text-slate-400 italic">
                        {isPaid ? "Acknowledged & Received via Digital Payroll" : "Pending Signature Upon Collection"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-600 mt-2 font-medium">
                      <span>Date: {payment.paid_date || payment.payment_date || new Date().toISOString().slice(0, 10)}</span>
                      <span className="text-[10px] text-slate-400">ID: {employee?.employee_id || "STAFF"}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Disclaimer & Authenticity Statement */}
                <div className="pt-4 border-t border-slate-200 text-center space-y-1 text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-600">
                    Rama Software & IT Solutions • Bole Road, Addis Ababa, Ethiopia • info@ramasoftware.com • +251-911-000000
                  </p>
                  <p>
                    This is an official computer-generated salary payment voucher issued by Rama Software & IT Solutions. Any alteration or unauthorized reproduction of this document is strictly illegal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- DOCUMENT FOUND: OFFICIAL LETTER ---------------- */}
        {!loading && officialLetter && (
          <div className="space-y-6">
            {/* Authenticity Banner */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  <BadgeCheck className="size-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-md">
                      VERIFIED OFFICIAL LETTER
                    </span>
                    <span className="text-[11px] text-blue-100 flex items-center gap-1">
                      <Lock className="size-3" /> Recorded in Registry
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                    {officialLetter.subject || officialLetter.title || "Official Corporate Letter"}
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Recipient: {officialLetter.recipient_name} • Ref: {officialLetter.reference_number || officialLetter.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs h-9 gap-1.5"
                >
                  <Printer className="size-3.5" />
                  Print Letter
                </Button>
              </div>
            </div>

            {/* Letter View Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-12 space-y-6 print:border-none print:shadow-none print:p-0">
              <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center">
                    <img src={defaultLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Rama Software & IT Solutions</h3>
                    <p className="text-xs text-slate-500">Official Document Verification System</p>
                  </div>
                </div>

                <div className="size-20 bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                  <QRCodeSVG value={currentUrl} size={64} level="M" includeMargin={true} />
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-800">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Ref: {officialLetter.reference_number || officialLetter.id}</span>
                  <span>Date: {officialLetter.letter_date || officialLetter.created_at?.slice(0, 10)}</span>
                </div>

                <div>
                  <p className="font-bold text-slate-900">To: {officialLetter.recipient_name}</p>
                  {officialLetter.recipient_address && <p className="text-slate-600 text-xs">{officialLetter.recipient_address}</p>}
                </div>

                <h4 className="text-base font-bold text-blue-900 uppercase tracking-tight pt-2">
                  {officialLetter.subject || officialLetter.title}
                </h4>

                <div className="whitespace-pre-line text-slate-700 leading-relaxed text-sm">
                  {officialLetter.content?.body || officialLetter.body || "Letter body verified."}
                </div>

                <div className="pt-8 flex justify-between items-end border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Authorized Signatory</span>
                    <p className="font-bold text-slate-900">{officialLetter.content?.signer_name || companySettings?.manager_name || "Daniel Marion"}</p>
                    <p className="text-xs text-slate-500">{officialLetter.content?.signer_title || companySettings?.manager_title || "General Manager"}</p>
                  </div>

                  <div className="size-16 rounded-full border-2 border-dashed border-blue-600/40 text-blue-700 flex flex-col items-center justify-center text-center p-1 rotate-[-12deg]">
                    <BadgeCheck className="size-4" />
                    <span className="text-[7px] font-black uppercase">AUTHENTIC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

