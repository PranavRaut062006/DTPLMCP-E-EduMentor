# Syllabus AI Assistant

Build Phase 1 of a web application called "TeachGen AI".

PRODUCT:

TeachGen AI is a faculty-focused e-content generation platform. The primary user is faculty. Students are secondary users who will later consume faculty-approved content.

IMPORTANT:

This is ONLY PHASE 1.

Do NOT implement voice cloning, voice authentication, RAG, AI-generated audio, quizzes, analytics, LMS integration, mobile app, or advanced AI agents yet.

PHASE 1 GOAL:

Build a functional prototype for this workflow:

Faculty Login

→ Faculty Dashboard

→ Upload Syllabus PDF

→ Extract and display syllabus content

→ Identify Units and Topics

→ Faculty selects a topic

→ Generate AI lecture content

→ Generate PPT content/slide outline

→ Faculty reviews and edits content

→ Faculty approves content

→ Approved content becomes visible in Student Portal

==================================================

1. USER ROLES

==================================================

Create two roles:

PRIMARY USER:

Faculty

Faculty can:

- Login

- Upload syllabus

- Create/manage subjects

- View extracted units and topics

- Select a topic

- Generate lecture content

- Generate PPT slide content

- Edit generated content

- Regenerate content

- Approve content

- Publish approved content

- View published content

SECONDARY USER:

Student

Student can:

- Login

- View available subjects

- View units and topics

- View only faculty-approved content

- View lecture notes

- View PPT/slide content

Students must NOT be able to:

- Generate AI content

- Edit faculty content

- Upload syllabus

- Approve content

==================================================

2. DESIGN

==================================================

Create a modern, professional education SaaS interface.

Style:

- Clean

- Minimal

- Professional

- Academic

- Easy to use

- Responsive

- Desktop-first but mobile-friendly

Use a consistent design system.

Suggested visual direction:

- White/light background

- Dark text

- Blue/indigo primary accent

- Cards with subtle borders

- Rounded corners

- Clear buttons

- Good spacing

- Professional dashboard layout

Do NOT make it look like a generic chatbot.

The application should feel like an institutional faculty productivity platform.

==================================================

3. LANDING PAGE

==================================================

Create a simple landing page.

Hero section:

Title:

"Create Faculty E-Content Faster with AI"

Subtitle:

"Transform your official syllabus into structured lecture content and presentation material, with faculty review and approval at every step."

Primary CTA:

"Get Started"

Secondary CTA:

"Login"

Show a simple 3-step explanation:

1. Upload Syllabus

2. Generate E-Content

3. Review & Publish

Also show:

"For Faculty"

"Generate structured teaching content from your syllabus while keeping complete control over the final material."

==================================================

4. AUTHENTICATION

==================================================

Create login and registration pages.

Login fields:

- Email

- Password

- Role selection: Faculty / Student

Registration:

- Name

- Email

- Password

- Role

For Phase 1, use normal authentication.

After login:

Faculty → Faculty Dashboard

Student → Student Dashboard

Protect routes according to user role.

==================================================

5. FACULTY DASHBOARD

==================================================

Create a faculty dashboard.

Sidebar navigation:

Dashboard

My Subjects

Upload Syllabus

Generated Content

Published Content

Profile

Dashboard should show:

- Total Subjects

- Total Topics

- Draft Content

- Approved Content

Also show a "Recent Subjects" section.

Main CTA:

"+ Create Subject"

==================================================

6. CREATE SUBJECT

==================================================

Faculty can create a subject.

Fields:

Subject Name

Example:

"Data Structures"

Subject Code

Example:

"CS201"

Department

Semester

Button:

"Create Subject"

After creating the subject, open the subject page.

==================================================

7. UPLOAD SYLLABUS

==================================================

Create an upload interface.

Faculty selects a subject.

Upload:

- PDF syllabus

Show:

"Upload Official Syllabus"

Supported format:

PDF

After upload:

1. Store the file

2. Extract text from the PDF

3. Display extracted text

4. Run syllabus analysis

5. Extract:

   - Subject

   - Units

   - Topics

   - Subtopics if available

Show processing states:

Uploading...

Extracting syllabus...

Analyzing syllabus...

Creating topic structure...

Completed

==================================================

8. SYLLABUS STRUCTURE

==================================================

After processing, display:

Subject

↓

Unit 1

  ├── Topic 1

  ├── Topic 2

  └── Topic 3

Unit 2

  ├── Topic 1

  ├── Topic 2

  └── Topic 3

etc.

Use expandable/collapsible unit cards.

Each topic should have:

Topic Name

Status:

- Not Generated

- Draft

- Approved

Button:

"Generate Content"

Important:

The syllabus is the source for the topic structure.

Do not invent random topics if the syllabus extraction does not find them.

==================================================

9. TOPIC PAGE

==================================================

When faculty selects a topic, show:

Subject

Unit

Topic

Example:

Data Structures

Unit 3

Binary Search Tree

Show buttons:

"Generate Lecture Content"

"Generate PPT"

Initially these can be separate actions.

==================================================

10. AI LECTURE CONTENT GENERATION

==================================================

Create an AI content generation workflow.

Input:

- Official syllabus context

- Unit

- Topic

- Extracted syllabus information

Generate structured lecture content.

The output should contain:

1. Topic Title

2. Learning Objectives

3. Introduction

4. Concept Explanation

5. Important Points

6. Examples

7. Applications

8. Summary

9. Important Questions

Keep the generated content educational and easy for faculty to review.

IMPORTANT:

The AI should be instructed to stay grounded in the supplied syllabus context.

Do not generate unrelated topics.

If information is missing from the syllabus, clearly indicate that additional reference material may be required instead of pretending the information came from the syllabus.

==================================================

11. PPT GENERATION

==================================================

For Phase 1, do NOT create a complicated visual presentation generator.

Generate a structured PPT slide outline.

Example:

Slide 1:

Topic Title

Slide 2:

Learning Objectives

Slide 3:

Introduction

Slide 4:

Core Concept

Slide 5:

Example

Slide 6:

Applications

Slide 7:

Summary

Slide 8:

Important Questions

Each slide should contain:

- Slide title

- Main points

- Optional speaker notes

Show the generated slides in a presentation-style preview.

Add:

"Download PPT"

If actual PPT generation is supported by the backend, generate a .pptx file.

Otherwise create the slide structure first and keep the download button ready for the backend implementation.

==================================================

12. FACULTY REVIEW

==================================================

This is a CORE feature.

Never automatically publish AI-generated content.

After generation, show:

"AI Generated Draft"

Faculty can:

- Edit

- Regenerate

- Save Draft

- Approve

Show a clear status:

DRAFT

UNDER REVIEW

APPROVED

PUBLISHED

The faculty must click:

"Approve & Publish"

before students can see the content.

==================================================

13. CONTENT EDITOR

==================================================

Create a simple editor for generated lecture content.

Faculty should be able to edit:

- Title

- Learning objectives

- Explanation

- Examples

- Summary

- Questions

Add buttons:

Save Changes

Regenerate

Approve & Publish

==================================================

14. STUDENT DASHBOARD

==================================================

Create a separate student dashboard.

Sidebar:

Dashboard

My Subjects

Published Content

Profile

Show available subjects.

Example:

Data Structures

Machine Learning

Database Management Systems

When student selects a subject:

Unit 1

Unit 2

Unit 3

...

When student selects a topic, show ONLY approved/published content.

Student should see:

Lecture Notes

PPT

Do NOT show draft or unapproved content.

==================================================

15. DATABASE

==================================================

Create database structure for:

users

- id

- name

- email

- role

- created_at

subjects

- id

- faculty_id

- name

- code

- department

- semester

syllabi

- id

- subject_id

- file_url

- extracted_text

- created_at

units

- id

- subject_id

- unit_number

- title

topics

- id

- unit_id

- title

- status

content

- id

- topic_id

- lecture_content

- ppt_content

- status

- created_by

- created_at

- updated_at

Use relationships between these tables.

==================================================

16. CONTENT STATUS

==================================================

Use this workflow:

NOT_GENERATED

↓

DRAFT

↓

UNDER_REVIEW

↓

APPROVED

↓

PUBLISHED

Students can access ONLY:

PUBLISHED

Faculty can access all their own content.

==================================================

17. SECURITY

==================================================

Implement role-based access.

Faculty:

- Can access only their subjects/content.

Students:

- Can access only published content.

Students cannot:

- Modify content

- Generate content

- Approve content

- Upload syllabus

Protect all routes.

==================================================

18. IMPORTANT PHASE 1 LIMITATIONS

==================================================

DO NOT implement these yet:

- Voice cloning

- Faculty voice authentication

- Voice biometric verification

- Audio generation

- Cryptographic voice tokens

- Audio watermarking

- RAG knowledge base

- Multi-agent architecture

- CrewAI

- Automatic quizzes

- Student personalization

- Analytics

- LMS integration

- Automatic video generation

- Mobile application

These are planned for future phases.

==================================================

19. PHASE 1 SUCCESS CRITERIA

==================================================

Phase 1 is successful when this complete workflow works:

1. Faculty creates a subject

2. Faculty uploads a real syllabus PDF

3. System extracts syllabus text

4. System identifies units/topics

5. Faculty sees the structured syllabus

6. Faculty selects a topic

7. AI generates lecture content

8. AI generates PPT slide structure

9. Faculty edits the generated content

10. Faculty approves it

11. Content becomes PUBLISHED

12. Student logs in

13. Student sees the subject

14. Student sees the published topic

15. Student can read the approved content

16. Student can view/download the PPT

Use realistic sample data so the application is immediately testable.

Build the complete frontend, backend/database structure, authentication, role-based access, syllabus upload flow, syllabus parsing workflow, AI generation workflow, review/approval workflow, and student viewing workflow.

Keep the architecture modular because Phase 2 will later add RAG, AI evaluation, and authorized faculty voice generation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/204b487f-62f6-48c9-b3cd-409245657336).

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
