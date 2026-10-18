# Town fixes and verification status

## Changes in this package
- Home page hero has no four-principle list and no “Explore communities” / “Open the feed” buttons.
- Added a centered SEARCH shortcut in the top navigation.
- Primary navigation uses the label “Chat”; Search is not in the personal (“You”) navigation.
- Added “Days joined” to the Reputation contribution stats, calculated from `profiles.created_at`.
- Uses the supplied cursor artwork recolored neon green, at a deliberately small 32×32 PNG size. The CSS hotspot is set near the raised fingertip.
- Home pet remains a compact companion in its own small area and is loaded from the selected profile pet, with the per-user local-storage fallback. It is hidden when the saved selection is `No pet`.
- Attachment error handling now displays the actual Storage error. If storage succeeds but the message row fails, it displays the database error too.
- Includes `supabase/migrations/20261017_town_chat_media_storage.sql` for the `chat-media` bucket and per-user upload policies.

## Required setup
1. Extract this ZIP to a new folder.
2. Copy `.env.local` from your existing local project into this folder. Do not share that file.
3. In Command Prompt, change directory into this exact extracted folder, then run `npm ci` and `npm run dev`.
4. In Supabase SQL Editor, run `supabase/migrations/20261017_town_chat_media_storage.sql` using a project-owner account.
5. Test with a signed-in account: open Home, verify principles/buttons are gone, verify centered Search and Chat label, open Reputation and check Days joined, select a pet in Settings and return Home, then send an attachment in Chat.

## Important limits
- The app build could not be verified in the supplied execution environment because Vite is not installed in its `node_modules`; `npm run build` failed with `vite: not found`.
- The SQL migration has not been run against the user's Supabase project, and file upload has not been tested against their live database. If an upload still fails, the UI should now display the actual Supabase Storage or message-insert error; use that exact error to diagnose the remaining policy/schema issue.
- This ZIP is not deployed to GitHub or Vercel.
