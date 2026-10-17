# Town — Stage 5

Adds the first moderation layer: reporting posts/comments and a community-moderator queue with removal/dismissal actions.

## Supabase
Run `supabase/stage5-moderation.sql` once in the existing Town Supabase project.

## Local
```bash
npm install
npm run build
npm run dev
```

Open `#/moderation` while signed in as a community owner/moderator.

## Profile avatars
The current profile avatar library contains 20 supplied images in `public/avatars/`. Run `supabase/stage11-town-avatars.sql` once in the existing Town Supabase project before testing profile settings. The migration removes the old generated/URL-based avatar fields and stores only the selected fixed avatar ID.
