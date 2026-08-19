"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, Clock, CheckCircle, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { researchApi } from "@/lib/api";
import api from "@/lib/api";

interface ResearchSession {
  id: string;
  original_query: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get<ResearchSession[]>("/research/history")
      .then((r) => setSessions(r.data))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setIsLoading(true);
      const data = await researchApi.startSession(query);
      if (data.session_id) {
        router.push(`/dashboard/research/${data.session_id}`);
      }
    } catch (error) {
      console.error("Failed to start research:", error);
      setIsLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />;
  };

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "completed") return "default";
    if (status === "failed") return "destructive";
    return "secondary";
  };

  const suggestions = [
    "Long-term effects of microplastics on human health",
    "How does quantum computing threaten current encryption?",
    "Future of solid-state batteries for EVs",
  ];

  return (
    <div className="flex flex-col items-center w-full px-4 py-10 gap-12 max-w-3xl mx-auto">

      {/* Hero Search */}
      <div className="w-full text-center space-y-3 pt-6">
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight leading-tight">
          What do you want to<br />
          <span className="text-primary">research today?</span>
        </h1>
        <p className="text-muted-foreground text-base">
          Lyra&apos;s agents will debate and synthesize the answer from live web sources.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 w-full mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="research-query"
              className="pl-10 h-12 text-base"
              placeholder="Ask a research question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="h-12 px-5" disabled={isLoading || !query.trim()}>
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><ArrowRight className="w-4 h-4 mr-1" />Research</>
            }
          </Button>
        </form>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Zap className="w-3 h-3 text-primary" />
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Research</h2>
          {sessions.length > 0 && (
            <span className="text-xs text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {sessionsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Search className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-muted-foreground">No research sessions yet</p>
              <p className="text-sm text-muted-foreground/60">Submit a question above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                onClick={() => router.push(`/dashboard/research/${session.id}`)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate leading-snug">{session.original_query}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {new Date(session.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusIcon(session.status)}
                      <Badge variant={statusVariant(session.status)} className="capitalize text-xs">
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
