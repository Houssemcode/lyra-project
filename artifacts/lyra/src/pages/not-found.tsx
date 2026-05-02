import { Link } from "wouter";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-muted-foreground/20 mb-4" style={{ fontFamily: "var(--app-font-display)" }}>404</p>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">This page doesn't exist.</p>
        <Button asChild>
          <Link href="/"><Home size={15} className="mr-1.5" /> Back to Today</Link>
        </Button>
      </div>
    </div>
  );
}
