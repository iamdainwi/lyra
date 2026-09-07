"use client";

import { use, useEffect, useRef, useState, KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { researchApi } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, AlertCircle, BrainCircuit, ArrowLeft,
  ExternalLink, ChevronDown, Globe, ArrowUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

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

// ─── Source favicon ───────────────────────────────────────────────────────────
function Favicon({ domain, size = 14 }: { domain?: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!domain || err) return <Globe style={{ width: size, height: size }} className="text-muted-foreground shrink-0" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      width={size}
      height={size}
      className="rounded-[2px] shrink-0"
      onError={() => setErr(true)}
    />
  );
}

// ─── Source pills row ─────────────────────────────────────────────────────────
function SourcePills({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.slice(0, 5).map((s, i) => {
        let host = s.domain;
        if (!host) {
          try { host = new URL(s.url).hostname.replace("www.", ""); } catch { host = s.url; }
        }
        return (
          <Link
            key={s.id ?? i}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/70 bg-muted/30 hover:bg-muted hover:border-border transition-colors text-xs text-muted-foreground hover:text-foreground max-w-[180px]"
          >
            <Favicon domain={s.domain} size={12} />
            <span className="truncate">{host}</span>
            <span className="text-[10px] text-muted-foreground/40 shrink-0 font-sans">{i + 1}</span>
          </Link>
        );
      })}
      {sources.length > 5 && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border/50 text-xs text-muted-foreground">
          +{sources.length - 5}
        </span>
      )}
    </div>
  );
}

// ─── Rich source card (right panel) ──────────────────────────────────────────
function SourceCard({ source, index }: { source: Source; index: number }) {
  let host = source.domain;
  if (!host) {
    try { host = new URL(source.url).hostname.replace("www.", ""); } catch { host = source.url; }
  }
  const snippet = source.content?.slice(0, 120);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group block p-3 rounded-xl hover:bg-muted/60 transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <span className="text-[10px] font-sans text-muted-foreground/50 pt-0.5 w-4 shrink-0 text-right">{index + 1}</span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <Favicon domain={source.domain} size={12} />
            <span className="text-[10px] text-muted-foreground truncate">{host}</span>
          </div>
          <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {source.title || source.url}
          </p>
          {snippet && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
              {snippet}…
            </p>
          )}
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

// ─── Agent debate accordion ───────────────────────────────────────────────────
function DebateAccordion({ messages }: { messages: DebateMessage[] }) {
  return (
    <AccordionPrimitive.Root type="multiple" className="w-full space-y-1.5">
      {messages.map((msg, i) => {
        const isResearcher = msg.agent === "researcher";
        return (
          <AccordionPrimitive.Item
            key={msg.id ?? i}
            value={`msg-${i}`}
            className="rounded-xl border overflow-hidden"
          >
            <AccordionPrimitive.Trigger
              className={`flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium transition-all [&[data-state=open]>svg]:rotate-180 ${isResearcher
                ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/30"
                : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold capitalize">{msg.agent}</span>
                <span className="text-muted-foreground/60">· Round {msg.round}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 opacity-50" />
            </AccordionPrimitive.Trigger>
            <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-foreground/80 prose-pre:bg-[#0d1117] prose-pre:rounded-xl">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
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

// ─── Persistent follow-up bar ─────────────────────────────────────────────────
function FollowUpBar({ onSubmit, loading }: { onSubmit: (q: string) => void; loading: boolean }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [value]);

  const submit = () => {
    if (value.trim() && !loading) { onSubmit(value.trim()); setValue(""); }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="shrink-0 border-t bg-background px-4 md:px-6 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background shadow-sm px-4 py-2.5 focus-within:border-foreground/20 focus-within:shadow-md transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask a follow-up..."
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 leading-relaxed py-0.5 max-h-36 disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={!value.trim() || loading}
            className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-80 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ResearchSessionPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const sessionId = params.id;
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [debate, setDebate] = useState<DebateMessage[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [status, setStatus] = useState<string>("loading");
  const [activeNode, setActiveNode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const fetchResultsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const fetchResults = async () => {
      try {
        const res = await researchApi.getResults(sessionId);
        setSources(res.sources as Source[]);
        setDebate(res.debate as DebateMessage[]);
        setAnswer(res.answer as Answer | null);
        if (res.chat) setChatMessages(res.chat);
      } catch (err) {
        console.error("Failed to fetch results", err);
      }
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
            if (parsed.type === "node_update") setActiveNode(parsed.node ?? "");
            else if (parsed.type === "completed") {
              setStatus("completed"); fetchResultsRef.current?.(); eventSource?.close();
            } else if (parsed.type === "error" || parsed.type === "failed") {
              setStatus("failed"); setError(parsed.message ?? "Research failed"); eventSource?.close();
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
    return () => { eventSource?.close(); if (pollInterval) clearInterval(pollInterval); };
  }, [sessionId]);

  const NODES = ["expand_query", "search", "extract", "deduplicate", "researcher", "critic", "synthesize"];
  const NODE_LABELS: Record<string, string> = {
    expand_query: "Expanding your query",
    search: "Searching the web",
    extract: "Reading sources",
    deduplicate: "Filtering results",
    researcher: "Writing research position",
    critic: "Critiquing the argument",
    synthesize: "Synthesizing final answer",
  };

  const handleFollowUp = async (q: string) => {
    if (!q.trim() || followUpLoading) return;
    try {
      setFollowUpLoading(true);
      setChatMessages(prev => [...prev, { role: "user", content: q }]);

      const token = await researchApi.getAuthToken();
      const res = await fetch(researchApi.getChatUrl(sessionId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: q })
      });

      if (!res.ok) throw new Error("Chat request failed");

      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            setChatMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].content += chunk;
              return newMsgs;
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const suggestions = session?.original_query ? [
    `Can you elaborate on this topic in more detail?`,
    `What are the main counter-arguments or criticisms?`,
    `How does this compare to alternative approaches?`,
    `What are the real-world implications or applications?`,
  ] : [];

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full min-h-80">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (status === "error" || status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-80 gap-4 p-8 text-center">
        <AlertCircle className="w-9 h-9 text-destructive/70" />
        <div>
          <p className="font-medium text-sm">Research failed</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>
      </div>
    );
  }

  // ── Pending ──────────────────────────────────────────────────────────────────
  if (status === "pending") {
    const activeIdx = NODES.indexOf(activeNode);
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 md:px-10 py-12 md:py-20 space-y-12">

            {/* Header */}
            <div className="space-y-4">
              <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3 h-3" />
                New search
              </Link>
              <h1 className="text-2xl md:text-3xl font-heading font-bold leading-snug tracking-tight">
                {session?.original_query}
              </h1>
            </div>

            {/* Reasoning Log */}
            <div className="border border-border/60 rounded-2xl bg-card/50 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <BrainCircuit className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground/80">Researching</h2>
              </div>

              <div className="space-y-4">
                {NODES.map((node, i) => {
                  const isCompleted = activeIdx > i || activeIdx === -1;
                  const isActive = activeIdx === i && activeIdx !== -1;
                  const isUpcoming = activeIdx < i && activeIdx !== -1;

                  return (
                    <div key={node} className={`flex items-center gap-3.5 transition-opacity duration-300 ${isUpcoming ? "opacity-30" : "opacity-100"}`}>
                      <div className="shrink-0 flex items-center justify-center w-6 h-6">
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {NODE_LABELS[node]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
        <FollowUpBar onSubmit={handleFollowUp} loading={followUpLoading} />
      </div>
    );
  }

  // ── Completed ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 md:px-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 items-start">

            {/* ── Left: main content ── */}
            <div className="space-y-6 min-w-0">

              {/* Back + Query heading */}
              <div>
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
                  <ArrowLeft className="w-3 h-3" />
                  New search
                </Link>
                <h1 className="text-xl md:text-[1.4rem] font-bold leading-snug tracking-tight">
                  {session?.original_query}
                </h1>
              </div>

              {/* Source pills (above answer, Perplexity-style) */}
              {sources.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out fill-mode-both">
                  <SourcePills sources={sources} />
                </div>
              )}

              {/* Divider */}
              <hr className="border-border/60" />

              {/* Answer — no section label, just content */}
              {answer ? (
                <div className="prose prose-base dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out delay-150 fill-mode-both
                  prose-p:leading-[1.75] prose-p:text-foreground/85
                  prose-headings:font-heading prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground
                  prose-h2:text-[1.05rem] prose-h3:text-[0.95rem]
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-normal
                  prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[0.8em] prose-code:font-normal
                  prose-pre:bg-[#0d1117] prose-pre:rounded-2xl prose-pre:text-[0.8em]
                  prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                  prose-ul:space-y-0.5 prose-ol:space-y-0.5
                  prose-li:text-foreground/85
                  prose-strong:font-semibold prose-strong:text-foreground
                  prose-table:text-sm
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {answer.answer}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No answer was generated.</p>
              )}

              {/* Related questions — same style as Perplexity */}
              {answer && suggestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Related</p>
                  <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleFollowUp(q)}
                        disabled={followUpLoading}
                        className="flex items-center justify-between gap-4 text-left text-sm px-4 py-3 bg-transparent hover:bg-muted/40 transition-colors text-foreground/75 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{q}</span>
                        <ArrowUp className="w-3.5 h-3.5 rotate-45 opacity-30 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent reasoning — collapsed */}
              {/* {debate.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Agent Reasoning</p>
                  <DebateAccordion messages={debate} />
                </div>
              )} */}

              {/* Chat Thread */}
              {chatMessages.length > 0 && (
                <div className="space-y-8 pt-8 mt-8 border-t border-border/60">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 border border-border/50">
                        {msg.role === "user" ? <span className="text-xs font-semibold">ME</span> : <BrainCircuit className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0 prose prose-base dark:prose-invert max-w-none 
                        prose-p:leading-relaxed prose-p:text-foreground/85
                        prose-headings:font-heading prose-headings:font-semibold
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[0.8em]
                        prose-pre:bg-[#0d1117] prose-pre:rounded-xl prose-pre:text-[0.8em]">
                        {msg.role === "user" ? (
                          <div className="font-semibold text-[1.1rem] text-foreground pt-1">{msg.content}</div>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                            {msg.content || "..."}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* ── Right: rich sources panel ── */}
            {sources.length > 0 && (
              <aside className="hidden lg:block sticky top-8">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2">
                  {sources.length} Sources
                </p>
                <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/50">
                  <ScrollArea className="max-h-[calc(100vh-10rem)]">
                    <div className="py-1.5">
                      {sources.map((s, i) => (
                        <SourceCard key={s.id ?? i} source={s} index={i} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </aside>
            )}

          </div>
        </div>
      </div>

      {/* Sticky bottom follow-up bar */}
      <FollowUpBar onSubmit={handleFollowUp} loading={followUpLoading} />
    </div>
  );
}
