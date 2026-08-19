import Link from "next/link";
import { ArrowRight, BrainCircuit, Search, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="flex h-16 items-center justify-between px-6 border-b bg-background">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-primary" />
          <span className="font-heading font-black text-xl tracking-tight">LYRA</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 md:py-32">
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter leading-tight">
              Autonomous Research <br className="hidden md:block" />
              <span className="text-primary">Without Hallucinations.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-sans max-w-2xl mx-auto">
              Lyra pits an AI Researcher and Critic against each other, debating over live web sources until they synthesize the absolute truth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full">
                  Start Your Research <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/30 py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-heading font-bold">How Lyra Works</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">1. Deep Crawl</h3>
                <p className="text-muted-foreground">Lyra expands your query and fetches real-time web pages to gather massive context.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">2. Agentic Debate</h3>
                <p className="text-muted-foreground">A Researcher proposes theories while a Critic tries to debunk them using the fetched sources.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Database className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">3. Final Synthesis</h3>
                <p className="text-muted-foreground">Once consensus is reached, a Synthesizer writes a comprehensive, citation-backed answer.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Lyra Autonomous Research. All rights reserved.</p>
      </footer>
    </div>
  );
}
