# Pet companion, share cards and chat uploads

## Included
- Pet name editor in Settings and in the pet panel; the pet panel opens from the pet itself and does not redirect to Settings.
- Four states: idle breathing, short contained movement when wandering is selected, contextual reacting via `window.dispatchEvent(new CustomEvent('town-pet-event', {detail:{kind:'post-published'|'community-opened'|'message-received'}}))`, and sleep after three minutes of inactivity. Clicking wakes it.
- Personalisation: name, idle behaviour, personality and accessory selection; Feed, Play, Rest controls and lightweight local progress.
- Shareable member card preview and browser-generated PNG download, containing username/display name, reputation score, days joined and pet.
- Supabase migration adds `profiles.pet_name` and configures the `chat-media` bucket and owner-folder upload policies.

## Required Supabase step
Run `supabase/migrations/20261017_town_pet_companion_and_chat_media.sql` in Supabase SQL Editor as project owner. This is required for the pet name to persist across devices and for attachment uploads to work. This project currently uses a public storage bucket for attachment URLs. Do not use it for sensitive files. For private attachments, implement signed URLs and participant-aware reads first.

## Chat attachment diagnosis
The UI now displays the Supabase Storage error. If uploads still fail, record the exact message and HTTP status. Check: project URL/key, logged-in session, bucket id `chat-media`, 20 MB limit, allowed MIME type, and that upload path begins with the authenticated user's UUID. Message insertion can separately fail if `messages` RLS or attachment columns are missing.

## Share cards
Settings > Shareable profile cards lets the user select Neon terminal or Light print and download a 1200x630 PNG. Export is client-side and does not publish the card. It includes profile name/handle, short bio, reputation, membership days, and pet name/type. Avoid putting private chat content on share cards.

## Verify locally
1. Copy `.env.local` from the existing project into this folder.
2. Run `npm ci` then `npm run build` and `npm run dev`.
3. In Settings, choose a pet, set its name, and Save profile.
4. On Home, click the small pet: test rename/save, Feed, Play, Rest, idle options, and close button. Wait 3 minutes for sleep; click to wake.
5. Dispatch the three documented `town-pet-event` kinds from the post/community/chat success handlers to enable contextual reactions.
6. In Settings, download both card styles and check the PNG.
7. Test chat attachments with two accounts after applying the migration.
