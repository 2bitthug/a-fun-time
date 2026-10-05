# A Fun Time — Supabase setup

This version uses Supabase for real authentication, public profiles, connection requests, and private chat.

## 1. Create a Supabase project

Create a project at Supabase and enable the Email provider.

## 2. Configure authentication

The app registers users with a real email address, username, and password. If email confirmation is enabled, users must confirm their email before signing in.

## 3. Create the database

Open the Supabase SQL Editor and run `supabase/schema.sql`. The database trigger creates the public profile from the username stored in Auth metadata during registration.

## 4. Add environment variables

Copy `.env.example` to `.env.local` and replace the values with your project's URL and publishable key.

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Never put a Supabase service-role/secret key in the frontend.

## What is stored

- Supabase Auth: account credentials and authentication state.
- `profiles`: public username and creation time.
- `connections`: connection requests and accepted connections.
- `messages`: private direct messages between accepted connections.

Passwords are not stored in `profiles` or any application table. Supabase Auth handles password storage and verification.

## Community behaviour

Users can search public usernames, send connection requests, accept or decline requests, and open a private chat with accepted connections. Connecting in the Community section does not connect an external service or social account.
