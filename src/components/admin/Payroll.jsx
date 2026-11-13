import { useState, useMemo, useEffect } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Coins, Plus, Search, Edit, Trash2, CheckCircle2, AlertCircle, Clock,
  Calendar, Download, Printer, Filter, Settings, Percent, DollarSign,
  User, Briefcase, Building, Sparkles, RefreshCw, Moon, Sun, ChevronRight,
  TrendingUp, ArrowUpRight, Check, X, ShieldAlert, FileText, Award, HelpCircle,
  Users, RotateCcw, ExternalLink, ShieldCheck
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import defaultLogo from "@/assets/logo.png"
import {
  MONTHS,
  DEFAULT_OVERTIME_RULES,
  OVERTIME_TYPES,
  getOvertimeTypeMeta,
  calculateHourlyRate,
  calculateOvertimePay,
  calculateCommissionAmount,
  estimateIncomeTax,
  formatCurrency,
  numberToWords,
  generatePayslipPDF,
} from "@/lib/payrollUtils"

// Helper to generate next auto-incrementing reference code with "RAMA-" prefix for salary payments
export function getNextPaymentReference(existingPayments = []) {
  const currentYear = new Date().getFullYear()
  let maxSeq = 0

  let allPayments = Array.isArray(existingPayments) ? [...existingPayments] : []
  try {
    const local = localStorage.getItem("rama_salary_payments")
    if (local) {
      const parsed = JSON.parse(local)
      if (Array.isArray(parsed)) {
        allPayments = [...allPayments, ...parsed]
      }
    }
  } catch {
    // ignore
  }

  allPayments.forEach((p) => {
    const ref = (p?.reference_number || "").trim()
    if (!ref) return
    const match = ref.match(/RAMA-(?:PAY-|SAL-)?(?:\d{4}-)?(\d+)/i)
    if (match && match[1]) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num > maxSeq) maxSeq = num
    }
  })

  if (maxSeq === 0 && allPayments.length > 0) {
    maxSeq = allPayments.length
  }

  const nextSeq = maxSeq + 1
  return `RAMA-PAY-${currentYear}-${String(nextSeq).padStart(3, "0")}`
}

export default function Payroll() {
  const qc = useQueryClient()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-12

  // Active Tab
  const [activeTab, setActiveTab] = useState("salaries")

  // Salary Filters - Default to "all" so any created payment is IMMEDIATELY visible
  const [employeeFilter, setEmployeeFilter] = useState("all") // all, or employee_id
  const [yearFilter, setYearFilter] = useState("all") // all, or year string
  const [monthFilter, setMonthFilter] = useState("all") // all, or month string
  const [statusFilter, setStatusFilter] = useState("all") // all, paid, unpaid, pending
  const [searchQuery, setSearchQuery] = useState("")

  // Dialog States
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false)
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false)
  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false)
  const [payslipModalOpen, setPayslipModalOpen] = useState(false)
  const [selectedPaymentForPayslip, setSelectedPaymentForPayslip] = useState(null)
  const [editingPayment, setEditingPayment] = useState(null)
  const [editingCommission, setEditingCommission] = useState(null)

  // Salary Form Data
  const initialSalaryForm = {
    employee_id: "",
    year: currentYear,
    month: currentMonth,
    payment_date: new Date().toISOString().slice(0, 10),
    pay_period_start: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
    pay_period_end: `${currentYear}-${String(currentMonth).padStart(2, "0")}-28`,
    basic_salary: 0,
    overtime_amount: 0,
    overtime_hours_normal: 0,
    overtime_hours_night: 0,
    overtime_hours_weekend: 0,
    overtime_hours_holiday: 0,
    commission_amount: 0,
    transport_allowance: 0,
    housing_allowance: 0,
    meal_allowance: 0,
    other_allowances: 0,
    bonus: 0,
    tax_deduction: 0,
    pension_deduction: 0,
    loan_deduction: 0,
    other_deductions: 0,
    payment_method: "bank_transfer",
    payment_status: "paid", // default to paid as requested by user
    paid_date: new Date().toISOString().slice(0, 10),
    reference_number: "",
    notes: "",
  }
  const [salaryForm, setSalaryForm] = useState(initialSalaryForm)

  // Commission Form Data
  const initialCommissionForm = {
    employee_id: "",
    title: "",
    deal_amount: "",
    commission_rate: "",
    commission_amount: "",
    earned_date: new Date().toISOString().slice(0, 10),
    status: "approved",
    notes: "",
  }
  const [commissionForm, setCommissionForm] = useState(initialCommissionForm)

  // Overtime Form Data
  const initialOvertimeForm = {
    employee_id: "",
    date: new Date().toISOString().slice(0, 10),
    overtime_type: "normal",
    hours: "",
    hourly_rate: 0,
    multiplier: 1.5,
    calculated_amount: 0,
    status: "approved",
    notes: "",
  }
  const [overtimeForm, setOvertimeForm] = useState(initialOvertimeForm)

  // Overtime Rules / Settings Data
  const [rulesSettings, setRulesSettings] = useState(DEFAULT_OVERTIME_RULES)
  const [calculatorState, setCalculatorState] = useState({
    salary: 20000,
    normalHours: 5,
    nightHours: 3,
    weekendHours: 8,
    holidayHours: 0,
  })

  // 1. Fetch Employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("first_name", { ascending: true })
        if (error) throw error
        return data || []
      } catch (err) {
        console.warn("Could not fetch employees from Supabase:", err)
        return []
      }
    },
  })

  // 2. Fetch Payroll Settings
  const { data: fetchedSettings } = useQuery({
    queryKey: ["payroll-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("payroll_settings")
          .select("*")
          .limit(1)
          .maybeSingle()
        if (error || !data) {
          const local = localStorage.getItem("rama_payroll_settings")
          return local ? JSON.parse(local) : DEFAULT_OVERTIME_RULES
        }
        return data
      } catch (err) {
        const local = localStorage.getItem("rama_payroll_settings")
        return local ? JSON.parse(local) : DEFAULT_OVERTIME_RULES
      }
    },
  })

  useEffect(() => {
    if (fetchedSettings) {
      setRulesSettings({ ...DEFAULT_OVERTIME_RULES, ...fetchedSettings })
    }
  }, [fetchedSettings])

  // 3. Fetch Salary Payments (Bulletproof: merges Supabase DB records and LocalStorage)
  const { data: salaryPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["salary-payments"],
    queryFn: async () => {
      let dbData = []
      try {
        const { data, error } = await supabase
          .from("salary_payments")
          .select("*")
          .order("created_at", { ascending: false })
        if (!error && Array.isArray(data)) {
          dbData = data
        }
      } catch (err) {
        console.warn("Could not query Supabase salary_payments table:", err)
      }

      let localData = []
      try {
        const raw = localStorage.getItem("rama_salary_payments")
        localData = raw ? JSON.parse(raw) : []
      } catch (e) {}

      // Merge records by id
      const map = new Map()
      // First populate local items
      localData.forEach((p) => {
        if (p && p.id) map.set(p.id, p)
      })
      // Then overlay/add Supabase items
      dbData.forEach((p) => {
        if (p && p.id) map.set(p.id, p)
      })

      const merged = Array.from(map.values())
      // Sort newest first
      merged.sort((a, b) => {
        const dateA = new Date(a.payment_date || a.created_at || 0).getTime()
        const dateB = new Date(b.payment_date || b.created_at || 0).getTime()
        return dateB - dateA
      })

      return merged
    },
  })

  // 4. Fetch Commissions (Bulletproof Supabase + LocalStorage)
  const { data: commissions = [], isLoading: commissionsLoading } = useQuery({
    queryKey: ["employee-commissions"],
    queryFn: async () => {
      let dbData = []
      try {
        const { data, error } = await supabase
          .from("employee_commissions")
          .select("*")
          .order("earned_date", { ascending: false })
        if (!error && Array.isArray(data)) {
          dbData = data
        }
      } catch (err) {
        console.warn("Could not query Supabase commissions table:", err)
      }

      let localData = []
      try {
        const raw = localStorage.getItem("rama_employee_commissions")
        localData = raw ? JSON.parse(raw) : []
      } catch (e) {}

      const map = new Map()
      localData.forEach((c) => {
        if (c && c.id) map.set(c.id, c)
      })
      dbData.forEach((c) => {
        if (c && c.id) map.set(c.id, c)
      })

      return Array.from(map.values())
    },
  })

  // 5. Fetch Overtime records (Bulletproof Supabase + LocalStorage)
  const { data: overtimeRecords = [], isLoading: overtimeLoading } = useQuery({
    queryKey: ["employee-overtime"],
    queryFn: async () => {
      let dbData = []
      try {
        const { data, error } = await supabase
          .from("employee_overtime")
          .select("*")
          .order("date", { ascending: false })
        if (!error && Array.isArray(data)) {
          dbData = data
        }
      } catch (err) {
        console.warn("Could not query Supabase overtime table:", err)
      }

      let localData = []
      try {
        const raw = localStorage.getItem("rama_employee_overtime")
        localData = raw ? JSON.parse(raw) : []
      } catch (e) {}

      const map = new Map()
      localData.forEach((ot) => {
        if (ot && ot.id) map.set(ot.id, ot)
      })
      dbData.forEach((ot) => {
        if (ot && ot.id) map.set(ot.id, ot)
      })

      return Array.from(map.values())
    },
  })

  // Helper mapping: attach employee objects
  const paymentsWithEmployee = useMemo(() => {
    return salaryPayments.map((p) => {
      const emp = employees.find((e) => e.id === p.employee_id) || p.employee
      return { ...p, employee: emp }
    })
  }, [salaryPayments, employees])

  // Filtered salary payments
  const filteredSalaryPayments = useMemo(() => {
    return paymentsWithEmployee.filter((p) => {
      const empName = `${p.employee?.first_name || ""} ${p.employee?.last_name || ""}`.toLowerCase()
      const empId = (p.employee?.employee_id || "").toLowerCase()
      const dept = (p.employee?.department || "").toLowerCase()
      const ref = (p.reference_number || "").toLowerCase()
      const q = searchQuery.toLowerCase().trim()

      const matchSearch =
        !q ||
        empName.includes(q) ||
        empId.includes(q) ||
        dept.includes(q) ||
        ref.includes(q)

      const matchEmployee = employeeFilter === "all" || p.employee_id === employeeFilter
      const matchYear = yearFilter === "all" || String(p.year) === String(yearFilter)
      const matchMonth = monthFilter === "all" || String(p.month) === String(monthFilter)
      const matchStatus = statusFilter === "all" || p.payment_status === statusFilter

      return matchSearch && matchEmployee && matchYear && matchMonth && matchStatus
    })
  }, [paymentsWithEmployee, searchQuery, employeeFilter, yearFilter, monthFilter, statusFilter])

  // KPI Summary
  const kpiStats = useMemo(() => {
    let totalPayroll = 0
    let totalPaid = 0
    let totalUnpaid = 0
    let paidCount = 0
    let unpaidCount = 0

    filteredSalaryPayments.forEach((p) => {
      const net = Number(p.net_salary) || 0
      totalPayroll += net
      if (p.payment_status === "paid") {
        totalPaid += net
        paidCount++
      } else {
        totalUnpaid += net
        unpaidCount++
      }
    })

    return {
      totalPayroll,
      totalPaid,
      totalUnpaid,
      totalRecords: filteredSalaryPayments.length,
      paidCount,
      unpaidCount,
    }
  }, [filteredSalaryPayments])

  // Real-time calculations for Salary Form
  const salaryFormCalculations = useMemo(() => {
    const basic = Number(salaryForm.basic_salary) || 0
    const overtime = Number(salaryForm.overtime_amount) || 0
    const commission = Number(salaryForm.commission_amount) || 0
    const transport = Number(salaryForm.transport_allowance) || 0
    const housing = Number(salaryForm.housing_allowance) || 0
    const meal = Number(salaryForm.meal_allowance) || 0
    const otherAllow = Number(salaryForm.other_allowances) || 0
    const bonus = Number(salaryForm.bonus) || 0

    const gross = basic + overtime + commission + transport + housing + meal + otherAllow + bonus

    const tax = Number(salaryForm.tax_deduction) || 0
    const pension = Number(salaryForm.pension_deduction) || 0
    const loan = Number(salaryForm.loan_deduction) || 0
    const otherDed = Number(salaryForm.other_deductions) || 0

    const totalDeductions = tax + pension + loan + otherDed
    const net = gross - totalDeductions

    return { gross, totalDeductions, net }
  }, [salaryForm])

  // Handle Employee selection in Salary Form
  const handleEmployeeSelectForSalary = (empId) => {
    const emp = employees.find((e) => e.id === empId)
    if (!emp) return

    const basicSalary = Number(emp.salary) || 0
    const pensionRate = Number(rulesSettings.pension_employee_rate) || 7
    const autoPension = Number(((basicSalary * pensionRate) / 100).toFixed(2))
    const autoTax = estimateIncomeTax(basicSalary)

    setSalaryForm((prev) => ({
      ...prev,
      employee_id: empId,
      basic_salary: basicSalary,
      pension_deduction: autoPension,
      tax_deduction: autoTax,
    }))
  }

  // Open Quick Pay for an Employee directly from Employee Directory
  const handleQuickPayFromDirectory = (empId) => {
    const emp = employees.find((e) => e.id === empId)
    if (!emp) return

    setEditingPayment(null)
    const basicSalary = Number(emp.salary) || 0
    const pensionRate = Number(rulesSettings.pension_employee_rate) || 7
    const autoPension = Number(((basicSalary * pensionRate) / 100).toFixed(2))
    const autoTax = estimateIncomeTax(basicSalary)

    setSalaryForm({
      ...initialSalaryForm,
      employee_id: emp.id,
      basic_salary: basicSalary,
      pension_deduction: autoPension,
      tax_deduction: autoTax,
      payment_status: "paid",
      reference_number: getNextPaymentReference(salaryPayments),
    })
    setSalaryDialogOpen(true)
  }

  // Auto-Fetch & Calculate Overtime & Commissions for Salary Form
  const handleAutoFetchOvertimeAndCommissions = () => {
    if (!salaryForm.employee_id) {
      toast.error("Please select an employee first")
      return
    }

    const empId = salaryForm.employee_id
    const yr = Number(salaryForm.year)
    const mo = Number(salaryForm.month)

    const matchedOT = overtimeRecords.filter((ot) => {
      if (ot.employee_id !== empId || ot.status !== "approved") return false
      const otDate = new Date(ot.date)
      return otDate.getFullYear() === yr && otDate.getMonth() + 1 === mo
    })

    let normH = 0
    let nightH = 0
    let weekH = 0
    let holH = 0
    let totalOtAmount = 0

    matchedOT.forEach((ot) => {
      const h = Number(ot.hours) || 0
      const amt = Number(ot.calculated_amount) || 0
      totalOtAmount += amt
      if (ot.overtime_type === "normal") normH += h
      else if (ot.overtime_type === "night") nightH += h
      else if (ot.overtime_type === "weekend") weekH += h
      else if (ot.overtime_type === "holiday") holH += h
    })

    const matchedComms = commissions.filter((c) => {
      if (c.employee_id !== empId || c.status !== "approved") return false
      const cDate = new Date(c.earned_date)
      return cDate.getFullYear() === yr && cDate.getMonth() + 1 === mo
    })

    let totalCommAmount = 0
    matchedComms.forEach((c) => {
      totalCommAmount += Number(c.commission_amount) || 0
    })

    setSalaryForm((prev) => ({
      ...prev,
      overtime_amount: Number(totalOtAmount.toFixed(2)),
      overtime_hours_normal: normH,
      overtime_hours_night: nightH,
      overtime_hours_weekend: weekH,
      overtime_hours_holiday: holH,
      commission_amount: Number(totalCommAmount.toFixed(2)),
    }))

    toast.success(
      `Imported: ${matchedOT.length} Overtime records (${totalOtAmount.toFixed(2)} ETB) & ${matchedComms.length} Commissions (${totalCommAmount.toFixed(2)} ETB)`
    )
  }

  // --- MUTATIONS ---

  // Create / Update Salary Payment (Persists immediately to localStorage AND Supabase)
  const saveSalaryMutation = useMutation({
    mutationFn: async (payload) => {
      const finalRef = (payload.reference_number || "").trim() || getNextPaymentReference(salaryPayments)
      const fullPayload = {
        ...payload,
        reference_number: finalRef,
        gross_salary: salaryFormCalculations.gross,
        total_deductions: salaryFormCalculations.totalDeductions,
        net_salary: salaryFormCalculations.net,
      }

      const emp = employees.find((e) => e.id === fullPayload.employee_id)
      const recordId =
        editingPayment?.id ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "pay_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7))

      const recordToSave = {
        ...fullPayload,
        id: recordId,
        created_at: editingPayment?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        employee: emp,
      }

      // 1. Immediately store in localStorage
      let local = []
      try {
        local = JSON.parse(localStorage.getItem("rama_salary_payments") || "[]")
      } catch (e) {}

      if (editingPayment?.id) {
        local = local.map((p) => (p.id === editingPayment.id ? recordToSave : p))
      } else {
        local.unshift(recordToSave)
      }
      localStorage.setItem("rama_salary_payments", JSON.stringify(local))

      // 2. Persist to Supabase
      try {
        if (editingPayment?.id) {
          await supabase.from("salary_payments").update(fullPayload).eq("id", editingPayment.id)
        } else {
          const { data, error } = await supabase.from("salary_payments").insert([fullPayload]).select()
          if (!error && data && data[0]) {
            recordToSave.id = data[0].id
            local = local.map((p) => (p.id === recordId ? recordToSave : p))
            localStorage.setItem("rama_salary_payments", JSON.stringify(local))
          }
        }
      } catch (err) {
        console.warn("Supabase salary save notice:", err)
      }

      return recordToSave
    },
    onSuccess: (savedRecord) => {
      toast.success(
        editingPayment
          ? "Salary record updated successfully"
          : `Salary payment saved with status "${(savedRecord.payment_status || "paid").toUpperCase()}"`
      )
      // Reset filters so the payment is immediately visible in the table
      setEmployeeFilter("all")
      setYearFilter("all")
      setMonthFilter("all")
      setStatusFilter("all")
      setSearchQuery("")

      qc.invalidateQueries({ queryKey: ["salary-payments"] })
      setSalaryDialogOpen(false)
      setEditingPayment(null)
      setSalaryForm(initialSalaryForm)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save salary payment")
    },
  })

  // Change Payment Status Directly (paid, unpaid, pending)
  const changePaymentStatusMutation = useMutation({
    mutationFn: async ({ paymentId, newStatus }) => {
      const paidDate = newStatus === "paid" ? new Date().toISOString().slice(0, 10) : null

      // 1. Update localStorage immediately
      try {
        const local = JSON.parse(localStorage.getItem("rama_salary_payments") || "[]")
        const updated = local.map((p) =>
          p.id === paymentId ? { ...p, payment_status: newStatus, paid_date: paidDate } : p
        )
        localStorage.setItem("rama_salary_payments", JSON.stringify(updated))
      } catch (e) {}

      // 2. Update Supabase
      try {
        await supabase
          .from("salary_payments")
          .update({ payment_status: newStatus, paid_date: paidDate })
          .eq("id", paymentId)
      } catch (e) {
        console.warn("Supabase status update:", e)
      }

      return { paymentId, newStatus }
    },
    onSuccess: (vars) => {
      toast.success(`Payment status changed to ${vars.newStatus.toUpperCase()}`)
      qc.invalidateQueries({ queryKey: ["salary-payments"] })
    },
    onError: (err) => {
      toast.error("Error updating status: " + err.message)
    },
  })

  // Delete Salary Payment
  const deleteSalaryMutation = useMutation({
    mutationFn: async (id) => {
      // 1. Delete from localStorage
      try {
        const local = JSON.parse(localStorage.getItem("rama_salary_payments") || "[]")
        const filtered = local.filter((p) => p.id !== id)
        localStorage.setItem("rama_salary_payments", JSON.stringify(filtered))
      } catch (e) {}

      // 2. Delete from Supabase
      try {
        await supabase.from("salary_payments").delete().eq("id", id)
      } catch (e) {
        console.warn("Supabase delete notice:", e)
      }
    },
    onSuccess: () => {
      toast.success("Salary payment record deleted")
      qc.invalidateQueries({ queryKey: ["salary-payments"] })
    },
  })

  // Create / Update Commission
  const saveCommissionMutation = useMutation({
    mutationFn: async (payload) => {
      const emp = employees.find((e) => e.id === payload.employee_id)
      const commId =
        editingCommission?.id ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "comm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7))

      const commRecord = {
        ...payload,
        id: commId,
        created_at: editingCommission?.created_at || new Date().toISOString(),
        employee: emp,
      }

      let local = []
      try {
        local = JSON.parse(localStorage.getItem("rama_employee_commissions") || "[]")
      } catch (e) {}

      if (editingCommission?.id) {
        local = local.map((c) => (c.id === editingCommission.id ? commRecord : c))
      } else {
        local.unshift(commRecord)
      }
      localStorage.setItem("rama_employee_commissions", JSON.stringify(local))

      try {
        if (editingCommission?.id) {
          await supabase.from("employee_commissions").update(payload).eq("id", editingCommission.id)
        } else {
          await supabase.from("employee_commissions").insert([payload])
        }
      } catch (err) {
        console.warn("Supabase commission notice:", err)
      }
    },
    onSuccess: () => {
      toast.success("Commission registered successfully")
      qc.invalidateQueries({ queryKey: ["employee-commissions"] })
      setCommissionDialogOpen(false)
      setEditingCommission(null)
      setCommissionForm(initialCommissionForm)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to register commission")
    },
  })

  // Quick update Commission Status
  const updateCommissionStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      try {
        const local = JSON.parse(localStorage.getItem("rama_employee_commissions") || "[]")
        const updated = local.map((c) => (c.id === id ? { ...c, status } : c))
        localStorage.setItem("rama_employee_commissions", JSON.stringify(updated))
      } catch (e) {}

      try {
        await supabase
          .from("employee_commissions")
          .update({ status, approved_at: new Date().toISOString() })
          .eq("id", id)
      } catch (e) {
        console.warn("Supabase commission status notice:", e)
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`Commission marked as ${vars.status}`)
      qc.invalidateQueries({ queryKey: ["employee-commissions"] })
    },
  })

  // Delete Commission
  const deleteCommissionMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const local = JSON.parse(localStorage.getItem("rama_employee_commissions") || "[]")
        localStorage.setItem("rama_employee_commissions", JSON.stringify(local.filter((c) => c.id !== id)))
      } catch (e) {}

      try {
        await supabase.from("employee_commissions").delete().eq("id", id)
      } catch (e) {
        console.warn("Supabase commission delete notice:", e)
      }
    },
    onSuccess: () => {
      toast.success("Commission deleted")
      qc.invalidateQueries({ queryKey: ["employee-commissions"] })
    },
  })

  // Create Overtime Record
  const saveOvertimeMutation = useMutation({
    mutationFn: async (payload) => {
      const emp = employees.find((e) => e.id === payload.employee_id)
      const otId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "ot_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)

      const otRecord = {
        ...payload,
        id: otId,
        created_at: new Date().toISOString(),
        employee: emp,
      }

      let local = []
      try {
        local = JSON.parse(localStorage.getItem("rama_employee_overtime") || "[]")
      } catch (e) {}
      local.unshift(otRecord)
      localStorage.setItem("rama_employee_overtime", JSON.stringify(local))

      try {
        await supabase.from("employee_overtime").insert([payload])
      } catch (err) {
        console.warn("Supabase overtime notice:", err)
      }
    },
    onSuccess: () => {
      toast.success("Overtime record created successfully")
      qc.invalidateQueries({ queryKey: ["employee-overtime"] })
      setOvertimeDialogOpen(false)
      setOvertimeForm(initialOvertimeForm)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record overtime")
    },
  })

  // Update Overtime Status
  const updateOvertimeStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      try {
        const local = JSON.parse(localStorage.getItem("rama_employee_overtime") || "[]")
        const updated = local.map((ot) => (ot.id === id ? { ...ot, status } : ot))
        localStorage.setItem("rama_employee_overtime", JSON.stringify(updated))
      } catch (e) {}

      try {
        await supabase
          .from("employee_overtime")
          .update({ status, approved_at: new Date().toISOString() })
          .eq("id", id)
      } catch (e) {
        console.warn("Supabase overtime status notice:", e)
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`Overtime marked as ${vars.status}`)
      qc.invalidateQueries({ queryKey: ["employee-overtime"] })
    },
  })

  // Delete Overtime
  const deleteOvertimeMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const local = JSON.parse(localStorage.getItem("rama_employee_overtime") || "[]")
        localStorage.setItem("rama_employee_overtime", JSON.stringify(local.filter((ot) => ot.id !== id)))
      } catch (e) {}

      try {
        await supabase.from("employee_overtime").delete().eq("id", id)
      } catch (e) {
        console.warn("Supabase overtime delete notice:", e)
      }
    },
    onSuccess: () => {
      toast.success("Overtime record deleted")
      qc.invalidateQueries({ queryKey: ["employee-overtime"] })
    },
  })

  // Save Overtime Rules / Settings
  const saveRulesMutation = useMutation({
    mutationFn: async (settings) => {
      localStorage.setItem("rama_payroll_settings", JSON.stringify(settings))
      try {
        await supabase
          .from("payroll_settings")
          .upsert({ ...settings, updated_at: new Date().toISOString() })
      } catch (err) {
        console.warn("Supabase payroll settings notice:", err)
      }
    },
    onSuccess: () => {
      toast.success("Overtime rules and payroll settings saved!")
      qc.invalidateQueries({ queryKey: ["payroll-settings"] })
    },
  })

  // Helper to open Edit Salary
  const handleEditSalary = (payment) => {
    setEditingPayment(payment)
    setSalaryForm({
      employee_id: payment.employee_id,
      year: payment.year,
      month: payment.month,
      payment_date: payment.payment_date || new Date().toISOString().slice(0, 10),
      pay_period_start: payment.pay_period_start || "",
      pay_period_end: payment.pay_period_end || "",
      basic_salary: payment.basic_salary,
      overtime_amount: payment.overtime_amount,
      overtime_hours_normal: payment.overtime_hours_normal || 0,
      overtime_hours_night: payment.overtime_hours_night || 0,
      overtime_hours_weekend: payment.overtime_hours_weekend || 0,
      overtime_hours_holiday: payment.overtime_hours_holiday || 0,
      commission_amount: payment.commission_amount,
      transport_allowance: payment.transport_allowance || 0,
      housing_allowance: payment.housing_allowance || 0,
      meal_allowance: payment.meal_allowance || 0,
      other_allowances: payment.other_allowances || 0,
      bonus: payment.bonus || 0,
      tax_deduction: payment.tax_deduction || 0,
      pension_deduction: payment.pension_deduction || 0,
      loan_deduction: payment.loan_deduction || 0,
      other_deductions: payment.other_deductions || 0,
      payment_method: payment.payment_method || "bank_transfer",
      payment_status: payment.payment_status || "paid",
      paid_date: payment.paid_date || new Date().toISOString().slice(0, 10),
      reference_number: payment.reference_number || "",
      notes: payment.notes || "",
    })
    setSalaryDialogOpen(true)
  }

  // Helper to open Edit Commission
  const handleEditCommission = (comm) => {
    setEditingCommission(comm)
    setCommissionForm({
      employee_id: comm.employee_id,
      title: comm.title,
      deal_amount: comm.deal_amount || "",
      commission_rate: comm.commission_rate || "",
      commission_amount: comm.commission_amount || "",
      earned_date: comm.earned_date || new Date().toISOString().slice(0, 10),
      status: comm.status || "approved",
      notes: comm.notes || "",
    })
    setCommissionDialogOpen(true)
  }

  // Overtime Form dynamic calculation when typing
  const handleOvertimeEmployeeOrTypeChange = (newEmpId, newType, newHours) => {
    const empId = newEmpId !== undefined ? newEmpId : overtimeForm.employee_id
    const type = newType !== undefined ? newType : overtimeForm.overtime_type
    const hours = newHours !== undefined ? newHours : overtimeForm.hours

    const emp = employees.find((e) => e.id === empId)
    const basic = Number(emp?.salary) || 0
    const hourlyRate = calculateHourlyRate(basic, rulesSettings.standard_monthly_hours)

    let mult = rulesSettings.normal_overtime_rate
    if (type === "night") mult = rulesSettings.night_overtime_rate
    else if (type === "weekend") mult = rulesSettings.weekend_overtime_rate
    else if (type === "holiday") mult = rulesSettings.holiday_overtime_rate

    const calcAmount = calculateOvertimePay(hours, hourlyRate, mult)

    setOvertimeForm((prev) => ({
      ...prev,
      employee_id: empId,
      overtime_type: type,
      hours: hours,
      hourly_rate: hourlyRate,
      multiplier: mult,
      calculated_amount: calcAmount,
    }))
  }

  // Helper to reset all filters
  const handleResetFilters = () => {
    setEmployeeFilter("all")
    setYearFilter("all")
    setMonthFilter("all")
    setStatusFilter("all")
    setSearchQuery("")
    toast.info("All filters cleared. Showing all payment records.")
  }

  const isFilterActive =
    employeeFilter !== "all" ||
    yearFilter !== "all" ||
    monthFilter !== "all" ||
    statusFilter !== "all" ||
    searchQuery.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="size-6 text-indigo-600 dark:text-indigo-400" />
            Salary & Payroll Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create salary payments, track Paid/Unpaid/Pending statuses, manage commissions, and configure legal overtime rules.
          </p>
        </div>

        {/* Global Action Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "salaries" && (
            <Button
              onClick={() => {
                setEditingPayment(null)
                setSalaryForm({
                  ...initialSalaryForm,
                  reference_number: getNextPaymentReference(salaryPayments),
                })
                setSalaryDialogOpen(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
            >
              <Plus className="mr-1.5 size-4" />
              New Salary Payment
            </Button>
          )}

          {activeTab === "commissions" && (
            <Button
              onClick={() => {
                setEditingCommission(null)
                setCommissionForm(initialCommissionForm)
                setCommissionDialogOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
            >
              <Plus className="mr-1.5 size-4" />
              Register Commission
            </Button>
          )}

          {activeTab === "overtime" && (
            <Button
              onClick={() => {
                setOvertimeForm(initialOvertimeForm)
                setOvertimeDialogOpen(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
            >
              <Plus className="mr-1.5 size-4" />
              Record Overtime
            </Button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <TabsTrigger value="salaries" className="rounded-lg">
            <Coins className="mr-2 size-4" />
            Salary Payments ({salaryPayments.length})
          </TabsTrigger>
          <TabsTrigger value="commissions" className="rounded-lg">
            <Award className="mr-2 size-4" />
            Commissions ({commissions.length})
          </TabsTrigger>
          <TabsTrigger value="overtime" className="rounded-lg">
            <Clock className="mr-2 size-4" />
            Overtime ({overtimeRecords.length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg">
            <Settings className="mr-2 size-4" />
            Overtime Rules & Calculator
          </TabsTrigger>
        </TabsList>

        {/* ========================================================
            TAB 1: SALARY PAYMENTS & LISTING
        ======================================================== */}
        <TabsContent value="salaries" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm">
                <span>Total Payroll Listed</span>
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Coins className="size-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(kpiStats.totalPayroll, rulesSettings.currency)}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Across {kpiStats.totalRecords} salary payment records
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-sm">
                <span>Total Settled (PAID)</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(kpiStats.totalPaid, rulesSettings.currency)}
                </span>
                <p className="text-xs text-emerald-600/80 mt-1">
                  {kpiStats.paidCount} paid vouchers
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-rose-200 dark:border-rose-800/50 shadow-xs">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-sm">
                <span>Total UNPAID / PENDING</span>
                <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="size-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(kpiStats.totalUnpaid, rulesSettings.currency)}
                </span>
                <p className="text-xs text-rose-600/80 mt-1">
                  {kpiStats.unpaidCount} payments awaiting settlement
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm">
                <span>Payment Settlement Rate</span>
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {kpiStats.totalRecords > 0
                    ? `${Math.round((kpiStats.paidCount / kpiStats.totalRecords) * 100)}%`
                    : "0%"}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {kpiStats.paidCount} of {kpiStats.totalRecords} marked as paid
                </p>
              </div>
            </div>
          </div>

          {/* Quick Pay from Employee Directory Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl p-4 border border-indigo-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                <Users className="size-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Quick Pay From Employee Directory
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Choose any staff member from your employee directory to instantly prepare their salary payment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={employeeFilter === "all" ? "" : employeeFilter}
                onValueChange={(val) => {
                  setEmployeeFilter(val)
                  handleQuickPayFromDirectory(val)
                }}
              >
                <SelectTrigger className="w-[240px] bg-white dark:bg-slate-800 h-9 text-xs">
                  <SelectValue placeholder="⚡ Select Employee to Pay..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id || "No ID"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters Bar: Choose Employee Directory, Year, Month, Status, Search */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Search name, ID, department, TXN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Choose from Employee Directory Filter */}
              <div className="w-[200px]">
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <Users className="mr-1.5 size-3.5 text-indigo-500" />
                    <SelectValue placeholder="Employee Directory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id || "Staff"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Select */}
              <div className="w-[110px]">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                      <SelectItem key={yr} value={yr.toString()}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Select */}
              <div className="w-[125px]">
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Select */}
              <div className="w-[130px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">✅ Paid</SelectItem>
                    <SelectItem value="unpaid">❌ Unpaid</SelectItem>
                    <SelectItem value="pending">⏳ Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters */}
              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  title="Reset all filters"
                >
                  <RotateCcw className="mr-1 size-3.5" />
                  Reset
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Showing <strong>{filteredSalaryPayments.length}</strong> of{" "}
                <strong>{salaryPayments.length}</strong> total payments
              </span>
              {isFilterActive && (
                <span className="text-amber-600 font-medium">
                  Filters active (click Reset to see all)
                </span>
              )}
            </div>
          </div>

          {/* Salary Payments Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-600 dark:text-slate-400">
                  <TableRow>
                    <TableHead className="min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-center">Year</TableHead>
                    <TableHead className="text-center">Month</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Overtime</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Gross Total</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right font-black text-indigo-700 dark:text-indigo-400">
                      Net Payable
                    </TableHead>
                    <TableHead className="text-center min-w-[130px]">Status (Click to Change)</TableHead>
                    <TableHead className="text-right min-w-[110px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-36 text-center text-slate-500">
                        <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading salary payments...
                      </TableCell>
                    </TableRow>
                  ) : filteredSalaryPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-44 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                          <Coins className="size-10 stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {isFilterActive
                              ? "No payment records match the selected filters."
                              : "No salary payment records found yet."}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            {isFilterActive
                              ? "Try clearing filters to see all payments."
                              : "Click 'New Salary Payment' above or choose an employee from the directory to prepare a salary voucher."}
                          </p>
                          {isFilterActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleResetFilters}
                              className="mt-3 text-xs"
                            >
                              <RotateCcw className="mr-1.5 size-3.5" /> Show All Payments
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSalaryPayments.map((p) => {
                      const empName = `${p.employee?.first_name || ""} ${p.employee?.last_name || ""}`.trim() || "Employee"
                      const monthObj = MONTHS.find((m) => m.value === Number(p.month))
                      const isPaid = p.payment_status === "paid"
                      const isPending = p.payment_status === "pending"

                      const allowancesTotal =
                        Number(p.transport_allowance || 0) +
                        Number(p.housing_allowance || 0) +
                        Number(p.meal_allowance || 0) +
                        Number(p.other_allowances || 0) +
                        Number(p.bonus || 0)

                      return (
                        <TableRow key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                          {/* Employee */}
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8 rounded-lg border border-slate-200 dark:border-slate-700">
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs">
                                  {empName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white leading-tight text-xs">
                                  {empName}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {p.employee?.employee_id || "EMP"} • {p.employee?.department || "Staff"}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Year */}
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[11px] font-mono font-bold">
                              {p.year}
                            </Badge>
                          </TableCell>

                          {/* Month */}
                          <TableCell className="text-center">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                              {monthObj?.name || `M${p.month}`}
                            </span>
                          </TableCell>

                          {/* Payment Date */}
                          <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                            {p.payment_date || "N/A"}
                          </TableCell>

                          {/* Basic Salary */}
                          <TableCell className="text-right text-xs font-mono">
                            {formatCurrency(p.basic_salary, rulesSettings.currency)}
                          </TableCell>

                          {/* Overtime */}
                          <TableCell className="text-right text-xs font-mono">
                            {Number(p.overtime_amount) > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                +{formatCurrency(p.overtime_amount, rulesSettings.currency)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>

                          {/* Commission */}
                          <TableCell className="text-right text-xs font-mono">
                            {Number(p.commission_amount) > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                +{formatCurrency(p.commission_amount, rulesSettings.currency)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>

                          {/* Allowances */}
                          <TableCell className="text-right text-xs font-mono">
                            {allowancesTotal > 0 ? (
                              <span className="text-slate-700 dark:text-slate-300">
                                +{formatCurrency(allowancesTotal, rulesSettings.currency)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>

                          {/* Gross Total */}
                          <TableCell className="text-right text-xs font-mono font-medium text-slate-900 dark:text-white">
                            {formatCurrency(p.gross_salary, rulesSettings.currency)}
                          </TableCell>

                          {/* Deductions */}
                          <TableCell className="text-right text-xs font-mono text-rose-600 dark:text-rose-400">
                            -{formatCurrency(p.total_deductions, rulesSettings.currency)}
                          </TableCell>

                          {/* Net Payable */}
                          <TableCell className="text-right font-mono font-black text-xs text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                            {formatCurrency(p.net_salary, rulesSettings.currency)}
                          </TableCell>

                          {/* Interactive Status Changer (Paid, Unpaid, Pending) */}
                          <TableCell className="text-center">
                            <Select
                              value={p.payment_status || "paid"}
                              onValueChange={(newStatus) =>
                                changePaymentStatusMutation.mutate({ paymentId: p.id, newStatus })
                              }
                            >
                              <SelectTrigger
                                className={`h-7 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                                  isPaid
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                                    : isPending
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                                }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="paid">
                                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="size-3.5" /> PAID
                                  </span>
                                </SelectItem>
                                <SelectItem value="unpaid">
                                  <span className="text-rose-600 font-bold flex items-center gap-1.5">
                                    <AlertCircle className="size-3.5" /> UNPAID
                                  </span>
                                </SelectItem>
                                <SelectItem value="pending">
                                  <span className="text-amber-600 font-bold flex items-center gap-1.5">
                                    <Clock className="size-3.5" /> PENDING
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Payslip */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-slate-600 hover:text-indigo-600 dark:text-slate-300"
                                title="View Payslip Voucher"
                                onClick={() => {
                                  setSelectedPaymentForPayslip(p)
                                  setPayslipModalOpen(true)
                                }}
                              >
                                <Printer className="size-3.5" />
                              </Button>

                              {/* Official Verification Page */}
                              <a
                                href={`/#/verify?id=${encodeURIComponent(p.id || "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center size-7 rounded-md text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-300 transition-colors"
                                title="Open Official Verification Page for this Payment Letter"
                              >
                                <ShieldCheck className="size-3.5" />
                              </a>

                              {/* Download PDF */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-slate-600 hover:text-indigo-600 dark:text-slate-300"
                                title="Download Official PDF Slip"
                                onClick={() => {
                                  generatePayslipPDF({
                                    payment: p,
                                    employee: p.employee,
                                    companySettings: rulesSettings,
                                  })
                                }}
                              >
                                <Download className="size-3.5" />
                              </Button>

                              {/* Edit */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-slate-600 hover:text-slate-900 dark:text-slate-300"
                                title="Edit Record"
                                onClick={() => handleEditSalary(p)}
                              >
                                <Edit className="size-3.5" />
                              </Button>

                              {/* Delete */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                title="Delete Record"
                                onClick={() => {
                                  if (confirm("Delete this salary payment record?")) {
                                    deleteSalaryMutation.mutate(p.id)
                                  }
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================
            TAB 2: COMMISSION REGISTRATION & MANAGEMENT
        ======================================================== */}
        <TabsContent value="commissions" className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Commissions Value</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(
                  commissions.reduce((acc, c) => acc + (Number(c.commission_amount) || 0), 0),
                  rulesSettings.currency
                )}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Approved & Payable</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(
                  commissions
                    .filter((c) => c.status === "approved")
                    .reduce((acc, c) => acc + (Number(c.commission_amount) || 0), 0),
                  rulesSettings.currency
                )}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-amber-200 dark:border-amber-800">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Approval</span>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {commissions.filter((c) => c.status === "pending").length} deals
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Registered</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {commissions.length} items
              </p>
            </div>
          </div>

          {/* Commissions Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Registered Employee Commissions</h3>
                <p className="text-xs text-slate-500">
                  Approved commissions can be auto-imported directly into the employee's monthly salary slip.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCommission(null)
                  setCommissionForm(initialCommissionForm)
                  setCommissionDialogOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Plus className="mr-1.5 size-3.5" /> Register Commission
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Project / Deal Title</TableHead>
                    <TableHead className="text-right">Deal Amount</TableHead>
                    <TableHead className="text-right">Rate %</TableHead>
                    <TableHead className="text-right font-semibold">Commission</TableHead>
                    <TableHead>Earned Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-emerald-500" />
                        Loading commissions...
                      </TableCell>
                    </TableRow>
                  ) : commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-36 text-center text-slate-500">
                        No commissions registered yet. Click "Register Commission" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    commissions.map((c) => {
                      const empName = `${c.employee?.first_name || ""} ${c.employee?.last_name || ""}`.trim() || "Employee"
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <p className="font-medium text-slate-900 dark:text-white">{empName}</p>
                            <p className="text-xs text-slate-500">{c.employee?.employee_id}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{c.title}</p>
                            {c.notes && <p className="text-xs text-slate-500 truncate max-w-xs">{c.notes}</p>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {Number(c.deal_amount) > 0 ? formatCurrency(c.deal_amount, rulesSettings.currency) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {Number(c.commission_rate) > 0 ? `${c.commission_rate}%` : "Fixed"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(c.commission_amount, rulesSettings.currency)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                            {c.earned_date}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[11px] capitalize ${
                                c.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : c.status === "paid"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : c.status === "rejected"
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                              }`}
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {c.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                                    onClick={() =>
                                      updateCommissionStatusMutation.mutate({ id: c.id, status: "approved" })
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
                                    onClick={() =>
                                      updateCommissionStatusMutation.mutate({ id: c.id, status: "rejected" })
                                    }
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => handleEditCommission(c)}
                              >
                                <Edit className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-rose-500"
                                onClick={() => {
                                  if (confirm("Delete this commission?")) {
                                    deleteCommissionMutation.mutate(c.id)
                                  }
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================
            TAB 3: OVERTIME CALCULATION & REGISTRATION
        ======================================================== */}
        <TabsContent value="overtime" className="space-y-6">
          {/* Overtime Rules Multiplier Quick Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OVERTIME_TYPES.map((otType) => {
              let rate = rulesSettings.normal_overtime_rate
              if (otType.value === "night") rate = rulesSettings.night_overtime_rate
              if (otType.value === "weekend") rate = rulesSettings.weekend_overtime_rate
              if (otType.value === "holiday") rate = rulesSettings.holiday_overtime_rate

              return (
                <div
                  key={otType.value}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {otType.label}
                    </span>
                    <Badge className={otType.badgeColor}>{rate}x Rate</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{otType.description}</p>
                </div>
              )
            })}
          </div>

          {/* Overtime Records Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Logged Overtime Hours</h3>
                <p className="text-xs text-slate-500">
                  Hours calculated based on Employee Basic Salary / {rulesSettings.standard_monthly_hours}h standard base.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setOvertimeForm(initialOvertimeForm)
                  setOvertimeDialogOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Plus className="mr-1.5 size-3.5" /> Record Overtime
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Overtime Type</TableHead>
                    <TableHead className="text-right">Hours Worked</TableHead>
                    <TableHead className="text-right">Hourly Rate</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead className="text-right font-semibold">Calculated Pay</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimeLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading overtime records...
                      </TableCell>
                    </TableRow>
                  ) : overtimeRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-36 text-center text-slate-500">
                        No overtime entries recorded yet. Click "Record Overtime" to register hours worked.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overtimeRecords.map((ot) => {
                      const empName = `${ot.employee?.first_name || ""} ${ot.employee?.last_name || ""}`.trim() || "Employee"
                      const meta = getOvertimeTypeMeta(ot.overtime_type)

                      return (
                        <TableRow key={ot.id}>
                          <TableCell>
                            <p className="font-medium text-slate-900 dark:text-white">{empName}</p>
                            <p className="text-xs text-slate-500">{ot.employee?.employee_id}</p>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                            {ot.date}
                          </TableCell>
                          <TableCell>
                            <Badge className={meta.badgeColor}>
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                            {ot.hours} hrs
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatCurrency(ot.hourly_rate, rulesSettings.currency)}/hr
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-indigo-600">
                            {ot.multiplier}x
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                            {formatCurrency(ot.calculated_amount, rulesSettings.currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[11px] capitalize ${
                                ot.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : ot.status === "paid"
                                  ? "bg-blue-100 text-blue-800"
                                  : ot.status === "rejected"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {ot.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {ot.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                                  onClick={() =>
                                    updateOvertimeStatusMutation.mutate({ id: ot.id, status: "approved" })
                                  }
                                >
                                  Approve
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-rose-500"
                                onClick={() => {
                                  if (confirm("Delete this overtime record?")) {
                                    deleteOvertimeMutation.mutate(ot.id)
                                  }
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================
            TAB 4: OVERTIME RULES & PAYROLL SETTINGS & SANDBOX
        ======================================================== */}
        <TabsContent value="rules" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rules Configuration Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="size-5 text-indigo-600" />
                  Overtime Multiplier Rules
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure legal overtime rates for normal day, night shift, weekend rest days, and gazetted public holidays.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Normal Overtime Rate */}
                <div className="space-y-2">
                  <Label htmlFor="normal_rate" className="flex items-center gap-1.5 text-xs font-semibold">
                    <Sun className="size-3.5 text-amber-500" />
                    Normal / Day Overtime Multiplier
                  </Label>
                  <div className="relative">
                    <Input
                      id="normal_rate"
                      type="number"
                      step="0.05"
                      value={rulesSettings.normal_overtime_rate}
                      onChange={(e) =>
                        setRulesSettings({ ...rulesSettings, normal_overtime_rate: parseFloat(e.target.value) || 1.5 })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      x
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Regular daytime overtime (Standard: 1.5x)</p>
                </div>

                {/* Night Overtime Rate */}
                <div className="space-y-2">
                  <Label htmlFor="night_rate" className="flex items-center gap-1.5 text-xs font-semibold">
                    <Moon className="size-3.5 text-indigo-500" />
                    Night Shift Overtime Multiplier
                  </Label>
                  <div className="relative">
                    <Input
                      id="night_rate"
                      type="number"
                      step="0.05"
                      value={rulesSettings.night_overtime_rate}
                      onChange={(e) =>
                        setRulesSettings({ ...rulesSettings, night_overtime_rate: parseFloat(e.target.value) || 1.75 })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      x
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">10:00 PM to 6:00 AM (Standard: 1.75x)</p>
                </div>

                {/* Weekend Overtime Rate */}
                <div className="space-y-2">
                  <Label htmlFor="weekend_rate" className="flex items-center gap-1.5 text-xs font-semibold">
                    <Calendar className="size-3.5 text-purple-500" />
                    Weekend / Rest Day Multiplier
                  </Label>
                  <div className="relative">
                    <Input
                      id="weekend_rate"
                      type="number"
                      step="0.05"
                      value={rulesSettings.weekend_overtime_rate}
                      onChange={(e) =>
                        setRulesSettings({ ...rulesSettings, weekend_overtime_rate: parseFloat(e.target.value) || 2.0 })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      x
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Weekly rest day work (Standard: 2.0x)</p>
                </div>

                {/* Holiday Overtime Rate */}
                <div className="space-y-2">
                  <Label htmlFor="holiday_rate" className="flex items-center gap-1.5 text-xs font-semibold">
                    <Sparkles className="size-3.5 text-amber-500" />
                    Public Holiday Multiplier
                  </Label>
                  <div className="relative">
                    <Input
                      id="holiday_rate"
                      type="number"
                      step="0.05"
                      value={rulesSettings.holiday_overtime_rate}
                      onChange={(e) =>
                        setRulesSettings({ ...rulesSettings, holiday_overtime_rate: parseFloat(e.target.value) || 2.5 })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      x
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Official national holidays (Standard: 2.5x)</p>
                </div>
              </div>

              {/* Working Hours & Currency Settings */}
              <div className="border-t pt-4 border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Standard Monthly Hours</Label>
                  <Input
                    type="number"
                    value={rulesSettings.standard_monthly_hours}
                    onChange={(e) =>
                      setRulesSettings({
                        ...rulesSettings,
                        standard_monthly_hours: parseFloat(e.target.value) || 208,
                      })
                    }
                  />
                  <p className="text-[11px] text-slate-400">26 days * 8h = 208h</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Standard Daily Hours</Label>
                  <Input
                    type="number"
                    value={rulesSettings.standard_daily_hours}
                    onChange={(e) =>
                      setRulesSettings({
                        ...rulesSettings,
                        standard_daily_hours: parseFloat(e.target.value) || 8,
                      })
                    }
                  />
                  <p className="text-[11px] text-slate-400">Normally 8 hours/day</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Currency</Label>
                  <Input
                    value={rulesSettings.currency}
                    onChange={(e) => setRulesSettings({ ...rulesSettings, currency: e.target.value || "ETB" })}
                  />
                  <p className="text-[11px] text-slate-400">ETB / USD / etc.</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => saveRulesMutation.mutate(rulesSettings)}
                  disabled={saveRulesMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  <Check className="mr-1.5 size-4" /> Save Overtime Rules
                </Button>
              </div>
            </div>

            {/* Live Interactive Overtime Calculation Simulator */}
            <div className="bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-indigo-100 dark:border-slate-700 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent className="size-5 text-indigo-600" />
                  Live Overtime Simulator & Calculator
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Test your overtime rules on sample salary and hours to preview exact compensation payouts.
                </p>
              </div>

              {/* Input Salary */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Test Employee Basic Salary (Monthly)</Label>
                <Input
                  type="number"
                  value={calculatorState.salary}
                  onChange={(e) =>
                    setCalculatorState({ ...calculatorState, salary: parseFloat(e.target.value) || 0 })
                  }
                  className="font-mono text-base font-bold"
                />
                <p className="text-xs text-slate-500">
                  Computed Standard Hourly Rate:{" "}
                  <span className="font-bold font-mono text-indigo-600">
                    {formatCurrency(
                      calculateHourlyRate(calculatorState.salary, rulesSettings.standard_monthly_hours),
                      rulesSettings.currency
                    )}
                    /hour
                  </span>
                </p>
              </div>

              {/* Overtime Hours Inputs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px]">Normal Overtime ({rulesSettings.normal_overtime_rate}x)</Label>
                  <Input
                    type="number"
                    value={calculatorState.normalHours}
                    onChange={(e) =>
                      setCalculatorState({ ...calculatorState, normalHours: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Hours"
                  />
                </div>

                <div>
                  <Label className="text-[11px]">Night Overtime ({rulesSettings.night_overtime_rate}x)</Label>
                  <Input
                    type="number"
                    value={calculatorState.nightHours}
                    onChange={(e) =>
                      setCalculatorState({ ...calculatorState, nightHours: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Hours"
                  />
                </div>

                <div>
                  <Label className="text-[11px]">Weekend Overtime ({rulesSettings.weekend_overtime_rate}x)</Label>
                  <Input
                    type="number"
                    value={calculatorState.weekendHours}
                    onChange={(e) =>
                      setCalculatorState({ ...calculatorState, weekendHours: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Hours"
                  />
                </div>

                <div>
                  <Label className="text-[11px]">Holiday Overtime ({rulesSettings.holiday_overtime_rate}x)</Label>
                  <Input
                    type="number"
                    value={calculatorState.holidayHours}
                    onChange={(e) =>
                      setCalculatorState({ ...calculatorState, holidayHours: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Hours"
                  />
                </div>
              </div>

              {/* Simulation Result Box */}
              {(() => {
                const hourlyRate = calculateHourlyRate(calculatorState.salary, rulesSettings.standard_monthly_hours)
                const normPay = calculateOvertimePay(
                  calculatorState.normalHours,
                  hourlyRate,
                  rulesSettings.normal_overtime_rate
                )
                const nightPay = calculateOvertimePay(
                  calculatorState.nightHours,
                  hourlyRate,
                  rulesSettings.night_overtime_rate
                )
                const weekPay = calculateOvertimePay(
                  calculatorState.weekendHours,
                  hourlyRate,
                  rulesSettings.weekend_overtime_rate
                )
                const holPay = calculateOvertimePay(
                  calculatorState.holidayHours,
                  hourlyRate,
                  rulesSettings.holiday_overtime_rate
                )
                const totalOtPay = normPay + nightPay + weekPay + holPay
                const totalHours =
                  calculatorState.normalHours +
                  calculatorState.nightHours +
                  calculatorState.weekendHours +
                  calculatorState.holidayHours

                return (
                  <div className="bg-indigo-600 text-white rounded-xl p-4 space-y-3 shadow-md">
                    <div className="flex items-center justify-between text-indigo-100 text-xs">
                      <span>Total Overtime Calculated</span>
                      <span className="font-semibold">{totalHours} Hours Total</span>
                    </div>

                    <div className="text-2xl font-black font-mono">
                      {formatCurrency(totalOtPay, rulesSettings.currency)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-indigo-400/40 text-indigo-100">
                      <div>Normal: {formatCurrency(normPay, rulesSettings.currency)}</div>
                      <div>Night: {formatCurrency(nightPay, rulesSettings.currency)}</div>
                      <div>Weekend: {formatCurrency(weekPay, rulesSettings.currency)}</div>
                      <div>Holiday: {formatCurrency(holPay, rulesSettings.currency)}</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================
          DIALOG: NEW / EDIT SALARY PAYMENT FORM
      ======================================================== */}
      <Dialog open={salaryDialogOpen} onOpenChange={(open) => {
        setSalaryDialogOpen(open)
        if (open && !editingPayment) {
          setSalaryForm((prev) => ({
            ...prev,
            reference_number: prev.reference_number?.startsWith("RAMA-")
              ? prev.reference_number
              : getNextPaymentReference(salaryPayments),
          }))
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="size-5 text-indigo-600" />
              {editingPayment ? "Edit Salary Payment Record" : "Prepare Employee Salary Payment"}
            </DialogTitle>
            <DialogDescription>
              Specify period, earnings, overtime, commissions, and deductions. Set status as Paid, Unpaid, or Pending.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Row 1: Employee, Year, Month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Employee *</Label>
                <Select
                  value={salaryForm.employee_id}
                  onValueChange={handleEmployeeSelectForSalary}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id || "No ID"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Year *</Label>
                <Select
                  value={salaryForm.year.toString()}
                  onValueChange={(val) => setSalaryForm({ ...salaryForm, year: parseInt(val, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                      <SelectItem key={yr} value={yr.toString()}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Month *</Label>
                <Select
                  value={salaryForm.month.toString()}
                  onValueChange={(val) => setSalaryForm({ ...salaryForm, month: parseInt(val, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 1.5: Payment Date and Pay Period Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Date *</Label>
                <Input
                  type="date"
                  value={salaryForm.payment_date}
                  onChange={(e) => setSalaryForm({ ...salaryForm, payment_date: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Period Start Date</Label>
                <Input
                  type="date"
                  value={salaryForm.pay_period_start}
                  onChange={(e) => setSalaryForm({ ...salaryForm, pay_period_start: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Period End Date</Label>
                <Input
                  type="date"
                  value={salaryForm.pay_period_end}
                  onChange={(e) => setSalaryForm({ ...salaryForm, pay_period_end: e.target.value })}
                />
              </div>
            </div>

            {/* Quick Auto-Import helper button */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Sync Hours & Commissions:</span>{" "}
                Automatically pull approved overtime hours and commissions for this employee for Month {salaryForm.month}/{salaryForm.year}.
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAutoFetchOvertimeAndCommissions}
                className="text-xs font-medium bg-white dark:bg-slate-800 text-indigo-600 hover:text-indigo-700"
              >
                <Sparkles className="size-3.5 mr-1.5 text-indigo-500" />
                Auto-Import OT & Commissions
              </Button>
            </div>

            {/* Earnings Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-2">
                <DollarSign className="size-4 text-emerald-600" />
                Earnings Breakdown
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Basic / Base Salary (ETB) *</Label>
                  <Input
                    type="number"
                    value={salaryForm.basic_salary}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, basic_salary: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Overtime Amount (ETB)</Label>
                  <Input
                    type="number"
                    value={salaryForm.overtime_amount}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, overtime_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-blue-600 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Commission Amount (ETB)</Label>
                  <Input
                    type="number"
                    value={salaryForm.commission_amount}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, commission_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-emerald-600 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Transport Allowance</Label>
                  <Input
                    type="number"
                    value={salaryForm.transport_allowance}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, transport_allowance: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Housing Allowance</Label>
                  <Input
                    type="number"
                    value={salaryForm.housing_allowance}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, housing_allowance: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Bonus / Incentives</Label>
                  <Input
                    type="number"
                    value={salaryForm.bonus}
                    onChange={(e) => setSalaryForm({ ...salaryForm, bonus: parseFloat(e.target.value) || 0 })}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-2">
                <Percent className="size-4 text-rose-600" />
                Deductions
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Income Tax</Label>
                    <button
                      type="button"
                      onClick={() =>
                        setSalaryForm((prev) => ({
                          ...prev,
                          tax_deduction: estimateIncomeTax(prev.basic_salary),
                        }))
                      }
                      className="text-[10px] text-indigo-600 hover:underline"
                    >
                      Auto-Calc
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={salaryForm.tax_deduction}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, tax_deduction: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Pension ({rulesSettings.pension_employee_rate}%)</Label>
                    <button
                      type="button"
                      onClick={() =>
                        setSalaryForm((prev) => ({
                          ...prev,
                          pension_deduction: Number(
                            (((Number(prev.basic_salary) || 0) * (Number(rulesSettings.pension_employee_rate) || 7)) / 100).toFixed(2)
                          ),
                        }))
                      }
                      className="text-[10px] text-indigo-600 hover:underline"
                    >
                      Auto-Calc
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={salaryForm.pension_deduction}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, pension_deduction: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Loan / Advance</Label>
                  <Input
                    type="number"
                    value={salaryForm.loan_deduction}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, loan_deduction: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Other Deductions</Label>
                  <Input
                    type="number"
                    value={salaryForm.other_deductions}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, other_deductions: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-rose-600"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Total Bar */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400">Gross Earnings</span>
                <p className="font-mono font-semibold text-lg text-emerald-400">
                  {formatCurrency(salaryFormCalculations.gross, rulesSettings.currency)}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-400">Total Deductions</span>
                <p className="font-mono font-semibold text-lg text-rose-400">
                  -{formatCurrency(salaryFormCalculations.totalDeductions, rulesSettings.currency)}
                </p>
              </div>

              <div className="border-l border-slate-700 pl-4">
                <span className="text-xs text-indigo-300 font-semibold uppercase">Net Salary Payable</span>
                <p className="font-mono font-black text-2xl text-white">
                  {formatCurrency(salaryFormCalculations.net, rulesSettings.currency)}
                </p>
              </div>
            </div>

            {/* Payment Status & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Payment Status *</Label>
                <Select
                  value={salaryForm.payment_status}
                  onValueChange={(val) => {
                    setSalaryForm({
                      ...salaryForm,
                      payment_status: val,
                      paid_date: val === "paid" ? new Date().toISOString().slice(0, 10) : salaryForm.paid_date,
                    })
                  }}
                >
                  <SelectTrigger className="font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">
                      <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" /> PAID
                      </span>
                    </SelectItem>
                    <SelectItem value="unpaid">
                      <span className="text-rose-600 font-bold flex items-center gap-1.5">
                        <AlertCircle className="size-3.5" /> UNPAID
                      </span>
                    </SelectItem>
                    <SelectItem value="pending">
                      <span className="text-amber-600 font-bold flex items-center gap-1.5">
                        <Clock className="size-3.5" /> PENDING
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Payment Method</Label>
                <Select
                  value={salaryForm.payment_method}
                  onValueChange={(val) => setSalaryForm({ ...salaryForm, payment_method: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="telebirr">Telebirr</SelectItem>
                    <SelectItem value="cbe_birr">CBE Birr</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Reference / TXN Number</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setSalaryForm((prev) => ({
                        ...prev,
                        reference_number: getNextPaymentReference(salaryPayments),
                      }))
                    }
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    title="Generate auto-incremented reference"
                  >
                    Auto: RAMA-PAY-
                  </button>
                </div>
                <Input
                  value={salaryForm.reference_number}
                  onChange={(e) => setSalaryForm({ ...salaryForm, reference_number: e.target.value })}
                  placeholder="e.g. RAMA-PAY-2026-001"
                  className="font-mono font-semibold text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Remarks / Notes</Label>
              <Textarea
                rows={2}
                value={salaryForm.notes}
                onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                placeholder="Optional payment notes..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSalaryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!salaryForm.employee_id) {
                  toast.error("Please select an employee")
                  return
                }
                saveSalaryMutation.mutate(salaryForm)
              }}
              disabled={saveSalaryMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Check className="mr-1.5 size-4" />
              {editingPayment ? "Update Salary Record" : "Save Salary Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          DIALOG: REGISTER / EDIT COMMISSION
      ======================================================== */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="size-5 text-emerald-600" />
              {editingCommission ? "Edit Commission" : "Register Employee Commission"}
            </DialogTitle>
            <DialogDescription>
              Record sales, client deals, or milestone performance commissions for employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Employee *</Label>
              <Select
                value={commissionForm.employee_id}
                onValueChange={(val) => setCommissionForm({ ...commissionForm, employee_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id || "No ID"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Deal / Project Title *</Label>
              <Input
                value={commissionForm.title}
                onChange={(e) => setCommissionForm({ ...commissionForm, title: e.target.value })}
                placeholder="e.g. ERP System Sale - Client X"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Deal Amount (ETB)</Label>
                <Input
                  type="number"
                  value={commissionForm.deal_amount}
                  onChange={(e) => {
                    const deal = parseFloat(e.target.value) || 0
                    const rate = parseFloat(commissionForm.commission_rate) || 0
                    const comm = rate > 0 ? ((deal * rate) / 100).toFixed(2) : commissionForm.commission_amount
                    setCommissionForm({ ...commissionForm, deal_amount: e.target.value, commission_amount: comm })
                  }}
                  placeholder="e.g. 50000"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Commission Rate (%)</Label>
                <Input
                  type="number"
                  value={commissionForm.commission_rate}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value) || 0
                    const deal = parseFloat(commissionForm.deal_amount) || 0
                    const comm = deal > 0 ? ((deal * rate) / 100).toFixed(2) : commissionForm.commission_amount
                    setCommissionForm({ ...commissionForm, commission_rate: e.target.value, commission_amount: comm })
                  }}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Calculated Commission Pay (ETB) *</Label>
              <Input
                type="number"
                value={commissionForm.commission_amount}
                onChange={(e) => setCommissionForm({ ...commissionForm, commission_amount: e.target.value })}
                className="font-mono font-bold text-emerald-600"
                placeholder="Calculated or fixed amount"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Earned Date</Label>
                <Input
                  type="date"
                  value={commissionForm.earned_date}
                  onChange={(e) => setCommissionForm({ ...commissionForm, earned_date: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={commissionForm.status}
                  onValueChange={(val) => setCommissionForm({ ...commissionForm, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="paid">Paid Out</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes / Details</Label>
              <Textarea
                rows={2}
                value={commissionForm.notes}
                onChange={(e) => setCommissionForm({ ...commissionForm, notes: e.target.value })}
                placeholder="Optional commission reference..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCommissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!commissionForm.employee_id || !commissionForm.title || !commissionForm.commission_amount) {
                  toast.error("Please fill in Employee, Title, and Commission amount")
                  return
                }
                saveCommissionMutation.mutate(commissionForm)
              }}
              disabled={saveCommissionMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Check className="mr-1.5 size-4" />
              {editingCommission ? "Update Commission" : "Save Commission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          DIALOG: RECORD OVERTIME
      ======================================================== */}
      <Dialog open={overtimeDialogOpen} onOpenChange={setOvertimeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-5 text-blue-600" />
              Record Overtime Hours
            </DialogTitle>
            <DialogDescription>
              Select overtime type to automatically apply legal rate multiplier and calculate pay.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Employee *</Label>
              <Select
                value={overtimeForm.employee_id}
                onValueChange={(val) => handleOvertimeEmployeeOrTypeChange(val, undefined, undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (Salary: {formatCurrency(emp.salary || 0, rulesSettings.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date of Overtime *</Label>
                <Input
                  type="date"
                  value={overtimeForm.date}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Hours Worked *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={overtimeForm.hours}
                  onChange={(e) => handleOvertimeEmployeeOrTypeChange(undefined, undefined, e.target.value)}
                  placeholder="e.g. 4.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Overtime Rule Type *</Label>
              <Select
                value={overtimeForm.overtime_type}
                onValueChange={(val) => handleOvertimeEmployeeOrTypeChange(undefined, val, undefined)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OVERTIME_TYPES.map((t) => {
                    let rate = rulesSettings.normal_overtime_rate
                    if (t.value === "night") rate = rulesSettings.night_overtime_rate
                    if (t.value === "weekend") rate = rulesSettings.weekend_overtime_rate
                    if (t.value === "holiday") rate = rulesSettings.holiday_overtime_rate

                    return (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label} ({rate}x)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Live Calculation Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Hourly Base Rate:</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(overtimeForm.hourly_rate, rulesSettings.currency)}/hr
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rule Multiplier:</span>
                <span className="font-mono font-semibold text-indigo-600">
                  {overtimeForm.multiplier}x
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span className="text-slate-800 dark:text-slate-200">Total Overtime Compensation:</span>
                <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                  {formatCurrency(overtimeForm.calculated_amount, rulesSettings.currency)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason / Project Tasks</Label>
              <Textarea
                rows={2}
                value={overtimeForm.notes}
                onChange={(e) => setOvertimeForm({ ...overtimeForm, notes: e.target.value })}
                placeholder="Tasks completed during overtime hours..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOvertimeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!overtimeForm.employee_id || !overtimeForm.hours) {
                  toast.error("Please select an employee and enter hours worked")
                  return
                }
                saveOvertimeMutation.mutate(overtimeForm)
              }}
              disabled={saveOvertimeMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Check className="mr-1.5 size-4" /> Save Overtime
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: OFFICIAL PAYSLIP VIEW & PRINT (WITH LOGO, CHAPA, & SCANNABLE QR)
      ======================================================== */}
      {selectedPaymentForPayslip && (() => {
        const p = selectedPaymentForPayslip
        const emp = p.employee
        const fullName = `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim() || "Employee"
        const monthName = MONTHS.find((m) => m.value === Number(p.month))?.name || `Month ${p.month}`
        const isPaid = p.payment_status === "paid"
        const isPending = p.payment_status === "pending"

        // Direct verification link to this exact salary payment voucher
        const customBase = rulesSettings?.verification_base_url || rulesSettings?.company_website
        const origin =
          typeof window !== "undefined" && window.location.origin && window.location.origin !== "null"
            ? window.location.origin
            : "https://ramaitsolution.com"
        const cleanBase = customBase?.startsWith("http") ? customBase.replace(/\/+$/, "") : origin.replace(/\/+$/, "")
        const qrCodeUrl = `${cleanBase}/#/verify?id=${encodeURIComponent(p.id || "")}`

        return (
          <Dialog open={payslipModalOpen} onOpenChange={setPayslipModalOpen}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
              <div id="printable-payslip" className="space-y-5 bg-white text-slate-900 p-2 sm:p-4 rounded-xl print:p-0">
                {/* 1. Header with Company Logo, Title, and Scannable QR Code */}
                <div className="bg-[#071B3B] text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-700 shadow-sm print:rounded-none">
                  {/* Left: Company Logo + Names */}
                  <div className="flex items-center gap-3.5">
                    <div className="size-16 sm:size-20 rounded-xl bg-white p-2 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                      <img
                        src={defaultLogo}
                        alt="Rama Software Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black tracking-tight uppercase leading-tight text-white">
                        RAMA SOFTWARE & IT SOLUTIONS
                      </h3>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        Official Employee Salary Voucher & Payslip
                      </p>
                      <p className="text-xs text-sky-300 font-semibold mt-1">
                        Period: {monthName} {p.year}
                      </p>
                    </div>
                  </div>

                  {/* Right: Functional Scannable QR Code + Status Stamp */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    {/* Phone Camera Scannable QR Code */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                      <QRCodeSVG
                        value={qrCodeUrl}
                        size={84}
                        level="M"
                        includeMargin={true}
                      />
                      <span className="text-[9px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
                        Scan to Verify
                      </span>
                      <a
                        href={`/#/verify?id=${encodeURIComponent(p.id || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-blue-600 hover:text-blue-800 font-bold underline inline-flex items-center gap-0.5 mt-0.5 print:hidden"
                        title="Open verification page in new tab"
                      >
                        Open Page ↗
                      </a>
                    </div>

                    {/* Status Stamp */}
                    <div>
                      <Badge
                        className={`text-xs px-3 py-1 font-black tracking-wider uppercase shadow-sm ${
                          isPaid
                            ? "bg-emerald-500 text-white"
                            : isPending
                            ? "bg-amber-500 text-white"
                            : "bg-rose-500 text-white"
                        }`}
                      >
                        {p.payment_status?.toUpperCase() || "PAID"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 2. Employee Info & Payment Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-1 text-[11px] uppercase tracking-wider">
                      EMPLOYEE INFORMATION
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm">{fullName}</p>
                    <p className="text-slate-600 mt-0.5">
                      <strong>Employee ID:</strong> {emp?.employee_id || "N/A"}
                    </p>
                    <p className="text-slate-600">
                      <strong>Department:</strong> {emp?.department || "General"}
                    </p>
                    <p className="text-slate-600">
                      <strong>Job Title:</strong> {emp?.job_title || "Staff"}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-slate-400 font-bold block mb-1 text-[11px] uppercase tracking-wider">
                      PAYMENT METADATA
                    </span>
                    <p className="text-slate-700">
                      <strong>Voucher ID:</strong> {p.id?.slice(0, 14) || "VCH-" + p.year}
                    </p>
                    <p className="text-slate-700">
                      <strong>Payment Date:</strong> {p.payment_date || "N/A"}
                    </p>
                    <p className="text-slate-700">
                      <strong>Method:</strong> {p.payment_method?.replace(/_/g, " ").toUpperCase()}
                    </p>
                    <p className="text-slate-700">
                      <strong>Reference / TXN:</strong> {p.reference_number || (isPaid ? "TXN-VERIFIED" : "PENDING")}
                    </p>
                  </div>
                </div>

                {/* 3. Earnings & Deductions Tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Earnings Table */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-white">
                    <h5 className="font-bold border-b pb-1.5 text-emerald-700 flex items-center justify-between">
                      <span>EARNINGS ITEM</span>
                      <span>AMOUNT</span>
                    </h5>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Basic / Contract Salary:</span>
                      <span className="font-mono font-medium">{formatCurrency(p.basic_salary, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Overtime Pay:</span>
                      <span className="font-mono font-medium text-blue-600">+{formatCurrency(p.overtime_amount, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Performance Commissions:</span>
                      <span className="font-mono font-medium text-emerald-600">+{formatCurrency(p.commission_amount, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Transport Allowance:</span>
                      <span className="font-mono">{formatCurrency(p.transport_allowance, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Housing Allowance:</span>
                      <span className="font-mono">{formatCurrency(p.housing_allowance, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Meal & Other Allowances:</span>
                      <span className="font-mono">{formatCurrency(Number(p.meal_allowance || 0) + Number(p.other_allowances || 0), rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Bonus & Incentives:</span>
                      <span className="font-mono">{formatCurrency(p.bonus, rulesSettings.currency)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                      <span>Gross Total Earnings:</span>
                      <span className="font-mono text-emerald-700 font-extrabold">{formatCurrency(p.gross_salary, rulesSettings.currency)}</span>
                    </div>
                  </div>

                  {/* Deductions Table */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-white">
                    <h5 className="font-bold border-b pb-1.5 text-rose-700 flex items-center justify-between">
                      <span>DEDUCTIONS ITEM</span>
                      <span>AMOUNT</span>
                    </h5>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Income Tax:</span>
                      <span className="font-mono font-medium text-rose-600">-{formatCurrency(p.tax_deduction, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Pension Fund (Employee 7%):</span>
                      <span className="font-mono font-medium text-rose-600">-{formatCurrency(p.pension_deduction, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Loan / Salary Advance:</span>
                      <span className="font-mono text-rose-600">-{formatCurrency(p.loan_deduction, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">Other Authorized Deductions:</span>
                      <span className="font-mono text-rose-600">-{formatCurrency(p.other_deductions, rulesSettings.currency)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-transparent select-none">
                      <span>-</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-transparent select-none">
                      <span>-</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-transparent select-none">
                      <span>-</span>
                      <span>-</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                      <span>Total Deductions:</span>
                      <span className="font-mono text-rose-700 font-extrabold">-{formatCurrency(p.total_deductions, rulesSettings.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Net Salary Payable Box */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                      NET SALARY PAYABLE
                    </span>
                    <p className="text-[11px] text-slate-600 italic mt-0.5 font-medium">
                      Amount in words: {numberToWords(p.net_salary)}
                    </p>
                  </div>
                  <div className="text-2xl font-black font-mono text-indigo-700">
                    {formatCurrency(p.net_salary, rulesSettings.currency)}
                  </div>
                </div>

                {/* 5. SIGNATURES & OFFICIAL CHAPA (ማህተም) SECTION */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  {/* 1. Prepared by HR */}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800">Prepared By:</p>
                    <div className="h-9 border-b border-slate-300 border-dashed" />
                    <p className="font-semibold text-slate-900 mt-1">HR & Finance Officer</p>
                    <p className="text-[11px] text-slate-500">Rama Software</p>
                  </div>

                  {/* 2. OFFICIAL CHAPA (COMPANY STAMP / SEAL / ማህተም) PLACEHOLDER */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="size-24 rounded-full border-2 border-dashed border-blue-700 bg-blue-50/50 flex flex-col items-center justify-center p-2 text-blue-800 shadow-xs relative">
                      {/* Inner dashed ring */}
                      <div className="absolute inset-1 rounded-full border border-dotted border-blue-500 pointer-events-none" />
                      <span className="text-[7.5px] font-black uppercase tracking-tight">RAMA SOFTWARE</span>
                      <span className="text-[8px] font-black tracking-widest my-0.5 text-blue-900">★ CHAPA ★</span>
                      <span className="text-[7.5px] font-extrabold uppercase">ማህተም / SEAL</span>
                      <span className="text-[6.5px] text-blue-600 font-medium">OFFICIAL STAMP</span>
                    </div>
                    <span className="text-[8px] font-bold text-blue-700 mt-1 uppercase tracking-wider">
                      Placeholder for Chapa
                    </span>
                  </div>

                  {/* 3. Authorized Signature (General Manager) */}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800">Authorized Signature:</p>
                    <div className="h-9 border-b border-slate-300 border-dashed" />
                    <p className="font-semibold text-slate-900 mt-1">General Manager</p>
                    <p className="text-[11px] text-slate-500">Rama Software</p>
                  </div>

                  {/* 4. Employee Signature & Acknowledgement */}
                  <div className="space-y-1 text-xs sm:text-right">
                    <p className="font-bold text-slate-800">Employee Signature:</p>
                    <div className="h-9 border-b border-slate-300 border-dashed" />
                    <p className="font-semibold text-slate-900 mt-1 truncate">{fullName}</p>
                    <p className="text-[11px] text-slate-500">Received & Signed</p>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="pt-2 text-center text-[10px] text-slate-400">
                  This document is an authenticated salary payment voucher generated by Rama Software & IT Solutions ERP.
                </div>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="print:hidden gap-2 pt-2 flex-wrap sm:flex-nowrap">
                <Button variant="outline" onClick={() => setPayslipModalOpen(false)}>
                  Close
                </Button>

                {/* View Official Verification Page */}
                <a
                  href={`/#/verify?id=${encodeURIComponent(p.id || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <ExternalLink className="mr-1.5 size-4 text-blue-600" /> View Verification Page
                  </Button>
                </a>

                {/* Direct Browser Print Button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    window.print()
                  }}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Printer className="mr-1.5 size-4 text-slate-600" /> Print Payslip
                </Button>

                {/* Download PDF Button */}
                <Button
                  onClick={() => {
                    generatePayslipPDF({
                      payment: p,
                      employee: emp,
                      companySettings: rulesSettings,
                    })
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                >
                  <Download className="mr-1.5 size-4" /> Download Official PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
