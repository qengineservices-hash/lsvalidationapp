# LS Validation App

An app for validation — from request to quotation.

1. Designer can place request for site validation for services. 
2. Request to be assigned to Valdaition lead by respective city VM. 
3. Validation lead can go to site and do a detailed site validation (put all the measurement/click photos/annotate images).
4. Generate report at site level and should be able to share with the designer via email or whats app.
5. Q Engine should get generated with the same measurement (Qengine as it is excel file with MRC, SKU selection, auto measurement for some categories, aligned to work packages with download feature quotation as per Canvas - see if later API inttegration can be done with the same with limiting access to edit in RFV section to maintain sanity)
6. Check wether Supply flow can be integrated or not with the same. 
7. Dashboards to be created real time for PAN India level (Total validation request tracking, total valdation done, total quotation given). Later we can build different error reports as well with this. 

## Tech Stack

- **Frontend**: Node Js
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
