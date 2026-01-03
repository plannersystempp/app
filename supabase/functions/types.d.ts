declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void
}

declare module 'https://deno.land/std@0.168.0/encoding/hex.ts' {
  export function encode(data: Uint8Array): Uint8Array
}

declare module 'https://esm.sh/@supabase/supabase-js@2.39.7' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2.39.3' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2.75.1' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2.74.0' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2.7.1' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/stripe@14.11.0?target=deno' {
  import Stripe from 'stripe'
  export default Stripe
}

declare module 'https://esm.sh/stripe@14.21.0?target=deno' {
  import Stripe from 'stripe'
  export default Stripe
}

declare module 'https://esm.sh/web-push@3.6.7' {
  const webpush: any
  export default webpush
}

declare const Deno: {
  env: { get(name: string): string | undefined },
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}
