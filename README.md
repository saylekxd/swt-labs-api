# SWT Labs Server Documentation

## Overview
Node.js/Express backend providing AI-powered cost estimation services. Built with TypeScript and deployed on Render.com.

### Key Features
- OpenAI GPT-4 integration for cost predictions
- Automated API health monitoring
- Structured logging with emoji indicators
- CORS configuration for production/development environments
- Environment variable management
- AI-generated blog management (Gemini-powered)

## Technical Stack
| Component          | Technology               |
|--------------------|--------------------------|
| Runtime            | Node.js 18+              |
| Framework          | Express 4.x              |
| Language           | TypeScript 5.x           |
| AI Provider        | OpenAI API               |
| AI Provider        | OpenAI API + Google Gemini |
| Deployment         | Render.com               |
| Monitoring         | Structured JSON logging  |
| Database           | Supabase                 |

## Core Endpoints
| Endpoint           | Method | Description                          |
|--------------------|--------|--------------------------------------|
| `/api/health`      | GET    | System health check + OpenAI status  |
| `/api/estimate`    | POST   | AI-powered cost estimation           |
| `/api/subscribe`   | POST   | Save user email to Supabase          |
| `/api/blog`         | GET    | List published blog posts            |
| `/api/blog/:slug`  | GET    | Fetch single blog post by slug       |
| `/api/blog/admin/posts` | GET | Get all blog posts (admin)         |
| `/api/blog/admin/create` | POST | Create a new blog post (admin)    |
| `/api/blog/admin/:id` | PUT | Update blog post by ID (admin)      |
| `/api/blog/admin/:id` | DELETE | Delete blog post by ID (admin)    |
| `/`                | GET    | Basic service status                 |

## Supabase Setup

This service integrates with Supabase to store user emails. To set up:

1. Create a Supabase project at https://supabase.com/
2. Create a table named `user_emails` (or your custom name) with the following structure:
   - `id`: uuid (primary key)
   - `email`: varchar (required)
   - `project_name`: varchar (nullable)
   - `project_type`: varchar (nullable)
   - `features`: jsonb (nullable)
   - `complexity`: integer (nullable)
   - `estimation_result`: text (nullable)
   - `created_at`: timestamp with timezone (defaulted to `now()`)

3. Add the following environment variables to your `.env` file:
   ```
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_EMAILS_TABLE=user_emails
   ```

The service will automatically save email information during estimation requests and via the dedicated `/api/subscribe` endpoint.
