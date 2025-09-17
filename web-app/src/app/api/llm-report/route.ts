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
    
    // Calculate the start of the review period: 11 AM CST on the previous business day.
    const getReviewStartTime = (date: Date): Date => {
      const reviewStart = new Date(date);
      const day = date.getDay();

      // Set time to 11:00 AM America/Chicago
      // Note: We set the time in the local timezone of the server, then convert.
      // This is a bit tricky with UTC dates. A better way is to set UTC hours directly.
      // 11 AM CDT = 16:00 UTC. 11 AM CST = 17:00 UTC.
      // Let's assume CDT for now.
      const reviewHourUTC = 16; // 11 AM CDT

      // If it's Monday, the review period starts on Friday at 11 AM.
      if (day === 1) { // Monday
        reviewStart.setUTCDate(date.getUTCDate() - 3);
      }
      // If it's Sunday, starts on Friday.
      else if (day === 0) { // Sunday
        reviewStart.setUTCDate(date.getUTCDate() - 2);
      }
      // Otherwise, it starts on the previous day.
      else {
        reviewStart.setUTCDate(date.getUTCDate() - 1);
      }

      // Set the time to 11:00 AM CST/CDT (16:00 UTC for CDT)
      reviewStart.setUTCHours(reviewHourUTC, 0, 0, 0);
      return reviewStart;
    };

    const reviewStartTime = getReviewStartTime(now);
    const reviewStartTimeUTC = reviewStartTime.toISOString();
    
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
            captureRecent = logDate >= reviewStartTime;
          }
        }
        
        if (captureRecent) {
          recentLines.push(line);
        }
      }
      
      recentLogContent = recentLines.length > 0 ? recentLines.join('\n') : 'No changes since the last review period.';
      
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

    // Get tasks with recent status changes, new tasks, and completed tasks
    const newTasks = tasks.filter(task => {
      if (!task.date_created) return false;
      const createdDate = new Date(parseInt(task.date_created));
      return createdDate >= reviewStartTime;
    });

    const recentlyCompletedTasks = tasks.filter(task => {
      if (!task.date_done) return false;
      const doneDate = new Date(parseInt(task.date_done));
      return doneDate >= reviewStartTime;
    });

    const recentlyStartedTasks = tasks.filter(task => {
      if (!task.date_updated || !task.status?.status?.toLowerCase().includes('progress')) return false;
      const updatedDate = new Date(parseInt(task.date_updated));
      // This is a proxy: assumes the last update was the move to "in progress"
      return updatedDate >= reviewStartTime;
    });

    // --- Slack Message Generation ---
    // Dynamically create a map for Slack user handles from the developer list
    const slackUserMap: Record<string, string> = {};
    Object.values(developerMap).forEach(name => {
      // Creates a mapping from 'Dev Name' to 'dev.name' for Slack @mentions.
      if (name && !slackUserMap[name]) {
        slackUserMap[name] = name.toLowerCase().replace(/\s+/g, '.');
      }
    });

    const developerTalkingPoints: Record<string, string[]> = {};

    // Collect talking points for each developer (urgent, stale, or in-progress)
    inProgressTasks.forEach(task => {
      const devField = task.custom_fields?.find(f => f.name?.toLowerCase().includes('developer'));
      const devName = devField ? getDeveloperName(devField) : 'Unassigned';
      
      if (devName !== 'Unassigned') {
        const isUrgent = task.priority?.priority?.toLowerCase() === 'urgent';
        const isStale = staleInProgressTasks.some(staleTask => staleTask.id === task.id);

        // We only want to prompt them about urgent or stale tasks
        if (isUrgent || isStale) {
          if (!developerTalkingPoints[devName]) {
            developerTalkingPoints[devName] = [];
          }
          let point = `- ${task.name}`;
          if (isUrgent && isStale) {
            point += ' (🔥 Urgent & ⏰ Stale)';
          } else if (isUrgent) {
            point += ' (🔥 Urgent)';
          } else if (isStale) {
            point += ' (⏰ Stale)';
          }
          developerTalkingPoints[devName].push(point);
        }
      }
    });

    let slackMessage = `*Good morning!* ☀️ Here is your daily review summary.\n\nPlease be prepared to discuss your urgent/stale tasks:`;

    Object.entries(developerTalkingPoints).forEach(([dev, points]) => {
      const slackHandle = slackUserMap[dev] ? `<@${slackUserMap[dev]}>` : `*${dev}*`;
      slackMessage += `\n\n${slackHandle}:\n${points.join('\n')}`;
    });

    const slackBlock = `## 📋 SLACK MESSAGE TO COPY
\`\`\`
${slackMessage}
\`\`\`
---
`;
    // --- End Slack Message Generation ---

    // Generate the markdown report
    const report = `${slackBlock}# Daily Review Analysis Report
Generated: ${nowUTC}
Current Time (CST/CDT): ${now.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'long' })}
Review Period Start: ${reviewStartTime.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'long' })}

## PROMPT FOR DAILY REVIEW ANALYSIS

You are analyzing a software development team's task management data for their daily review meeting.

**IMPORTANT CONTEXT:**
- The report was generated at: ${nowUTC}
- The review period is from **11:00 AM CST/CDT on the previous business day** to now.
- The logs below show changes since: ${reviewStartTimeUTC}
- All timestamps are in UTC format (ISO 8601).
- Assume developers have a capacity of 6 productive hours per day.

**IMPORTANT: Review the COMPLETE TASK TABLE and the DAILY REVIEW section below. These are your primary data sources.**

Based on the data, please provide:

### 1. DAILY REVIEW ANALYSIS
Review the 'CHANGES SINCE LAST REVIEW' log and the list of 'CURRENTLY IN-PROGRESS TASKS'.
- What key activities occurred since the last review period started (${reviewStartTime.toLocaleString('en-US', { timeZone: 'America/Chicago' })})?
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

### CHANGES SINCE LAST REVIEW
**Review Period Start**: ${reviewStartTime.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'long' })}
**Changes Tracked From**: ${reviewStartTimeUTC}
**Current Time (UTC)**: ${nowUTC}

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

### 🚀 KEY CHANGES SINCE LAST REVIEW
- **New Tasks Created**: ${newTasks.length}
- **Tasks Started (Moved to In Progress)**: ${recentlyStartedTasks.length}
- **Tasks Completed**: ${recentlyCompletedTasks.length}

${newTasks.length > 0 ? `
**New Tasks:**
${newTasks.map(t => `- ${t.name}`).join('\n')}
` : ''}
${recentlyStartedTasks.length > 0 ? `
**Started Tasks:**
${recentlyStartedTasks.map(t => `- ${t.name}`).join('\n')}
` : ''}
${recentlyCompletedTasks.length > 0 ? `
**Completed Tasks:**
${recentlyCompletedTasks.map(t => `- ${t.name}`).join('\n')}
` : ''}

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
1. **Quick summary** of changes since the review period started (${reviewStartTime.toLocaleString('en-US', { timeZone: 'America/Chicago', timeStyle: 'short' })} on ${reviewStartTime.toLocaleDateString('en-US', { weekday: 'long' })})
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