import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const OrchestApp = lazy(() => import("@/orchest/App"));

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "إدارة أوركست | تسجيل الدخول" },
      { name: "description", content: "لوحة إدارة أوركست المحمية." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoute,
});

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-o-bg px-5 text-o-text" dir="rtl">
      <p className="text-sm font-semibold text-o-muted">جارٍ تحميل لوحة الإدارة...</p>
    </main>
  );
}

function AdminRoute() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <OrchestApp />
      </Suspense>
    </ClientOnly>
  );
}
