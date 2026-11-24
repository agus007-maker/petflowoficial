import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { supabase, publicAppUrl } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/useMobile";
import { Check, LoaderCircle, LogOut, PanelLeft, PawPrint, Pencil, UserRound } from "lucide-react";
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
  administrationItem,
  activeId,
  onNavigate,
}: {
  children: React.ReactNode;
  items: DashboardNavItem[];
  administrationItem?: DashboardNavItem;
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
  if (!user) return <LoginScreen />;

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent items={items} administrationItem={administrationItem} activeId={activeId} onNavigate={onNavigate} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup" | "recovery">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      if (mode === "signin") {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        // Garantiza que la sesión persistida y el cliente API queden listos
        // antes de renderizar las vistas protegidas del dashboard.
        window.location.reload();
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: publicAppUrl() } });
        if (result.error) throw result.error;
        setMessage(result.data.session ? "Cuenta creada. Preparando tu espacio…" : "Te enviamos un correo para confirmar la cuenta.");
      } else {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: publicAppUrl() });
        if (result.error) throw result.error;
        setMessage("Si el correo existe, recibirás un enlace para restablecer la contraseña.");
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos completar el acceso."); }
    finally { setBusy(false); }
  }
  const title = mode === "signin" ? "Todo el ritmo de tu pet shop, en un solo lugar." : mode === "signup" ? "Crea tu cuenta de PetFlow." : "Recupera tu acceso a PetFlow.";
  const description = mode === "signin" ? "Inicia sesión para administrar inventario, ventas, clientes, mascotas y agenda desde cualquier dispositivo." : mode === "signup" ? "Registra tu correo y crea una contraseña para comenzar a gestionar tu negocio." : "Te enviaremos un enlace seguro para elegir una nueva contraseña.";
  return <div className="petflow-login min-h-screen px-5 py-10"><div className="petflow-login-card"><div className="petflow-logo-mark"><PawPrint className="h-6 w-6" /></div><span className="eyebrow">PETFLOW</span><h1>{title}</h1><p>{description}</p><form onSubmit={submit} className="mt-5 space-y-3"><label className="block text-left text-sm font-medium text-[#315248]">Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#cddbd3] bg-white px-3 py-2.5 outline-none focus:border-[#397360] focus:ring-2 focus:ring-[#b7d4c6]" placeholder="tu@email.com" /></label>{mode !== "recovery" && <label className="block text-left text-sm font-medium text-[#315248]">Contraseña<input required minLength={8} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#cddbd3] bg-white px-3 py-2.5 outline-none focus:border-[#397360] focus:ring-2 focus:ring-[#b7d4c6]" placeholder="••••••••" /></label>}<Button disabled={busy} size="lg" className="w-full bg-[#17483c] text-white hover:bg-[#0f382e]">{busy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Procesando…</> : mode === "signin" ? "Ingresar a PetFlow" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}</Button></form>{message && <p className="mt-4 text-sm text-[#28604f]" role="status">{message}</p>}{error && <p className="mt-4 text-sm text-[#a14e45]" role="alert">{error}</p>}<div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm"><button type="button" className="text-[#28604f] underline underline-offset-4" onClick={() => { setMode(mode === "signin" ? "recovery" : "signin"); setError(""); }}>{mode === "signin" ? "¿Olvidaste tu contraseña?" : "Volver a iniciar sesión"}</button>{mode === "signin" && <button type="button" className="text-[#28604f] underline underline-offset-4" onClick={() => setMode("signup")}>Crear cuenta</button>}</div></div></div>;
}

function ProfileDialog({ user, close, refresh }: { user: any; close: () => void; refresh: () => Promise<unknown> }) {
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const result = await supabase.auth.updateUser({ data: { full_name: name.trim(), name: name.trim() } });
    if (result.error) setMessage(result.error.message);
    else { await refresh(); setMessage("Perfil actualizado."); window.setTimeout(close, 700); }
    setSaving(false);
  }
  return <div className="profile-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title"><div className="flex items-start justify-between gap-4"><div><span className="eyebrow">CUENTA PERSONAL</span><h2 id="profile-dialog-title">Ver y editar perfil</h2></div><button type="button" className="profile-close" onClick={close} aria-label="Cerrar"><span aria-hidden="true">×</span></button></div><div className="profile-summary"><div className="profile-large-avatar">{name.charAt(0).toUpperCase() || "P"}</div><div><strong>{name || "Responsable"}</strong><span>{user?.email || "Correo no disponible"}</span></div></div><form onSubmit={save} className="profile-form"><label>Nombre visible<input value={name} onChange={event => setName(event.target.value)} minLength={2} required placeholder="Tu nombre" /></label><label>Correo electrónico<input value={user?.email || ""} readOnly /></label><Button disabled={saving} className="w-full bg-[#17483c] text-white hover:bg-[#0e382e]">{saving ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : <><Pencil className="mr-2 h-4 w-4" />Guardar cambios</>}</Button></form>{message && <p className={`profile-message ${message === "Perfil actualizado." ? "profile-success" : "profile-error"}`} role="status">{message === "Perfil actualizado." && <Check className="mr-1 inline h-4 w-4" />}{message}</p>}</section></div>;
}

function DashboardLayoutContent({
  children,
  items,
  administrationItem,
  activeId,
  onNavigate,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  items: DashboardNavItem[];
  administrationItem?: DashboardNavItem;
  activeId: string;
  onNavigate: (id: string) => void;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout, refresh } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const [isResizing, setIsResizing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const activeLabel = [...items, ...(administrationItem ? [administrationItem] : [])].find(item => item.id === activeId)?.label ?? "PetFlow";
  const navClass = "petflow-nav-item h-11 rounded-xl px-3 text-[#d9eee6] hover:bg-white/10 hover:text-white data-[active=true]:!bg-[#e9b95d] data-[active=true]:!text-[#153f35]";

  return <>
    <div className="relative" ref={sidebarRef}>
      <Sidebar collapsible="icon" className="petflow-sidebar border-r-0" disableTransition={isResizing}>
        <SidebarHeader className="h-[88px] justify-center px-3"><div className="flex items-center gap-3 px-1 w-full"><button onClick={toggleSidebar} className="petflow-collapse-button shrink-0" aria-label="Alternar navegación"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed && <div className="flex items-center gap-3 min-w-0"><div className="petflow-logo-mark"><PawPrint className="h-5 w-5" /></div><div><p className="font-display font-semibold leading-none text-[#fffaf0]">PetFlow</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#b7d4ca]">operaciones</p></div></div>}</div></SidebarHeader>
        <SidebarContent className="gap-0 px-2 pt-2">
          {!isCollapsed && <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#99b8ac]">Gestión diaria</p>}
          <SidebarMenu className="gap-1">{items.map(item => <SidebarMenuItem key={item.id}><SidebarMenuButton isActive={activeId === item.id} onClick={() => onNavigate(item.id)} tooltip={item.label} className={navClass}><item.icon className="h-[18px] w-[18px]" /><span className="font-medium">{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>
          {administrationItem && <div className="mt-auto border-t border-white/10 pt-4"><div className="mb-1 flex items-center justify-between px-3">{!isCollapsed && <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#99b8ac]">Configuración</p>}{!isCollapsed && <span className="text-[10px] text-[#7fa89b]">Propietario</span>}</div><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive={activeId === administrationItem.id} onClick={() => onNavigate(administrationItem.id)} tooltip={administrationItem.label} className={navClass}><administrationItem.icon className="h-[18px] w-[18px]" /><span className="font-medium">{administrationItem.label}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></div>}
        </SidebarContent>
        <SidebarFooter className="p-3"><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-1"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-3 rounded-xl px-2 py-2 w-full text-left hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e9b95d] group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 shrink-0 border border-white/20"><AvatarFallback className="bg-[#3b7565] text-xs font-bold text-[#fffaf0]">{user?.name?.charAt(0).toUpperCase() || "P"}</AvatarFallback></Avatar><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user?.name || "Responsable"}</p><p className="mt-0.5 truncate text-xs text-[#a8c9bd]">Mi pet shop</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={() => setProfileOpen(true)} className="cursor-pointer"><UserRound className="mr-2 h-4 w-4" />Ver y editar perfil</DropdownMenuItem><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>{profileOpen && <ProfileDialog user={user} close={() => setProfileOpen(false)} refresh={refresh} />}</SidebarFooter>
      </Sidebar>
      <div className={`absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-[#e9b95d]/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} />
    </div>
    <SidebarInset className="bg-[#f6f3eb]">{isMobile && <div className="flex h-16 items-center gap-3 border-b border-[#ded8c8] bg-[#fdfbf6]/95 px-4 backdrop-blur sticky top-0 z-40"><SidebarTrigger className="rounded-xl bg-[#e9eee8]" /><span className="font-display text-lg font-semibold text-[#153f35]">{activeLabel}</span></div>}<main className="min-h-screen flex-1 bg-[#f6f3eb] p-4 sm:p-6 lg:p-8">{children}</main></SidebarInset>
  </>;
}
