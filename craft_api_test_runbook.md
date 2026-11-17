# Craft API Test Runbook

This runbook exercises the craft endpoints against a Supabase project and the local Next.js app. Use a test account and test crafts; the completion check changes that account's XP.

## 1. Prepare Supabase and the app

1. In Supabase Dashboard, open **SQL Editor** and run the SQL from [`supabase/migrations/20261115120000_create_crafts.sql`](supabase/migrations/20261115120000_create_crafts.sql). This creates the `crafts` table, its row-level security policies, and the `complete_craft` RPC used by the API.
2. Make sure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set for that same Supabase project. The publishable key is also called the anon key in some projects. Do not use a service-role key in API requests.
3. Make sure the project has a confirmed test user with an email and password.
4. In a terminal at the repository root, start the app:

   ```powershell
   npm run dev
   ```

5. In a second PowerShell terminal, set the connection values and sign in to get a bearer token:

   ```powershell
   $base = 'http://localhost:3000'
   $supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co'
   $publishableKey = 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
   $email = 'craft-test@example.com'
   $password = 'YOUR_TEST_USER_PASSWORD'

   $login = Invoke-RestMethod `
     -Method Post `
     -Uri "$supabaseUrl/auth/v1/token?grant_type=password" `
     -Headers @{ apikey = $publishableKey } `
     -ContentType 'application/json' `
     -Body (@{ email = $email; password = $password } | ConvertTo-Json)

   $token = $login.access_token
   $headers = @{
     Authorization = "Bearer $token"
     apikey = $publishableKey
     'Content-Type' = 'application/json'
   }
   ```

Use the same Supabase URL and key configured in `.env.local`. If the sign-in request fails, confirm the user is confirmed and the credentials are correct.

## 2. Check authentication

Run a request without an authorization header:

```powershell
Invoke-WebRequest -Method Get -Uri "$base/api/crafts" -SkipHttpErrorCheck |
  Select-Object StatusCode, Content
```

Expected: `401` with an `unauthorized` error response.

## 3. Create and list crafts

Create a craft and save its ID for later requests:

```powershell
$created = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/crafts" `
  -Headers $headers `
  -Body (@{
    title = 'Test paper flowers'
    description = 'Temporary API test craft'
    photo_url = $null
  } | ConvertTo-Json)

$created.craft
$craftId = $created.craft.id
```

Expected: `201 Created`; the response has a `craft` with a UUID, title, `status` of `todo`, nullable `completed_at`, and timestamps.

List all crafts and filter by status:

```powershell
Invoke-RestMethod -Method Get -Uri "$base/api/crafts" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$base/api/crafts?status=todo" -Headers $headers
```

Expected: `200 OK` and `{ crafts: [...] }`. The filtered list should contain only crafts with the requested status. Check invalid filter handling:

```powershell
Invoke-WebRequest -Method Get -Uri "$base/api/crafts?status=unknown" `
  -Headers $headers -SkipHttpErrorCheck |
  Select-Object StatusCode, Content
```

Expected: `400 Bad Request`.

## 4. Check request validation

Both requests should return `400 Bad Request`:

```powershell
Invoke-WebRequest -Method Post -Uri "$base/api/crafts" -Headers $headers `
  -Body (@{ title = '' } | ConvertTo-Json) -SkipHttpErrorCheck |
  Select-Object StatusCode, Content

Invoke-WebRequest -Method Post -Uri "$base/api/crafts" -Headers $headers `
  -Body (@{ title = ('x' * 129) } | ConvertTo-Json) -SkipHttpErrorCheck |
  Select-Object StatusCode, Content
```

The API also accepts `description` and `photo_url` as `null`; description is limited to 2000 characters. Status must be `todo`, `in_progress`, or `complete`.

## 5. Update and complete a craft

First update a regular field and status:

```powershell
$updated = Invoke-RestMethod `
  -Method Patch `
  -Uri "$base/api/crafts/$craftId" `
  -Headers $headers `
  -Body (@{ status = 'in_progress'; description = 'Started' } | ConvertTo-Json)
$updated.craft
```

Expected: `200 OK`; status is `in_progress` and the updated timestamp changes.

Complete the craft:

```powershell
$completed = Invoke-RestMethod `
  -Method Patch `
  -Uri "$base/api/crafts/$craftId" `
  -Headers $headers `
  -Body (@{ status = 'complete' } | ConvertTo-Json)
$completed
```

Expected: `200 OK`; `craft.status` is `complete`, `completed_at` is set, and `user` reports XP and level. The first completion should increase XP by 50.

Send the same completion request again:

```powershell
$completedAgain = Invoke-RestMethod `
  -Method Patch `
  -Uri "$base/api/crafts/$craftId" `
  -Headers $headers `
  -Body (@{ status = 'complete' } | ConvertTo-Json)
$completedAgain.user
```

Expected: `200 OK`; XP and level match the first completion response. XP must not increase a second time.

Level calculation is `floor(xp / 500) + 1`. For a boundary check, use a dedicated test account whose XP is close to 500; avoid changing production user metadata for this check.

## 6. Check not-found and user ownership

An unknown UUID should return `404` for both update and delete:

```powershell
$missingId = '00000000-0000-4000-8000-000000000000'
Invoke-WebRequest -Method Patch -Uri "$base/api/crafts/$missingId" -Headers $headers `
  -Body (@{ title = 'Missing' } | ConvertTo-Json) -SkipHttpErrorCheck |
  Select-Object StatusCode, Content
```

To check ownership, sign in as a second test user using the sign-in step above and replace `$headers` with that user's headers. Fetching their list must not show `$craftId`; patching or deleting the first user's craft must return `404`. Restore the first user's headers before cleanup.

## 7. Delete and confirm XP is retained

Delete the completed craft using the first test user's token:

```powershell
Invoke-WebRequest -Method Delete -Uri "$base/api/crafts/$craftId" `
  -Headers $headers -SkipHttpErrorCheck | Select-Object StatusCode
```

Expected: `204 No Content`. Listing crafts should no longer include `$craftId`. Deletion does not revoke XP; if checking XP through the app's user endpoint, compare it with the value returned by `$completed.user`.

## Expected coverage

| Area | Expected result |
| --- | --- |
| Missing auth | `401` |
| Create valid craft | `201` |
| Invalid title or status | `400` |
| List and filter | `200`, only the signed-in user's crafts |
| Update / complete | `200`, timestamp set on completion |
| Repeat completion | No additional XP |
| Unknown or other user's ID | `404` |
| Delete existing craft | `204`, XP retained |
