# QRQC - Production Management Application

## Project Overview

**Project Name:** QRQC - Gestion des Ateliers de Production  
**Type:** Web Application (Full Stack)  
**Core Functionality:** Centralize, visualize and analyze daily production workshop data for managerial decision-making  
**Target Users:** Workshop managers, production supervisors, management (read-only)

---

## UI/UX Specification

### Layout Structure

**Main Layout:**
- Fixed sidebar navigation (280px width)
- Main content area with header
- Responsive: sidebar collapses to hamburger menu on mobile

**Page Sections:**
1. Header: App title "QRQC" + current date
2. Sidebar: Navigation menu
3. Content Area: Dynamic based on route

**Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Visual Design

**Color Palette:**
- Primary: `#1a365d` (Deep Navy)
- Secondary: `#2d3748` (Dark Gray)
- Accent: `#ed8936` (Orange)
- Success: `#38a169` (Green)
- Warning: `#d69e2e` (Yellow/Amber)
- Danger: `#e53e3e` (Red)
- Background: `#f7fafc` (Light Gray)
- Card Background: `#ffffff` (White)
- Header Beige: `#f5f0e6` (Light Beige)
- Text Primary: `#1a202c`
- Text Secondary: `#718096`

**Typography:**
- Font Family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
- Headings: 700 weight
  - H1: 28px
  - H2: 24px
  - H3: 20px
  - H4: 16px
- Body: 400 weight, 14px
- Small: 12px

**Spacing System:**
- Base unit: 4px
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

**Visual Effects:**
- Card shadows: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Hover shadows: `0 4px 6px rgba(0,0,0,0.1)`
- Border radius: 8px (cards), 4px (buttons/inputs)
- Transitions: 200ms ease-in-out

### Components

**Sidebar:**
- Logo/Title area
- Navigation items with icons
- User info at bottom
- Active state: background highlight + left border accent

**Dashboard Cards (KPI):**
- Icon + Title
- Large value display
- Trend indicator
- Color-coded border-left based on status

**Data Tables:**
- Striped rows
- Hover effect
- Sortable columns
- Color-coded cells based on values

**Status Indicators:**
- 🟢 Green circle: Objective met
- 🟡 Yellow circle: Warning
- 🔴 Red circle: Below objective

**Forms:**
- Floating labels
- Validation states
- Submit/Cancel buttons

---

## Functionality Specification

### Core Features

#### 1. Authentication
- Login page with email/password
- JWT token-based authentication
- Role-based access control (Admin, Chef Atelier, Management)
- Session persistence

#### 2. Dashboard (Main View)
- **Header Section:**
  - Title: "QRQC"
  - Current date display (DD/MM/YYYY format)

- **Two Main Tables Side by Side:**
  - **Tableau 1: Atelier CMS 2**
    - Lines: EE PRO, Cabro, W1000
    - Indicators: TRG, TRS, FORM, FPY ICT, FPY WC, Encours pannes, Incident IT, QRQC, 5S
    
  - **Tableau 2: Atelier Intégration**
    - Lines: EE, W4000, OTII
    - Same indicators as CMS 2

- **Gap Analysis Section:**
  - Columns: Gap, Workshop, Line/Pole, Causes, Actions, Impact (%), Pilot, Deadline, Completed (Yes/No)

- **Summary Block (Bottom Right):**
  - Total BBS
  - Value
  - Troubleshooting
  - Ongoing BBS Panne
  - Integration
  - CMS
  - Variation J-1

- **Color Coding:**
  - Green: >= 95% (objective met)
  - Yellow: 85-94% (attention)
  - Red: < 85% (critical)

#### 3. Data Entry Module
- Form for workshop chiefs
- Fields: production, stops (duration + cause), staff, incidents
- Daily validation
- Required field validation
- History view by date
- Editable with trace

#### 4. User Management
- Admin: Full access
- Chef Atelier: Data entry + read
- Management: Read-only
- Secure authentication
- Role-based rights
- Modification log

#### 5. Export & Reporting
- PDF dashboard export
- Excel data export
- Performance history

---

## Technical Architecture

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   ├── Dashboard/
│   │   ├── Forms/
│   │   └── Common/
│   ├── pages/
│   ├── services/
│   ├── context/
│   ├── styles/
│   └── utils/
```

### Backend (Node.js + Express)
```
backend/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   └── config/
```

### Database (MySQL)
Tables:
- users
- ateliers
- production
- arrets
- qualite
- effectif
- incidents

---

## Acceptance Criteria

### Visual Checkpoints
- [ ] Sidebar displays correctly with navigation
- [ ] Dashboard shows two tables side by side
- [ ] Color coding works for all indicators
- [ ] Date displays in DD/MM/YYYY format
- [ ] Responsive design works on mobile/tablet/desktop

### Functional Checkpoints
- [ ] Login/Logout works
- [ ] Dashboard displays mock data
- [ ] Navigation between pages works
- [ ] Data entry forms are functional
- [ ] Export buttons are present

### Technical Checkpoints
- [ ] Frontend runs with npm run dev
- [ ] No console errors
- [ ] Clean, commented code
- [ ] Proper project structure

