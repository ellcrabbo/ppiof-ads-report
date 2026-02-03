# PPIOF Ads Report

A production-ready Meta Ads analytics dashboard built with Next.js 16, TypeScript, PostgreSQL, and Prisma ORM.

## Features

- 📊 **Dashboard with KPI Cards** - View total spend, impressions, clicks, CTR, CPC, and CPM
- 📈 **Campaign Analytics** - Detailed campaign performance with drill-down capabilities
- 📥 **CSV Upload** - Auto-detect and import Meta Ads Manager exports with column mapping
- 📋 **Recommendations Engine** - Deterministic rules-based recommendations for optimization
- 📄 **PDF Export** - Generate professional PDF reports for selected date ranges
- 📝 **Campaign Notes** - Add annotations and observations to campaigns
- 🔐 **Password Authentication** - Secure access via NextAuth.js
- 🎨 **Modern UI** - Built with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v4 (credentials provider)
- **PDF Generation**: @react-pdf/renderer
- **CSV Parsing**: PapaParse
- **Validation**: Zod

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/    # NextAuth configuration
│   │   │   ├── campaigns/              # Campaign CRUD endpoints
│   │   │   ├── dashboard/             # Dashboard metrics API
│   │   │   ├── export/                # PDF export endpoint
│   │   │   └── upload/                # CSV upload endpoint
│   │   ├── campaign/[id]/             # Campaign detail page
│   │   ├── dashboard/                 # Main dashboard page
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Login page
│   ├── components/ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── csv-parser.ts              # CSV parsing and column mapping
│   │   ├── db.ts                      # Prisma client
│   │   ├── pdf-generator.ts           # PDF generation utilities
│   │   └── recommendations.ts         # Recommendation engine
│   └── middleware.ts                  # Route protection
├── prisma/
│   ├── schema.prisma                   # Database schema
│   └── seed.ts                        # Database seeding script
├── samples/
│   └── sample-ads-export.csv          # Sample CSV for testing
└── .env.example                       # Environment variables template
```

## Database Schema

### Models

- **ImportRun**: Tracks CSV uploads for multi-run comparison
- **Campaign**: Campaign-level data with metrics
- **AdSet**: Ad set-level data with breakdowns
- **Ad**: Individual ad data with creative URLs
- **DailyMetric**: Time series metrics for charts
- **CampaignNote**: User annotations

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (local or cloud-hosted)
- npm or bun package manager

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd ppiof-ads-report
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/ppiof_ads_report"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # Admin Password
   ADMIN_PASSWORD="admin123"
   ```

3. **Initialize the database**:
   ```bash
   # Generate Prisma client
   bun run db:generate

   # Push schema to database
   bun run db:push

   # (Optional) Seed with sample data
   bun run db:seed
   ```

4. **Run the development server**:
   ```bash
   bun run dev
   ```

5. **Access the application**:
   - Open http://localhost:3000 in your browser
   - Sign in with the password from `ADMIN_PASSWORD`

## CSV Upload Format

The application supports Meta Ads Manager CSV exports with the following columns (auto-detected):

- `Campaign name` - Campaign name
- `Ad set name` - Ad set name
- `Ad name` - Ad name
- `Amount spent (USD)` - Spend amount
- `Impressions` - Number of impressions
- `Reach` - Number of people reached
- `Link clicks` - Number of link clicks
- `Results` - Number of conversions/results
- `Result Type` - Type of result (e.g., purchase, lead)
- `Reporting starts` - Date range start
- `Reporting ends` - Date range end
- `Objective` - Campaign objective
- `Delivery status` - Campaign status
- `Platform` - Platform (facebook, instagram)

The system automatically:
- Detects column mappings with confidence scoring
- Ignores "Totals" rows
- Warns about breakdown exports
- Aggregates data by campaign, ad set, and ad
- Calculates derived metrics (CPM, CPC, CTR)

## Deployment

### Vercel Deployment

#### Option 1: Vercel Postgres

1. **Create a new project**:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository

2. **Set up Vercel Postgres**:
   - Go to Storage → Create Database → Postgres
   - Copy the connection string

3. **Configure environment variables**:
   ```
   DATABASE_URL=<your-vercel-postgres-connection-string>
   NEXTAUTH_URL=https://your-project.vercel.app
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   ADMIN_PASSWORD=<your-secure-password>
   ```

4. **Deploy**:
   ```bash
   vercel deploy
   ```

5. **Run migrations on deploy**:
   - Add a build script in `package.json`:
     ```json
     "postinstall": "prisma generate"
     ```
   - The schema will be automatically pushed to Vercel Postgres

#### Option 2: Supabase

1. **Create Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project

2. **Get connection string**:
   - Go to Settings → Database
   - Copy the connection URI (with password)

3. **Configure environment variables**:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   NEXTAUTH_URL=https://your-project.vercel.app
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   ADMIN_PASSWORD=<your-secure-password>
   ```

4. **Deploy**:
   ```bash
   vercel deploy
   ```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | Base URL of your app | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Secret for NextAuth | Generate with: `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | Admin password for login | `your-secure-password` |

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

### Data Management
- `POST /api/upload` - Upload and process CSV file
- `GET /api/campaigns` - List campaigns with filters
- `GET /api/campaigns/[id]` - Get campaign details
- `POST /api/campaigns/[id]/notes` - Add campaign note
- `GET /api/dashboard` - Get dashboard metrics
- `POST /api/export` - Export PDF report

## Recommendations Engine

The application includes a deterministic recommendations engine that analyzes:

### Campaign-Level Recommendations
- High CPC (> $3)
- Low CTR (< 0.5%)
- Low conversion rate (< 2%)
- High CPM (> $20)
- Ad frequency (> 5x)
- Low return on spend

### Ad Set & Ad-Level Recommendations
- Low CTR performance
- High CPC alerts
- Creative fatigue detection

Each recommendation includes:
- **What Happened**: Performance summary with metrics
- **What to Change**: Actionable optimization steps
- **What to Test**: Testing suggestions

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
bun run db:push

# Reset database (WARNING: Deletes all data)
bun run db:reset
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
bun run db:generate
```

### CSV Upload Issues

- Ensure CSV format matches Meta Ads export
- Check for "Totals" rows (automatically filtered)
- Verify column headers are properly formatted
- Breakdown exports are not recommended

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
