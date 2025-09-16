import { NextRequest, NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';
import { getAllLogs } from '@/lib/blob-logger';

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
        // Map both orderindex and id to handle both numeric and UUID formats
        if (option.orderindex !== undefined) {
          developerMap[option.orderindex] = option.name;
        }
        if (option.id) {
          developerMap[option.id] = option.name;
        }
      });
    }
    
    // Helper function to get developer name from custom field
    const getDeveloperName = (field: { value?: unknown }): string => {
      // Correctly check for null or undefined, allowing 0 as a valid value
      if (field.value === null || field.value === undefined) return 'Unassigned';
      
      const value = field.value;
      
      // If it's a number (orderindex), look it up in the map
      if (typeof value === 'number') {
        return developerMap[value] || `Developer ${value}`;
      }
      
      // If it's a string (could be UUID or numeric string)
      if (typeof value === 'string') {
        // Check if it's in the map (handles both UUIDs and numeric strings)
        if (developerMap[value]) {
          return developerMap[value];
        }
        // Check if the value itself is already a developer name
        if (value === 'Young' || value === 'Swezey' || value === 'Jacob' || value === 'Irtaza' || value === 'Hamza') {
          return value;
        }
        // If not found and it's a number, show as Developer X
        if (!isNaN(Number(value))) {
          return `Developer ${value}`;
        }
        // If it's a UUID or other string not in map, return as Unassigned
        // This prevents showing raw UUIDs in the report
        return 'Unassigned';
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
    const nowUTC = now.toISOString();
    
    // Calculate last standup time (10 AM CST = 3 PM UTC or 4 PM UTC depending on DST)
    const getLastStandupTime = (date: Date): Date => {
      const day = date.getDay();
      const lastStandup = new Date(date);
      
      // Determine if we need to look at today's or yesterday's standup
      const currentHour = date.getUTCHours();
      const currentMinutes = date.getUTCMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinutes;
      
      // 10 AM CST = 4 PM UTC (during CST) or 3 PM UTC (during CDT)
      // For simplicity, we'll use 3 PM UTC (CDT) as the cutoff since it's currently CDT
      const standupHourUTC = 15; // 3 PM UTC = 10 AM CDT
      const standupTimeInMinutes = standupHourUTC * 60;
      
      // Add a 3-hour buffer after standup for updates made during/after the meeting
      // This prevents showing updates from the meeting itself as "changes since last standup"
      const bufferHours = 3;
      const bufferEndTimeInMinutes = standupTimeInMinutes + (bufferHours * 60); // 6 PM UTC = 1 PM CDT
      
      if (currentTimeInMinutes < standupTimeInMinutes) {
        // Before today's standup, look at previous business day's standup
        if (day === 0) { // Sunday
          lastStandup.setUTCDate(date.getUTCDate() - 2); // Friday
        } else if (day === 1) { // Monday
          lastStandup.setUTCDate(date.getUTCDate() - 3); // Friday
        } else {
          lastStandup.setUTCDate(date.getUTCDate() - 1); // Previous day
        }
      } else if (currentTimeInMinutes >= bufferEndTimeInMinutes) {
        // After today's standup + buffer, use today's standup end time (standup + buffer)
        // This means changes made during the meeting won't show up tomorrow
        lastStandup.setUTCHours(standupHourUTC + bufferHours, 0, 0, 0);
        return lastStandup;
      }
      // else: During standup or buffer period, still use previous day's standup
      
      // Set to standup time + buffer (to exclude meeting updates)
      lastStandup.setUTCHours(standupHourUTC + bufferHours, 0, 0, 0);
      return lastStandup;
    };
    
    const lastStandupTime = getLastStandupTime(now);
    const lastStandupTimeUTC = lastStandupTime.toISOString();
    
    // Get log file content from blob or local
    let logContent = '';
    let recentLogContent = '';
    
    try {
      const fullLog = await getAllLogs();
      const lines = fullLog.split('\n');
      
      // Get logs since last standup
      const recentLines: string[] = [];
      let captureRecent = false;
      
      for (const line of lines) {
        // Check if line contains a timestamp
        if (line.startsWith('## ')) {
          const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
          if (timestampMatch) {
            const logDate = new Date(timestampMatch[1]);
            captureRecent = logDate >= lastStandupTime;
          }
        }
        
        if (captureRecent) {
          recentLines.push(line);
        }
      }
      
      recentLogContent = recentLines.length > 0 ? recentLines.join('\n') : 'No changes since last standup.';
      
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
Generated: ${nowUTC}
Current Time (UTC): ${nowUTC}
Current Time (CST/CDT): ${now.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'long' })}
Daily Standup Time: 10:00 AM CST/CDT (15:00 UTC during CDT, 16:00 UTC during CST)
Last Standup: ${lastStandupTime.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'long' })}

## PROMPT FOR DAILY STANDUP ANALYSIS

You are analyzing a software development team's task management data for their ${now.toLocaleDateString('en-US', { weekday: 'long' })} morning standup meeting at 10 AM CST/CDT.

**IMPORTANT CONTEXT:**
- The current report was generated at: ${nowUTC}
- Your daily standup is at 10:00 AM CST/CDT (which is 15:00 UTC during CDT, 16:00 UTC during CST)
- The logs below show changes since: ${lastStandupTimeUTC}
  - This includes a 3-hour buffer after standup meetings to exclude updates made during/after the meeting
  - This prevents rehashing updates that were discussed in yesterday's meeting
- All timestamps in the logs are in UTC format (ISO 8601)
- Assume developers have a capacity of 6 productive hours per day.

**IMPORTANT: Review the COMPLETE TASK TABLE and the DAILY REVIEW section below. These are your primary data sources.**

Based on the data, please provide:

### 1. DAILY REVIEW ANALYSIS
Review the 'CHANGES SINCE LAST STANDUP' log and the list of 'CURRENTLY IN-PROGRESS TASKS'.
- What key activities occurred since the last standup (${lastStandupTime.toLocaleString('en-US', { timeZone: 'America/Chicago' })})?
- Are there any completed tasks or regressions mentioned in the logs?
- Do the in-progress tasks align with the team's current priorities?

### 2. RISKS AND BLOCKERS
From the table data:
- Tasks without hour estimates that are high/urgent priority.
- Overdue tasks that might impact other work.
- Developers with >40 hours of assigned work.

### 3. STANDUP TALKING POINTS (QUICK READ)
Based on the complete task table, provide 5-7 concise, actionable talking points focusing on:

**URGENT ITEMS HANGING:**
- Which URGENT tasks have been in progress for 2+ days? (Check Task ID, Developer, Days in Progress)
- Which URGENT tasks are still unassigned and need immediate assignment?
- Any urgent tasks without time estimates that need sizing?

**TODAY'S PRIORITIES:**
- For each developer with urgent work: "[Developer] has urgent task [Task ID: Name] - [X days] in progress"
- Overdue tasks marked with 🚨 that need escalation
- Quick wins: Urgent tasks under 4 hours that could be completed today

**WORKLOAD CHECK:**
- Developers with 10+ hours of urgent work in progress
- Anyone blocked or overloaded based on hours (6 productive hours/day capacity)

Keep each point brief and reference specific Task IDs for easy lookup. Focus on urgent tasks that have been stagnant.

**Use the actual data from the task table and logs. Reference specific task names, developer names, and hour estimates. Do not make assumptions and do NOT suggest reassigning work between developers.**

## COMPLETE TASK TABLE (ALL ${tasks.length} TASKS)

| Task ID | Task Name | Description | Status | Priority | Developer | Hours Est. | Due Date | Days In Progress |
|---------|-----------|-------------|--------|----------|-----------|------------|----------|------------------|
${tasks
  .sort((a, b) => {
    // Sort alphabetically by task name (parent - child format)
    return a.name.localeCompare(b.name);
  })
  .map(task => {
    const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
    const devName = devField ? getDeveloperName(devField) : 'Unassigned';
    const hours = task.time_estimate ? (task.time_estimate / (1000 * 60 * 60)).toFixed(1) : '0';
    const dueDate = task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString() : 'None';
    const isInProgress = task.status?.status?.toLowerCase().includes('progress') ||
                         task.status?.status?.toLowerCase().includes('active');
    const daysInProgress = isInProgress && task.date_updated ?
      Math.floor((now.getTime() - new Date(parseInt(task.date_updated)).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isOverdue = task.due_date && new Date(parseInt(task.due_date)) < now;
    
    const description = task.description ? task.description.replace(/(\r\n|\n|\r)/gm, " ").substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'No description';
    
    return `| ${task.id} | ${task.name} | ${description} | ${task.status?.status || 'Unknown'} | ${task.priority?.priority || 'None'} | **${devName}** | ${hours}h | ${dueDate}${isOverdue ? ' 🚨' : ''} | ${isInProgress ? daysInProgress : '-'} |`;
  }).join('\n')}

## DAILY REVIEW

### CHANGES SINCE LAST STANDUP
**Last Standup**: ${lastStandupTime.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'long' })}
**Changes Tracked From**: ${lastStandupTimeUTC} (includes 3-hour post-meeting buffer)
**Current Time (UTC)**: ${nowUTC}
**Note**: Updates made during/after standup meetings are excluded to prevent rehashing

\`\`\`markdown
${recentLogContent}
\`\`\`

### CURRENTLY IN-PROGRESS TASKS (${inProgressTasks.length})
${inProgressTasks.map(task => {
  const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
  const devName = devField ? getDeveloperName(devField) : 'Unassigned';
  const hours = task.time_estimate ? (task.time_estimate / (1000 * 60 * 60)).toFixed(1) : '0';
  return `- **${task.name}** (${devName}, ${hours}h)`;
}).join('\n')}


## EXECUTIVE SUMMARY

### 🚨 Critical Metrics
- **Total Tasks**: ${tasks.length}
- **Urgent Tasks**: ${urgentTasks.length} total (${unassignedUrgent} unassigned)
- **High Priority Tasks**: ${highPriorityTasks.length} total (${unassignedHigh} unassigned)
- **In Progress Tasks**: ${inProgressTasks.length}
- **Overdue Tasks**: ${overdueTasks.length}
- **Stale Tasks (>3 days)**: ${staleInProgressTasks.length}

### 👥 HOUR-BASED DEVELOPER WORKLOAD (PRIMARY METRIC)

${Object.entries(developerWorkload)
  .filter(([dev]) => dev !== 'Unassigned')
  .sort((a, b) => {
    // Sort by in-progress hours first, then by total hours, then by task count
    const aInProgressHrs = developerInProgressHours[a[0]] || 0;
    const bInProgressHrs = developerInProgressHours[b[0]] || 0;
    if (aInProgressHrs !== bInProgressHrs) return bInProgressHrs - aInProgressHrs;
    const aHours = developerHours[a[0]] || 0;
    const bHours = developerHours[b[0]] || 0;
    if (aHours !== bHours) return bHours - aHours;
    return (developerInProgress[b[0]] || 0) - (developerInProgress[a[0]] || 0);
  })
  .map(([dev, count]) => {
    const inProgress = developerInProgress[dev] || 0;
    const inProgressHrs = developerInProgressHours[dev] || 0;
    const urgentHrs = developerUrgentHours[dev] || 0;
    const highHrs = developerHighHours[dev] || 0;
    const hours = developerHours[dev] || 0;
    const urgentCount = developerUrgentCount[dev] || 0;
    const highCount = developerHighCount[dev] || 0;
    
    // Status based on IN-PROGRESS HOURS (not task count)
    const status = inProgressHrs > 32 ? '🔴 OVERLOADED' :
                   inProgressHrs > 16 ? '🟡 BUSY' :
                   '🟢 AVAILABLE';
    
    // Warning if developer has tasks but no hour estimates
    const noHoursWarning = count > 0 && hours === 0 ? ' ⚠️ NO TIME ESTIMATES' : '';
    
    return `#### ${dev} ${status}${noHoursWarning}
**HOURS BREAKDOWN:**
- **In Progress**: ${inProgressHrs.toFixed(1)} hours (${inProgress} tasks) ${inProgressHrs > 24 ? '⚠️ TOO MANY HOURS' : ''}
- **Urgent Priority**: ${urgentHrs.toFixed(1)} hours (${urgentCount} tasks)
- **High Priority**: ${highHrs.toFixed(1)} hours (${highCount} tasks)
- **Total Assigned**: ${hours.toFixed(1)} hours (${count} tasks)
- **Work Days**: ${hours > 0 ? (hours / 8).toFixed(1) : '0.0'} days | In-Progress Days: ${inProgressHrs > 0 ? (inProgressHrs / 8).toFixed(1) : '0.0'} days
${count > 0 && hours === 0 ? '⚠️ **WARNING**: Has ' + count + ' tasks but no time estimates provided!' : ''}`;
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
  .filter(([, count]) => count > 0)
  .sort((a, b) => a[0].localeCompare(b[0])) // Sort alphabetically by developer name
  .map(([dev]) => {
    const devTasks = inProgressTasks.filter(task => {
      const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
      return devField && getDeveloperName(devField) === dev;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort tasks alphabetically by name
    
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

### 🚨 URGENT PRIORITY TASKS BY DEVELOPER

${(() => {
  // Group urgent tasks by developer
  const urgentByDeveloper: Record<string, typeof urgentTasks> = {};
  
  urgentTasks.forEach(task => {
    const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
    const devName = devField ? getDeveloperName(devField) : 'Unassigned';
    
    if (!urgentByDeveloper[devName]) {
      urgentByDeveloper[devName] = [];
    }
    urgentByDeveloper[devName].push(task);
  });
  
  // Sort developers alphabetically and format output
  return Object.entries(urgentByDeveloper)
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort alphabetically by developer name
    .map(([dev, tasks]) => {
      const sortedTasks = tasks.sort((a, b) => a.name.localeCompare(b.name)); // Sort tasks alphabetically
      
      return `#### ${dev} (${sortedTasks.length} urgent tasks)
${sortedTasks.map(task => {
  const hours = task.time_estimate ? (task.time_estimate / (1000 * 60 * 60)).toFixed(1) : '0';
  const isInProgress = task.status?.status?.toLowerCase().includes('progress') ||
                       task.status?.status?.toLowerCase().includes('active');
  const overdue = task.due_date && new Date(parseInt(task.due_date)) < now;
  
  return `- **${task.name}**
  - Status: ${task.status?.status || 'Unknown'} ${isInProgress ? '(In Progress)' : ''}
  - Time Estimate: ${hours}h
  ${overdue ? '  - 🚨 **OVERDUE**' : ''}`;
}).join('\n')}`;
    }).join('\n\n');
})()}

### 📊 HIGH PRIORITY TASKS BY DEVELOPER

${(() => {
  // Group high priority tasks by developer
  const highByDeveloper: Record<string, typeof highPriorityTasks> = {};
  
  highPriorityTasks.forEach(task => {
    const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
    const devName = devField ? getDeveloperName(devField) : 'Unassigned';
    
    if (!highByDeveloper[devName]) {
      highByDeveloper[devName] = [];
    }
    highByDeveloper[devName].push(task);
  });
  
  // Sort developers alphabetically and format output
  return Object.entries(highByDeveloper)
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort alphabetically by developer name
    .map(([dev, tasks]) => {
      const sortedTasks = tasks.sort((a, b) => a.name.localeCompare(b.name)); // Sort tasks alphabetically
      
      return `#### ${dev} (${sortedTasks.length} high priority tasks)
${sortedTasks.map(task => {
  const hours = task.time_estimate ? (task.time_estimate / (1000 * 60 * 60)).toFixed(1) : '0';
  const isInProgress = task.status?.status?.toLowerCase().includes('progress') ||
                       task.status?.status?.toLowerCase().includes('active');
  const overdue = task.due_date && new Date(parseInt(task.due_date)) < now;
  
  return `- **${task.name}**
  - Status: ${task.status?.status || 'Unknown'} ${isInProgress ? '(In Progress)' : ''}
  - Time Estimate: ${hours}h
  ${overdue ? '  - 🚨 **OVERDUE**' : ''}`;
}).join('\n')}`;
    }).join('\n\n');
})()}

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

## FOCUS AREAS FOR TODAY

Please analyze the data above and provide:
1. **Quick summary** of changes since last standup (${lastStandupTime.toLocaleString('en-US', { timeZone: 'America/Chicago', timeStyle: 'short' })} on ${lastStandupTime.toLocaleDateString('en-US', { weekday: 'long' })})
2. **Urgent tasks stagnant 2+ days** - List Task IDs and developers
3. **Critical unassigned urgent work** - Task IDs that need immediate assignment
4. **Developer capacity concerns** - Who's over 6 productive hours today?
5. **Blockers/risks** needing immediate attention

Keep responses concise and actionable, referencing specific Task IDs.

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