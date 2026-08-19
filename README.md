# AI Learning Suite

**AI-powered, multi-tenant learning platform for schools**

AI Learning Suite is a full-stack educational platform designed to help schools manage teachers, students, courses, lessons, assignments, assessments, and AI-assisted learning from a single application.

The platform follows a **multi-tenant architecture**, allowing multiple schools to use the same system while keeping their users, courses, and educational data isolated from one another.

---

## Overview

AI Learning Suite provides role-based experiences for four types of users:

* **Platform Super Admin** — manages schools and platform-level configuration
* **School Admin** — manages users and resources within a school
* **Teacher** — creates and manages courses, lessons, assignments, and assessments
* **Student** — joins courses, learns from course content, submits work, and tracks progress

The platform combines traditional learning management features with AI-assisted content creation, evaluation, and tutoring.

### Core Capabilities

* Multi-school / multi-tenant architecture
* Role-based authentication and authorization
* Course and module management
* Manual and AI-assisted lesson creation
* PDF-based learning content generation
* Assignment and quiz management
* AI-assisted assessment and grading
* Student progress tracking
* AI Tutor based on course content
* Grade and performance reports
* School administration
* Platform-level administration
* PostgreSQL database
* REST APIs using FastAPI
* React-based frontend
* Azure deployment support

---

# Architecture

The platform follows a **frontend–backend–database architecture**.

```text
                    ┌─────────────────────┐
                    │    Platform Admin   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   AI Learning Suite │
                    │       Platform      │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │ School A │      │ School B │      │ School C │
        └────┬─────┘      └────┬─────┘      └────┬─────┘
             │                 │                 │
        ┌────┴─────┐      ┌────┴─────┐      ┌────┴─────┐
        │ Teachers │      │ Teachers │      │ Teachers │
        │ Students │      │ Students │      │ Students │
        └──────────┘      └──────────┘      └──────────┘
```

### Application Architecture

```text
┌──────────────────────────────┐
│        React Frontend        │
│          Vite + JS           │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│       FastAPI Backend        │
│                              │
│ Authentication               │
│ School Management            │
│ Course Management            │
│ Lesson Management            │
│ Assignment Management        │
│ Student Progress             │
│ AI Services                  │
│ PDF Processing               │
└──────────────┬───────────────┘
               │
               │ SQLAlchemy
               ▼
┌──────────────────────────────┐
│        PostgreSQL            │
│          Database            │
└──────────────────────────────┘
```

---

# User Roles

## Platform Super Admin

The Super Admin operates at the platform level.

### Features

* Platform dashboard
* School onboarding
* School management
* School status management
* Subscription management
* Platform settings
* Activity logs
* Multi-school administration
* Shared / Golden Source learning content management

---

## School Admin

School Admins manage resources belonging to their school.

### Features

* Manage teachers
* Add teachers
* Edit teacher information
* Manage students
* Add students
* Edit student information
* View school users
* Manage school courses
* Monitor school activity
* Maintain school-level information

All school resources belong to their respective tenant.

---

## Teacher

Teachers are responsible for creating and managing educational content.

### Course Management

Teachers can:

* Create courses
* Edit courses
* Generate unique course codes
* Create course modules
* Create and manage lessons
* Publish course content

### Lesson Creation

Lessons can be created through multiple workflows:

* Manual creation
* PDF-based generation
* AI-assisted generation

AI-generated content can be reviewed and edited by the teacher before being published to students.

### Assignments and Assessments

Teachers can:

* Create assignments
* Create quizzes
* Generate assessments using AI
* Assign work to students
* Collect submissions
* Grade submissions
* View student performance

### AI-Assisted Evaluation

The platform can support AI-assisted evaluation workflows including:

```text
Answer Key PDF
      │
      ▼
Answer Processing
      │
      ▼
AI-Assisted Evaluation
      │
      ▼
Suggested Marks
      │
      ▼
Teacher Review
      │
      ▼
Final Grade
```

AI assists with evaluation, but teachers retain control over final grades.

### Reports

Teachers can monitor student performance and generate reports containing:

* Student names
* Assignments
* Marks
* Total scores
* Performance information

Reports can be exported to supported formats such as PDF or Excel.

---

# Student

Students use the platform to access their learning material and complete assigned work.

### Features

* Join courses using course codes
* View enrolled courses
* Access course modules
* Read lessons
* View assignments
* Complete quizzes
* Submit assignments
* View grades
* Track learning progress
* View achievements where enabled
* Interact with the AI Tutor

---

# AI Tutor

The AI Tutor provides students with AI-assisted learning support.

Unlike a general-purpose chatbot, the tutor is designed to use the learning material associated with the student's course.

```text
Student Question
       │
       ▼
Course Context
       │
       ▼
Relevant Learning Material
       │
       ▼
AI Tutor
       │
       ▼
Contextual Answer
```

This approach helps keep responses relevant to the educational material provided by the teacher.

The AI Tutor architecture can be extended to support retrieval-based approaches such as course-document search and context-aware responses.

---

# AI Integration

AI functionality is implemented through backend services so that AI providers can be changed without requiring major frontend changes.

### Supported / Planned Providers

* Google Gemini
* Anthropic Claude
* Other compatible AI services

AI provider credentials must be stored as environment variables.

**Never commit API keys or other secrets to Git.**

Example:

```env
GEMINI_API_KEY=your_api_key_here
```

---

# Multi-Tenant Architecture

AI Learning Suite is designed as a **multi-tenant application**.

Each school represents a separate tenant.

```text
School
│
├── Teachers
├── Students
├── Courses
├── Modules
├── Lessons
├── Assignments
├── Submissions
└── Student Progress
```

Every school-owned resource is associated with its respective school.

### Tenant Isolation

A user from School A must not be able to access resources belonging to School B.

Tenant isolation is enforced at the backend layer by applying school-level authorization and filtering to school-owned resources.

```text
School A
   │
   ├── Teacher A
   ├── Student A
   └── Course A

School B
   │
   ├── Teacher B
   ├── Student B
   └── Course B

        ✕ No cross-school access
```

This architecture allows multiple schools to use the same application while maintaining logical separation of their data.

---

# Authentication & Authorization

The application uses JWT-based authentication.

```text
User Login
    │
    ▼
Authentication API
    │
    ▼
JWT Token
    │
    ▼
Frontend Auth Context
    │
    ▼
Authorization Header
    │
    ▼
Protected API
```

Protected backend endpoints validate:

1. Authentication
2. User role
3. Tenant / school access
4. Resource permissions

This ensures that users can only access functionality and data appropriate to their role and school.

---

# Application Flow

## Platform Setup

```text
Super Admin
     │
     ▼
Create School
     │
     ▼
School Admin
```

## School Setup

```text
School Admin
     │
     ├── Add Teachers
     │
     └── Add Students
```

## Course Creation

```text
Teacher
   │
   ▼
Create Course
   │
   ▼
Generate Course Code
   │
   ▼
Create Modules
   │
   ├── Manual
   ├── PDF
   └── AI
   │
   ▼
Create Lessons
   │
   ▼
Review Content
   │
   ▼
Publish Course
```

## Student Enrollment

```text
Teacher
   │
   ▼
Course Code
   │
   ▼
Student
   │
   ▼
Join Course
```

## Learning

```text
Student
   │
   ├── Lessons
   ├── Assignments
   ├── Quizzes
   ├── Activities
   ├── Grades
   ├── Progress
   └── AI Tutor
```

---

# Technology Stack

## Frontend

| Technology   | Purpose                      |
| ------------ | ---------------------------- |
| React        | User interface               |
| Vite         | Frontend build tool          |
| JavaScript   | Application development      |
| React Router | Client-side routing          |
| Context API  | Application state management |
| CSS          | Styling                      |

## Backend

| Technology | Purpose                 |
| ---------- | ----------------------- |
| Python     | Backend development     |
| FastAPI    | REST API framework      |
| SQLAlchemy | Database ORM            |
| Pydantic   | Data validation         |
| PostgreSQL | Relational database     |
| JWT        | Authentication          |
| Alembic    | Database migrations     |
| psycopg2   | PostgreSQL connectivity |

## AI

| Technology       | Purpose                      |
| ---------------- | ---------------------------- |
| Google Gemini    | AI generation and assistance |
| Anthropic Claude | AI generation and assistance |

AI providers are accessed through backend services rather than directly from the frontend.

## Document Processing

* PDF processing
* PDF-based course generation
* PDF answer-key processing
* Report generation

## Deployment

The application is designed for cloud deployment using:

* Microsoft Azure
* Azure App Service
* Azure Database for PostgreSQL

---

# Project Structure

```text
AI LEARNING/
│
├── Backend/
│   └── backend/
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── services/
│       │   └── main.py
│       │
│       ├── alembic/
│       ├── alembic.ini
│       ├── requirements.txt
│       └── seed.py
│
├── Frontend/
│   ├── public/
│   ├── src/
│   │   ├── Components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

# Prerequisites

Before running the project, install:

* Python 3.10+
* Node.js
* npm
* PostgreSQL
* Git

---

# Local Development Setup

## 1. Clone the Repository

```powershell
git clone <repository-url>
cd "AI LEARNING"
```

---

# Backend Setup

Navigate to the backend:

```powershell
cd Backend\backend
```

Create a Python virtual environment:

```powershell
python -m venv venv
```

Activate the environment:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the required dependencies:

```powershell
pip install -r requirements.txt
```

---

# Environment Configuration

Create:

```text
Backend/backend/.env
```

Example:

```env
DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@localhost:5432/ai_learning
SECRET_KEY=<YOUR_SECRET_KEY>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

Replace the placeholder values with your local configuration.

**Do not commit `.env` to the repository.**

---

# Database Setup

Create a PostgreSQL database named `ai_learning`.

```sql
CREATE DATABASE ai_learning;
```

Run the database migrations:

```powershell
alembic upgrade head
```

If development seed data is available:

```powershell
python seed.py
```

Seed data should only be used for development and testing.

---

# Start the Backend

From:

```text
Backend/backend
```

run:

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

---

# Frontend Setup

Open a second terminal and navigate to the frontend:

```powershell
cd Frontend
```

Install dependencies:

```powershell
npm install
```

Create:

```text
Frontend/.env
```

Example:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Start the development server:

```powershell
npm run dev
```

Vite will display the local frontend URL in the terminal, normally:

```text
http://localhost:5173
```

---

# Running the Full Application

Two terminals are required during local development.

### Terminal 1 — Backend

```powershell
cd Backend\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend

```powershell
cd Frontend
npm run dev
```

Then open the frontend URL displayed by Vite.

---

# API

The backend REST API is exposed under:

```text
/api/v1
```

FastAPI provides interactive API documentation at:

```text
http://localhost:8000/docs
```

The Swagger interface can be used during development to inspect and test available endpoints.

---

# Production Build

Build the React frontend:

```powershell
cd Frontend
npm run build
```

The production build will be generated in:

```text
Frontend/dist
```

---

# Production Backend

A production deployment can run FastAPI using Gunicorn with Uvicorn workers:

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

The exact deployment command may vary depending on the hosting environment.

---

# Azure Deployment

A typical Azure deployment can use:

```text
                         Azure
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
      Azure App Service           Azure App Service
          Frontend                    Backend
                                         │
                                         ▼
                              Azure Database for
                                  PostgreSQL
```

### Backend Environment Variables

Configure production secrets through Azure configuration rather than storing them in source code.

```text
DATABASE_URL
SECRET_KEY
GEMINI_API_KEY
```

### Frontend Environment Variable

```text
VITE_API_BASE_URL
```

Example:

```env
VITE_API_BASE_URL=https://your-backend-app.azurewebsites.net/api/v1
```

---

# Security

Never commit sensitive information to Git.

This includes:

* Database passwords
* JWT secret keys
* AI API keys
* Access tokens
* Production credentials
* `.env` files

Recommended `.gitignore` entries:

```gitignore
# Environment variables
.env
.env.*
!.env.example

# Python
venv/
__pycache__/
*.pyc

# Node
node_modules/
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

# Development Principles

### 1. Frontend and Backend Separation

The React frontend communicates with the FastAPI backend through REST APIs.

The frontend should never connect directly to PostgreSQL.

### 2. Tenant Isolation

School-specific resources must remain isolated between tenants.

Backend authorization should always verify the user's school before returning or modifying school-owned resources.

### 3. Role-Based Access

Users should only access functionality permitted by their role.

```text
Super Admin
     │
     ├── Platform-wide access
     │
School Admin
     │
     ├── School-level administration
     │
Teacher
     │
     ├── Teaching and course management
     │
Student
     │
     └── Learning and submissions
```

### 4. Teacher Control Over AI

AI-generated educational content should be reviewed and edited by teachers before being published to students.

### 5. AI Provider Flexibility

AI integrations should remain behind backend service layers so that providers can be changed without redesigning the frontend.

### 6. No Mock Data in Production

Production data must come from the PostgreSQL database through the backend APIs.

Development seed data should not be used as production application data.

---

# Development Status

The project currently includes the core full-stack architecture:

* React frontend
* Vite development environment
* FastAPI backend
* PostgreSQL database integration
* SQLAlchemy ORM
* Alembic migrations
* JWT authentication
* Multi-tenant school architecture
* Platform Super Admin functionality
* School administration
* Teacher functionality
* Student functionality
* Course management
* Module and lesson management
* Assignment functionality
* Student progress tracking
* PDF-based learning workflows
* AI service architecture
* AI Tutor architecture
* Production frontend build
* Azure deployment preparation

Further AI provider configuration, production infrastructure configuration, testing, monitoring, and deployment setup may be required before production release.

---

# Project Goal

AI Learning Suite aims to provide schools with a scalable and secure learning environment where:

* **Administrators** manage their schools
* **Teachers** create and control educational content
* **Students** learn, practice, and track their progress
* **AI** assists with content creation, assessment, and personalized learning

The overall goal is to combine the structure of a traditional Learning Management System with the capabilities of modern AI while keeping **teachers in control of the learning experience**.

---

## License

This project is currently developed as an educational/project application.
