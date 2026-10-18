# Town implementation notes

## Profile settings migration (required for account-level persistence)

In the Supabase dashboard for the Town project, open **SQL Editor**, paste and run `supabase/migrations/20261017_town_profile_settings.sql`, and confirm it completes before testing profile save. It adds the profile fields used by Settings and an owner-only update policy. The policy limits profile updates to the signed-in user's own row; it does not grant update access to other users' rows.

The pet selector temporarily falls back to local browser storage if the `pet_id` column is not available, but account-wide pet persistence requires the migration.

## Local checks

Run `npm ci`, then `npm run build`. The source files were syntax-checked after the changes, but a full Vite build and live Supabase test could not be run in this environment because dependencies could not be installed here.

## Changes in this revision

- Restyled the home hero as a compact principles list; removed the permanent cat mascot from the live app.
- Added a global search form for published posts and public active communities.
- Renamed the primary navigation item to Home and added Settings under You.
- Curated the default community directory to seven entries without deleting community records; users can expand to the full directory or search/filter.
- Improved the empty feed state with community discovery and post-creation actions, without fabricated activity.
- Removed the profile banner picker and preview banner variants from Settings.
- Added 18 selectable optional pet companions plus a no-pet choice.
- Wired accent colour through the app shell and common navigation/focus/button styles.
- Made profile save/load errors show the underlying Supabase message to aid diagnosis.
