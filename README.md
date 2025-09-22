# External Tracking System

## Documentation Structure

This repository follows a standardized documentation structure designed for both human developers and AI tools. All documentation is organized in the [`/docs`](docs/) folder.

- **SOPs ([`/docs/SOPs`](docs/SOPs/))**: Contains standardized procedures and coding standards.
- **System Docs ([`/docs/System`](docs/System/))**: Technical system documentation.
- **Project Docs ([`/docs/Project`](docs/Project/))**: Project-specific documentation.

## Project Overview

The External Tracking System is designed to monitor and track external resources, services, and dependencies. This system provides visibility into third-party integrations, API usage, and external service health. Its primary integration is a real-time web interface for viewing and managing ClickUp tasks.

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- Access to ClickUp API credentials

### Setup Instructions
1.  Clone the repository:
    ```bash
    git clone https://github.com/ThinkWithTheo/external-tracking.git
    cd external-tracking
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    # Edit .env with your configuration
    ```

### For AI Development
When working with AI tools, always include:
- **This README** for project context.
- **[`/docs/SOPs/Coding-Standards.md`](docs/SOPs/Coding-Standards.md)** for development standards.
- Relevant system documentation from [`/docs/System/`](docs/System/).

## Development Standards

- **Code Quality**: Follow standards in [`/docs/SOPs/Coding-Standards.md`](docs/SOPs/Coding-Standards.md).
- **Version Control**: Use feature branches (`feature/description`) and rebase on `main`.
- **Documentation**: Keep this README under 500 lines for AI context efficiency.

## ClickUp Integration ✅ COMPLETED & ENHANCED (September 2025)

The [`/web-app`](web-app/) directory contains a **fully operational** Next.js application that provides a modern, professional web interface for viewing and managing ClickUp tasks.

### 🎯 Key Features
- **✅ Modern Card-Based Interface**: Beautiful and responsive task cards.
- **✅ Comprehensive Stats Dashboard**: Real-time metrics for active tasks, in-progress work, and developer workload.
- **✅ Advanced Filtering & Dual View Modes**: Filter by priority and assignee; toggle between card and table views.
- **✅ Real-time Data**: Live synchronization with ClickUp API with full pagination support.
- **✅ Task Update Modal**: Click any task to edit its details with pre-filled data.
- **✅ Change Tracking System**: All task operations are logged to Vercel Redis for auditing and AI review.
- **✅ Admin Log Editor**: Web-based editor at `/logs` for admins to view and edit task change logs.
- **✅ Role-Based Task Creation**: Simplified interface for non-admin users.

### 🎨 Latest Updates (September 2025)

#### **"In Progress" Duration Tracking (NEW)**
To address issues with tasks remaining "In Progress" for too long, a new tracking system has been implemented, deriving data directly from the Vercel Redis logs.

- **Accurate Duration Calculation**: The system now precisely calculates how long a task has been in its current "In Progress" state by parsing Redis logs for the most recent status change. This handles tasks that are moved in and out of progress, always reflecting the latest period.
- **Color-Coded UI Indicators**: The duration is displayed throughout the UI with color-coding to quickly identify stale tasks:
  - **Blue**: ≤ 3 days
  - **Yellow**: 4-5 days
  - **Red**: > 5 days
- **Simplified Display**: The duration is shown in a human-readable format (e.g., "3 days" or "5 hours"), and hour estimates are now whole numbers (e.g., "8h").
- **Admin Override**: Admins can manually correct the "In Progress Since" date via the task update modal. This action creates a `MANUAL UPDATE` entry in the logs, which takes precedence over all other entries for that task.
- **LLM Report Integration**: The daily LLM report now uses this accurate, log-derived data to highlight stale tasks, improving the quality of the analysis.

#### **Task Creation & Update Functionality**
- **Role-Based Interface**: Non-admins have a simplified task creation form, while admins have full control.
- **Click-to-Edit Tasks**: Click any task name to open the update modal with pre-filled data.
- **Parent Task Management**: Admins can change a task's parent, converting subtasks to parent tasks or vice versa.

#### **Technical Enhancements**
- **Vercel Redis for Logging**: All CREATE, UPDATE, and MANUAL UPDATE operations are logged to a durable Vercel Redis database, solving previous rate limiting and race condition issues.
- **Robust Log Parsing**: The log parser now correctly handles `CREATE`, `UPDATE`, and `MANUAL UPDATE` events, ensuring that tasks set to "In Progress" upon creation are tracked correctly.
- **Direct Log Access**: The application now reads logs directly from the source (`getAllLogs`) instead of relying on an internal API fetch, improving reliability in the deployed Vercel environment.

### Quick Start
```bash
cd web-app
npm install
cp .env.local.example .env.local
# Edit .env.local with your ClickUp API credentials
# To connect to the Vercel Redis log store locally, run:
# vercel env pull .env.development.local
npm run dev
# Visit http://localhost:3000
```

### 🔧 Technical Implementation
- **Framework**: Next.js 15 with TypeScript and Tailwind CSS v4
- **UI Library**: Custom component library with Framer Motion for animations.
- **Logging**: Vercel Redis for durable, high-performance logging.

### Deployment
The web application is configured for automatic deployment to Vercel when changes are pushed to the `main` branch. The Vercel project's **Root Directory** is set to `web-app`.

## Contributing
1.  **Read the Standards**: Review [`/docs/SOPs/Coding-Standards.md`](docs/SOPs/Coding-Standards.md).
2.  **Create Feature Branch**: `git checkout -b feature/your-feature-name`.
3.  **Test Your Changes** and submit a Pull Request.

---
**Note**: This README serves as the primary entry point for both developers and AI tools. Keep it concise (≤500 lines) and always reference the [`/docs`](docs/) folder for detailed information.