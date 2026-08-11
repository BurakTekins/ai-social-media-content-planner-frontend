# AI Social Media Content Planner Frontend

The React-based user interface for AI Social Media Content Planner. The project is intended to live in the `frontend/` directory of the backend repository.

## Technology Stack

- React 19
- Vite 7
- Tailwind CSS 4
- pnpm

## Local Setup

From the backend project's root directory, open the frontend directory:

```bash
cd frontend
```

Install the dependencies:

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

The frontend runs at `http://localhost:5173` by default and proxies `/api` requests to the backend.

## Environment Variables

```properties
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
```

- `VITE_API_BASE_URL`: The API URL or path used by the browser.
- `VITE_API_PROXY_TARGET`: The backend URL used by the Vite development proxy.

## Commands

```bash
pnpm dev      # Start the development server
pnpm build    # Create a production build
pnpm preview  # Preview the production build locally
```
