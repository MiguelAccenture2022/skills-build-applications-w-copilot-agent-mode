# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route selection and rendering in React components, and use the shared API client for all `/api` requests. Each capability view should expose accessible loading, empty, and error states without embedding business or persistence logic.
- Logic tier decision: Keep request validation and HTTP response mapping in the Express routes, and put reusable capability behavior in the service layer. Return deliberate 4xx responses for invalid or unknown resources rather than leaking Mongoose cast or validation errors as 500s.
- Data tier decision: Express required fields, references, and valid value ranges in the Mongoose models. Keep seed data representative of all four capabilities and make repeated seeding idempotent.
- Activity tracking approach: Validate that submitted user and team IDs are well-formed and refer to existing records. Persist the user, team, type, and minutes, and compute points and `occurredAt` on the server.
- Team management approach: Require a non-empty team name, preserve the submitted name and mascot, and store members as user references. Return created teams in the same shape used by the list endpoint.
- Leaderboard approach: Sum activity points by team, sort by total points descending, and assign ranks starting at 1. Keep the response entries limited to `teamName`, `totalPoints`, and `rank`.
- Workout suggestions approach: Find the user by email and use their goal or recent activity pattern to select a relevant first suggestion with an explanatory reason. Return a deliberate 4xx response when no user matches.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`. Model assertion failures indicate missing or incorrect schema requirements; seed failures indicate incomplete or non-idempotent sample data. Baseline: 4 model contract tests fail and the seed test passes.
- API command: `npm run test:api --prefix octofit-tracker/backend`. Failures identify incorrect status codes or response behavior for activities, teams, leaderboard, or workout suggestions. Baseline: all 4 API contract tests fail; activity/team validation returns 501, the leaderboard is empty, and workout suggestions omit the expected reason.
- Frontend command: `npm test --prefix octofit-tracker/frontend`. Failures identify missing API rendering or accessible loading, empty, and error states. Baseline: all 15 presentation contract tests fail across those behaviors.
- Backend build command: `npm run build --prefix octofit-tracker/backend`. TypeScript errors indicate a backend implementation or model type mismatch; this build has not yet been run for the baseline.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`. TypeScript or Vite build errors indicate a frontend type or production-bundling problem; this build has not yet been run for the baseline.

Run checks in dependency order: data contracts, API contracts, frontend contracts, then both builds. A passing build does not replace the behavior checks.
