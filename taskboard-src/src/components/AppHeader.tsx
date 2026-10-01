import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-display text-2xl font-bold">
          Taskboard<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" asChild><Link to="/dashboard">Dashboard</Link></Button>
              <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>Sign out</Button>
            </>
          ) : (
            <Button asChild><Link to="/auth">Get started</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
