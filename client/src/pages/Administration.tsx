import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { roleDefaults, roleLabels, permissionCatalog, type MembershipRole, type PermissionKey } from "@shared/permissions";
import { Check, ChevronRight, LockKeyhole, Save, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const roleOrder: MembershipRole[] = ["manager", "cashier", "assistant", "viewer"];

type PermissionState = Record<PermissionKey, boolean>;

function emptyPermissions(): PermissionState {
  return Object.fromEntries(permissionCatalog.map(item => [item.key, false])) as PermissionState;
}

function permissionsForRole(role: MembershipRole): PermissionState {
  const next = emptyPermissions();
  if (role !== "owner") for (const key of roleDefaults[role]) next[key] = true;
  return next;
}

export default function Administration() {
  const utils = trpc.useUtils();
  const membersQuery = trpc.administration.members.useQuery(undefined, { retry: false });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newUserId, setNewUserId] = useState("");
  const [role, setRole] = useState<MembershipRole>("assistant");
  const [permissions, setPermissions] = useState<PermissionState>(() => permissionsForRole("assistant"));
  const [isNew, setIsNew] = useState(false);
  const saveMutation = trpc.administration.saveMember.useMutation({
    onSuccess: () => {
      toast.success("Permisos guardados correctamente.");
      setIsNew(false);
      setNewUserId("");
      void utils.administration.members.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const suspendMutation = trpc.administration.suspendMember.useMutation({
    onSuccess: () => {
      toast.success("Acceso suspendido.");
      setSelectedId(null);
      void utils.administration.members.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const members = membersQuery.data?.members ?? [];
  const availableUsers = membersQuery.data?.availableUsers ?? [];
  const selected = members.find(item => item.membership.id === selectedId);
  const memberCountLabel = `${members.length} ${members.length === 1 ? "miembro" : "miembros"}`;
  const groupedPermissions = useMemo(() => permissionCatalog.reduce<Record<string, typeof permissionCatalog[number][]>>((groups, item) => {
    (groups[item.group] ??= []).push(item);
    return groups;
  }, {}), []);

  useEffect(() => {
    if (!selected) return;
    const next = emptyPermissions();
    for (const item of selected.permissions) next[item.permission as PermissionKey] = item.enabled;
    setRole(selected.membership.role);
    setPermissions(next);
    setIsNew(false);
  }, [selected]);

  const startNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setRole("assistant");
    setPermissions(permissionsForRole("assistant"));
    setNewUserId(availableUsers[0] ? String(availableUsers[0].id) : "");
  };
  const changeRole = (next: MembershipRole) => {
    setRole(next);
    if (next !== "owner") setPermissions(permissionsForRole(next));
  };
  const save = () => {
    const userId = isNew ? Number(newUserId) : selected?.user.id;
    if (!userId) return toast.error("Elegí una persona para asignarle permisos.");
    saveMutation.mutate({
      userId,
      role,
      permissions: permissionCatalog.map(item => ({ permission: item.key, enabled: permissions[item.key] })),
    });
  };

  return <div className="administration-page">
    <section className="administration-hero">
      <div className="administration-hero-icon"><ShieldCheck className="h-6 w-6" /></div>
      <div className="min-w-0 flex-1"><span className="eyebrow">ADMINISTRACIÓN DEL NEGOCIO</span><h2>Herramientas de gestión</h2><p>Definí quién puede consultar, vender, editar y administrar PetFlow. Los permisos se validan en el servidor.</p></div>
      <div className="administration-hero-stat"><strong>{memberCountLabel}</strong><span>con acceso al negocio</span></div>
    </section>

    <div className="administration-grid">
      <section className="administration-members content-card">
        <div className="administration-section-heading"><div><span className="eyebrow">EQUIPO</span><h3>Personas con acceso</h3></div><Button onClick={startNew} className="rounded-xl bg-[#17483c] text-white hover:bg-[#0e382e]" disabled={!availableUsers.length}><UserPlus className="mr-2 h-4 w-4" />Agregar persona</Button></div>
        {members.length ? <div className="member-list">{members.map(item => <button key={item.membership.id} onClick={() => setSelectedId(item.membership.id)} className={cn("member-row", selectedId === item.membership.id && "member-row-selected")}><div className="member-avatar">{(item.user.name || item.user.email || "U").charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1 text-left"><strong>{item.user.name || "Sin nombre"}</strong><span>{item.user.email || item.user.openId}</span></div><span className={cn("role-pill", `role-${item.membership.role}`)}>{roleLabels[item.membership.role]}</span><ChevronRight className="h-4 w-4 text-[#8d9b92]" /></button>)}</div> : <div className="administration-empty"><UsersRound className="h-5 w-5" /><div><strong>Aún no hay miembros</strong><p>Cuando otra persona inicie sesión, podrás asignarle un rol desde aquí.</p></div></div>}
        {!availableUsers.length && <p className="administration-hint"><LockKeyhole className="h-4 w-4" />No hay usuarios nuevos disponibles para agregar. Compartí el acceso de PetFlow y volvé aquí cuando la persona haya iniciado sesión.</p>}
      </section>

      <section className="administration-editor content-card">
        {isNew || selected ? <>
          <div className="administration-section-heading"><div><span className="eyebrow">CONFIGURACIÓN DE ACCESO</span><h3>{isNew ? "Nuevo miembro" : selected?.user.name || "Editar miembro"}</h3></div><span className="editor-lock"><ShieldCheck className="h-4 w-4" />Seguro</span></div>
          {isNew && <label className="admin-field"><span>Persona</span><select value={newUserId} onChange={event => setNewUserId(event.target.value)} className="select-control w-full"><option value="">Elegir usuario</option>{availableUsers.map(user => <option key={user.id} value={user.id}>{user.name || user.email || user.openId}</option>)}</select></label>}
          <label className="admin-field"><span>Rol operativo</span><select value={role} onChange={event => changeRole(event.target.value as MembershipRole)} className="select-control w-full">{roleOrder.map(item => <option key={item} value={item}>{roleLabels[item]}</option>)}</select></label>
          <div className="permission-heading"><div><span className="eyebrow">PERMISOS DETALLADOS</span><p>Podés ajustar cada permiso sin cambiar el rol.</p></div><button onClick={() => setPermissions(permissionsForRole(role))} className="permission-reset">Restablecer rol</button></div>
          <div className="permission-groups">{Object.entries(groupedPermissions).map(([group, items]) => <div className="permission-group" key={group}><h4>{group}</h4>{items.map(item => <label className="permission-row" key={item.key}><span><strong>{item.label}</strong><small>{item.key}</small></span><input type="checkbox" checked={permissions[item.key]} onChange={event => setPermissions(current => ({ ...current, [item.key]: event.target.checked }))} /></label>)}</div>)}</div>
          <div className="editor-actions"><Button variant="outline" onClick={() => { setIsNew(false); setSelectedId(null); }}>Cancelar</Button><Button onClick={save} disabled={saveMutation.isPending} className="rounded-xl bg-[#17483c] text-white hover:bg-[#0e382e]"><Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? "Guardando…" : "Guardar permisos"}</Button>{selected && <Button variant="ghost" onClick={() => suspendMutation.mutate({ membershipId: selected.membership.id })} className="ml-auto text-[#a84f3b] hover:bg-[#fae4de] hover:text-[#a84f3b]">Suspender acceso</Button>}</div>
        </> : <div className="administration-editor-empty"><div className="administration-empty-icon"><ShieldCheck className="h-6 w-6" /></div><h3>Elegí una persona para empezar</h3><p>Seleccioná un miembro de la lista o agregá una persona para configurar su rol y sus permisos.</p></div>}
      </section>
    </div>
    {membersQuery.error && <p className="administration-error">No se pudo cargar Administración. Solo el propietario puede gestionar roles y permisos.</p>}
  </div>;
}
