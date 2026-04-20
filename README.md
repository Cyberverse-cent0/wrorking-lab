# ScholarForge - Research Collaboration Platform

## Overview

ScholarForge is a comprehensive research collaboration platform designed for scholars to create, manage, and collaborate on research projects. Built as a modern monorepo architecture with React, Express, and PostgreSQL, it provides all the tools needed for effective research team management.

## Architecture

### Monorepo Structure
```
Go-Auth-Service/
|-- artifacts/
|   |-- scholar-forge/          # Frontend React application
|   |-- api-server/              # Backend Express API server
|   `-- scripts/                # Utility scripts
|-- lib/
|   |-- api-client-react/       # Shared API client utilities
|   |-- api-zod/                # API schemas with Zod validation
|   |-- db/                     # Database schema and migrations
|   `-- api-spec/               # OpenAPI specification
|-- package.json                # Root workspace configuration
|-- pnpm-workspace.yaml         # pnpm workspace setup
`-- manage.sh                   # Server management script
```

### Technology Stack

- **Monorepo Management**: pnpm workspaces
- **Node.js**: v24+
- **Frontend**: 
  - React 18 with TypeScript
  - Vite for fast development
  - Tailwind CSS v4 for styling
  - shadcn/ui component library
  - Wouter for routing
  - Recharts for data visualization
- **Backend**:
  - Express 5 with TypeScript
  - JWT authentication (jsonwebtoken + bcryptjs)
  - Drizzle ORM for database operations
  - Pino for structured logging
- **Database**: PostgreSQL with Drizzle ORM
- **Build Tools**: esbuild for fast compilation

## Key Features

### Authentication & Authorization
- JWT-based authentication with localStorage storage (`scholarforge_token`)
- First user automatically gets ADMIN role
- Role-based access control (ADMIN, LEAD, CO_LEAD, CONTRIBUTOR, VIEWER)
- Secure password hashing with bcryptjs

### Project Management
- Create and manage research projects
- Project visibility settings (public/private)
- Project status tracking
- Keywords and abstract support
- Project analytics and insights

### Team Collaboration
- Team member management with role-based permissions
- Invitation system for new members
- Real-time project chat (polling every 10s)
- Activity logging and timeline
- File upload/download per project

### Task Management
- Kanban board interface (TODO/IN_PROGRESS/IN_REVIEW/DONE)
- Task priority levels
- Assignee management
- Task dependencies and tracking

### Milestones & Deadlines
- Milestone creation and tracking
- Due date management
- Completion percentage tracking
- Progress visualization

### Admin Features
- User management and oversight
- Project administration
- Analytics dashboard
- System health monitoring

### Analytics & Reporting
- Dashboard statistics
- Interactive charts with Recharts
- Project progress metrics
- User activity reports

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Project Members
- `GET /api/projects/:id/members` - List project members
- `POST /api/projects/:id/members` - Add member
- `PUT /api/projects/:id/members/:userId` - Update member role
- `DELETE /api/projects/:id/members/:userId` - Remove member

### Tasks
- `GET /api/projects/:id/tasks` - List project tasks
- `POST /api/projects/:id/tasks` - Create task
- `PUT /api/projects/:id/tasks/:taskId` - Update task
- `DELETE /api/projects/:id/tasks/:taskId` - Delete task

### Milestones
- `GET /api/projects/:id/milestones` - List milestones
- `POST /api/projects/:id/milestones` - Create milestone
- `PUT /api/projects/:id/milestones/:id` - Update milestone
- `DELETE /api/projects/:id/milestones/:id` - Delete milestone

### Files
- `GET /api/projects/:id/files` - List project files
- `POST /api/projects/:id/files` - Upload file
- `GET /api/projects/:id/files/:fileId` - Download file
- `DELETE /api/projects/:id/files/:fileId` - Delete file

### Messages
- `GET /api/projects/:id/messages` - Get project chat messages
- `POST /api/projects/:id/messages` - Send message

### Activity
- `GET /api/projects/:id/activity` - Get project activity log

### Analytics
- `GET /api/analytics/overview` - System overview
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/admin` - Admin analytics

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:userId` - Manage user
- `GET /api/admin/projects` - List all projects

## Database Schema

### Core Tables
- **users** - User accounts and profiles
- **projects** - Research project information
- **project_members** - Project membership and roles
- **tasks** - Project tasks with status tracking
- **milestones** - Project milestones and deadlines
- **files** - File management metadata
- **messages** - Project chat messages
- **activity** - Activity log entries
- **invitations** - Project invitations

### Relationships
- Users can belong to multiple projects with different roles
- Projects can have multiple tasks, milestones, files, and messages
- Activity logs track all major actions across the system

## Quick Start

### Prerequisites
- Node.js 24+
- pnpm package manager
- PostgreSQL database (or SQLite for development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Cyberverse-cent0/wrorking-lab.git
   cd wrorking-lab
   ```

2. **Use the management script** (recommended):
   ```bash
   chmod +x manage.sh
   ./manage.sh install
   ```

3. **Manual installation**:
   ```bash
   # Install dependencies
   npx pnpm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database configuration
   
   # Run database migrations
   npx pnpm --filter @workspace/db run push
   ```

### Running the Application

#### Using Management Script (Recommended)
```bash
# Start all services
./manage.sh start

# Stop all services
./manage.sh stop

# View status
./manage.sh status

# Restart services
./manage.sh restart
```

#### Manual Start
```bash
# Terminal 1: Start API server
cd artifacts/api-server
DATABASE_URL=sqlite:./dev.db PORT=5000 npx pnpm run dev

# Terminal 2: Start frontend
cd artifacts/scholar-forge
PORT=3000 BASE_PATH=/ npx pnpm run dev
```

### Environment Variables

#### API Server (.env)
```bash
DATABASE_URL=sqlite:./dev.db          # Database connection
PORT=5000                              # API server port
NODE_ENV=development                   # Environment mode
JWT_SECRET=your-secret-key             # JWT signing secret
```

#### Frontend (.env)
```bash
PORT=3000                              # Frontend port
BASE_PATH=/                            # Base path for routing
VITE_API_URL=http://localhost:5000/api  # API base URL
```

## Development Workflow

### Database Changes
```bash
# Make schema changes in lib/db/src/schema/
# Push changes to database
npx pnpm --filter @workspace/db run push

# Generate API types
npx pnpm --filter @workspace/api-spec run generate
```

### API Development
```bash
# Update OpenAPI spec in lib/api-spec/openapi.yaml
# Generate client types
npx pnpm --filter @workspace/api-client-react run generate
```

### Frontend Development
```bash
cd artifacts/scholar-forge
npx pnpm run dev        # Development server
npx pnpm run build      # Production build
npx pnpm run typecheck  # Type checking
```

### Backend Development
```bash
cd artifacts/api-server
npx pnpm run dev        # Development with hot reload
npx pnpm run build      # Production build
npx pnpm run start      # Start production server
```

## Demo Credentials

For testing purposes, please create your own account using the signup functionality. The first user created will automatically receive ADMIN privileges.

## Production Deployment

### Environment Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Build the application:
   ```bash
   npx pnpm run build
   ```

### Docker Deployment
```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d
```

### Security Considerations
- Use strong JWT secrets in production
- Enable HTTPS
- Configure proper CORS settings
- Set up database backups
- Monitor application logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

**"DATABASE_URL must be set"**
- Ensure your environment variables are properly configured
- Check that your database is running and accessible

**"PORT environment variable is required"**
- Set PORT environment variable for both frontend and backend
- Default: Frontend 3000, Backend 5000

**pnpm installation issues**
- Use `npx pnpm install` instead of global pnpm
- Ensure Node.js 24+ is installed

**Build failures**
- Clear node_modules and reinstall: `rm -rf node_modules && npx pnpm install`
- Check TypeScript configuration

### Getting Help
- Check the logs in the terminal output
- Verify all environment variables are set
- Ensure database migrations are up to date
- Check network connectivity for API calls

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the API documentation in `lib/api-spec/openapi.yaml`
