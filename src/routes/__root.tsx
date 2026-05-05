import { Outlet, createRootRouteWithContext, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-semibold tracking-tight">404</h1>
        <h2 className="mt-4 text-xl font-medium">Reel not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This scene didn't make the cut.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Back to library
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "CineWatch — Your personal movie journal" },
      { name: "description", content: "Track every movie you watch. Logs, stats, watchlists, and smart re-watch picks — beautifully minimal." },
      { name: "theme-color", content: "#0d0e12" },
      { property: "og:title", content: "CineWatch — Your personal movie journal" },
      { property: "og:description", content: "Track every movie you watch. Logs, stats, watchlists, and smart re-watch picks — beautifully minimal." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "CineWatch — Your personal movie journal" },
      { name: "twitter:description", content: "Track every movie you watch. Logs, stats, watchlists, and smart re-watch picks — beautifully minimal." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/895bd9f7-e22f-4771-a12d-543c0e568dbd/id-preview-af40c3b4--e0cfa868-d651-4c69-91df-c11b0a14aa6b.lovable.app-1777887160215.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/895bd9f7-e22f-4771-a12d-543c0e568dbd/id-preview-af40c3b4--e0cfa868-d651-4c69-91df-c11b0a14aa6b.lovable.app-1777887160215.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cw-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Scripts />
      </body>
    </html>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
