# Posted

A social app for sharing daily outfits ("fits") and shopping hauls, with a full social graph — public/private accounts, follow requests, saved collections, and contact-based friend discovery. Built solo, end-to-end, from schema design through App Store submission.

**Live on the App Store** · Built with React Native (Expo) + Supabase

Link to app store: https://apps.apple.com/us/app/posted-fits-hauls/id6791696227
---

## Overview

Posted lets users post their daily outfit or a haul of new purchases, browse an Explore feed of public posts, and follow other users — with full support for private accounts that require follow approval, similar to Instagram. Saved posts can be organized into custom collections, and users can find friends already on the app via their phone contacts or through mutual-connection suggestions.

The project spans the full stack: a Postgres/Supabase backend with row-level security, an Expo Router–based React Native client, and a production deployment pipeline through EAS to TestFlight.

## Core Features

- **Dual sign-up flow** — email/password or phone number with SMS OTP verification (Supabase Auth), including a flow for email users to optionally verify a phone number post-signup to participate in contact-based friend discovery
- **Public & private accounts** — private accounts require follow approval; a three-state follow button (Follow / Requested / Following) is used consistently across every surface in the app (search, profile, followers list, suggestions)
- **Follow request system** — a dedicated requests inbox, plus a live preview banner on the Notifications screen showing pending requests with stacked avatars
- **Saved collections** — Instagram-style "save to collection" with a bottom-sheet picker, folder-based browsing, and full-screen scrollable feeds per collection
- **Friend discovery** — contact matching via `expo-contacts`, normalized phone number lookup against a Postgres RPC (never exposing raw phone numbers between users), plus a separate mutual-friends suggestion engine based on the follow graph
- **Content feeds** — separate Explore (public posts), Wardrobe (personal outfit calendar + haul gallery), and per-collection feeds, each with independent data loading to avoid state collisions between screens
- **Notifications** — likes, comments, follows, follow requests, and follow acceptances, with read/unread state

## Architecture

**Client:** React Native, Expo Router, TypeScript. Feature logic is organized into custom hooks (`useFollows`, `usePosts`, `useSavedPosts`, `useContactFriends`, `useSuggestedFriends`) that wrap Supabase queries and expose clean, component-friendly APIs — keeping screens focused on presentation rather than data-fetching logic.

**Backend:** Supabase (Postgres + Auth + Storage). Access control is enforced almost entirely at the database layer via Row Level Security policies, rather than trusted-client checks — for example, follow-request approval is restricted server-side to the _recipient_ of the request, not just gated in the UI. Cross-user operations that need to bypass RLS safely (contact matching, mutual-friend suggestions) are implemented as `SECURITY DEFINER` Postgres functions that return only the minimum public-safe fields, so no client ever queries another user's phone number or private data directly.

**Auth:** Supabase Auth handles both email/password and phone/OTP flows through a single `AuthContext`, with a route-guard component (`RouteGaurd`) that drives the entire onboarding sequence — profile completion → optional phone verification → friend suggestions → main app — purely from server-persisted user state, so the flow resumes correctly no matter where a user drops off.

**Deployment:** EAS Build for native compilation (required once the app depended on native modules like `expo-contacts`, which don't run in Expo Go), submitted to TestFlight via `eas submit` and App Store Connect.

## Notable Engineering Problems Solved

A few representative debugging/design problems from building this out:

- **Silent RLS failures on cross-user writes.** Notifications need to be written _for_ another user (the recipient), which a naive "users can only touch their own rows" RLS policy blocks outright — and does so silently unless every insert explicitly checks its error response. Diagnosed and fixed by scoping the insert policy to the _actor_ rather than the recipient, and adding explicit error logging to every previously-unchecked insert across the codebase.
- **A trigger-induced 500 on every email signup.** New user signups began failing with an opaque `500` from Supabase Auth. Root-caused via Postgres logs to an unqualified table reference (`profiles` instead of `public.profiles`) inside a trigger function that ran in a schema context where the search path didn't include `public` — a subtle bug that only surfaces once you have more than one trigger firing on `auth.users` insert.
- **A race condition between two data loaders writing to the same state.** An Explore feed briefly flashed unfiltered (including private-account) posts before settling on the correctly filtered list. Traced to a hook that auto-loaded data in a `useEffect` on mount, racing against an explicit, privacy-aware loader called by the screen on focus — resolved by removing implicit auto-loading from the shared hook entirely and requiring every consumer to explicitly request the data shape it needs.
- **Privacy-preserving contact matching.** Rather than querying a `profiles` table with phone numbers directly from the client (which would require exposing everyone's phone number to any authenticated user), contact matching runs through a `SECURITY DEFINER` RPC that accepts a list of normalized phone numbers and returns only `id`, `name`, `username`, and `profile_image_url` for matches — the underlying `phone` column is never selectable directly by other users' clients.

## Tech Stack

`React Native` · `Expo` · `Expo Router` · `TypeScript` · `Supabase (Postgres, Auth, Storage, RLS)` · `EAS Build/Submit` · `expo-contacts`

---

_Built and shipped solo — schema design, RLS policy design, full client implementation, and App Store deployment._

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
