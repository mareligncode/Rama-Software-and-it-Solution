import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, User, Calendar, Building, MapPin, Phone, Mail, IdCard, Coins } from "lucide-react"
import { exportToPDF, exportToExcel, generateQRCode } from "@/lib/exportUtils"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [payslipData, setPayslipData] = useState({
    month: new Date().toISOString().slice(0, 7),
    basicSalary: '',
    allowances: '',
    deductions: '',
    bonus: ''
  })

  const { data: employees, isLoading } = useQuery({
    queryKey: ["reports-employees", dateRange],
    queryFn: async () => {
      let query = supabase.from("employees").select("*")
      
      if (dateRange.startDate && dateRange.endDate) {
        query = query.gte('hire_date', dateRange.startDate).lte('hire_date', dateRange.endDate)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  const { data: tasks } = useQuery({
    queryKey: ["reports-tasks", dateRange],
    queryFn: async () => {
      let query = supabase.from("tasks").select("*")
      
      if (dateRange.startDate && dateRange.endDate) {
        query = query.gte('created_at', dateRange.startDate).lte('created_at', dateRange.endDate)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  const { data: projects } = useQuery({
    queryKey: ["reports-projects", dateRange],
    queryFn: async () => {
      let query = supabase.from("projects").select("*")
      
      if (dateRange.startDate && dateRange.endDate) {
        query = query.gte('start_date', dateRange.startDate).lte('start_date', dateRange.endDate)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  // Calculate analytics summary
  const analytics = {
    totalEmployees: employees?.length || 0,
    activeEmployees: employees?.filter(e => e.status === "active").length || 0,
    totalTasks: tasks?.length || 0,
    completedTasks: tasks?.filter(t => t.status === "completed").length || 0,
    inProgressTasks: tasks?.filter(t => t.status === "in_progress").length || 0,
    pendingTasks: tasks?.filter(t => t.status === "pending").length || 0,
    totalProjects: projects?.length || 0,
    activeProjects: projects?.filter(p => p.status === "active").length || 0,
    completedProjects: projects?.filter(p => p.status === "completed").length || 0,
  }

  const handleGenerateReport = (reportType, format = 'pdf') => {
    const reportData = {
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      date: new Date().toLocaleDateString(),
      dateRange: dateRange,
    }

    if (reportType === 'employee') {
      reportData.employees = employees || []
    } else if (reportType === 'task') {
      reportData.tasks = tasks || []
    } else if (reportType === 'project') {
      reportData.projects = projects || []
    } else if (reportType === 'analytics') {
      reportData.analytics = analytics
    }

    if (format === 'pdf') {
      exportToPDF(reportData, `${reportType}-report`)
    } else {
      exportToExcel(reportData, `${reportType}-report`)
    }
  }

  const handleGeneratePayslip = async (employee) => {
    setSelectedEmployee(employee)
    setPayslipDialogOpen(true)
  }

  const handleDownloadPayslip = async () => {
    if (!selectedEmployee) return

    const doc = new jsPDF({ orientation: 'landscape' })
    
    // Company header
    doc.setFillColor(59, 130, 246)
    doc.rect(0, 0, 297, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text('Rama Software & IT Solutions', 148.5, 12, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text('Employee Payslip', 148.5, 20, { align: 'center' })
    
    // Employee info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`Employee: ${selectedEmployee.first_name} ${selectedEmployee.last_name}`, 20, 45)
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Employee ID: ${selectedEmployee.employee_id}`, 20, 52)
    doc.text(`Department: ${selectedEmployee.department || 'N/A'}`, 20, 58)
    doc.text(`Job Title: ${selectedEmployee.job_title || 'N/A'}`, 20, 64)
    doc.text(`Period: ${payslipData.month}`, 20, 70)
    
    // Earnings table
    const earnings = [
      ['Description', 'Amount (ETB)'],
      ['Basic Salary', payslipData.basicSalary || '0'],
      ['Allowances', payslipData.allowances || '0'],
      ['Bonus', payslipData.bonus || '0'],
    ]
    
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Amount (ETB)']],
      body: earnings.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 80 } }
    })
    
    // Deductions table
    const deductions = [
      ['Description', 'Amount (ETB)'],
      ['Deductions', payslipData.deductions || '0'],
    ]
    
    const yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 120
    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount (ETB)']],
      body: deductions.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 80 } }
    })
    
    // Total
    const basic = parseFloat(payslipData.basicSalary) || 0
    const allowances = parseFloat(payslipData.allowances) || 0
    const bonus = parseFloat(payslipData.bonus) || 0
    const deductionsAmount = parseFloat(payslipData.deductions) || 0
    const total = basic + allowances + bonus - deductionsAmount
    
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 40
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.setFillColor(59, 130, 246)
    doc.rect(20, finalY - 8, 200, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text(`Net Salary: ETB ${total.toFixed(2)}`, 30, finalY + 5)
    
    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, 140)
    doc.text('Rama Software & IT Solutions - Confidential', 277, 140, { align: 'right' })
    
    doc.save(`payslip-${selectedEmployee.employee_id}-${payslipData.month}.pdf`)
    setPayslipDialogOpen(false)
  }

  const handleGenerateIDCard = async (employee) => {
    const doc = new jsPDF()
    
    // Card background
    doc.setFillColor(59, 130, 246)
    doc.rect(0, 0, 85.6, 53.98, 'F')
    
    // Company name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text('RAMA SOFTWARE', 42.8, 8, { align: 'center' })
    doc.setFontSize(6)
    doc.text('Employee ID Card', 42.8, 14, { align: 'center' })
    
    // Employee photo placeholder
    doc.setFillColor(255, 255, 255)
    doc.rect(10, 18, 20, 20, 'F')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(5)
    doc.text('Photo', 20, 28, { align: 'center' })
    
    // Employee details
    doc.setFontSize(5)
    doc.text(`Name: ${employee.first_name} ${employee.last_name}`, 35, 22)
    doc.text(`ID: ${employee.employee_id}`, 35, 27)
    doc.text(`Dept: ${employee.department || 'N/A'}`, 35, 32)
    doc.text(`Role: ${employee.job_title || 'N/A'}`, 35, 37)
    
    // Generate QR code
    try {
      const qrData = `EMP:${employee.employee_id}|${employee.first_name} ${employee.last_name}`
      const qrCode = await generateQRCode(qrData)
      if (qrCode) {
        doc.addImage(qrCode, 'PNG', 70, 18, 12, 12)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
    
    doc.save(`idcard-${employee.employee_id}.pdf`)
  }

  if (isLoading) {
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Documents</h2>
          <p className="text-slate-500 dark:text-slate-400">Generate reports, payslips, and ID cards</p>
        </div>
        {/* Custom Date Filter */}
        <div className="flex items-center gap-2">
          <div>
            <Label htmlFor="reportStartDate" className="text-xs">From</Label>
            <Input
              id="reportStartDate"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="h-9 w-36"
            />
          </div>
          <div>
            <Label htmlFor="reportEndDate" className="text-xs">To</Label>
            <Input
              id="reportEndDate"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="h-9 w-36"
            />
          </div>
          {(dateRange.startDate || dateRange.endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
              className="mt-5"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Report Generation Section */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{employees?.length || 0} employees</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleGenerateReport('employee', 'pdf')} className="flex-1">
                <Download className="mr-2 size-4" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleGenerateReport('employee', 'excel')} className="flex-1">
                <Download className="mr-2 size-4" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tasks?.length || 0} tasks</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleGenerateReport('task', 'pdf')} className="flex-1">
                <Download className="mr-2 size-4" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleGenerateReport('task', 'excel')} className="flex-1">
                <Download className="mr-2 size-4" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{projects?.length || 0} projects</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleGenerateReport('project', 'pdf')} className="flex-1">
                <Download className="mr-2 size-4" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleGenerateReport('project', 'excel')} className="flex-1">
                <Download className="mr-2 size-4" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analytics Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">Overview statistics</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleGenerateReport('analytics', 'pdf')} className="flex-1">
                <Download className="mr-2 size-4" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleGenerateReport('analytics', 'excel')} className="flex-1">
                <Download className="mr-2 size-4" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
                <Coins className="size-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Payslips</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Generate payslips</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
                <IdCard className="size-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">ID Cards</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Print ID cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List for Individual Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Individual Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees?.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                    {employee.first_name?.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {employee.employee_id} • {employee.department || 'Unassigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGeneratePayslip(employee)}
                  >
                    <Coins className="mr-2 size-4" /> Payslip
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateIDCard(employee)}
                  >
                    <IdCard className="mr-2 size-4" /> ID Card
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payslip Dialog */}
      <Dialog open={payslipDialogOpen} onOpenChange={setPayslipDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Generate Payslip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {selectedEmployee?.first_name} {selectedEmployee?.last_name}
              </p>
            </div>
            <div>
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={payslipData.month}
                onChange={(e) => setPayslipData({ ...payslipData, month: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                value={payslipData.basicSalary}
                onChange={(e) => setPayslipData({ ...payslipData, basicSalary: e.target.value })}
                placeholder="Enter basic salary"
              />
            </div>
            <div>
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                value={payslipData.allowances}
                onChange={(e) => setPayslipData({ ...payslipData, allowances: e.target.value })}
                placeholder="Enter allowances"
              />
            </div>
            <div>
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                value={payslipData.deductions}
                onChange={(e) => setPayslipData({ ...payslipData, deductions: e.target.value })}
                placeholder="Enter deductions"
              />
            </div>
            <div>
              <Label htmlFor="bonus">Bonus</Label>
              <Input
                id="bonus"
                type="number"
                value={payslipData.bonus}
                onChange={(e) => setPayslipData({ ...payslipData, bonus: e.target.value })}
                placeholder="Enter bonus"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayslipDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownloadPayslip}>
              <Download className="mr-2 size-4" /> Download Payslip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
