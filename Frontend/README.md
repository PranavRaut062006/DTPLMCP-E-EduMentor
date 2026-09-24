# TeachAI Studio

AI-Powered Content Generator & Mentor — Frontend

Build a complete, professional frontend for an industry-style AI SaaS web application called TeachAI.

The platform is an AI-powered academic content generator and mentor that helps faculty convert syllabus and reference materials into structured teaching content, while allowing students to access the published learning material.

Design Direction

Create a premium, modern AI-tool interface similar in quality to products like ChatGPT, Notion, Linear, and other modern SaaS platforms.

Theme

Primary theme: Dark 

Use subtle gradients and glassmorphism where appropriate

Clean white/light-gray typography

Use one elegant accent color for important actions

Avoid excessive colors

Rounded cards and buttons

Subtle borders and shadows

Smooth hover and transition animations

Professional spacing and typography

Responsive on desktop, tablet, and mobile

The interface should feel like a real commercial AI product, not a college project.

Brand

Application name:

TeachAI

Tagline:

"Turn your syllabus into intelligent learning."

Create a simple professional TeachAI logo/icon.

The logo should be minimal and modern:

Simple TeachAI silhouette/head

Geometric and clean

Suitable for an AI SaaS product

Should work as both an icon and a small navbar logo

Do not make it cartoonish or childish

Use the TeachAI logo consistently throughout the application.

Authentication

Create professional authentication screens.

Login

Fields:

Email

Password

Options:

Remember me

Forgot password

Sign In

Also provide:

Don't have an account? Create account

Registration

Fields:

Full Name

Email

Password

Confirm Password

Role

Role selection:

Faculty

Student

Use attractive role-selection cards instead of a plain dropdown.

After registration/login, redirect the user to the appropriate dashboard.

Landing Page

Create a professional public landing page for TeachAI.

Hero section:

Turn your syllabus into intelligent learning.

Supporting text:

"TeachAI helps faculty transform syllabi and reference materials into structured teaching plans, presentations, notes, PDFs, and AI-narrated lectures — all within the available teaching time."

Primary CTA:

Get Started

Secondary CTA:

Explore Platform

Show a beautiful product dashboard preview/mockup in the hero section.

Add sections:

How It Works

Upload Syllabus

Add References

Set Teaching Duration

Generate Content

Review & Edit

Publish to Students

AI Capabilities

Cards for:

AI Teaching Plans

PPT Generation

Notes & PDF Generation

AI Lecture Generation

Faculty Voice

Reference-Based Learning

Faculty / Student

Two separate sections explaining the experience for Faculty and Students.

Footer

Include:

TeachAI

About

Features

Contact

Privacy

Terms

Faculty Dashboard

Create a professional dashboard after Faculty login.

Sidebar navigation:

Dashboard

My Classrooms

Create Classroom

Content Generator

Materials

Students

Profile

Settings

Top navigation:

Search

Notifications

Faculty profile/avatar

Dashboard content:

Welcome Section

"Good morning, Professor"

Subtitle:

"Create engaging learning content from your syllabus."

Statistics Cards

Show:

Total Classrooms

Published Materials

Students

Generated Content

Recent Classrooms

Display classroom cards with:

Subject name

Class code

Number of students

Number of materials

Last updated

Open Classroom button

Quick Actions

Buttons:

Create Classroom

Generate Content

Upload Reference

View Materials

Create Classroom

Create a clean form.

Fields:

Classroom Name

Subject

Description

Academic Year

Department / Course

Generate a unique:

Class Code

After creation, show the classroom dashboard.

Classroom Dashboard

Show:

Classroom name

Subject

Class code

Student count

Tabs:

Overview

Syllabus

Materials

Students

Overview should show:

Recent activity

Published content

Upcoming teaching topics

Syllabus Management

Create an interface where Faculty can:

Upload complete syllabus PDF

Upload document

Enter syllabus manually

Add Unit

Add Topic

Edit topic

Delete topic

Display syllabus hierarchically:

Unit I

├── Topic 1

├── Topic 2

└── Topic 3

Unit II

├── Topic 1

└── Topic 2

Provide buttons:

Add Unit

Add Topic

Upload Syllabus

AI Content Generator

This is one of the most important screens.

Create a professional multi-step content generation interface.

Step 1 — Select Classroom

Select the classroom/course.

Step 2 — Select Topics

Display syllabus tree with checkboxes.

Example (it's just an example don't use it as placeholder or inbuilt data):

☑ Unit I — Design Thinking for Product Innovation

☑ Introduction to Innovation

☑ Need for Product Development

☑ Design Thinking

☑ Human-Centered Product Design

☑ Five Stages of Design Thinking

☑ Customer Need Analysis

Step 3 — Teaching Duration

Allow Faculty to specify:

Teaching Duration

Example:

4 Hours

Provide a slider and manual input.

Step 4 — Reference Materials

Allow:

Upload PDF

Upload DOCX

Upload PPT

Add book reference

Add website reference

Add YouTube URL

Show uploaded references as cards.

Step 5 — Content Selection

Allow Faculty to choose what AI should generate:

☑ Teaching Plan

☑ PPT Presentation

☑ Lecture Notes

☑ PDF

☑ Lecture Script

☑ Video Lecture

Generate

Large primary button:

Generate Learning Content

Show an attractive AI generation/loading state.

Example:

"Analyzing syllabus..."

"Reading reference materials..."

"Creating teaching structure..."

"Generating lecture content..."

"Preparing learning materials..."

AI Generation Result

After generation, show a professional content workspace.

Header:

AI Generated Learning Package

Show:

Teaching duration

Topics covered

References used

Generation status

Tabs:

Teaching Plan

PPT

Notes

PDF

Lecture Script

Video

Provide actions:

Edit

Regenerate

Download

Preview

Approve & Publish

Teaching Plan

Display a timeline.

Example:

00:00 – 00:20

Introduction to Innovation

00:20 – 00:50

Need for Product Development

00:50 – 01:30

Design Thinking

01:30 – 02:00

Human-Centered Design

etc.

Make the timeline visually attractive.

PPT Preview

Create a slide-preview interface.

Left side:

Slide thumbnails

Center:

Large selected slide preview

Right side:

Slide information / editing controls

Buttons:

Edit Slide

Regenerate Slide

Add Slide

Delete Slide

Notes / PDF Preview

Provide a document-style preview.

Actions:

Edit

Regenerate

Download PDF

Lecture Script

Show the generated lecture script with sections.

Example:

Introduction

"Good morning everyone. Today we are going to learn about..."

Actions:

Edit Script

Regenerate Section

Generate Voice

Video Lecture

Create a professional video-generation interface.

Show:

Video preview area

Below it:

Voice

AI Voice

Faculty Voice

Speaking Speed

Slow

Normal

Fast

Lecture Duration

Generate Lecture Video

Show generation progress.

After generation:

Preview Video

Download

Publish

Do not implement actual AI video generation yet. Build the complete UI so that the backend/API can be connected later.

Faculty Review & Publishing

Before publishing, show a review page.

Checklist:

✓ Teaching Plan

✓ PPT

✓ Notes

✓ PDF

✓ Lecture Script

✓ Video

Buttons:

Save Draft

Publish to Classroom

After publishing show:

"Learning package published successfully."

Students in that classroom can now access it.

Student Dashboard

Create a separate student experience.

Sidebar:

Dashboard

My Classrooms

Learning Materials

Assignments

Profile

Settings

Dashboard:

Welcome

"Welcome back!"

Show:

Enrolled Classes

Available Materials

Recently Published Content

Learning Progress

Join Classroom

Provide:

Enter Class Code

Example:

ABC123

Button:

Join Classroom

Show joined classrooms as cards.

Student Classroom

Show:

Subject

Faculty

Description

Class information

Tabs:

Overview

Learning Materials

Teaching Plan

Learning material cards:

📄 Lecture Notes

📊 Presentation

📕 PDF

🎥 Video Lecture

Each card should have:

View

Download

Video Learning Page

Create a professional video-learning interface.

Large video player.

Below:

Lecture title

Description

Topics covered

Teaching duration

Reference materials

Sidebar:

Course Contents

Unit I

Topic 1 ✓

Topic 2

Topic 3

Profile & Settings

Create settings pages for both Faculty and Students.

Profile:

Name

Email

Role

Profile picture

Faculty-specific:

Voice Profile

UI for:

Upload voice sample

Voice profile status

Delete voice profile

Include a clear consent message:

"Faculty voice generation requires explicit consent."

Do not implement the voice cloning functionality yet.

Important UI/UX Requirements

Make the application fully responsive.

Use:

Modern sidebar

Breadcrumbs

Cards

Modals

Toast notifications

Loading skeletons

Empty states

Confirmation dialogs

Progress indicators

Use realistic sample data so the UI looks complete even before the backend is connected.

Use reusable components throughout the application.

Create clear API/service placeholders so backend functionality can be connected later.

Do NOT hardcode the application architecture in a way that makes backend integration difficult.

The frontend should be structured so we can later connect:

Authentication API

Classroom API

Syllabus upload API

Reference/document processing API

Gemini/LLM API

PPT generation API

PDF generation API

Text-to-speech API

Video generation pipeline

Database

File storage

Overall Goal

The final result should look like a production-ready AI education SaaS platform called TeachAI.

It should feel similar to a modern AI startup product — clean, minimal, premium, dark, professional, and highly usable.

Prioritize UI quality, consistency, responsiveness, and scalability.

Important: No Placeholder or Hardcoded Data

Do NOT use fake, placeholder, mock, demo, or hardcoded user data anywhere in the application.

The UI should contain only:

Empty states when no data exists

Forms for the user to enter data

Dynamic data fetched from the backend/database

Dynamic content generated through APIs

Do not pre-fill:

Faculty names

Student names

Classroom names

Class codes

Subjects

Syllabus topics

Statistics

Learning materials

Notifications

Profile information

Generated content

Do not create fake/sample classrooms, students, courses, PDFs, PPTs, videos, or AI-generated content.

All values shown in the dashboard and other pages must come from the authenticated user's actual data or backend API responses.

If data is not available, show a professional empty state such as:

"Create your first classroom to get started."

Use loading skeletons while fetching data and proper empty/error states when data is unavailable.

All the examples give are just for example does not mean you have to put sample/inbuilt data there

Keep the frontend architecture ready for real backend API integration. Do not implement fake API responses or simulated backend data.

ROLE-BASED ACCESS

The application has two roles:

- FACULTY

- STUDENT

After authentication, the user's role determines the dashboard and available routes.

Faculty-only routes must not be accessible to students.

Student-only routes must not be accessible to faculty unless explicitly required.

Implement route protection using an authentication/authorization layer rather than only hiding navigation items.

The frontend should obtain the authenticated user's role from the authentication system/backend and never assume a role from hardcoded data.

## CRITICAL: FRONTEND ONLY

For this request, build **ONLY the frontend/UI**.

Do NOT build, configure, or implement:

* Backend

* Database

* Authentication backend

* API integrations

* AI/LLM APIs

* Gemini API

* File storage

* Text-to-speech

* Speech-to-text

* Video generation

* Server-side logic

Do NOT create mock APIs, fake API responses, simulated backend services, or database data.

Focus only on creating the complete, polished, responsive frontend and UI/UX for all the screens and user flows described above.

Use proper frontend components, routing, forms, states, and reusable UI components so that I can connect a separate backend later.

**Do not spend credits implementing backend functionality. Stop at the frontend layer.**


when I say backend I mean build a frontend which is suitable for this backend don't create backend

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://teachflow-ai-97.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/67628b84-819c-4afd-b4f5-6321ce478391).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
