# Town urgent fixes

This build removes the four-item principles list and both Home hero buttons. The Home hero is now a single column. It shows a compact pet hangout when a pet is selected in Settings; it reads `profiles.pet_id` and falls back to `localStorage` key `town-pet:<user-id>`.

The sidebar social entry and section title are `Chat` (not `People & Chat` / `Find users & chat`). Search has been removed from the personal `You` navigation; the dedicated Search route remains available from the app's other entry points.

Chat attachment errors now display Supabase's actual error message instead of the generic instruction to rerun schema. The migration `supabase/migrations/20261017_town_chat_media_storage.sql` creates/configures the `chat-media` bucket and owner-folder policies. Run it in Supabase SQL Editor while signed in as project owner. Then reload the app and test with a small non-sensitive file. Because current code uses public URLs, attachments in this bucket are publicly readable by URL; do not use it for sensitive files.

Build verification: `npm run build` could not run in this environment because the installed `node_modules` folder does not contain Vite (`sh: vite: not found`). On Windows, extract into a clean folder, copy `.env.local` from your current project, run `npm ci`, then `npm run dev`.
