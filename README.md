# Rama Software & IT Solutions

Enterprise software, network infrastructure and cybersecurity for mission-critical organisations.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your Supabase project settings → API
3. Copy your Project URL and anon/public key
4. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 3. Run Database Migration

1. Go to your Supabase project → SQL Editor
2. Copy the contents of `supabase-migration.sql`
3. Paste and run the SQL script
4. This will create all necessary tables, functions, and security policies

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Admin Access

1. Navigate to `/admin` (you'll need to set up routing)
2. Sign up with the email that matches the admin bootstrap email (default: `admin@ramasoftware.com`)
3. The first user with this email will automatically become an admin
4. You can then manage other admins from the admin panel

## Database Schema

The project includes the following Supabase tables:

- **user_roles**: Manages admin access control
- **contact_messages**: Stores form submissions from the website
- **posts**: Content management for news, careers, internships, and events
- **admin_bootstrap**: Controls initial admin setup

## Features

- **Public Website**: Complete landing page with services, portfolio, and contact form
- **Admin Panel**: Secure dashboard for managing messages and content
- **Contact Form**: Integrated with Supabase for message collection
- **Content Management**: Create and publish news, career posts, and internship listings
- **Authentication**: Supabase Auth with role-based access control

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Animations**: Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: TanStack Query
- **Forms**: React Hook Form with Zod validation

## Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist` directory.

## License

© 2026 Rama Software & IT Solutions. All rights reserved.
