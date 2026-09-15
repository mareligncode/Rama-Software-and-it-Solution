import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Export data to PDF
export function exportToPDF(data, filename) {
  const doc = new jsPDF({ orientation: 'landscape' })
  
  // Add header with company branding
  doc.setFillColor(59, 130, 246)
  doc.rect(0, 0, 297, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('Rama Software & IT Solutions', 148.5, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text('Employee Management System', 148.5, 18, { align: 'center' })
  
  // Add title
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text(data.title || 'Report', 14, 40)
  
  // Add date and filter info
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Generated: ${data.date || new Date().toLocaleDateString()}`, 14, 48)
  if (data.dateRange && (data.dateRange.startDate || data.dateRange.endDate)) {
    doc.text(`Date Range: ${data.dateRange.startDate || 'All'} to ${data.dateRange.endDate || 'All'}`, 14, 54)
  }
  
  let yPos = 65
  
  // Add analytics summary if available
  if (data.analytics) {
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Summary Statistics', 14, yPos)
    yPos += 8
    
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    
    const summaryData = Object.entries(data.analytics).map(([key, value]) => [
      key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim(),
      value.toString()
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40 } }
    })
    
    yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 30
  }
  
  // Add department chart data if available
  if (data.departmentChartData && data.departmentChartData.length > 0) {
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Employees by Department', 14, yPos)
    yPos += 8
    
    const tableData = data.departmentChartData.map(item => [
      item.name,
      item.value.toString(),
      `${item.percentage}%`
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Department', 'Count', 'Percentage']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } }
    })
    
    yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 30
  }
  
  // Add task status data if available
  if (data.taskStatusData && data.taskStatusData.length > 0) {
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Task Status Overview', 14, yPos)
    yPos += 8
    
    const tableData = data.taskStatusData.map(item => [
      item.name,
      item.value.toString()
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Status', 'Count']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40 } }
    })
    
    yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 30
  }
  
  // Add project status data if available
  if (data.projectStatusData && data.projectStatusData.length > 0) {
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Project Status Overview', 14, yPos)
    yPos += 8
    
    const tableData = data.projectStatusData.map(item => [
      item.name,
      item.value.toString()
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Status', 'Count']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40 } }
    })
    
    yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 30
  }
  
  // Add employee details table if available
  if (data.employees && data.employees.length > 0) {
    // Check if we need a new page
    if (yPos > 180) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Employee Details', 14, yPos)
    yPos += 8
    
    const employeeData = data.employees.map(emp => [
      emp.employee_id || 'N/A',
      `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      emp.email || 'N/A',
      emp.phone || 'N/A',
      emp.department || 'N/A',
      emp.job_title || 'N/A',
      emp.status || 'N/A',
      emp.hire_date || 'N/A'
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Job Title', 'Status', 'Hire Date']],
      body: employeeData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 },
        6: { cellWidth: 25 },
        7: { cellWidth: 30 }
      }
    })
  }

  // Add task details table if available
  if (data.tasks && data.tasks.length > 0) {
    if (yPos > 180) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Task Details', 14, yPos)
    yPos += 8
    
    const taskData = data.tasks.map(task => [
      task.id || 'N/A',
      task.title || 'N/A',
      task.description || 'N/A',
      task.status || 'N/A',
      task.priority || 'N/A',
      task.created_at || 'N/A',
      task.due_date || 'N/A'
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Task ID', 'Title', 'Description', 'Status', 'Priority', 'Created', 'Due Date']],
      body: taskData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 35 },
        6: { cellWidth: 35 }
      }
    })
  }

  // Add project details table if available
  if (data.projects && data.projects.length > 0) {
    if (yPos > 180) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Project Details', 14, yPos)
    yPos += 8
    
    const projectData = data.projects.map(project => [
      project.id || 'N/A',
      project.name || 'N/A',
      project.description || 'N/A',
      project.status || 'N/A',
      project.start_date || 'N/A',
      project.end_date || 'N/A'
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Project ID', 'Name', 'Description', 'Status', 'Start Date', 'End Date']],
      body: projectData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 80 },
        3: { cellWidth: 30 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 }
      }
    })
  }
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Page ${i} of ${pageCount}`, 148.5, 200, { align: 'center' })
    doc.text('Rama Software & IT Solutions - Confidential', 14, 200)
    doc.text(new Date().toLocaleDateString(), 280, 200, { align: 'right' })
  }
  
  doc.save(`${filename}.pdf`)
}

// Export data to Excel
export function exportToExcel(data, filename) {
  const workbook = XLSX.utils.book_new()
  
  // Employees sheet
  if (data.employees && data.employees.length > 0) {
    const employeeData = data.employees.map(emp => ({
      'Employee ID': emp.employee_id,
      'First Name': emp.first_name,
      'Last Name': emp.last_name,
      'Email': emp.email,
      'Phone': emp.phone,
      'Department': emp.department,
      'Job Title': emp.job_title,
      'Status': emp.status,
      'Hire Date': emp.hire_date
    }))
    
    const employeeSheet = XLSX.utils.json_to_sheet(employeeData)
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employees')
  }
  
  // Tasks sheet
  if (data.tasks && data.tasks.length > 0) {
    const taskData = data.tasks.map(task => ({
      'Task ID': task.id,
      'Title': task.title,
      'Description': task.description,
      'Status': task.status,
      'Priority': task.priority,
      'Created': task.created_at,
      'Due Date': task.due_date
    }))
    
    const taskSheet = XLSX.utils.json_to_sheet(taskData)
    XLSX.utils.book_append_sheet(workbook, taskSheet, 'Tasks')
  }
  
  // Projects sheet
  if (data.projects && data.projects.length > 0) {
    const projectData = data.projects.map(project => ({
      'Project ID': project.id,
      'Name': project.name,
      'Description': project.description,
      'Status': project.status,
      'Start Date': project.start_date,
      'End Date': project.end_date
    }))
    
    const projectSheet = XLSX.utils.json_to_sheet(projectData)
    XLSX.utils.book_append_sheet(workbook, projectSheet, 'Projects')
  }
  
  // Add summary sheet if analytics data exists
  if (data.analytics) {
    const summaryData = Object.entries(data.analytics).map(([key, value]) => ({
      'Metric': key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim(),
      'Value': value
    }))
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  }
  
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Generate QR code
export async function generateQRCode(text) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return null
  }
}
