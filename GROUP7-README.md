# Town — Group 7: Beta Readiness

This group prepares the platform for controlled beta testing.

## 1. Run the database migration

Run `supabase/stage7-beta-readiness.sql` once in the same Supabase project.

It creates `public.beta_feedback` with RLS so authenticated users can submit feedback and read their own reports.

## 2. Build

```bash
npm run build
```

## 3. Beta readiness changes

- Added a dedicated Beta Feedback page for bugs, usability issues, suggestions, and content issues.
- Captures the page being tested with each report.
- Shows the user's recent feedback reports.
- Added Terms, Privacy, and Accessibility pages.
- Added Beta Feedback to the footer.
- Footer version now identifies the application as BETA.

This group does not start public launch. It prepares the product for controlled user testing.
