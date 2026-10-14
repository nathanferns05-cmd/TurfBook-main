import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { Toaster } from "sonner";
import logoUrl from '../assets/logo.jpg'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import appCss from '../styles.css?url'

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TurfBook',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    { rel: 'icon', type: 'image/jpeg', href: logoUrl, }, 
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors position="top-center" />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}