"use client";

import { Clock, BookOpen, Settings, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Trash2, X, LogOut, User } from "lucide-react";
import AppLink from "@/components/AppLink";
import { usePathname, useRouter } from "@/lib/router";
import { useStore } from "@/contexts/StoreContext";
import { format, formatDistanceToNow, isThisWeek, isToday, isYesterday } from "date-fns";
import Logo from "@/components/Logo";
import type { HistoryEntry } from "@/hooks/use-store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import avatar1 from "@/assets/avatar_1.png";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, isMobile, toggleSidebar }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { history, removeHistoryEntry, clearHistory } = useStore();

  const isActive = (path: string) => pathname === path;

  const handleLoadQuery = (item: HistoryEntry) => {
    router.push(`/?historyId=${encodeURIComponent(item.id)}`);
  };

  const groupedHistory = history.slice(0, 30).reduce<Record<string, typeof history>>((acc, item) => {
    const itemDate = new Date(item.timestamp);
    const label = isToday(itemDate)
      ? "Today"
      : isYesterday(itemDate)
        ? "Yesterday"
        : isThisWeek(itemDate)
          ? "This Week"
          : format(itemDate, "MMM d, yyyy");
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  return (
    <>
      {isMobile && isOpen && (
        <button
          className="fixed inset-0 z-30 bg-background/40 backdrop-blur-[1px] md:hidden"
          onClick={toggleSidebar}
          aria-label="Close navigation backdrop"
        />
      )}
      <aside
        className={`h-screen flex flex-col bg-card/70 md:bg-card/50 border-r border-border/40 transition-all duration-300 shrink-0
          ${isMobile
            ? `fixed left-0 top-0 z-40 w-[280px] transform ${isOpen ? "translate-x-0" : "-translate-x-full"}`
            : `${isOpen ? "w-[280px]" : "w-[56px]"}`
          }`}
      >
      <div className={`h-[60px] shrink-0 flex items-center ${isOpen ? 'px-5 justify-between' : 'justify-center'}`}>
        {isOpen && (
          <Logo variant="sidebar" className="text-[19px] ml-1 max-w-[150px]" />
        )}
        <button 
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors text-secondary/50 hover:text-foreground"
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-x-hidden overflow-y-auto pt-4 pb-3 flex flex-col gap-1 custom-scrollbar">
        <div className="px-2 flex flex-col gap-0.5">
          <button
            title="New Consultation"
            onClick={() => {
              router.push("/?new=1");
              if (isMobile) toggleSidebar();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-body font-medium transition-all duration-300 overflow-hidden ${
              isActive("/") && isOpen ? "text-primary bg-primary/10" : isActive("/") ? "text-primary" : "text-secondary/70 hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <LayoutDashboard className="w-[18px] h-[18px] shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>New Consultation</span>
          </button>
          <AppLink
            title="Research Vault"
            href="/vault"
            onClick={() => isMobile && toggleSidebar()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-body font-medium transition-all duration-300 overflow-hidden ${
              isActive("/vault") && isOpen ? "text-primary bg-primary/10" : isActive("/vault") ? "text-primary" : "text-secondary/70 hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <BookOpen className="w-[18px] h-[18px] shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>Research Vault</span>
          </AppLink>
        </div>

        {/* History */}
        <div className={`mt-5 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`}>
          <div className="px-4 flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-body font-medium text-secondary/50 uppercase tracking-[0.12em] flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recent Conversations
            </h4>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                aria-label="Delete all recent conversations"
                className="text-secondary/30 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="px-2 space-y-px">
            {history.length === 0 ? (
              <p className="px-3 py-4 text-[11px] font-body text-secondary/40 text-center">No queries yet</p>
            ) : (
              Object.entries(groupedHistory).map(([group, items]) => (
                <div key={group} className="mb-2.5">
                  <p className="px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-secondary/45">{group}</p>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group w-full flex items-start gap-1 px-2.5 py-1.5 rounded-lg text-left transition-colors hover:bg-muted/40 cursor-pointer"
                      onClick={() => handleLoadQuery(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-body text-foreground/80 group-hover:text-primary transition-colors line-clamp-1 block">
                          {item.title || item.query}
                        </span>
                        <span className="text-[10px] font-body text-secondary/40 mt-0.5 block">
                          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHistoryEntry(item.id);
                        }}
                        aria-label={`Delete conversation: ${item.query}`}
                        className="shrink-0 mt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 text-secondary/40 hover:text-destructive transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </nav>

      <div className="p-2 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all duration-300 hover:bg-muted/50 ${isOpen ? '' : 'justify-center'}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-border/50">
                <img src={avatar1.src} alt="User" className="w-full h-full object-cover" />
              </div>
              <div className={`flex-1 min-w-0 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                <p className="text-[13px] font-medium text-foreground truncate leading-tight">SentArc Labs</p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">Free plan</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side={isMobile ? "top" : "right"} className="w-56" sideOffset={12}>
            <div className="px-2 py-1.5 mb-1">
              <p className="text-sm font-medium text-foreground truncate">SentArc Labs</p>
              <p className="text-xs text-muted-foreground truncate">sentarc.ai@gmail.com</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { router.push("/settings"); if (isMobile) toggleSidebar(); }} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast({ title: "Logged out", description: "You have been signed out." })} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
