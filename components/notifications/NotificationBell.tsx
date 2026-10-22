"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, BellRing, Check, MapPin, Receipt, 
  FileCheck, ShieldAlert, CreditCard, 
  PenTool, UserCheck, CheckCircle2, ChevronRight 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Map notification types to icons
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'quote_request':
      return <Receipt className="w-5 h-5 text-livspace-blue" />;
    case 'quote_submitted':
      return <PenTool className="w-5 h-5 text-livspace-orange" />;
    case 'quote_approved':
      return <FileCheck className="w-5 h-5 text-green-600" />;
    case 'quote_rejected':
      return <ShieldAlert className="w-5 h-5 text-red-500" />;
    case 'payment_confirmed':
      return <CreditCard className="w-5 h-5 text-emerald-500" />;
    case 'gfc_requested':
    case 'gfc_assigned':
    case 'gfc_uploaded':
    case 'gfc_approved':
      return <PenTool className="w-5 h-5 text-purple-600" />;
    case 'vl_changed':
      return <UserCheck className="w-5 h-5 text-blue-500" />;
    case 'validation_completed':
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    default:
      return <Bell className="w-5 h-5 text-slate-400" />;
  }
};

// Map notification types to route destinations
const getNotificationHref = (n: Notification) => {
  const id = n.related_entity_id || "";
  switch (n.type) {
    case 'quote_request':
      return `/quotation/${id}`;
    case 'quote_submitted':
      // The entity is quote, so we might need to route to review. 
      // If validation_request_id is needed, that logic should be handled downstream or passed somehow.
      // Usually quote reviews are /quotation/[requestId]/review, but here id is the quoteId.
      // Assuming our routes can handle quoteId or we fallback to the general quote route.
      // For now linking to /quote-review or similar. We'll use the convention requested:
      return `/quotation/${id}/review`;
    case 'quote_approved':
      return `/quotation/${id}`;
    case 'payment_confirmed':
      return `/quotation/${id}/summary`;
    case 'gfc_requested':
    case 'gfc_assigned':
      return `/gfc/${id}`;
    case 'gfc_uploaded':
      return `/gfc/${id}/review`;
    case 'validation_completed':
      return `/validation/${id}`;
    default:
      return "#";
  }
};

export default function NotificationBell() {
  const { currentUser } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(currentUser?.id);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    setIsOpen(false); // Close panel on navigate
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors touch-target flex items-center justify-center"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute top-1 right-1 bg-primary text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-secondary shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5 h-5 text-white/80 hover:text-white transition-colors" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:-right-4 mt-2 w-[calc(100vw-32px)] sm:w-80 md:w-96 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 origin-top-right transform transition-all animate-in fade-in slide-in-from-top-2">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-bold text-livspace-blue hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">You're all caught up ✓</p>
                <p className="text-xs text-slate-400 mt-1">Check back later for updates</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const href = getNotificationHref(n);
                  
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "block p-4 hover:bg-slate-50 transition-colors relative group",
                        !n.is_read ? "bg-primary/5 border-l-2 border-primary pl-[14px]" : ""
                      )}
                    >
                      <div className="flex gap-3 items-start">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(n.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className={cn(
                              "text-sm tracking-tight truncate pr-2",
                              !n.is_read ? "font-bold text-slate-800" : "font-medium text-slate-600"
                            )}>
                              {n.title}
                            </p>
                            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap pt-0.5">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        </div>

                        {/* Chevron on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center pl-1">
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Footer view all
          <div className="border-t border-slate-100 p-2 bg-slate-50/30">
            <Link href="/notifications" className="block w-full text-center py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
              View All History
            </Link>
          </div>
          */}
        </div>
      )}
    </div>
  );
}
