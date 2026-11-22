# TaskForge 🚀
### AI-Powered, Milestone-Driven Freelance Marketplace

TaskForge is a modern freelance marketplace designed to make project collaboration more structured, transparent, and secure. Instead of relying on traditional freelance workflows, TaskForge organizes projects into AI-assisted milestones, tracks progress, and connects payments with milestone completion.

The platform integrates AI-powered project decomposition to help clients transform project ideas into structured milestones, making project planning, budgeting, and collaboration easier.

🔗 **Live Demo:** https://taskforge-qja8.vercel.app/

---

## ✨ Features

- **AI-Powered Project Decomposition** – Uses Google Gemini AI to convert project briefs into structured milestones with descriptions, estimated effort, and deliverables.
- **Milestone-Based Project Management** – Break projects into manageable milestones with clear deliverables and progress tracking.
- **Budget Allocation** – Allocate the total project budget across milestones using an effort-based allocation approach.
- **Freelancer Applications** – Freelancers can explore projects and apply for suitable opportunities.
- **Milestone-Based Payment Tracking** – Track milestone rewards and payment status through an internal wallet and transaction ledger.
- **Protected Work Preview** – Supports a workflow for previewing submitted work before final deliverable release.
- **Submission and Review Workflow** – Clients can review submitted work, approve submissions, and request revisions.
- **Role-Based Access** – Separate workflows for clients and freelancers.
- **Authentication & Authorization** – User authentication and access control through Supabase.
- **Database Security** – Row Level Security (RLS) policies for access control.
- **Notifications** – Notifications for relevant platform activities.
- **Responsive Interface** – Designed to provide a usable experience across different screen sizes.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React | UI development |
| TypeScript | Type-safe development |
| Supabase | Backend infrastructure |
| PostgreSQL | Database |
| Supabase Auth | Authentication |
| Row Level Security (RLS) | Database access control |
| Supabase Realtime | Real-time functionality |
| Google Gemini API | AI-powered project decomposition |
| Vercel | Deployment |

---

## ⚙️ How TaskForge Works

### 1. Project Creation
Clients create projects by providing a project description, budget, requirements, and timeline.

### 2. AI-Assisted Milestone Generation
Google Gemini AI analyzes the project brief and helps generate a structured breakdown of milestones, tasks, deliverables, estimated effort, and project requirements.

### 3. Review & Customization
Clients can review and modify the AI-generated project structure before publishing.

### 4. Freelancer Applications
Freelancers browse available projects and submit applications for projects matching their skills.

### 5. Project Execution
Once a freelancer is selected, work progresses through predefined milestones, keeping the project organized and trackable.

### 6. Submission & Review
Freelancers submit milestone work for client review. Clients can approve submissions or request revisions according to the workflow.

### 7. Payment Tracking
Milestone-based payment accounting and transaction tracking help maintain transparency between clients and freelancers.

---

## 🏗️ Architecture Overview

TaskForge follows a full-stack architecture:

- **Frontend:** Next.js and React
- **Backend Services:** Supabase
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth
- **Authorization:** Row Level Security (RLS)
- **AI Integration:** Google Gemini API
- **Deployment:** Vercel

The frontend interacts with Supabase for database operations, authentication, and platform functionality, while AI-powered project decomposition is handled through the Gemini integration.

---

## 🚀 Getting Started

Follow these steps to run TaskForge locally.

### Prerequisites

- Node.js
- npm
- A Supabase project
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/TASKFORGE.git
cd TASKFORGE
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholders with your actual credentials.

<sub>Never commit your API keys or environment files to GitHub.</sub>

### 4. Run the Development Server

```bash
npm run dev
```

### 5. Open the Application

Visit:

http://localhost:3000

---

## 🔐 Security

TaskForge incorporates security-focused practices, including:

- Authentication through Supabase Auth.
- Row Level Security policies for database access.
- Role-based access controls.
- Protected database operations.
- Environment-based secret management.

---

## 🌐 Deployment

TaskForge is deployed using Vercel.

Live Application:

https://taskforge-qja8.vercel.app/

---

## 🎯 Project Objective

TaskForge aims to improve the freelance collaboration experience by combining structured milestone management, AI-assisted project planning, transparent budgeting, and a workflow that connects project progress with payment tracking.

The goal is to reduce ambiguity in freelance projects and provide a more organized experience for both clients and freelancers.

---

## 📄 License

This project is developed for educational and portfolio purposes.
