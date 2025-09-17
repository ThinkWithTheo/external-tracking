# Standard Operating Procedure: Daily Review Process

## 1. Overview

This document outlines the standardized process for the daily review and analysis of development tasks. The goal of this process is to ensure that the team is aligned, focused, and productive, with a clear understanding of daily priorities and any potential blockers.

The process is centered around a data-driven daily meeting, supported by an automated report that provides a concise summary of task-related activities.

## 2. The Daily Review Cycle

The daily review cycle is a 23-hour period that captures a full day of work.

- **Review Window:** The review period begins at **11:00 AM CST on the previous business day** and ends at **10:00 AM CST on the current day**.
- **LLM Report:** An automated report is generated at **9:55 AM CST** each day, summarizing all relevant activities within this window.
- **Daily Meeting:** A 30-minute meeting is held at **10:00 AM CST** to review the report, discuss priorities, and address any blockers.

## 3. The LLM Report

The **Daily Review Analysis Report** is an automated report that serves as the foundation for the daily meeting. The report is designed to be a single source of truth for the team's progress and priorities.

### Key Sections

- **Key Changes Summary:** This is the most critical section of the report for the daily meeting. It provides a high-level overview of:
    - **New Tasks Created:** Any new tasks that have been added to the system.
    - **Tasks Started:** Tasks that have been moved to an "In Progress" status.
    - **Tasks Completed:** Tasks that have been marked as done.
- **Executive Summary:** Provides key metrics, including the number of urgent, high-priority, and overdue tasks.
- **Developer Workload:** A breakdown of the current workload for each developer, including the number of tasks and estimated hours.
- **Detailed Task Lists:** Comprehensive lists of all tasks, categorized by priority, status, and developer.

## 4. The Daily Meeting

The daily meeting is a structured, time-boxed event designed to be as efficient as possible. For a detailed breakdown of the meeting structure, please refer to the [Daily Review Analysis Meeting Agenda](./Daily-Review-Analysis-Agenda.md).

### Core Principles

- **Be Prepared:** All attendees are expected to have reviewed the "Key Changes" and "Executive Summary" sections of the report before the meeting.
- **Be Brief:** Discussions should be concise and to the point. The meeting is not a status report, but a forum for identifying and resolving issues.
- **Be Action-Oriented:** The primary outcome of the meeting should be a clear set of action items and priorities for the day.

## 5. Roles and Responsibilities

- **Developers:**
    - Keep task statuses and estimates up to date.
    - Review the daily report before the meeting.
    - Actively participate in the daily meeting, raising any blockers or concerns.
- **Facilitator:**
    - Ensures the meeting starts and ends on time.
    - Guides the discussion according to the agenda.
    - Captures and assigns action items.
- **Project Manager/Team Lead:**
    - Monitors the overall progress of the team.
    - Helps to resolve any escalated blockers.
    - Ensures that the daily review process is being followed effectively.

## 6. Process Flow

```mermaid
graph TD
    A[1. Previous Day's Meeting Ends at 11:00 AM CST] --> B{2. Team Works on Tasks};
    B --> C[3. LLM Report is Generated at 9:55 AM CST];
    C --> D{4. Daily Review Meeting at 10:00 AM CST};
    D --> E[5. Review Key Changes];
    D --> F[6. Discuss Blockers and Risks];
    D --> G[7. Align on Priorities and Action Items];
    G --> H[8. Meeting Ends and Work Begins];
    H --> B;

    subgraph "Automated Process"
        C
    end

    subgraph "Team Collaboration"
        D
        E
        F
        G
    end