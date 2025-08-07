# ClickUp Task Tracker - External Tracking System

A Next.js web application that displays ClickUp tasks and subtasks in a clean, ClickUp-like interface. This application is part of the External Tracking System and provides real-time visibility into project tasks, their status, assignments, and progress.

## Features

- **Real-time Task Display**: Fetches and displays tasks from ClickUp API
- **Hierarchical View**: Shows tasks with their subtasks in an expandable/collapsible format
- **ClickUp-like Interface**: Matches the familiar ClickUp list view layout
- **Filtered Results**: Automatically excludes closed tasks, showing only active work
- **Comprehensive Task Info**: Displays task name, time estimates, developer assignments, status, due dates, priorities, and comment counts
- **Responsive Design**: Works on desktop and mobile devices
- **Auto-refresh**: Manual refresh capability with last update timestamps

## Task Information Displayed

For each task and subtask, the application shows:

- **Task Name**: Full task title with priority indicators
- **Time Estimate**: Formatted time estimates (hours/minutes)
- **Developer**: Assigned developer from custom fields or assignees
- **Status**: Current task status with color coding
- **Due Date**: Formatted due dates
- **Priority**: Task priority level with visual indicators
- **Comments**: Number of comments on the task

## Prerequisites

- Node.js 18+ 
- ClickUp API access
- ClickUp API token with appropriate permissions

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd external-tracking/web-app
npm install
```

### 2. Configure Environment Variables

Copy the environment template and configure your ClickUp credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your ClickUp information:

```env
# ClickUp API Configuration
CLICKUP_API_TOKEN=your_clickup_api_token_here
CLICKUP_LIST_ID=your_clickup_list_id
CLICKUP_TEAM_ID=your_clickup_team_id
```

### 3. Get ClickUp API Credentials

#### API Token
1. Go to ClickUp Settings → Apps
2. Generate a new API token
3. Copy the token to `CLICKUP_API_TOKEN`

#### List ID
1. Open your ClickUp list in the browser
2. The List ID is in the URL: `https://app.clickup.com/[TEAM_ID]/v/l/[LIST_ID]`
3. Copy the List ID to `CLICKUP_LIST_ID`

#### Team ID
1. The Team ID is also in the URL: `https://app.clickup.com/[TEAM_ID]/v/l/[LIST_ID]`
2. Copy the Team ID to `CLICKUP_TEAM_ID`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment to Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Configure Environment Variables in Vercel

In your Vercel dashboard, add the following environment variables:

- `CLICKUP_API_TOKEN`: Your ClickUp API token
- `CLICKUP_LIST_ID`: Your ClickUp list ID  
- `CLICKUP_TEAM_ID`: Your ClickUp team ID

### 4. Alternative: Deploy via GitHub

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

## Project Structure

```
web-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── tasks/
│   │   │       └── route.ts          # API endpoint for fetching tasks
│   │   ├── globals.css               # Global styles and ClickUp-like styling
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Main page component
│   ├── components/
│   │   ├── TaskList.tsx              # Main task list component
│   │   └── TaskRow.tsx               # Individual task row component
│   ├── lib/
│   │   └── clickup-api.ts            # ClickUp API client and utilities
│   └── types/
│       └── clickup.ts                # TypeScript type definitions
├── .env.local                        # Environment variables (not in git)
├── .env.local.example                # Environment template
├── vercel.json                       # Vercel deployment configuration
└── README.md                         # This file
```

## API Integration

The application uses the ClickUp API v2 to fetch task data. Key features:

- **Authentication**: Uses API token for secure access
- **Task Filtering**: Automatically filters out closed and archived tasks
- **Subtask Handling**: Properly organizes subtasks under their parent tasks
- **Custom Fields**: Extracts developer information from custom fields
- **Comment Counting**: Fetches comment counts for each task
- **Error Handling**: Graceful error handling with user-friendly messages

## Customization

### Adding New Task Fields

To display additional task information:

1. Update the `ProcessedTask` interface in `src/types/clickup.ts`
2. Modify the `processTask` method in `src/lib/clickup-api.ts`
3. Update the `TaskRow` component to display the new field
4. Add appropriate column headers in `TaskList.tsx`

### Styling Modifications

The application uses Tailwind CSS with custom ClickUp-like styling in `globals.css`. Key style classes:

- `.task-row`: Individual task row styling
- `.status-badge`: Status indicator styling  
- `.priority-high`: High priority task animation
- `.bg-gray-25`: Subtle background for subtasks

### API Customization

Modify `src/lib/clickup-api.ts` to:

- Change task filtering criteria
- Add additional API endpoints
- Modify data processing logic
- Add caching or rate limiting

## Troubleshooting

### Common Issues

**401 Unauthorized Error**
- Verify your ClickUp API token is correct
- Ensure the token has appropriate permissions
- Check that the token hasn't expired

**No Tasks Displayed**
- Verify the List ID is correct
- Check that the list contains open (non-closed) tasks
- Ensure your API token has access to the specified list

**Slow Loading**
- ClickUp API responses can be slow for large lists
- Consider implementing caching for production use
- Check your internet connection

### Development Issues

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Type Errors**
- Ensure all TypeScript types are properly defined
- Check that API responses match expected interfaces

## Contributing

1. Follow the coding standards defined in `/docs/SOPs/Coding-Standards.md`
2. Create feature branches: `git checkout -b feature/description`
3. Write tests for new functionality
4. Submit pull requests with clear descriptions

## License

This project is part of the External Tracking System. See the main project README for license information.

## Support

For issues related to:
- **ClickUp API**: Check ClickUp API documentation
- **Deployment**: Refer to Vercel documentation
- **Application Issues**: Create an issue in the project repository

---

**Note**: This application requires a valid ClickUp API token and appropriate permissions to access your ClickUp workspace data.
