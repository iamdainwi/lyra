"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import {
  BrainCircuit, Plus, LayoutDashboard, LogOut,
  Clock, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResearchSession {
  id: string;
  original_query: string;
  status: string;
  created_at: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />;
  if (status === "failed") return <XCircle className="w-3 h-3 text-destructive shrink-0" />;
  return <Clock className="w-3 h-3 text-muted-foreground shrink-0 animate-pulse" />;
}

function AppSidebar({ sessions, sessionsLoading }: { sessions: ResearchSession[]; sessionsLoading: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      setUserName(user?.user_metadata?.name ?? null);
    });
  }, []);

  const displayName = userName || userEmail?.split("@")[0] || "User";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="px-4 py-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-primary shrink-0" />
          <span className="font-heading font-black text-xl tracking-tight">LYRA</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Link href="/dashboard">
                    <Plus className="w-4 h-4" />
                    <span>New Research</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Sessions */}
        <SidebarGroup>
          <SidebarGroupLabel>Recent Sessions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessionsLoading ? (
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </SidebarMenuItem>
              ) : sessions.length === 0 ? (
                <SidebarMenuItem>
                  <p className="px-2 py-1 text-xs text-muted-foreground italic">No sessions yet.</p>
                </SidebarMenuItem>
              ) : (
                sessions.slice(0, 15).map((session) => {
                  const isActive = pathname === `/dashboard/research/${session.id}`;
                  return (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton isActive={isActive} className="h-auto py-2">
                        <Link href={`/dashboard/research/${session.id}`}>
                          <StatusIcon status={session.status} />
                          <span className="truncate text-xs leading-snug">{session.original_query}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter className="border-t p-2">
        <DropdownMenu>
          {/* Base UI MenuPrimitive.Trigger renders as <button> by default.
              Using the render prop swaps it for a <div>, eliminating button-in-button. */}
          <DropdownMenuTrigger
            render={
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Valid session — user is authenticated, show the dashboard
        setAuthLoading(false);
      } else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        // SIGNED_OUT: explicit logout
        // INITIAL_SESSION with no session: truly not authenticated on first load
        // All other events (TOKEN_REFRESHED, USER_UPDATED, etc.) are ignored
        // to avoid false positives during the brief post-login handshake.
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    api.get<ResearchSession[]>("/research/history")
      .then((r) => setSessions(r.data))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar sessions={sessions} sessionsLoading={sessionsLoading} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex h-12 items-center border-b px-4 gap-2 shrink-0">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
