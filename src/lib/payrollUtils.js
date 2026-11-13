import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { generateQRCode } from "./exportUtils"

export const MONTHS = [
  { value: 1, name: "January", short: "Jan" },
  { value: 2, name: "February", short: "Feb" },
  { value: 3, name: "March", short: "Mar" },
  { value: 4, name: "April", short: "Apr" },
  { value: 5, name: "May", short: "May" },
  { value: 6, name: "June", short: "Jun" },
  { value: 7, name: "July", short: "Jul" },
  { value: 8, name: "August", short: "Aug" },
  { value: 9, name: "September", short: "Sep" },
  { value: 10, name: "October", short: "Oct" },
  { value: 11, name: "November", short: "Nov" },
  { value: 12, name: "December", short: "Dec" },
]

export const DEFAULT_OVERTIME_RULES = {
  currency: "ETB",
  standard_monthly_hours: 208, // 26 days * 8 hours
  standard_daily_hours: 8,
  normal_overtime_rate: 1.5,   // Daytime overtime (e.g. 6:00 AM - 10:00 PM)
  night_overtime_rate: 1.75,   // Night hours overtime (10:00 PM - 6:00 AM)
  weekend_overtime_rate: 2.0,  // Weekly rest day / weekend overtime
  holiday_overtime_rate: 2.5,  // Public holiday overtime
  pension_employee_rate: 7,    // 7% employee contribution
  pension_employer_rate: 11,   // 11% employer contribution
}

export const OVERTIME_TYPES = [
  {
    value: "normal",
    label: "Normal / Day Overtime",
    description: "Work performed during day hours beyond normal shift",
    defaultMultiplier: 1.5,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  {
    value: "night",
    label: "Night Shift Overtime",
    description: "Work performed during night hours (10:00 PM - 6:00 AM)",
    defaultMultiplier: 1.75,
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  },
  {
    value: "weekend",
    label: "Weekend / Rest Day",
    description: "Work performed on designated weekly rest days",
    defaultMultiplier: 2.0,
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  },
  {
    value: "holiday",
    label: "Public Holiday Overtime",
    description: "Work performed on gazetted public or national holidays",
    defaultMultiplier: 2.5,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
]

export function getOvertimeTypeMeta(type) {
  return OVERTIME_TYPES.find((t) => t.value === type) || OVERTIME_TYPES[0]
}

export function calculateHourlyRate(basicSalary, standardMonthlyHours = 208) {
  const salary = Number(basicSalary) || 0
  const hours = Number(standardMonthlyHours) || 208
  if (hours <= 0) return 0
  return Number((salary / hours).toFixed(2))
}

export function calculateOvertimePay(hours, hourlyRate, multiplier) {
  const h = Number(hours) || 0
  const rate = Number(hourlyRate) || 0
  const mult = Number(multiplier) || 1.5
  return Number((h * rate * mult).toFixed(2))
}

export function calculateCommissionAmount(dealAmount, ratePercent) {
  const deal = Number(dealAmount) || 0
  const rate = Number(ratePercent) || 0
  return Number(((deal * rate) / 100).toFixed(2))
}

export function estimateIncomeTax(taxableIncome) {
  const income = Number(taxableIncome) || 0
  if (income <= 600) return 0
  if (income <= 1650) return Number((income * 0.1 - 60).toFixed(2))
  if (income <= 3200) return Number((income * 0.15 - 142.5).toFixed(2))
  if (income <= 5250) return Number((income * 0.2 - 302.5).toFixed(2))
  if (income <= 7800) return Number((income * 0.25 - 565).toFixed(2))
  if (income <= 10900) return Number((income * 0.3 - 955).toFixed(2))
  return Number((income * 0.35 - 1500).toFixed(2))
}

export function formatCurrency(amount, currency = "ETB") {
  const num = Number(amount) || 0
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function numberToWords(num) {
  if (isNaN(num)) return ""
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ]
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  const parts = Number(num).toFixed(2).split(".")
  let integerPart = parseInt(parts[0], 10)
  const decimalPart = parts[1] || "00"

  if (integerPart === 0) return `Zero Birr and ${decimalPart}/100`

  function convertGroup(n) {
    let str = ""
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred "
      n %= 100
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "") + " "
    } else if (n > 0) {
      str += a[n] + " "
    }
    return str
  }

  let words = ""
  if (integerPart >= 1000000) {
    words += convertGroup(Math.floor(integerPart / 1000000)) + "Million "
    integerPart %= 1000000
  }
  if (integerPart >= 1000) {
    words += convertGroup(Math.floor(integerPart / 1000)) + "Thousand "
    integerPart %= 1000
  }
  if (integerPart > 0) {
    words += convertGroup(integerPart)
  }

  return `${words.trim()} Birr and ${decimalPart}/100`
}

// Convert image to base64 for embedding in PDF
export async function getCompanyLogoBase64() {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext("2d")
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL("image/png"))
        } catch (e) {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = "/logo.png"
    } catch (e) {
      resolve(null)
    }
  })
}

export async function generatePayslipPDF({ payment, employee, companySettings }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const monthName = MONTHS.find((m) => m.value === Number(payment.month))?.name || `Month ${payment.month}`
  const currency = companySettings?.currency || "ETB"

  // 1. Header Bar with Deep Navy Background
  doc.setFillColor(7, 27, 59) // #071B3B
  doc.rect(0, 0, 210, 34, "F")

  // Load and place Company Logo in Header
  const logoBase64 = await getCompanyLogoBase64()
  if (logoBase64) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(14, 5, 24, 24, 2, 2, "F")
    doc.addImage(logoBase64, "PNG", 15, 6, 22, 22)
  }

  // Company Name & Subtitle
  const titleX = logoBase64 ? 43 : 14
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont(undefined, "bold")
  doc.text("RAMA SOFTWARE & IT SOLUTIONS", titleX, 15)

  doc.setFontSize(9)
  doc.setFont(undefined, "normal")
  doc.text("Official Employee Salary Voucher & Payslip", titleX, 22)
  doc.setFontSize(8.5)
  doc.text(`Period: ${monthName} ${payment.year}`, 196, 22, { align: "right" })

  // Status Stamp in Header
  const isPaid = payment.payment_status === "paid"
  const isPending = payment.payment_status === "pending"
  const statusColor = isPaid ? [16, 185, 129] : isPending ? [245, 158, 11] : [225, 29, 72]
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.roundedRect(156, 8, 40, 8, 2, 2, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont(undefined, "bold")
  doc.text(payment.payment_status ? payment.payment_status.toUpperCase() : "PAID", 176, 13.5, { align: "center" })

  // 2. Employee & Voucher Details Box
  doc.setFillColor(248, 250, 252)
  doc.rect(14, 38, 182, 34, "F")
  doc.setDrawColor(226, 232, 240)
  doc.rect(14, 38, 182, 34, "S")

  doc.setTextColor(51, 65, 85)
  doc.setFontSize(9)
  doc.setFont(undefined, "bold")
  doc.text("EMPLOYEE DETAILS", 18, 44)
  doc.text("PAYMENT METADATA", 95, 44)

  doc.setFont(undefined, "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)

  const fullName = `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() || "Employee"
  doc.text(`Name: ${fullName}`, 18, 50)
  doc.text(`Employee ID: ${employee?.employee_id || "N/A"}`, 18, 55)
  doc.text(`Job Title: ${employee?.job_title || "Staff"}`, 18, 60)
  doc.text(`Department: ${employee?.department || "General"}`, 18, 65)

  doc.text(`Voucher ID: ${payment.id?.slice(0, 13) || "VCH-" + payment.year}`, 95, 50)
  doc.text(`Payment Date: ${payment.payment_date || new Date().toISOString().slice(0, 10)}`, 95, 55)
  doc.text(`Payment Method: ${payment.payment_method?.replace(/_/g, " ").toUpperCase() || "BANK TRANSFER"}`, 95, 60)
  doc.text(`Reference No: ${payment.reference_number || (isPaid ? "TXN-VERIFIED" : "PENDING")}`, 95, 65)

  // 3. Functional Scannable QR Code (Opens verification URL when scanned by phone camera)
  const customBase = companySettings?.verification_base_url || companySettings?.company_website
  const origin =
    typeof window !== "undefined" && window.location.origin && window.location.origin !== "null"
      ? window.location.origin
      : "https://ramaitsolution.com"
  const cleanBase = customBase?.startsWith("http") ? customBase.replace(/\/+$/, "") : origin.replace(/\/+$/, "")
  const qrCodeUrl = `${cleanBase}/#/verify?id=${encodeURIComponent(payment.id || "")}`

  try {
    const QRCode = (await import("qrcode")).default
    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
    })
    if (qrDataUrl) {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(163, 39, 31, 32, 2, 2, "F")
      doc.setDrawColor(203, 213, 225)
      doc.roundedRect(163, 39, 31, 32, 2, 2, "S")
      doc.addImage(qrDataUrl, "PNG", 165.5, 40, 26, 26)

      doc.setFontSize(6)
      doc.setTextColor(71, 85, 105)
      doc.setFont(undefined, "bold")
      doc.text("SCAN TO VERIFY", 178.5, 68.5, { align: "center" })
    }
  } catch (err) {
    console.error("Payslip QR code generation error:", err)
  }

  // 4. Earnings and Deductions Table
  const earningsData = [
    ["Basic / Base Salary", formatCurrency(payment.basic_salary, currency)],
    [
      `Overtime Pay (${(Number(payment.overtime_hours_normal || 0) + Number(payment.overtime_hours_night || 0) + Number(payment.overtime_hours_weekend || 0) + Number(payment.overtime_hours_holiday || 0)).toFixed(1)} hrs total)`,
      formatCurrency(payment.overtime_amount, currency),
    ],
    ["Performance Commissions", formatCurrency(payment.commission_amount, currency)],
    ["Transport Allowance", formatCurrency(payment.transport_allowance, currency)],
    ["Housing Allowance", formatCurrency(payment.housing_allowance, currency)],
    ["Meal Allowance", formatCurrency(payment.meal_allowance, currency)],
    ["Other Allowances & Bonuses", formatCurrency(Number(payment.other_allowances || 0) + Number(payment.bonus || 0), currency)],
  ]

  const deductionsData = [
    ["Income Tax", formatCurrency(payment.tax_deduction, currency)],
    ["Pension Fund (Employee 7%)", formatCurrency(payment.pension_deduction, currency)],
    ["Loan / Salary Advance", formatCurrency(payment.loan_deduction, currency)],
    ["Other Authorized Deductions", formatCurrency(payment.other_deductions, currency)],
    ["-", "-"],
    ["-", "-"],
    ["-", "-"],
  ]

  const combinedTableBody = earningsData.map((e, idx) => [
    e[0],
    e[1],
    deductionsData[idx][0],
    deductionsData[idx][1],
  ])

  autoTable(doc, {
    startY: 77,
    head: [["Earnings Item", "Amount", "Deductions Item", "Amount"]],
    body: combinedTableBody,
    theme: "striped",
    headStyles: {
      fillColor: [7, 27, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.7,
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 36, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 55 },
      3: { cellWidth: 36, halign: "right", fontStyle: "bold" },
    },
  })

  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 155

  // Summary Totals Table
  autoTable(doc, {
    startY: finalY + 2,
    body: [
      [
        "Gross Total Earnings",
        formatCurrency(payment.gross_salary, currency),
        "Total Deductions",
        formatCurrency(payment.total_deductions, currency),
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: 9,
      fontStyle: "bold",
      fillColor: [241, 245, 249],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 36, halign: "right" },
      2: { cellWidth: 55 },
      3: { cellWidth: 36, halign: "right" },
    },
  })

  finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : finalY + 18

  // 5. Net Payable Box
  doc.setFillColor(239, 246, 255)
  doc.roundedRect(14, finalY, 182, 20, 3, 3, "F")
  doc.setDrawColor(191, 219, 254)
  doc.roundedRect(14, finalY, 182, 20, 3, 3, "S")

  doc.setTextColor(7, 27, 59)
  doc.setFontSize(10.5)
  doc.setFont(undefined, "bold")
  doc.text("NET SALARY PAYABLE:", 20, finalY + 8.5)

  doc.setFontSize(13)
  doc.setTextColor(37, 99, 235)
  doc.text(formatCurrency(payment.net_salary, currency), 190, finalY + 8.5, { align: "right" })

  doc.setFontSize(8)
  doc.setFont(undefined, "italic")
  doc.setTextColor(71, 85, 105)
  doc.text(`Amount in Words: ${numberToWords(payment.net_salary)}`, 20, finalY + 15)

  // 6. Overtime Breakdown (if any hours recorded)
  const totalOtHours =
    Number(payment.overtime_hours_normal || 0) +
    Number(payment.overtime_hours_night || 0) +
    Number(payment.overtime_hours_weekend || 0) +
    Number(payment.overtime_hours_holiday || 0)

  if (totalOtHours > 0) {
    finalY += 26
    doc.setFontSize(7.5)
    doc.setFont(undefined, "bold")
    doc.setTextColor(51, 65, 85)
    doc.text("Overtime Hours Breakdown:", 14, finalY)
    doc.setFont(undefined, "normal")
    doc.setTextColor(100, 116, 139)
    doc.text(
      `Normal: ${payment.overtime_hours_normal || 0} hrs | Night: ${payment.overtime_hours_night || 0} hrs | Weekend: ${payment.overtime_hours_weekend || 0} hrs | Holiday: ${payment.overtime_hours_holiday || 0} hrs`,
      52,
      finalY,
    )
  } else {
    finalY += 22
  }

  // 7. SIGNATURES & OFFICIAL CHAPA (ማህተም) SECTION
  const sigY = Math.max(finalY + 8, 232)

  // 1. Prepared By Line (Left)
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.4)
  doc.line(14, sigY + 14, 52, sigY + 14)
  doc.setFontSize(7.5)
  doc.setFont(undefined, "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Prepared By (HR):", 14, sigY + 18)
  doc.setFont(undefined, "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text("Finance Department", 14, sigY + 22)

  // -------------------------------------------------------------
  // 2. PLACEHOLDER FOR CHAPA / OFFICIAL COMPANY STAMP & SEAL (Center-Left)
  // -------------------------------------------------------------
  const chapaX = 76
  const chapaY = sigY + 7
  const chapaRadius = 12

  // Outer circle in official stamp blue ink
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.7)
  doc.circle(chapaX, chapaY, chapaRadius, "S")

  // Inner dashed circle
  doc.setLineDashPattern([1.2, 0.8], 0)
  doc.setLineWidth(0.35)
  doc.circle(chapaX, chapaY, chapaRadius - 1.5, "S")
  doc.setLineDashPattern([], 0) // reset dash to solid

  // Chapa typography & seal stamp placeholder
  doc.setFontSize(5.5)
  doc.setFont(undefined, "bold")
  doc.setTextColor(30, 64, 175)
  doc.text("RAMA SOFTWARE", chapaX, chapaY - 5.5, { align: "center" })
  doc.setFontSize(6)
  doc.text("★ CHAPA ★", chapaX, chapaY - 1, { align: "center" })
  doc.setFontSize(5.2)
  doc.text("ማህተም / SEAL", chapaX, chapaY + 3, { align: "center" })
  doc.setFontSize(4.5)
  doc.setFont(undefined, "normal")
  doc.text("OFFICIAL STAMP", chapaX, chapaY + 6.8, { align: "center" })

  // 3. Authorized Signature Line (General Manager)
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.4)
  doc.line(100, sigY + 14, 142, sigY + 14)
  doc.setFontSize(7.5)
  doc.setFont(undefined, "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Authorized Signature:", 100, sigY + 18)
  doc.setFont(undefined, "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text("General Manager", 100, sigY + 22)

  // 4. Employee Signature Line (Received & Signed)
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.4)
  doc.line(152, sigY + 14, 196, sigY + 14)
  doc.setFontSize(7.5)
  doc.setFont(undefined, "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Employee Signature:", 152, sigY + 18)
  doc.setFont(undefined, "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text(fullName.slice(0, 24), 152, sigY + 22)

  // 8. Footer Note
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text(
    "This document is an authenticated salary payment voucher generated by Rama Software & IT Solutions ERP. Scan QR to verify.",
    105,
    286,
    { align: "center" },
  )

  const filename = `Payslip_${fullName.replace(/\s+/g, "_")}_${monthName}_${payment.year}.pdf`
  doc.save(filename)
}
