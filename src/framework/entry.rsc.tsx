import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/rsc'
import type { ReactFormState } from 'react-dom/client'
import type { ComponentType, ReactNode } from 'react'
// NEW: Define a type for our components for clarity
type Module = { default: ComponentType<{ children?: ReactNode }> }

// NEW: A helper to dynamically load components (pages or layouts)
// It returns the component or null if not found.
async function loadComponent(
  segments: string[],
  type: 'page' | 'layout',
): Promise<ComponentType<{ children?: ReactNode }> | null> {
  // Construct the path e.g., ../app/dashboard/settings/page.tsx
  const path = `../app/${[...segments, type].join('/')}.tsx`
  try {
    // Dynamically import the module
    const mod = (await import(/* @vite-ignore */ path)) as Module
    return mod.default
  } catch (e) {
    // Gracefully handle modules that don't exist
    return null
  }
}

// MODIFIED: The router is now dynamic and handles nested routes
async function router(url: URL): Promise<ReactNode> {
  const pathSegments = url.pathname.split('/').filter(Boolean)

  // 1. Find the page component for the exact path
  const Page = await loadComponent(pathSegments, 'page')

  // 2. Handle 404
  if (!Page) {
    const RootLayout = (await loadComponent([], 'layout')) || (({ children }) => <>{children}</>)
    const NotFoundPage = () => <div>404 - Not Found</div>
    return (
      <RootLayout>
        <NotFoundPage />
      </RootLayout>
    )
  }

  // 3. Find all applicable layouts, from the root down to the current segment
  const layoutPromises: Promise<ComponentType<{ children?: ReactNode }> | null>[] = []
  for (let i = 0; i <= pathSegments.length; i++) {
    const segmentsForLayout = pathSegments.slice(0, i)
    layoutPromises.push(loadComponent(segmentsForLayout, 'layout'))
  }

  // 4. Resolve all layout promises and filter out any that weren't found
  const layouts = (await Promise.all(layoutPromises)).filter(
    (layout): layout is ComponentType<{ children?: ReactNode }> => layout !== null,
  )

  // 5. Compose the page with all its layouts, from the outermost to the innermost
  const pageWithLayouts = layouts.reduceRight(
    (acc: ReactNode, Layout) => <Layout>{acc}</Layout>,
    <Page />,
  )

  return pageWithLayouts
}


// The schema of payload which is serialized into RSC stream on rsc environment
// and deserialized on ssr/client environments.
export type RscPayload = {
  // this demo renders/serializes/deserizlies entire root html element
  // but this mechanism can be changed to render/fetch different parts of components
  // based on your own route conventions.
  root: React.ReactNode
  // server action return value of non-progressive enhancement case
  returnValue?: unknown
  // server action form state (e.g. useActionState) of progressive enhancement case
  formState?: ReactFormState
}

// the plugin by default assumes `rsc` entry having default export of request handler.
// however, how server entries are executed can be customized by registering
// own server handler e.g. `@cloudflare/vite-plugin`.
export default async function handler(request: Request): Promise<Response> {
  // handle server function request
  const isAction = request.method === 'POST'
  let returnValue: unknown | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  if (isAction) {
    // x-rsc-action header exists when action is called via `ReactClient.setServerCallback`.
    const actionId = request.headers.get('x-rsc-action')
    if (actionId) {
      const contentType = request.headers.get('content-type')
      const body = contentType?.startsWith('multipart/form-data')
        ? await request.formData()
        : await request.text()
      temporaryReferences = createTemporaryReferenceSet()
      const args = await decodeReply(body, { temporaryReferences })
      const action = await loadServerAction(actionId)
      returnValue = await action.apply(null, args)
    } else {
      // otherwise server function is called via `<form action={...}>`
      // before hydration (e.g. when javascript is disabled).
      // aka progressive enhancement.
      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      const result = await decodedAction()
      formState = await decodeFormState(result, formData)
    }
  }

  // serialization from React VDOM tree to RSC stream.
  // we render RSC stream after handling server function request
  // so that new render reflects updated state from server function call
  // to achieve single round trip to mutate and fetch from server.
  const url = new URL(request.url)
  // MODIFIED: The router now returns the fully composed React node.
  const rootNode = await router(url)
  const rscPayload: RscPayload = {
    root: rootNode,
    formState,
    returnValue,
  }
  const rscOptions = { temporaryReferences }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions)

  // respond RSC stream without HTML rendering based on framework's convention.
  // here we use request header `content-type`.
  // additionally we allow `?__rsc` and `?__html` to easily view payload directly.
  const isRscRequest =
    (!request.headers.get('accept')?.includes('text/html') &&
      !url.searchParams.has('__html')) ||
    url.searchParams.has('__rsc')

  if (isRscRequest) {
    return new Response(rscStream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
        vary: 'accept',
      },
    })
  }

  // Delegate to SSR environment for html rendering.
  // The plugin provides `loadSsrModule` helper to allow loading SSR environment entry module
  // in RSC environment. however this can be customized by implementing own runtime communication
  // e.g. `@cloudflare/vite-plugin`'s service binding.
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const htmlStream = await ssrEntryModule.renderHTML(rscStream, {
    formState,
    // allow quick simulation of javscript disabled browser
    debugNojs: url.searchParams.has('__nojs'),
  })

  // respond html
  return new Response(htmlStream, {
    headers: {
      'Content-type': 'text/html',
      vary: 'accept',
    },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}