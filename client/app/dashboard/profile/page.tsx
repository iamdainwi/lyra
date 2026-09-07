"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, User, Mail, Calendar, FlaskConical, AlertCircle,
} from "lucide-react";

interface ResearchSession {
  id: string;
  status: string;
}

interface UserProfile {
  name: string | null;
  email: string | null;
  createdAt: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // auth.getUser() is a network call; user will be null until it resolves
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) throw new Error("No active session");

        setProfile({
          name: user.user_metadata?.name ?? null,
          email: user.email ?? null,
          createdAt: user.created_at ?? null,
        });

        // Sessions for stats — best-effort
        const hist = await api.get<ResearchSession[]>("/research/history").catch(() => null);
        if (hist) setSessions(hist.data);
      } catch (e) {
        setError((e as Error).message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const completed = sessions.filter(s => s.status === "completed").length;
  const total = sessions.length;

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // ── Profile ──────────────────────────────────────────────────────────────────
  const displayName = profile?.name || profile?.email?.split("@")[0] || "User";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <h1 className="text-lg font-heading font-bold">Profile</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-lg font-semibold">{displayName}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      {/* Info rows */}
      <div className="border rounded-lg divide-y">
        <InfoRow icon={<User className="w-4 h-4" />} label="Full name" value={profile?.name ?? "—"} />
        <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile?.email ?? "—"} />
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Member since" value={formatDate(profile?.createdAt ?? null)} />
        <InfoRow
          icon={<FlaskConical className="w-4 h-4" />}
          label="Research sessions"
          value={
            <span className="flex items-center gap-2">
              {total}
              {total > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {completed} completed
                </Badge>
              )}
            </span>
          }
        />
      </div>

    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{value}</span>
    </div>
  );
}
