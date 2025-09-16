import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { clickupAPI } from '@/lib/clickup-api';

export async function GET(request: NextRequest) {
  try {
    // Fetch all tasks
    const tasks = await clickupAPI.getTasks();
    
    // Get developer mapping
    const customFields = await clickupAPI.getCustomFields();
    const developerField = customFields.find(field =>
      field.name.toLowerCase().includes('developer')
    );
    
    // Create developer ID to name mapping
    const developerMap: Record<string, string> = {};
    if (developerField && developerField.type === 'drop_down') {
      const options = developerField.type_config?.options || [];
      options.forEach((option) => {
        developerMap[option.orderindex || option.id] = option.name;
      });
    }
    
    // Helper function to get developer name from custom field
    const getDeveloperName = (field: { value?: unknown }): string => {
      if (!field.value) return 'Unassigned';
      
      const value = field.value;
      
      // If it's a number (orderindex), look it up in the map
      if (typeof value === 'number') {
        return developerMap[value] || `Developer ${value}`;
      }
      
      // If it's a string that's a number
      if (typeof value === 'string' && !isNaN(Number(value))) {
        return developerMap[value] || `Developer ${value}`;
      }
      
      // If it's an object with a name property
      if (typeof value === 'object' && value !== null && 'name' in value) {
        return (value as { name?: string }).name || 'Unknown';
      }
      
      // Otherwise, convert to string
      return String(value);
    };
    
    // Analyze tasks
    const now = new Date();
    
    // Calculate last business day for log filtering
    const getLastBusinessDay = (date: Date): Date => {
      const day = date.getDay();
      const lastBizDay = new Date(date);
      
      if (day === 0) { // Sunday
        lastBizDay.setDate(date.getDate() - 2); // Friday
      } else if (day === 1) { // Monday
        lastBizDay.setDate(date.getDate() - 3); // Friday
      } else {
        lastBizDay.setDate(date.getDate() - 1); // Previous day
      }
      
      // Set to 8 AM of that day
      lastBizDay.setHours(8, 0, 0, 0);
      return lastBizDay;
    };
    
    const lastBusinessDay = getLastBusinessDay(now);
    
    // Get log file content
    const isVercel = process.env.VERCEL === '1';
    const logDir = isVercel ? '/tmp' : path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'task-changes.md');
    
    let logContent = '';
    let recentLogContent = '';
    
    try {
      const fullLog = await fs.readFile(logFile, 'utf8');
      const lines = fullLog.split('\n');
      
      // Get logs since last business day
      const recentLines: string[] = [];
      let captureRecent = false;
      
      for (const line of lines) {
        // Check if line contains a timestamp
        if (line.startsWith('## ')) {
          const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
          if (timestampMatch) {
            const logDate = new Date(timestampMatch[1]);
            captureRecent = logDate >= lastBusinessDay;
          }
        }
        
        if (captureRecent) {
          recentLines.push(line);
        }
      }
      
      recentLogContent = recentLines.length > 0 ? recentLines.join('\n') : 'No changes since last business day.';
      
      // Also keep last 1000 lines for full context
      const last1000Lines = lines.slice(-1000).join('\n');
      logContent = last1000Lines;
    } catch {
      console.log('No log file found');
      logContent = 'No task change logs available yet.';
      recentLogContent = 'No task change logs available yet.';
    }
    
    const inProgressTasks = tasks.filter(task =>
      task.status?.status?.toLowerCase().includes('progress') ||
      task.status?.status?.toLowerCase().includes('active')
    );

    const overdueTasks = tasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(parseInt(task.due_date));
      return dueDate < now;
    });
    
    // Get urgent and high priority tasks
    const urgentTasks = tasks.filter(task =>
      task.priority?.priority?.toLowerCase() === 'urgent'
    );
    
    const highPriorityTasks = tasks.filter(task =>
      task.priority?.priority?.toLowerCase() === 'high'
    );

    // Count tasks and hours per developer with priority breakdown
    const developerWorkload: Record<string, number> = {};
    const developerHours: Record<string, number> = {};
    const developerInProgress: Record<string, number> = {};
    const developerInProgressHours: Record<string, number> = {};
    const developerUrgentHours: Record<string, number> = {};
    const developerHighHours: Record<string, number> = {};
    const developerUrgentCount: Record<string, number> = {};
    const developerHighCount: Record<string, number> = {};
    
    tasks.forEach(task => {
      task.custom_fields?.forEach(field => {
        if (field.name?.toLowerCase().includes('developer')) {
          const devName = getDeveloperName(field);
          
          if (devName !== 'Unassigned') {
            developerWorkload[devName] = (developerWorkload[devName] || 0) + 1;
            
            const taskHours = task.time_estimate ? (task.time_estimate / (1000 * 60 * 60)) : 0;
            
            if (taskHours > 0) {
              developerHours[devName] = (developerHours[devName] || 0) + taskHours;
            }
            
            // Track in-progress tasks and hours
            if (task.status?.status?.toLowerCase().includes('progress') ||
                task.status?.status?.toLowerCase().includes('active')) {
              developerInProgress[devName] = (developerInProgress[devName] || 0) + 1;
              if (taskHours > 0) {
                developerInProgressHours[devName] = (developerInProgressHours[devName] || 0) + taskHours;
              }
            }
            
            // Track urgent task hours
            if (task.priority?.priority?.toLowerCase() === 'urgent') {
              developerUrgentCount[devName] = (developerUrgentCount[devName] || 0) + 1;
              if (taskHours > 0) {
                developerUrgentHours[devName] = (developerUrgentHours[devName] || 0) + taskHours;
              }
            }
            
            // Track high priority task hours
            if (task.priority?.priority?.toLowerCase() === 'high') {
              developerHighCount[devName] = (developerHighCount[devName] || 0) + 1;
              if (taskHours > 0) {
                developerHighHours[devName] = (developerHighHours[devName] || 0) + taskHours;
              }
            }
          }
        }
      });
    });
    
    // Count unassigned urgent/high priority tasks
    const unassignedUrgent = urgentTasks.filter(task => {
      const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
      return !devField?.value;
    }).length;
    
    const unassignedHigh = highPriorityTasks.filter(task => {
      const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
      return !devField?.value;
    }).length;

    // Find tasks in progress for too long
    const staleInProgressTasks = inProgressTasks.filter(task => {
      if (!task.date_updated) return false;
      const lastUpdate = new Date(parseInt(task.date_updated));
      const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 3; // More than 3 days
    });

    // Generate the markdown report
    const report = `# Daily Standup Task Analysis Report
Generated: ${now.toISOString()}

## PROMPT FOR DAILY STANDUP ANALYSIS

You are analyzing a software development team's task management data for their daily standup meeting. This team meets every morning to review progress and plan the day. Please provide a structured analysis focusing on:

### 1. IMMEDIATE ACTIONS NEEDED (For Today's Standup)
- **Critical Issues**: What needs immediate attention today?
- **Blocked Tasks**: Which tasks are blocked and who can unblock them?
- **Overdue Items**: What's overdue and needs escalation?
- **Unassigned Urgent Tasks**: Which urgent tasks need assignment NOW?

### 2. DEVELOPER WORKLOAD ANALYSIS
- **Overloaded Developers**: Who has too many in-progress tasks (>4 is concerning)?
- **Available Capacity**: Who can take on more work?
- **Redistribution Recommendations**: Specific task reassignments needed

### 3. PROGRESS TRACKING
- **Yesterday's Progress**: What was completed recently (check logs)?
- **Today's Focus**: What should each developer focus on today?
- **Stale Tasks**: Tasks in progress >3 days that need attention

### 4. RISK ASSESSMENT
- **At-Risk Deliverables**: What might not meet deadlines?
- **Customer Impact**: Which customer-facing issues are still open?
- **Technical Debt**: Are urgent fixes preventing planned work?

### 5. STANDUP TALKING POINTS
Provide 3-5 specific discussion points for the standup meeting, formatted as:
- **[Developer Name]**: Specific question or action item
- **Team Discussion**: Topics that need group input

Focus on actionable, specific recommendations that can be implemented TODAY. Use developer names, not numbers.

## EXECUTIVE SUMMARY

### 🚨 Critical Metrics
- **Urgent Tasks**: ${urgentTasks.length} total (${unassignedUrgent} unassigned)
- **High Priority Tasks**: ${highPriorityTasks.length} total (${unassignedHigh} unassigned)
- **In Progress Tasks**: ${inProgressTasks.length}
- **Overdue Tasks**: ${overdueTasks.length}
- **Stale Tasks (>3 days)**: ${staleInProgressTasks.length}

### 👥 Developer Workload Summary

${Object.entries(developerWorkload)
  .filter(([dev]) => dev !== 'Unassigned')
  .sort((a, b) => (developerInProgress[b[0]] || 0) - (developerInProgress[a[0]] || 0))
  .map(([dev, count]) => {
    const inProgress = developerInProgress[dev] || 0;
    const hours = developerHours[dev] || 0;
    const status = inProgress > 4 ? '🔴 OVERLOADED' : inProgress > 2 ? '🟡 BUSY' : '🟢 AVAILABLE';
    return `#### ${dev} ${status}
- Total Tasks: ${count}
- In Progress: ${inProgress} tasks
- Total Hours: ${hours.toFixed(1)} hours
- Estimated Days: ${(hours / 8).toFixed(1)} days`;
  })
  .join('\n\n')}

### 📊 Unassigned Work
- Unassigned Tasks: ${tasks.filter(t => {
    const dev = t.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
    return !dev?.value;
  }).length} total
- Unassigned Urgent: ${unassignedUrgent} tasks
- Unassigned High Priority: ${unassignedHigh} tasks

## DETAILED TASK ANALYSIS

### 🔥 URGENT TASKS REQUIRING IMMEDIATE ACTION

${urgentTasks.map(task => {
  const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
  const devName = devField ? getDeveloperName(devField) : 'Unassigned';
  const isInProgress = task.status?.status?.toLowerCase().includes('progress') ||
                       task.status?.status?.toLowerCase().includes('active');
  
  return `#### ${task.name}
- **Developer**: ${devName} ${devName === 'Unassigned' ? '⚠️ NEEDS ASSIGNMENT' : ''}
- **Status**: ${task.status?.status || 'Unknown'} ${isInProgress ? '(In Progress)' : ''}
- **Time Estimate**: ${task.time_estimate ? (task.time_estimate / (1000 * 60 * 60)).toFixed(1) + ' hours' : 'Not estimated'}
- **Due Date**: ${task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString() : 'No due date'}
${task.due_date && new Date(parseInt(task.due_date)) < now ? '- 🚨 **OVERDUE**' : ''}`;
}).join('\n\n')}

### 📋 IN PROGRESS TASKS BY DEVELOPER

${Object.entries(developerInProgress)
  .filter(([dev, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .map(([dev]) => {
    const devTasks = inProgressTasks.filter(task => {
      const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
      return devField && getDeveloperName(devField) === dev;
    });
    
    return `#### ${dev} (${devTasks.length} in progress)
${devTasks.map(task => {
  const daysInProgress = task.date_updated ?
    Math.floor((now.getTime() - new Date(parseInt(task.date_updated)).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  const statusEmoji = daysInProgress > 3 ? '⚠️' : '✅';
  const overdue = task.due_date && new Date(parseInt(task.due_date)) < now;
  
  return `- ${statusEmoji} **${task.name}**
  - Priority: ${task.priority?.priority || 'None'}
  - Days in Progress: ${daysInProgress} ${daysInProgress > 3 ? '**STALE**' : ''}
  - Time Estimate: ${task.time_estimate ? (task.time_estimate / (1000 * 60 * 60)).toFixed(1) + 'h' : 'Not set'}
  ${overdue ? '  - 🚨 **OVERDUE**' : ''}`;
}).join('\n')}`;
  }).join('\n\n')}

### ⏰ STALE TASKS (In Progress >3 Days)

${staleInProgressTasks.length > 0 ? staleInProgressTasks.map(task => {
  const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
  const devName = devField ? getDeveloperName(devField) : 'Unassigned';
  const daysInProgress = task.date_updated ?
    Math.floor((now.getTime() - new Date(parseInt(task.date_updated)).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  return `- **${task.name}** (${devName})
  - ${daysInProgress} days in progress
  - Priority: ${task.priority?.priority || 'None'}
  - Last Updated: ${task.date_updated ? new Date(parseInt(task.date_updated)).toLocaleDateString() : 'Unknown'}`;
}).join('\n') : 'No stale tasks - good job keeping tasks moving!'}

## ALL TASKS LIST (For Reference)

<details>
<summary>Click to expand full task list</summary>

${tasks.map(task => {
  const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
  const devName = devField ? getDeveloperName(devField) : 'Unassigned';
  
  return `- [${task.status?.status || 'Unknown'}] ${task.name} (${task.priority?.priority || 'None'} | ${devName})`;
}).join('\n')}

</details>

## RECENT TASK CHANGES (Last 1000 Actions)

<details>
<summary>Click to expand recent changes log</summary>

\`\`\`markdown
${logContent}
\`\`\`

</details>

## SPECIFIC QUESTIONS FOR STANDUP DISCUSSION

Based on the HOUR-FOCUSED analysis above, please address these questions:

1. **HOUR-BASED REDISTRIBUTION NEEDED TODAY**:
   - Which developers have >24 hours of in-progress work?
   - Which specific tasks (with hour estimates) should be reassigned?
   - Who has available capacity (in hours) to take them?

2. **URGENT HOUR ALLOCATION**:
   - How many total urgent hours need completion this week?
   - Which developers should focus on urgent tasks based on their current hour load?
   - Are there enough available hours to complete all urgent work?

3. **SINCE LAST BUSINESS DAY REVIEW**:
   - What was completed since ${lastBusinessDay.toLocaleDateString('en-US', { weekday: 'long' })} morning?
   - What tasks were started but not finished?
   - Based on the activity logs, what's the team's actual velocity in hours/day?

4. **TODAY'S HOUR COMMITMENTS**:
   - Each developer should commit to completing X hours of work today - what's realistic?
   - Which tasks (with hours) are the priority for completion today?
   - Do we need to work overtime to meet any deadlines?

5. **CAPACITY PLANNING**:
   - Based on 8-hour workdays, who is over capacity?
   - How many total hours of work are in progress vs. team capacity?
   - Should we delay any non-urgent work to focus on priorities?

6. **RISK BY HOURS**:
   - Which tasks don't have hour estimates and need them ASAP?
   - Based on hour estimates, which deliverables are at risk?
   - How many hours behind schedule are we overall?

Please provide HOUR-FOCUSED recommendations. Example: "Move Task X (6 hours) from Developer A (32 hours in progress) to Developer B (8 hours in progress)."

---
END OF REPORT
`;

    // Check if download is requested
    const download = request.nextUrl.searchParams.get('download') === 'true';
    
    if (download) {
      // Return as downloadable file
      return new NextResponse(report, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="llm-task-report-${now.toISOString().split('T')[0]}.md"`,
        },
      });
    }

    // Return as JSON with preview
    return NextResponse.json({
      report,
      stats: {
        totalTasks: tasks.length,
        inProgress: inProgressTasks.length,
        overdue: overdueTasks.length,
        stale: staleInProgressTasks.length,
      },
      downloadUrl: '/api/llm-report?download=true'
    });

  } catch (error) {
    console.error('Error generating LLM report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}