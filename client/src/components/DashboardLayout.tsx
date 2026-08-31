import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LogOut, PanelLeft, PawPrint } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SIDEBAR_WIDTH_KEY = "petflow-sidebar-width";
const DEFAULT_WIDTH = 268;
const MIN_WIDTH = 220;
const MAX_WIDTH = 360;

export default function DashboardLayout({
  children,
  items,
  activeId,
  onNavigate,
}: {
  children: React.ReactNode;
  items: DashboardNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="petflow-login min-h-screen px-5 py-10">
        <div className="petflow-login-card">
          <div className="petflow-logo-mark"><PawPrint className="h-6 w-6" /></div>
          <span className="eyebrow">PETFLOW</span>
          <h1>Todo el ritmo de tu pet shop, en un solo lugar.</h1>
          <p>Inicia sesión para administrar inventario, ventas, clientes, mascotas y agenda desde cualquier dispositivo.</p>
          <Button onClick={() => startLogin()} size="lg" className="w-full bg-[#17483c] text-white hover:bg-[#0f382e]">Ingresar a PetFlow</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent items={items} activeId={activeId} onNavigate={onNavigate} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  items,
  activeId,
  onNavigate,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  items: DashboardNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const next = event.clientX - left;
      if (next >= MIN_WIDTH && next <= MAX_WIDTH) setSidebarWidth(next);
    };
    const up = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const activeLabel = items.find(item => item.id === activeId)?.label ?? "PetFlow";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="petflow-sidebar border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-[88px] justify-center px-3">
            <div className="flex items-center gap-3 px-1 w-full">
              <button onClick={toggleSidebar} className="petflow-collapse-button shrink-0" aria-label="Alternar navegación"><PanelLeft className="h-4 w-4" /></button>
              {!isCollapsed && <div className="flex items-center gap-3 min-w-0"><div className="petflow-logo-mark"><PawPrint className="h-5 w-5" /></div><div><p className="font-display font-semibold leading-none text-[#fffaf0]">PetFlow</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#b7d4ca]">operaciones</p></div></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="gap-0 px-2 pt-2">
            {!isCollapsed && <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#99b8ac]">Gestión diaria</p>}
            <SidebarMenu className="gap-1">
              {items.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton isActive={activeId === item.id} onClick={() => onNavigate(item.id)} tooltip={item.label} className="petflow-nav-item h-11 rounded-xl px-3 text-[#d9eee6] hover:bg-white/10 hover:text-white data-[active=true]:bg-[#e9b95d] data-[active=true]:text-[#153f35]">
                    <item.icon className="h-[18px] w-[18px]" /><span className="font-medium">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-xl px-2 py-2 w-full text-left hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e9b95d] group-data-[collapsible=icon]:justify-center">
                    <Avatar className="h-9 w-9 shrink-0 border border-white/20"><AvatarFallback className="bg-[#3b7565] text-xs font-bold text-[#fffaf0]">{user?.name?.charAt(0).toUpperCase() || "P"}</AvatarFallback></Avatar>
                    <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user?.name || "Responsable"}</p><p className="mt-0.5 truncate text-xs text-[#a8c9bd]">Mi pet shop</p></div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-[#e9b95d]/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} />
      </div>
      <SidebarInset className="bg-[#f6f3eb]">
        {isMobile && <div className="flex h-16 items-center gap-3 border-b border-[#ded8c8] bg-[#fdfbf6]/95 px-4 backdrop-blur sticky top-0 z-40"><SidebarTrigger className="rounded-xl bg-[#e9eee8]" /><span className="font-display text-lg font-semibold text-[#153f35]">{activeLabel}</span></div>}
        <main className="min-h-screen flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
