# LS Validation App

An app for validation — from request to quotation.

## Tech Stack

- **Frontend**: React + Vite
- **Backend / Database**: Supabase
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Forms**: React Hook Form + Zod validation
- **Offline DB**: Dexie (IndexedDB)
- **Icons**: Lucide React

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/qengineservices-hash/lsvalidationapp.git
cd lsvalidationapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Then open `.env.local` and replace the placeholder values with your real Supabase keys.
Get them from: **https://supabase.com → Your Project → Settings → API**

### 4. Start the development server

```bash
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public API key |

> ⚠️ **Never commit `.env.local` or any file containing real API keys to GitHub.**

## Security

- `.env.local` is listed in `.gitignore` and will never be pushed to GitHub
- Only `.env.example` (with placeholder values) is committed as a template
