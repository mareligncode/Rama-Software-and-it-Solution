import React, { useState, useEffect, useRef, useMemo } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Send, Search, Paperclip, Smile, Image, FileText, Check, CheckCheck, 
  Clock, Shield, User, Users, MoreVertical, X, Phone, Video, Info,
  MessageSquare, Sparkles, ArrowLeft, Loader2, Download, AlertCircle,
  Briefcase, Mail, Building
} from "lucide-react"

export default function ChatApp({ currentUserId, userEmail, userRole = "admin", employeeData = null }) {
  const qc = useQueryClient()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [messageText, setMessageText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all") // 'all', 'admins', 'employees'
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showInfoSidebar, setShowInfoSidebar] = useState(false)
  const [mobileViewActive, setMobileViewActive] = useState(false) // for mobile: false = list, true = chat
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // 1. Fetch directory contacts (all Admins & Employees)
  const { data: directory = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["chat-directory", currentUserId],
    queryFn: async () => {
      // A. Fetch all employees with linked user_id
      const { data: empList, error: empErr } = await supabase
        .from("employees")
        .select("id, employee_id, first_name, last_name, email, phone, job_title, department, profile_image_url, user_id")
        .order("first_name", { ascending: true })

      if (empErr) console.warn("Could not fetch employee contacts:", empErr)

      // B. Fetch all admins from user_roles
      const { data: adminRoles, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin")

      if (roleErr) console.warn("Could not fetch admin roles:", roleErr)

      const contactsMap = new Map()

      // Add employees
      empList?.forEach((emp) => {
        if (emp.user_id && emp.user_id !== currentUserId) {
          contactsMap.set(emp.user_id, {
            id: emp.user_id,
            employeeRecordId: emp.id,
            name: `${emp.first_name} ${emp.last_name}`.trim() || emp.email,
            email: emp.email,
            jobTitle: emp.job_title || "Employee",
            department: emp.department || "Staff",
            avatar: emp.profile_image_url || "",
            role: "employee",
          })
        }
      })

      // Add admins (if not already mapped)
      adminRoles?.forEach((adm) => {
        if (adm.user_id !== currentUserId) {
          const existing = contactsMap.get(adm.user_id)
          if (existing) {
            existing.role = "admin"
            existing.isAdmin = true
          } else {
            contactsMap.set(adm.user_id, {
              id: adm.user_id,
              name: "System Admin",
              email: "admin@ramasoftware.com",
              jobTitle: "Administrator",
              department: "Management",
              avatar: "",
              role: "admin",
              isAdmin: true,
            })
          }
        }
      })

      return Array.from(contactsMap.values())
    },
    enabled: !!currentUserId,
  })

  // 2. Fetch User's Conversations & participants
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["chat-conversations", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return []
      
      // Get conversation IDs where current user is participant
      const { data: myParticipations, error: partErr } = await supabase
        .from("chat_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", currentUserId)

      if (partErr) {
        console.warn("Could not fetch chat participants:", partErr)
        return []
      }

      if (!myParticipations || myParticipations.length === 0) return []

      const convIds = myParticipations.map((p) => p.conversation_id)

      // Get conversation details & all participants
      const { data: convList, error: convErr } = await supabase
        .from("chat_conversations")
        .select(`
          id, type, title, updated_at,
          chat_participants (user_id, last_read_at)
        `)
        .in("id", convIds)
        .order("updated_at", { ascending: false })

      if (convErr) {
        console.warn("Could not fetch conversations:", convErr)
        return []
      }

      // Fetch latest message for each conversation
      const { data: latestMessages, error: msgErr } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, sender_id, message, attachment_name, is_read, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })

      const latestMsgMap = {}
      latestMessages?.forEach((m) => {
        if (!latestMsgMap[m.conversation_id]) {
          latestMsgMap[m.conversation_id] = m
        }
      })

      // Combine with directory info to populate other participant details
      return (convList || []).map((c) => {
        const otherParticipant = c.chat_participants?.find((p) => p.user_id !== currentUserId)
        const myPart = c.chat_participants?.find((p) => p.user_id === currentUserId)
        const contactInfo = directory.find((d) => d.id === otherParticipant?.user_id) || {
          id: otherParticipant?.user_id,
          name: "Colleague",
          email: "",
          jobTitle: "Team Member",
          role: "member",
        }

        const lastMsg = latestMsgMap[c.id]
        const hasUnread = lastMsg && myPart?.last_read_at && new Date(lastMsg.created_at) > new Date(myPart.last_read_at) && lastMsg.sender_id !== currentUserId

        return {
          ...c,
          contact: contactInfo,
          otherUserId: otherParticipant?.user_id,
          lastMessage: lastMsg,
          hasUnread: Boolean(hasUnread),
        }
      })
    },
    enabled: !!currentUserId && directory.length >= 0,
    refetchInterval: 6000,
  })

  // 3. Fetch active conversation messages
  const activeConvId = selectedConversation?.id
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", activeConvId],
    queryFn: async () => {
      if (!activeConvId) return []
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true })

      if (error) {
        console.warn("Could not fetch messages:", error)
        return []
      }
      return data ?? []
    },
    enabled: !!activeConvId,
  })

  // Realtime subscription for incoming messages
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel("chat-realtime-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["chat-conversations", currentUserId] })
          if (payload.new?.conversation_id === activeConvId) {
            qc.invalidateQueries({ queryKey: ["chat-messages", activeConvId] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, activeConvId, qc])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Mark active conversation as read
  useEffect(() => {
    if (!activeConvId || !currentUserId) return
    const markRead = async () => {
      await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", activeConvId)
        .eq("user_id", currentUserId)
      qc.invalidateQueries({ queryKey: ["chat-conversations", currentUserId] })
    }
    markRead()
  }, [activeConvId, currentUserId, messages.length])

  // Mutation: Start or open conversation with a contact
  const startChatMutation = useMutation({
    mutationFn: async (targetContact) => {
      if (!currentUserId) throw new Error("You must be logged in to chat")
      if (!targetContact?.id) throw new Error("Invalid contact")

      // Call database RPC to get or create direct conversation
      const { data: convId, error: rpcErr } = await supabase.rpc("get_or_create_direct_conversation", {
        _user1: currentUserId,
        _user2: targetContact.id,
      })

      if (rpcErr) throw rpcErr

      return { id: convId, contact: targetContact }
    },
    onSuccess: (result) => {
      setSelectedConversation(result)
      setSelectedContact(result.contact)
      setMobileViewActive(true)
      qc.invalidateQueries({ queryKey: ["chat-conversations", currentUserId] })
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start conversation")
    },
  })

  // Mutation: Send text message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ convId, text, attachment }) => {
      if (!text.trim() && !attachment) return

      const payload = {
        conversation_id: convId,
        sender_id: currentUserId,
        message: text.trim(),
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
        is_read: false,
      }

      const { data, error } = await supabase.from("chat_messages").insert(payload).select().single()
      if (error) throw error

      // Update conversation updated_at
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId)

      return data
    },
    onSuccess: () => {
      setMessageText("")
      qc.invalidateQueries({ queryKey: ["chat-messages", activeConvId] })
      qc.invalidateQueries({ queryKey: ["chat-conversations", currentUserId] })
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message")
    },
  })

  // Handle send message
  const handleSendMessage = (e) => {
    e?.preventDefault()
    if (!messageText.trim() || !activeConvId) return
    sendMessageMutation.mutate({ convId: activeConvId, text: messageText })
  }

  // Handle file attachment upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeConvId) return

    try {
      setUploadingFile(true)
      const fileExt = file.name.split(".").pop()
      const fileName = `chat_${activeConvId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("employees")
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("employees")
        .getPublicUrl(fileName)

      sendMessageMutation.mutate({
        convId: activeConvId,
        text: `Shared file: ${file.name}`,
        attachment: {
          url: publicUrl,
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "document",
        },
      })
      toast.success("File uploaded and sent!")
    } catch (err) {
      toast.error("File upload failed: " + err.message)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Filtered contacts list
  const filteredContacts = useMemo(() => {
    return directory.filter((c) => {
      if (activeTab === "admins" && c.role !== "admin") return false
      if (activeTab === "employees" && c.role !== "employee") return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.jobTitle.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [directory, activeTab, searchQuery])

  // Quick Emoji reactions
  const addEmoji = (emoji) => {
    setMessageText((prev) => prev + emoji)
  }

  const activeContact = selectedConversation?.contact || selectedContact

  return (
    <div className="flex h-[78vh] min-h-[550px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      
      {/* ------------------------------------------------------------- */}
      {/* Left Sidebar: Conversations & Contacts List                   */}
      {/* ------------------------------------------------------------- */}
      <aside className={`w-full md:w-80 lg:w-96 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 ${
        mobileViewActive ? "hidden md:flex" : "flex"
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Team Messages</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Private & encrypted internal chat</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200">
              <Shield className="size-2.5 mr-1 text-blue-500" /> Private
            </Badge>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search colleagues or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60"
              }`}
            >
              All ({directory.length})
            </button>
            <button
              onClick={() => setActiveTab("admins")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "admins"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60"
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setActiveTab("employees")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "employees"
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60"
              }`}
            >
              Employees
            </button>
          </div>
        </div>

        {/* Contacts & Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {contactsLoading || conversationsLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <Loader2 className="size-6 animate-spin text-blue-600" />
              <p className="text-xs">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <User className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No colleagues found</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Try searching with a different name</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const conv = conversations.find((c) => c.otherUserId === contact.id)
              const isSelected = selectedConversation?.id === conv?.id || selectedContact?.id === contact.id
              const hasUnread = conv?.hasUnread

              return (
                <div
                  key={contact.id}
                  onClick={() => startChatMutation.mutate(contact)}
                  className={`group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="size-11 border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
                      {contact.avatar ? (
                        <AvatarImage src={contact.avatar} alt={contact.name} />
                      ) : null}
                      <AvatarFallback className="text-slate-700 dark:text-slate-200 font-bold text-xs">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className={`text-sm font-semibold truncate ${isSelected ? "text-blue-950 dark:text-blue-200" : "text-slate-900 dark:text-white"}`}>
                        {contact.name}
                      </h4>
                      {conv?.lastMessage && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv?.lastMessage?.message || contact.jobTitle || contact.department}
                      </p>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {contact.role === "admin" && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[9px] px-1.5 py-0 border-0">
                            Admin
                          </Badge>
                        )}
                        {hasUnread && (
                          <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* Right Area: Active Message Conversation                       */}
      {/* ------------------------------------------------------------- */}
      <main className={`flex-1 flex-col h-full bg-white dark:bg-slate-900 ${
        !mobileViewActive ? "hidden md:flex" : "flex"
      }`}>
        {activeContact ? (
          <>
            {/* Chat Top Header */}
            <header className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden size-8 mr-1 text-slate-500"
                  onClick={() => setMobileViewActive(false)}
                >
                  <ArrowLeft className="size-4" />
                </Button>

                <Avatar className="size-10 border border-slate-200 dark:border-slate-700">
                  {activeContact.avatar && <AvatarImage src={activeContact.avatar} />}
                  <AvatarFallback className="font-bold text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {activeContact.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                      {activeContact.name}
                    </h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                      activeContact.role === "admin" 
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}>
                      {activeContact.role === "admin" ? "Administrator" : (activeContact.jobTitle || "Employee")}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Online • Direct Private Chat
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`size-8 ${showInfoSidebar ? "bg-slate-100 dark:bg-slate-800" : ""}`}
                  onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                  title="Contact Information"
                >
                  <Info className="size-4 text-slate-500" />
                </Button>
              </div>
            </header>

            {/* Chat Body & Messages Area */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Message stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
                  {/* Encryption Notice */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Shield className="size-3 text-emerald-500" />
                      Messages in this conversation are private and visible only to you and {activeContact.name}.
                    </div>
                  </div>

                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="size-6 animate-spin text-blue-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="size-6" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Start the conversation</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                        Send a message, share files, or collaborate with {activeContact.name}.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.sender_id === currentUserId
                      const showDate = index === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()

                      return (
                        <React.Fragment key={msg.id || index}>
                          {showDate && (
                            <div className="flex justify-center my-3">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400">
                                {new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          )}

                          <div className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}>
                            {!isMe && (
                              <Avatar className="size-7 mb-1 shrink-0">
                                {activeContact.avatar && <AvatarImage src={activeContact.avatar} />}
                                <AvatarFallback className="text-[10px] bg-slate-300 dark:bg-slate-700 font-bold">
                                  {activeContact.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                                isMe
                                  ? "bg-blue-600 text-white rounded-br-xs"
                                  : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs"
                              }`}>
                                {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}

                                {/* Attachment if present */}
                                {msg.attachment_url && (
                                  <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-700">
                                    {msg.attachment_type === "image" ? (
                                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                                        <img src={msg.attachment_url} alt="Attachment" className="max-h-48 rounded-lg object-cover hover:opacity-95 transition-opacity" />
                                      </a>
                                    ) : (
                                      <a 
                                        href={msg.attachment_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        download 
                                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-colors ${
                                          isMe ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                                        }`}
                                      >
                                        <FileText className="size-4 shrink-0" />
                                        <span className="truncate max-w-[160px]">{msg.attachment_name || "Download File"}</span>
                                        <Download className="size-3.5 ml-auto" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Timestamp and status */}
                              <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && (
                                  <CheckCheck className="size-3 text-blue-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {/* Quick Emoji Bar */}
                  <div className="flex items-center gap-1 mb-2 px-1 text-base">
                    {["👍", "❤️", "🙌", "😊", "🔥", "✅", "🎉"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addEmoji(emoji)}
                        className="hover:scale-125 transition-transform p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0 text-slate-500 hover:text-blue-600"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      title="Attach file or image"
                    >
                      {uploadingFile ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                    </Button>

                    <Input
                      type="text"
                      placeholder={`Message ${activeContact.name}...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 h-10 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                    />

                    <Button
                      type="submit"
                      disabled={!messageText.trim() && !uploadingFile}
                      className="size-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shrink-0"
                    >
                      <Send className="size-4" />
                    </Button>
                  </form>
                </div>
              </div>

              {/* Optional Contact Details Drawer */}
              {showInfoSidebar && (
                <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4 hidden lg:block overflow-y-auto">
                  <div className="text-center py-2">
                    <Avatar className="size-16 mx-auto mb-2 border-2 border-slate-200 dark:border-slate-700">
                      {activeContact.avatar && <AvatarImage src={activeContact.avatar} />}
                      <AvatarFallback className="text-base font-bold bg-blue-600 text-white">
                        {activeContact.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{activeContact.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{activeContact.jobTitle}</p>
                  </div>

                  <div className="space-y-3 text-xs border-t border-slate-200 dark:border-slate-800 pt-3">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail className="size-3.5 text-slate-400" />
                      <span className="truncate">{activeContact.email || "No email available"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Building className="size-3.5 text-slate-400" />
                      <span>{activeContact.department || "General Staff"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Shield className="size-3.5 text-slate-400" />
                      <span className="capitalize">{activeContact.role} Access</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty Chat State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20 dark:bg-slate-950/10">
            <div className="size-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Rama Internal Private Chat</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              Connect privately with any colleague across the company. Select a teammate from the left sidebar to start messaging.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
