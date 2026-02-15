# TODO

## Server-side reader generation

Move Claude API calls from the browser to a backend so that a lost connection after clicking "Generate" doesn't lose the result.

**Proposed flow:**
1. Client POSTs `{ apiKey, topic, level, ... }` to a Supabase Edge Function (or Vercel Function)
2. Edge function calls Claude, parses the response, writes the reader directly to `user_data.generated_readers` in Supabase
3. Client subscribes to its Supabase row via Realtime and receives the reader as soon as it lands — no polling needed

**What needs building:**
- Edge function (Supabase or Vercel) that accepts generation params and handles the Claude call + parse + DB write
- Supabase Realtime subscription on the client (replaces waiting on the fetch to resolve)
- Update `pushGeneratedReader` flow — reader goes cloud-first instead of local-first

**Notes:**
- API key would transit the network to the edge function (currently stays in localStorage only — not fundamentally less safe, but worth noting)
- Supabase Edge Functions and Realtime are both available on the free tier
- Current client-side generation in `src/lib/api.js` (`generateReader`) can be reused or ported to the edge function
