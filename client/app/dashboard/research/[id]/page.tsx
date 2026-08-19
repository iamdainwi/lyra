"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { researchApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, BookOpen, MessageSquare, BrainCircuit, ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  original_query: string;
  status: string;
}

interface Source {
  id: string;
  url: string;
  title?: string;
  content?: string;
  domain?: string;
}

interface DebateMessage {
  id: string;
  agent: string;
  round: number;
  message: string;
}

interface Answer {
  answer: string;
  summary?: string;
}

// ─── Accordion component (no "type" prop bug) ─────────────────────────────────
import * as AccordionPrimitive from "@radix-ui/react-accordion";

function DebateAccordion({ messages }: { messages: DebateMessage[] }) {
  return (
    <AccordionPrimitive.Root type="multiple" className="w-full space-y-3">
      {messages.map((msg, i) => {
        const isResearcher = msg.agent === "researcher";
        return (
          <AccordionPrimitive.Item
            key={msg.id ?? i}
            value={`msg-${i}`}
            className="rounded-lg border overflow-hidden"
          >
            <AccordionPrimitive.Trigger
              className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-all hover:no-underline [&[data-state=open]>svg]:rotate-180 ${isResearcher
                ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold capitalize">{msg.agent}</span>
                <Badge variant="secondary" className="text-xs">Round {msg.round}</Badge>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200"><path d="m6 9 6 6 6-6" /></svg>
            </AccordionPrimitive.Trigger>
            <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="px-4 py-4 bg-card text-card-foreground prose prose-sm dark:prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:m-0 prose-p:leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {msg.message}
                </ReactMarkdown>
              </div>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        );
      })}
    </AccordionPrimitive.Root>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ResearchSessionPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const sessionId = params.id;

  const [session, setSession] = useState<Session | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [debate, setDebate] = useState<DebateMessage[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [activeNode, setActiveNode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref so the SSE closure always sees the latest fetchResults
  const fetchResultsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const fetchResults = async () => {
      const [srcs, dbte, ans] = await Promise.all([
        researchApi.getSources(sessionId).catch(() => [] as Source[]),
        researchApi.getDebate(sessionId).catch(() => [] as DebateMessage[]),
        researchApi.getAnswer(sessionId).catch(() => null),
      ]);
      setSources(srcs as Source[]);
      setDebate(dbte as DebateMessage[]);
      setAnswer(ans as Answer | null);
    };
    fetchResultsRef.current = fetchResults;

    const fetchInitialData = async () => {
      try {
        const data = await researchApi.getSession(sessionId) as Session;
        setSession(data);
        setStatus(data.status);

        if (data.status === "completed") {
          await fetchResults();
        } else if (data.status === "pending") {
          const token = await researchApi.getAuthToken();
          eventSource = new EventSource(researchApi.getStreamUrl(sessionId) + `?token=${token}`);

          eventSource.onmessage = (event) => {
            const parsed = JSON.parse(event.data) as { type: string; node?: string; message?: string };
            if (parsed.type === "node_update") {
              setActiveNode(parsed.node ?? "");
            } else if (parsed.type === "completed") {
              setStatus("completed");
              fetchResultsRef.current?.();
              eventSource?.close();
            } else if (parsed.type === "error" || parsed.type === "failed") {
              setStatus("failed");
              setError(parsed.message ?? "Research failed");
              eventSource?.close();
            }
          };

          eventSource.onerror = () => {
            eventSource?.close();
            pollInterval = setInterval(async () => {
              const current = await researchApi.getSession(sessionId) as Session;
              if (current.status !== "pending") {
                if (pollInterval) clearInterval(pollInterval);
                setStatus(current.status);
                if (current.status === "completed") fetchResultsRef.current?.();
              }
            }, 3000);
          };
        }
      } catch (err) {
        const e = err as Error;
        setError(e.message || "Failed to load session");
        setStatus("error");
      }
    };

    fetchInitialData();

    return () => {
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId]);

  const getNodeProgress = () => {
    const nodes = ["expand_query", "search", "extract", "deduplicate", "researcher", "critic", "synthesize"];
    const idx = nodes.indexOf(activeNode);
    return idx === -1 ? 10 : Math.floor(((idx + 1) / nodes.length) * 100);
  };

  // ── States ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "error" || status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-8 gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">Research Failed</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-8 max-w-xl mx-auto w-full text-center gap-6">
        <BrainCircuit className="w-16 h-16 text-primary animate-pulse" />
        <div>
          <h2 className="text-3xl font-heading font-bold">Agents at Work</h2>
          <p className="text-muted-foreground mt-2">
            {activeNode
              ? `Running: ${activeNode.replace(/_/g, " ")}`
              : "Initializing autonomous research graph..."}
          </p>
        </div>
        <Progress value={getNodeProgress()} className="h-2 w-full" />
      </div>
    );
  }

  // ── Completed ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full gap-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
              <ArrowLeft className="w-3 h-3 mr-1" />Back
            </Button>
          </Link>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Research Completed
          </Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-heading font-black leading-tight">{session?.original_query}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Answer + Sources */}
        <div className="lg:col-span-2 space-y-6">

          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" />
                Synthesized Answer
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {answer ? (
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:m-0 prose-p:leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {answer.answer}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="text-muted-foreground italic text-sm">No answer generated.</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Context Sources ({sources.length})
              </CardTitle>
              <CardDescription>Deduplicated sources used by the agents</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-100 px-4 pb-4">
                <div className="space-y-3">
                  {sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-8">No sources retrieved.</p>
                  ) : sources.map((s, i) => (
                    <div key={s.id ?? i} className="p-3 rounded-lg border bg-card">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-sm hover:underline text-primary flex items-center gap-1"
                      >
                        {s.title || s.url}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      {s.domain && (
                        <p className="text-xs text-muted-foreground mt-0.5">{s.domain}</p>
                      )}
                      {s.content && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{s.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Debate */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Agent Debate
              </CardTitle>
              <CardDescription>Multi-turn reasoning trace</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-200 px-4 pb-4">
                {debate.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-8">No debate transcript available.</p>
                ) : (
                  <DebateAccordion messages={debate} />
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
