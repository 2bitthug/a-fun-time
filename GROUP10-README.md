# Town — Group 10: Grow the Town

Final planned group in the current roadmap.

Included:
- Town growth dashboard
- Public community and category metrics
- Community expansion principles
- Recent community additions
- Authenticated community suggestion workflow
- User-visible history of submitted suggestions
- Explicit discovery and community-led growth guidance

Run `supabase/stage10-grow-town.sql`, then `npm run build`.

Group 10 completes the current implementation roadmap. Future work should be driven by real usage, moderation needs, community health, and user feedback rather than adding features by default.

## Current avatar update
The profile-picture system now uses the 20 supplied Town avatars in `public/avatars/`. Run `supabase/stage11-town-avatars.sql` in the existing Town Supabase project to remove the old avatar URL/preset fields and use `profiles.avatar_id` instead.
