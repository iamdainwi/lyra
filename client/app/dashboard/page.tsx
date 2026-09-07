"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e as any);
    }
  };

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
    <div className="flex items-center w-full max-w-3xl mx-auto h-screen">

      {/* Hero Search */}
      <div className="w-full text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight leading-tight">
          What do you want to<br />
          <span className="text-primary">research today?</span>
        </h1>
        <p className="text-muted-foreground text-base">
          Lyra&apos;s agents will debate and synthesize the answer from live web sources.
        </p>

        <div className="w-full mt-8 text-left">
          <div className="relative flex flex-col rounded-2xl border border-border bg-background shadow-sm focus-within:border-foreground/30 focus-within:shadow-md transition-all">
            <textarea
              id="research-query"
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask anything..."
              className="w-full resize-none bg-transparent text-base md:text-lg outline-none placeholder:text-muted-foreground/50 px-5 pt-4 pb-12 max-h-60 disabled:opacity-50"
            />
            
            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
              {/* Fake Pro toggle for aesthetic */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                Pro Search
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
                className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-80 active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 justify-center pt-4">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setQuery(s); setTimeout(() => handleSearch(new Event("submit") as any), 0); }}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border border-border/70 bg-muted/20 hover:bg-muted/60 hover:border-border transition-colors text-muted-foreground hover:text-foreground"
            >
              <Search className="w-3 h-3 opacity-50" />
              {s}
            </button>
          ))}
        </div>
      </div>


    </div>
  );
}
