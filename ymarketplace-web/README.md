# Recruiter OS

Redesign and build the complete foundation of a premium recruiter marketplace web application.

IMPORTANT:

This is NOT a generic AI dashboard.

Do not use the typical AI-generated SaaS aesthetic:

- no excessive purple gradients

- no giant hero sections

- no decorative illustrations

- no unnecessary glassmorphism

- no excessive rounded cards

- no oversized empty spaces

- no meaningless statistics

- no fake AI visual effects

The product should feel like a serious professional recruiting operating system used daily by experienced recruiters.

The screenshots provided in this conversation are visual/product references. Preserve all important information and functionality shown in them, but improve the information architecture, hierarchy, spacing, usability and visual quality substantially.

The final color palette will be finalized later. Therefore create a strong neutral visual system first using:

- white

- very light neutral backgrounds

- dark navy/charcoal typography

- subtle borders

- restrained status colors

- one configurable brand accent token

Make the interface feel premium through typography, spacing, hierarchy, alignment and interaction design rather than gradients.

==================================================

1. RECRUITER LOGIN / AUTHENTICATION

==================================================

Create a professional recruiter authentication flow.

Pages/states:

1. Sign in

- Email

- Password

- Continue

- Continue with Google

- Continue with LinkedIn

- Forgot password

- Create recruiter account

2. Create account

- First name

- Last name

- Email

- Password

- Confirm password

- Agree to Terms

- Agree to Privacy Policy

- Create account

- Google / LinkedIn signup

3. Email verification

- Verification state

- Resend verification

- Change email

4. Forgot password

- Email

- Send reset link

- Confirmation state

5. Reset password

- New password

- Confirm password

- Password requirements

- Success state

6. First-time recruiter onboarding

Keep this lightweight:

- Recruiter name

- Profile photo

- Recruiting specialties

- Years of experience

- Optional agency information

- Time zone

- Notification preferences

Do not force unnecessary onboarding questions.

==================================================

2. GLOBAL APPLICATION SHELL

==================================================

Create one consistent application shell used throughout the recruiter portal.

TOP HEADER:

Left:

- Current selected job/client context selector

- Company logo

- Company name

- Job title

- Dropdown arrow

The selector must show approved jobs available to the recruiter.

Example:

Within (formerly Klarity)

Senior/Staff AI Frontend Engineer

When opened:

- Search jobs

- Approved jobs list

- Company

- Job title

- Optional location

- Status

- Search/filter

- Recently used jobs

- Selected job indicator

Center navigation:

- Browse Jobs

- Your Clients

- Dashboard

Right:

- Notifications icon with unread count

- Recruiter avatar

- Profile/settings menu

The top header should remain extremely clean.

LEFT SIDEBAR:

Primary action:

- Submit Candidate

Navigation:

- Pipeline

- Overview

- Calendar

- Client Messages

- Cross List

- AI Matchmaker

Section:

CANDIDATE STAGES

- Active

- Rejected

Secondary:

- Referrals & Promotions

Bottom:

- Help & Resources

- Collapse sidebar

The sidebar should support collapsed and expanded states.

When collapsed:

show icons only.

When expanded:

show icon + label.

Do not change navigation structure randomly between pages.

==================================================

3. BROWSE JOBS

==================================================

Create a professional job discovery page.

Purpose:

Recruiters browse jobs available on the marketplace and decide which jobs to work on.

Include:

- Search

- Job title

- Company

- Location

- Salary

- Reward/bounty

- Job type

- Experience

- Remote/hybrid/on-site

- Funding stage

- Company size

- Number of open roles

- Posted date

- Status

Job cards/list rows should prioritize:

Company

Role

Salary

Recruiter reward

Location

Experience

Openings

Status

Provide:

- Save job

- View details

- Apply/request access where applicable

Do not make this page visually noisy.

==================================================

4. JOB DETAILS — PAGE 1

==================================================

This is one of the MOST IMPORTANT pages in the entire product.

When a recruiter opens a job, the page must expose all critical information without hiding important details.

Create a sophisticated job intelligence page.

HEADER:

Back

Company logo

Job title

Example:

Senior Account Executive (Remote, UK)

Show:

- Company

- Location

- Salary range

- Employment type

- Number of active candidates

- Recruiter reward/bounty

- Number of roles

Primary action:

Apply for this Role / Work on this Role

Secondary:

Details PDF

==================================================

5. JOB DETAILS — COMPANY CONTEXT

==================================================

Section:

WHY [COMPANY]?

Display structured information such as:

Top tier investors

- funding amount

- investor names

Repeat founders

- previous companies

- previous outcomes

Elite team pedigree

- notable previous employers

Leadership

- founder/leader cards

- name

- title

- profile/link

Company

- company size

- funding stage

- founding year

- website

- other relevant company information

This should feel like recruiter intelligence, not marketing copy.

==================================================

6. ABOUT THIS ROLE

==================================================

Large readable section.

Include:

About Company

About Role

Responsibilities

Why the role exists

Team structure

Reporting relationship

Working model

Location

Travel requirements

Expected working hours

Technology/tools where applicable

Hiring context

Long content should be readable without making the entire page one giant text block.

Use:

- section headings

- expandable sections

- subtle dividers

- readable typography

==================================================

7. JOB DETAILS + BENEFITS

==================================================

Create two structured panels.

JOB DETAILS:

- Experience

- Salary

- Equity

- Competitive equity indicator

- Visa sponsorship

- Employment type

- Location

- Remote/hybrid/on-site

- Other relevant job metadata

BENEFITS & PERKS:

- Healthcare

- Financial benefits

- Learning budget

- AI/technology benefits

- Immigration support

- PTO

- Holidays

- Other company benefits

==================================================

8. RIGHT-SIDE RECRUITER INTELLIGENCE PANEL

==================================================

On desktop, use a persistent right rail for high-value recruiter information.

Sections:

BOUNTY BREAKDOWN

- Base reward

- % of first-year salary

- Number of roles

- Bonus pool

- Net 30/60/90 payout terms

BONUSES ENABLED

- total potential bonus

- individual bonus types

- qualification requirements

REQUIREMENTS

Show critical requirements as concise rows.

Example:

- Full-cycle sales experience

- Mid-market sales experience

- 9–12 week sales cycles

- Multi-stakeholder selling

GREEN FLAGS

Positive signals the company wants.

RED FLAGS

Critical disqualifiers.

Do not bury these inside the job description.

==================================================

9. ACTIVITY LOG

==================================================

Show recruiter/company activity:

Examples:

- candidate advanced

- candidate approved

- candidate rejected

- company updated requirement

- red flag removed

- green flag added

Each activity:

- event

- actor

- time

- related job/candidate

- link to relevant object

==================================================

10. REQUIRED CANDIDATE Q&A

==================================================

Display required questions recruiters must answer before submitting candidates.

Examples:

- Upload resume in English

- LinkedIn profile

- Current location

- Work authorization

- Relocation

- Compensation

- Availability

Show:

Question

Required/optional

Response type

==================================================

11. INTERVIEW PIPELINE ON JOB DETAILS

==================================================

At the bottom of job details, show the actual candidate pipeline for this job.

Columns/stages may include:

- Pending Approval

- Application Review

- Pre Screen

- Team Interview

- Final Interview

- Offer

- Hired

Each stage shows:

- candidate count

- candidate rows

- candidate status

- scrolling if many candidates

Horizontal scrolling should be smooth.

Provide both:

- compact pipeline

- open pipeline view

Do not let the pipeline dominate the entire job details page.

==================================================

12. CLIENT APPLICATION FLOW

==================================================

When recruiter wants to work with a company/job:

Show:

- Apply for role

- confirmation

- application status

- pending approval

- approved

- rejected

If pending:

show when applied

show expected next step

show Withdraw Application

If rejected:

show rejection reason

show rejection date

show whether recruiter can reapply/contact support

==================================================

13. YOUR CLIENTS PAGE

==================================================

Create a redesigned version of the provided "Your Clients" page.

Header:

Your Clients

Status tabs:

- All

- Active

- Pending

- Paused

- Archived

Each tab shows count.

Search.

Main table:

Company

Role

Reward

Salary

Status

Actions

Example statuses:

Approved

Pending approval

Rejected

Paused

Archived

For APPROVED:

- Open job

- Submit candidate

- View pipeline

- Message client

- Unassign

For PENDING:

- View application

- Withdraw application

For REJECTED:

- View rejection details

- Rejection reason

- Rejected date

- Application history

For PAUSED:

- View job

- See pause reason

- No candidate submissions

For ARCHIVED:

- View historical details

Do not use the word "Unassign" as the only action when more meaningful actions exist.

Create a contextual action menu.

==================================================

14. CLIENT DETAILS

==================================================

Clicking a client should open a company/job workspace.

Show:

- Company

- Website

- Company size

- Funding

- Founded year

- Leadership

- Recruiter relationship

- Active jobs

- Previous jobs

- Candidate activity

- Messages

- Hiring requirements

- Green flags

- Red flags

- Compensation

- Rewards

- Application history

Make this a useful recruiter workspace, not just a company profile.

==================================================

15. RESPONSIVE BEHAVIOR

==================================================

Desktop is the primary experience.

Tablet:

- collapse right rail into drawers

- preserve information hierarchy

Mobile:

- bottom/slide navigation

- sticky primary action

- stacked job information

- horizontal pipeline scrolling

Do not simply shrink desktop.

==================================================

16. DESIGN SYSTEM

==================================================

Create reusable components:

- AppShell

- Header

- JobSelector

- Sidebar

- StatusBadge

- CandidateRow

- CandidateCard

- JobHeader

- InformationSection

- IntelligencePanel

- ActivityItem

- PipelineColumn

- DataTable

- EmptyState

- ConfirmationModal

- Drawer

- Toast

- Tooltip

- SearchBar

- FilterBar

Use consistent spacing.

Use 8px spacing logic.

Typography:

- strong dark headings

- highly readable body text

- compact metadata

- restrained labels

Borders should provide structure without making every section look like a floating card.

The product should feel like:

"Bloomberg-level information density + modern recruiting workflow"

rather than a generic SaaS template.

Build this as a connected product with realistic interactions and states.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/44694a7e-03ae-4b28-9037-c2091a94f7a7).

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
