import React, { useState, useMemo } from "react"
import { 
  Bell, CheckCircle2, Clock, AlertTriangle, Info, MessageSquare, 
  CheckCheck, Trash2, Filter, Search, ChevronRight, ExternalLink,
  Sparkles, X, ShieldAlert, Calendar, CheckSquare, FileText, ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { toast } from "sonner"

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onNavigate,
  readIds = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
  isFullPage = false,
  userType = "admin", // 'admin' | 'employee'
}) {
  const [filter, setFilter] = useState("all") // 'all', 'unread', 'tasks', 'messages', 'system'
  const [search, setSearch] = useState("")
  const [selectedNotification, setSelectedNotification] = useState(null)

  // Filter and search
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const isRead = readIds.includes(item.id) || item.isRead
      
      // Filter tab
      if (filter === "unread" && isRead) return false
      if (filter === "tasks" && item.type !== "task") return false
      if (filter === "messages" && item.type !== "message") return false
      if (filter === "system" && item.type !== "system") return false

      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const titleMatch = item.title?.toLowerCase().includes(q)
        const descMatch = item.description?.toLowerCase().includes(q)
        const senderMatch = item.sender?.toLowerCase().includes(q)
        if (!titleMatch && !descMatch && !senderMatch) return false
      }

      return true
    })
  }, [notifications, readIds, filter, search])

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !readIds.includes(item.id) && !item.isRead).length
  }, [notifications, readIds])

  const handleNotificationClick = (item) => {
    if (!readIds.includes(item.id)) {
      onMarkAsRead?.(item.id)
    }
    if (item.actionTab && onNavigate) {
      onNavigate(item.actionTab, item.actionData)
      if (onClose) onClose()
    } else {
      setSelectedNotification(item)
    }
  }

  const getTypeIcon = (type, priority) => {
    if (priority === "urgent" || priority === "high") {
      return <AlertTriangle className="size-5 text-rose-500" />
    }
    switch (type) {
      case "message":
        return <MessageSquare className="size-5 text-blue-500" />
      case "task":
        return <CheckSquare className="size-5 text-amber-500" />
      case "document":
        return <FileText className="size-5 text-purple-500" />
      case "system":
        return <ShieldAlert className="size-5 text-indigo-500" />
      default:
        return <Info className="size-5 text-blue-500" />
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case "message":
        return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200">Message</Badge>
      case "task":
        return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200">Task</Badge>
      case "document":
        return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">Document</Badge>
      case "system":
        return <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200">System</Badge>
      default:
        return <Badge variant="outline">Notice</Badge>
    }
  }

  const formatTimestamp = (dateString) => {
    if (!dateString) return "Just now"
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffMinutes < 1) return "Just now"
      if (diffMinutes < 60) return `${diffMinutes}m ago`
      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return "Recently"
    }
  }

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header Actions & Filters */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900">
              <Bell className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {userType === "admin" ? "Administrative updates, contact inquiries & task activity" : "Your assigned tasks, alerts & workspace updates"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onMarkAllAsRead?.()
                  toast.success("All notifications marked as read")
                }}
                className="text-xs h-8 gap-1.5"
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to clear all notifications?")) {
                    onClearAll?.()
                    toast.success("Notifications cleared")
                  }
                }}
                className="text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Clear all
              </Button>
            )}
            {!isFullPage && onClose && (
              <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filter pills */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
            {search && (
              <button 
                onClick={() => setSearch("")} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "unread"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter("tasks")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "tasks"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Tasks
            </button>
            {userType === "admin" && (
              <button
                onClick={() => setFilter("messages")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "messages"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Messages
              </button>
            )}
            <button
              onClick={() => setFilter("system")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "system"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              System
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">You're all caught up!</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mt-1">
              {filter === "unread" 
                ? "No unread notifications at the moment."
                : search 
                ? `No notifications found matching "${search}".`
                : "No notifications in this category."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isRead = readIds.includes(item.id) || item.isRead
            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  isRead
                    ? "bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 opacity-80"
                    : "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 shadow-sm"
                }`}
              >
                {/* Unread indicator dot */}
                {!isRead && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 size-2 bg-blue-600 rounded-full" />
                )}

                {/* Icon Container */}
                <div className={`shrink-0 size-10 rounded-xl flex items-center justify-center ${
                  item.priority === "urgent" || item.priority === "high"
                    ? "bg-rose-100 dark:bg-rose-950/50"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}>
                  {getTypeIcon(item.type, item.priority)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    {getTypeBadge(item.type)}
                    {item.priority === "urgent" && (
                      <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0 font-bold">URGENT</Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTimestamp(item.created_at || item.timestamp)}
                    </span>
                    {item.sender && (
                      <span>• From: <strong className="font-medium text-slate-600 dark:text-slate-400">{item.sender}</strong></span>
                    )}
                    {item.actionLabel && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 group-hover:underline ml-auto">
                        {item.actionLabel}
                        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {!isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                      title="Mark as read"
                      onClick={() => onMarkAsRead?.(item.id)}
                    >
                      <CheckCheck className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Dismiss"
                    onClick={() => onDismiss?.(item.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Selected Notification Dialog (if clicked item without direct route) */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {selectedNotification && getTypeBadge(selectedNotification.type)}
              {selectedNotification?.priority === "urgent" && (
                <Badge className="bg-rose-500 text-white">URGENT</Badge>
              )}
            </div>
            <DialogTitle className="text-lg font-bold">{selectedNotification?.title}</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {formatTimestamp(selectedNotification?.created_at || selectedNotification?.timestamp)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {selectedNotification?.description}
            </div>

            {selectedNotification?.details && (
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t pt-3">
                {Object.entries(selectedNotification.details).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize font-medium">{key}:</span>
                    <span className="text-slate-700 dark:text-slate-300">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedNotification(null)}
            >
              Close
            </Button>
            {selectedNotification?.actionTab && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                onClick={() => {
                  const tab = selectedNotification.actionTab
                  const data = selectedNotification.actionData
                  setSelectedNotification(null)
                  if (onClose) onClose()
                  if (onNavigate) onNavigate(tab, data)
                }}
              >
                {selectedNotification.actionLabel || "Go to Section"}
                <ArrowRight className="size-4" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  if (isFullPage) {
    return <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">{content}</div>
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 overflow-hidden flex flex-col gap-0 border-slate-200 dark:border-slate-800">
        {content}
      </DialogContent>
    </Dialog>
  )
}
