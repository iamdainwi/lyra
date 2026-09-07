import type { Metadata } from "next";
import { Playfair_Display, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const roboto = Roboto({ 
  subsets: ['latin'], 
  weight: ['400', '500', '700'],
  variable: '--font-sans' 
});

const playfairDisplay = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-heading' 
});

export const metadata: Metadata = {
  title: "Lyra — Autonomous Research",
  description: "Multi-agent AI research and synthesis engine",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans", roboto.variable, playfairDisplay.variable)}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
