# ScholarForge

## Overview

ScholarForge is a research collaboration platform where scholars create and manage research projects. Built as a pnpm monorepo with React + Express + PostgreSQL.

## Architecture

- **Frontend**: `artifacts/scholar-forge` — React + Vite + Tailwind CSS + wouter routing
- **Backend**: `artifacts/api-server` — Express 5 + JWT auth + Drizzle ORM
- **Database**: `lib/db` — PostgreSQL with Drizzle schema
- **Shared**: `lib/api-client-react` — shared fetch utilities

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Frontend**: React 18, Vite, Tailwind CSS v4, shadcn/ui, recharts, wouter
- **Backend**: Express 5, JWT (jsonwebtoken + bcryptjs), Drizzle ORM
- **Database**: PostgreSQL via Drizzle ORM
- **Build**: esbuild (API server)

## Key Features

- Auth: JWT in localStorage (`scholarforge_token`), first user auto-ADMIN
- Projects: create/manage with visibility, status, keywords, abstract
- Team members: roles (LEAD/CO_LEAD/CONTRIBUTOR/VIEWER), invitations
- Tasks: Kanban board (TODO/IN_PROGRESS/IN_REVIEW/DONE), priority, assignees
- Milestones: due dates, completion tracking
- Files: upload/download per project
- Chat: real-time-ish project messages (polling every 10s)
- Activity logs: per-project timeline
- Admin panel: user management, analytics, project oversight
- Analytics: dashboard stats, charts with recharts

## API Endpoints

- Auth: `/api/auth/signup`, `/api/auth/signin`, `/api/auth/me`, `/api/auth/change-password` (via `/api/users/change-password`)
- Projects: `/api/projects` (CRUD), `/api/projects/:id`
- Members: `/api/projects/:id/members`, invitations
- Tasks: `/api/projects/:id/tasks`
- Milestones: `/api/projects/:id/milestones`
- Files: `/api/projects/:id/files`
- Messages: `/api/projects/:id/messages`
- Activity: `/api/projects/:id/activity`
- Analytics: `/api/analytics/overview`, `/api/analytics/dashboard`, `/api/analytics/admin`
- Admin: `/api/admin/users`, `/api/admin/projects`

## Demo Setup

For testing purposes, create your own account using the signup functionality. The first user created will automatically receive ADMIN privileges.

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/scholar-forge run dev` — run frontend
- `pnpm --filter @workspace/db run push` — push DB schema changes
