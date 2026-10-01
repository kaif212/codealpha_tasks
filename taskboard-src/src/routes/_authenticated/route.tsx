import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Gate,
});

function Gate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        {user ? <Outlet /> : <p className="p-10 text-center text-muted-foreground">Loading…</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
