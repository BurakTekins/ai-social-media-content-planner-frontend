# AI Social Media Content Planner — Frontend

React frontend for the AI Social Media Content Planner. It provides a user interface for generating content batches, managing drafts and media, scheduling publications, browsing the content calendar, and managing provider credentials.

## Technology Stack

- React 19
- Vite 7
- Tailwind CSS 4
- pnpm

## Features

- Create AI-assisted generation batches from links and uploaded documents
- Browse batch progress and generation attempts
- Edit, schedule, and manage social media content
- View scheduled content in a calendar
- Manage AI provider and social platform credentials
- Select text, image, and video models
- Work with the backend's mock or real provider modes

## Local Setup

### Requirements

- Node.js
- pnpm
- [AI Social Media Content Planner Backend](https://github.com/BurakTekins/ai-social-media-content-planner-backend)

Install dependencies:

```bash
pnpm install
```

Create the environment file:

```bash
cp .env.example .env
```

Start the development server:

```bash
pnpm dev
```

The application runs at `http://localhost:5173` and proxies `/api` requests to `http://localhost:8080` by default.

## Configuration

```properties
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
```

`VITE_API_BASE_URL` controls the API path used by the browser. `VITE_API_PROXY_TARGET` controls the backend target used by the Vite development proxy.

## Backend

The REST API, PostgreSQL persistence, Flyway migrations, AI provider integrations, and publishing jobs are maintained in the [backend repository](https://github.com/BurakTekins/ai-social-media-content-planner-backend).
