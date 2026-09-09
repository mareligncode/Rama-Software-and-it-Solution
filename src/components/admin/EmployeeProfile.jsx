import { useState } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  User, Mail, Phone, Briefcase, Calendar, MapPin, FileText, Upload, Plus, 
  Download, Trash2, Loader2, CheckCircle2, AlertCircle, Eye
} from "lucide-react"

export default function EmployeeProfile() {
  const qc = useQueryClient()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [newDocument, setNewDocument] = useState({
    document_name: "",
    document_type: "other",
    description: "",
  })

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("status", "active")
        .order("first_name", { ascending: true })
      if (error) throw error
      return data
    },
  })

  const { data: employeeDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ["employee-documents", selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return []
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", selectedEmployeeId)
        .order("uploaded_at", { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!selectedEmployeeId,
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ employeeId, file, documentData }) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${employeeId}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('employees')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('employees')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase.from("employee_documents").insert({
        employee_id: employeeId,
        document_name: documentData.document_name,
        document_type: documentData.document_type,
        file_url: publicUrl,
        file_size: file.size,
        description: documentData.description,
      })

      if (dbError) throw dbError
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully")
      qc.invalidateQueries({ queryKey: ["employee-documents", selectedEmployeeId] })
      setNewDocument({ document_name: "", document_type: "other", description: "" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId) => {
      const { error } = await supabase.from("employee_documents").delete().eq("id", documentId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Document deleted successfully")
      qc.invalidateQueries({ queryKey: ["employee-documents", selectedEmployeeId] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function handleDocumentUpload(e) {
    e.preventDefault()
    const fileInput = document.getElementById('profile-document-file')
    const file = fileInput?.files?.[0]
    
    if (!file) {
      toast.error("Please select a file to upload")
      return
    }

    if (!newDocument.document_name) {
      toast.error("Please enter a document name")
      return
    }

    setUploading(true)
    uploadDocumentMutation.mutate(
      { 
        employeeId: selectedEmployeeId, 
        file, 
        documentData: newDocument 
      },
      {
        onSettled: () => {
          setUploading(false)
          if (fileInput) fileInput.value = ''
        }
      }
    )
  }

  function handleDeleteDocument(documentId) {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate(documentId)
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const selectedEmployee = employees?.find(e => e.id === selectedEmployeeId)

  return (
    <div className="space-y-6">
      {/* Employee Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <Label htmlFor="employee-select">Select Employee</Label>
        <Select value={selectedEmployeeId || ""} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Choose an employee to view profile" />
          </SelectTrigger>
          <SelectContent>
            {employees?.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.first_name} {employee.last_name} - {employee.job_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEmployee && (
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Employee Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="size-20 bg-gradient-to-br from-blue-500 to-indigo-500">
                      {selectedEmployee?.profile_image_url ? (
                        <img src={selectedEmployee.profile_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="text-white font-semibold text-2xl">
                          {selectedEmployee?.first_name?.[0]}{selectedEmployee?.last_name?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">{selectedEmployee?.job_title}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="size-4 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">ID:</span>
                      <span className="font-mono font-medium">{selectedEmployee?.employee_id || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="size-4 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">Email:</span>
                      <span className="font-medium">{selectedEmployee?.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="size-4 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">Phone:</span>
                      <span className="font-medium">{selectedEmployee?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="size-4 text-purple-500" />
                      <span className="text-slate-600 dark:text-slate-400">Department:</span>
                      <span className="font-medium">{selectedEmployee?.department || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="size-4 text-green-500" />
                      <span className="text-slate-600 dark:text-slate-400">Hire Date:</span>
                      <span className="font-medium">{selectedEmployee?.hire_date ? new Date(selectedEmployee.hire_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="size-4 text-orange-500" />
                      <span className="text-slate-600 dark:text-slate-400">Date of Birth:</span>
                      <span className="font-medium">{selectedEmployee?.date_of_birth ? new Date(selectedEmployee.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        selectedEmployee?.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0"
                          : selectedEmployee?.status === "terminated"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0"
                      }>
                        {selectedEmployee?.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedEmployee?.address && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="size-4 text-red-500" />
                    <span className="text-slate-600 dark:text-slate-400">Address:</span>
                    <span className="font-medium">{selectedEmployee.address}, {selectedEmployee.city}, {selectedEmployee.country}</span>
                  </div>
                </div>
              )}
              
              {selectedEmployee?.emergency_contact_name && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">Emergency Contact</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="size-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400">Name:</span>
                      <span className="font-medium">{selectedEmployee.emergency_contact_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="size-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400">Phone:</span>
                      <span className="font-medium">{selectedEmployee.emergency_contact_phone}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 dark:text-white mb-3">Upload New Document</h3>
              <form onSubmit={handleDocumentUpload} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="profile-document_name">Document Name *</Label>
                    <Input
                      id="profile-document_name"
                      value={newDocument.document_name}
                      onChange={(e) => setNewDocument({ ...newDocument, document_name: e.target.value })}
                      placeholder="e.g., Employment Contract"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-document_type">Document Type</Label>
                    <Select value={newDocument.document_type} onValueChange={(value) => setNewDocument({ ...newDocument, document_type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cv">CV/Resume</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="id_card">ID Card</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="profile-document-file">File *</Label>
                  <Input
                    id="profile-document-file"
                    type="file"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="profile-description">Description</Label>
                  <Textarea
                    id="profile-description"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                    placeholder="Optional description of the document"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="mr-2 size-4" /> Upload Document</>
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewDocument({ document_name: "", document_type: "other", description: "" })
                      const fileInput = document.getElementById('profile-document-file')
                      if (fileInput) fileInput.value = ''
                    }}
                    disabled={uploading}
                  >
                    <Plus className="mr-2 size-4" /> Add Another
                  </Button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                Uploaded Documents ({employeeDocuments?.length || 0})
              </h3>
              
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-slate-400" />
                </div>
              ) : !employeeDocuments || employeeDocuments.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <FileText className="size-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{doc.document_name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.document_type}
                            </Badge>
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                          </div>
                          {doc.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url, '_blank')}>
                          <Eye className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url, '_blank')}>
                          <Download className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteDocument(doc.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
