# Product Requirements Document (PRD)
## Salon Management & Customer Tracking Software
**Version:** 1.0  
**Date:** April 2026  
**Status:** Draft  
**Author:** [Your Name]  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Objectives](#2-goals--objectives)
3. [Target Users](#3-target-users)
4. [Assumptions & Constraints](#4-assumptions--constraints)
5. [Feature Requirements](#5-feature-requirements)
6. [User Workflows](#6-user-workflows)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Tech Stack](#8-recommended-tech-stack)
9. [Milestones & Phases](#9-milestones--phases)
10. [Success Metrics](#10-success-metrics)
11. [Out of Scope](#11-out-of-scope)
12. [Open Questions](#12-open-questions)

---

## 1. Overview

### 1.1 Product Summary

This document outlines the requirements for a **single-salon management software** designed to help salon owners and staff efficiently manage customers, appointments, billing, and follow-ups — all from one simple interface.

The software targets small-to-mid-sized salons that currently rely on paper registers, WhatsApp messages, or fragmented tools to manage their day-to-day operations. The core goal is to **reduce manual effort, increase customer retention, and improve revenue visibility**.

### 1.2 Problem Statement

Most independent salons face the following challenges:

- Customer details are stored informally (registers, phone contacts) and are difficult to retrieve
- No structured follow-up system — customers are lost after their first visit
- Appointment clashes and no-shows are common due to verbal bookings
- Revenue tracking is manual and error-prone
- There is no loyalty or re-engagement mechanism in place

### 1.3 Proposed Solution

A lightweight, web-based salon management system with:
- A centralized customer database
- Appointment scheduling and calendar
- Automated follow-up and reminders
- Billing and invoice tracking
- A dashboard with key business metrics

---

## 2. Goals & Objectives

| Goal | Description |
|---|---|
| **Centralize customer data** | All customer profiles, visit history, and preferences in one place |
| **Reduce no-shows** | Automated appointment reminders via WhatsApp/SMS |
| **Improve retention** | Systematic follow-ups, birthday messages, and loyalty tracking |
| **Streamline billing** | Quick invoice generation with payment mode tracking |
| **Enable data-driven decisions** | Dashboard and reports to track revenue and performance |

---

## 3. Target Users

### 3.1 Primary Users

| User | Role |
|---|---|
| **Salon Owner / Manager** | Full access — settings, reports, billing, staff management |
| **Receptionist / Front Desk** | Manages bookings, customer check-in, payments |
| **Stylist / Staff** | Views their own schedule and appointment details |

### 3.2 End Customer (Indirect)
Salon customers interact with the system indirectly via:
- SMS/WhatsApp appointment reminders
- Birthday and re-engagement messages
- Digital invoices (optional)

---

## 4. Assumptions & Constraints

### Assumptions
- The salon operates from a single location (multi-branch is out of scope for v1)
- Staff have access to a tablet or desktop at the counter
- WhatsApp Business API or SMS gateway is available for messaging
- Internet connectivity is available at the salon

### Constraints
- Must be operable by non-technical staff with minimal training
- UI must be simple, mobile-friendly, and in English (with regional language support as a future scope)
- Budget is limited — prefer low-cost or free-tier backend infrastructure for v1

---

## 5. Feature Requirements

---

### 5.1 Customer Management

**Priority: P0 (Must Have)**

#### Description
A searchable, centralized database of all salon customers with detailed profiles.

#### Requirements

| ID | Requirement |
|---|---|
| CM-01 | Staff can add a new customer with: Full Name, Phone Number, Email (optional), Date of Birth, Gender |
| CM-02 | Each customer has a unique profile page showing all past visits |
| CM-03 | Staff can add notes to a customer profile (e.g., hair type, allergies, preferred stylist) |
| CM-04 | Customers can be tagged as: New, Regular, VIP, Inactive |
| CM-05 | Search customers by name or phone number |
| CM-06 | Customer profile shows: Total visits, Total spent, Last visit date |
| CM-07 | Staff can edit or soft-delete customer profiles |

---

### 5.2 Appointment Scheduling

**Priority: P0 (Must Have)**

#### Description
A calendar-based booking system that allows front desk staff to schedule, manage, and track appointments.

#### Requirements

| ID | Requirement |
|---|---|
| AP-01 | Staff can create an appointment by selecting: Customer, Service(s), Stylist, Date & Time |
| AP-02 | Each appointment has a status: Booked, Confirmed, In Progress, Completed, No-show, Cancelled |
| AP-03 | Calendar view available in: Daily, Weekly formats |
| AP-04 | Walk-in appointments can be created on the spot without prior booking |
| AP-05 | System prevents double-booking of the same stylist at the same time |
| AP-06 | Staff can reschedule or cancel appointments |
| AP-07 | Appointment duration auto-calculated based on selected service(s) |
| AP-08 | Color-coded appointments by status on calendar view |

---

### 5.3 Follow-up & Communication

**Priority: P0 (Must Have)**

#### Description
Automated and manual communication tools to keep customers engaged before and after their visit.

#### Requirements

| ID | Requirement |
|---|---|
| FC-01 | Automated reminder sent 24 hours before appointment (WhatsApp or SMS) |
| FC-02 | Automated reminder sent 2 hours before appointment |
| FC-03 | Post-visit thank-you message sent after appointment is marked Completed |
| FC-04 | Birthday message sent on the customer's birthday with optional promo code |
| FC-05 | Re-engagement message triggered if customer has not visited in configurable X days (default: 45 days) |
| FC-06 | Owner/Manager can view all automated messages sent and their status (Delivered / Failed) |
| FC-07 | Message templates are configurable from the settings panel |
| FC-08 | Manual WhatsApp/SMS message can be sent to any customer from their profile |

---

### 5.4 Services & Menu Management

**Priority: P0 (Must Have)**

#### Description
A configurable list of services offered by the salon, mapped to pricing and staff.

#### Requirements

| ID | Requirement |
|---|---|
| SV-01 | Owner can add/edit/delete services with: Name, Category, Duration (minutes), Price |
| SV-02 | Services grouped by category (e.g., Hair, Skin, Nails, Spa) |
| SV-03 | Each service can be mapped to specific stylists who perform it |
| SV-04 | Combo/package services supported (bundle of multiple services at a package price) |
| SV-05 | Services can be marked Active or Inactive |

---

### 5.5 Staff Management

**Priority: P1 (Should Have)**

#### Description
Manage stylist profiles, their services, schedules, and performance.

#### Requirements

| ID | Requirement |
|---|---|
| ST-01 | Owner can add staff profiles: Name, Role, Phone, Services offered |
| ST-02 | Each staff member has a login with role-based access |
| ST-03 | Stylist can view their own appointment schedule |
| ST-04 | Basic attendance log — mark present/absent per day |
| ST-05 | Stylist performance report: Total appointments, Revenue generated |

---

### 5.6 Billing & Payments

**Priority: P0 (Must Have)**

#### Description
Quick invoice generation at the end of each appointment with payment tracking.

#### Requirements

| ID | Requirement |
|---|---|
| BL-01 | Invoice auto-generated when appointment is marked Completed |
| BL-02 | Invoice shows: Customer name, services availed, stylist, date, total amount |
| BL-03 | Staff can apply discounts (flat or percentage) at the time of billing |
| BL-04 | Payment modes supported: Cash, UPI, Card, Pending/Due |
| BL-05 | Invoice can be shared with customer via WhatsApp or printed |
| BL-06 | Revenue is tracked per day/week/month in reports |
| BL-07 | Outstanding dues can be flagged on customer profile |

---

### 5.7 Loyalty & Retention

**Priority: P1 (Should Have)**

#### Description
Simple loyalty tracking and reward mechanisms to encourage repeat visits.

#### Requirements

| ID | Requirement |
|---|---|
| LY-01 | Visit counter tracked per customer automatically |
| LY-02 | Owner can configure loyalty reward (e.g., "10th visit = 20% discount") |
| LY-03 | Loyalty milestone notification sent to customer when reached |
| LY-04 | Referral tracking — staff can record which customer referred a new customer |

---

### 5.8 Dashboard & Reports

**Priority: P0 (Must Have)**

#### Description
A central dashboard giving the owner a real-time view of business performance.

#### Requirements

| ID | Requirement |
|---|---|
| DB-01 | Dashboard shows: Today's appointments, Revenue today, New customers this month |
| DB-02 | Monthly revenue chart (bar or line graph) |
| DB-03 | Top 5 services by bookings and revenue |
| DB-04 | Customer breakdown: New vs Returning |
| DB-05 | No-show rate report |
| DB-06 | Stylist performance summary |
| DB-07 | Export reports to CSV or PDF |

---

### 5.9 Settings & Configuration

**Priority: P1 (Should Have)**

#### Requirements

| ID | Requirement |
|---|---|
| SE-01 | Salon name, logo, address, and contact details |
| SE-02 | Working hours configuration (open/close time, weekly off days) |
| SE-03 | Message templates for reminders, birthday, re-engagement |
| SE-04 | WhatsApp/SMS API key configuration |
| SE-05 | Role-based access control: Admin, Receptionist, Stylist |
| SE-06 | Backup and data export |

---

## 6. User Workflows

---

### 6.1 New Customer Walk-in Workflow

```
Customer walks in
       │
       ▼
Receptionist opens "Add Customer"
       │
       ▼
Enters: Name, Phone, DOB, Gender, Notes
       │
       ▼
Selects service(s) and available stylist
       │
       ▼
Creates appointment → Status: In Progress
       │
       ▼
Service completed → Staff marks "Completed"
       │
       ▼
Invoice auto-generated → Payment recorded
       │
       ▼
Thank-you message sent to customer (WhatsApp/SMS)
       │
       ▼
Customer profile updated with visit + spend history
```

---

### 6.2 Appointment Booking Workflow (Pre-booked)

```
Customer calls / messages to book
       │
       ▼
Receptionist opens Calendar → "New Appointment"
       │
       ▼
Search existing customer or create new profile
       │
       ▼
Select service(s), stylist, preferred date & time
       │
       ▼
System checks stylist availability → Confirms slot
       │
       ▼
Appointment created → Status: Booked
       │
       ▼
Automated reminder sent 24 hours before
       │
       ▼
Automated reminder sent 2 hours before
       │
       ▼
Customer arrives → Status changed to: In Progress
       │
       ▼
Service completed → Billing → Payment
       │
       ▼
Status: Completed → Thank-you message sent
```

---

### 6.3 Follow-up & Re-engagement Workflow

```
System checks daily — customers with last visit > 45 days
       │
       ▼
Re-engagement message triggered automatically
"Hi [Name], we miss you! Book your next visit..."
       │
       ▼
Customer responds / books → New appointment created
       │
       ▼
If no response → Flagged in dashboard as "At-risk customers"
       │
       ▼
Owner / Receptionist can send manual follow-up from profile
```

---

### 6.4 Birthday Workflow

```
System checks every day at 9:00 AM
       │
       ▼
Identifies customers with birthday = today
       │
       ▼
Sends birthday message with optional discount code
"Happy Birthday [Name]! Enjoy 15% off your next visit 🎉"
       │
       ▼
Message status logged (Sent / Failed)
       │
       ▼
Customer books using promo → Discount applied at billing
```

---

### 6.5 Billing Workflow

```
Appointment marked "Completed"
       │
       ▼
Invoice auto-generated with services + prices
       │
       ▼
Receptionist applies discount (if any)
       │
       ▼
Final amount shown → Customer pays
       │
       ▼
Staff records payment mode: Cash / UPI / Card
       │
       ▼
Invoice shared via WhatsApp or printed
       │
       ▼
Revenue logged → Updates daily dashboard
```

---

### 6.6 Owner Dashboard Workflow

```
Owner logs in → Lands on Dashboard
       │
       ├── Today's appointments (count + list)
       ├── Revenue today / this month
       ├── New customers this month
       ├── No-show count
       └── Top services this week
       │
       ▼
Clicks into Reports
       │
       ├── Monthly revenue trend
       ├── Customer retention rate
       ├── Stylist-wise performance
       └── Export to CSV / PDF
```

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Page load under 2 seconds on standard broadband |
| **Availability** | 99.5% uptime; works on Chrome, Safari, Firefox |
| **Usability** | Non-technical staff can operate core features with < 30 min training |
| **Mobile Friendly** | Fully responsive — works on tablets and mobile phones |
| **Security** | Role-based login; customer data encrypted at rest |
| **Data Backup** | Daily automated backup; manual export available anytime |
| **Scalability** | Supports up to 5,000 customer records and 100 appointments/day |

---

## 8. Recommended Tech Stack

| Layer | Recommended Option | Notes |
|---|---|---|
| **Frontend** | React.js + Tailwind CSS | Fast, responsive UI |
| **Backend** | Node.js (Express) or Python (FastAPI) | Lightweight REST API |
| **Database** | Supabase (PostgreSQL) | Free tier; auth included |
| **Authentication** | Supabase Auth or Firebase Auth | Role-based login |
| **Messaging** | Twilio (SMS) / WhatsApp Business API | Automated messages |
| **Hosting** | Vercel (frontend) + Railway (backend) | Free-to-start |
| **File Storage** | Supabase Storage or Cloudinary | Invoice PDFs, logos |
| **Reports Export** | jsPDF + CSV.js | Client-side export |

---

## 9. Milestones & Phases

### Phase 1 — Core MVP (Weeks 1–4)
- Customer profile management
- Appointment scheduling with calendar
- Services and staff setup
- Basic billing and payment recording

### Phase 2 — Communication & Follow-up (Weeks 5–7)
- Automated appointment reminders
- Post-visit thank-you messages
- Birthday messaging
- Re-engagement triggers

### Phase 3 — Reports & Dashboard (Weeks 8–9)
- Owner dashboard with key metrics
- Revenue and performance reports
- CSV/PDF export

### Phase 4 — Loyalty & Polish (Weeks 10–12)
- Loyalty visit tracking and rewards
- Referral recording
- Settings panel refinement
- Staff attendance log
- UAT and go-live

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Customer no-show rate | Reduce by 30% within 3 months |
| Repeat customer rate | Improve by 20% within 6 months |
| Time to create an appointment | Under 60 seconds |
| Billing errors | Near zero (auto-generated invoices) |
| Staff adoption | 100% of front-desk staff actively using by Week 2 |
| Owner dashboard usage | Daily check-in by owner within 30 days of launch |

---

## 11. Out of Scope (v1)

- Online booking portal for customers (self-service)
- Multi-branch / multi-location support
- Inventory management (products, stock)
- Payroll management for staff
- Native mobile app (iOS / Android)
- Integration with third-party marketplaces (UrbanClap, etc.)
- Advanced marketing campaigns / bulk promotions

> These may be considered for **v2** based on adoption and feedback.

---

## 12. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Which messaging platform is preferred — WhatsApp Business API or SMS? | Owner | Resolved — WhatsApp via Baileys (local socket) is primary; SMS supported as secondary channel |
| 2 | Should the system support multiple languages (e.g., Kannada, Hindi)? | Owner | Deferred to v2 — English only for v1 |
| 3 | Is offline mode required if internet is unavailable at the salon? | Tech Lead | Resolved — Not required for v1; system requires internet |
| 4 | What is the preferred payment gateway if online payments are added later? | Owner | Deferred to v2 — Current modes: Cash, UPI, Card, Pending |
| 5 | Should customers receive a digital copy of the invoice automatically? | Owner | Resolved — Invoice can be shared via WhatsApp or printed from Billing page |
