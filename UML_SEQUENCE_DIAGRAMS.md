# UML Sequence Diagrams (QRQC)

These diagrams are based on the current frontend and backend flows.

## 1) Login Flow

```mermaid
sequenceDiagram
    actor U as User
    participant L as Login.jsx
    participant A as AuthContext.jsx
    participant API as Express API
    participant DB as MySQL
    participant LS as localStorage

    U->>L: Submit email + password
    L->>A: login(email, password)
    A->>API: POST /api/auth/login
    API->>DB: SELECT user by email
    DB-->>API: user row + hashed password
    API->>API: bcrypt.compare(password, hash)

    alt Credentials valid
        API->>API: jwt.sign(..., expiresIn=24h)
        API-->>A: { success, user, token }
        A->>LS: set qrqc_user + qrqc_token
        A-->>L: success=true
        L-->>U: Navigate to /dashboard
    else Invalid credentials
        API-->>A: 401 { success:false, error }
        A-->>L: success=false
        L-->>U: Display error message
    end
```

## 2) Self-Registration Flow

```mermaid
sequenceDiagram
    actor U as User
    participant R as Register.jsx
    participant API as Express API
    participant DB as MySQL

    U->>R: Fill nom/prenom/email/password/role
    R->>R: Client validations
    R->>API: POST /api/auth/register

    API->>API: Validate role in allowedRoles
    alt Role invalid
        API-->>R: 400 role invalid
        R-->>U: Show error
    else Role valid
        API->>DB: SELECT id FROM users WHERE email=?
        alt Email already used
            DB-->>API: existing user
            API-->>R: 400 email already used
            R-->>U: Show error
        else Email available
            API->>API: bcrypt.hash(password)
            API->>DB: INSERT INTO users(..., atelier_id=NULL)
            DB-->>API: insertId
            API-->>R: { success:true, id }
            R-->>U: Success + redirect to /login
        end
    end
```

## 3) Gap Analysis Action Lifecycle

```mermaid
sequenceDiagram
    actor Admin as Admin
    actor Rep as Service Rep
    participant P as PlanActions.jsx
    participant API as Express API
    participant DB as MySQL

    Admin->>P: Create action
    P->>API: POST /api/gap-analysis
    API->>DB: INSERT gap_analysis
    API->>DB: INSERT gap_analysis_pilots (optional)
    DB-->>API: success
    API-->>P: { success:true, id }

    Rep->>P: Validate action
    P->>API: POST /api/gap-analysis/:id/validate
    API->>DB: SELECT user + action + pilot assignment
    API->>API: Authorization checks
    alt Authorized
        API->>DB: UPDATE gap_analysis SET statut='en_cours'
        API-->>P: success
    else Forbidden
        API-->>P: 403 error
    end

    Rep->>P: Close action
    P->>API: POST /api/gap-analysis/:id/close
    API->>DB: SELECT user + action + assignment
    API->>API: Primary rep/admin/chef/management checks
    alt Authorized
        API->>DB: UPDATE statut='cloture', realise=TRUE
        API-->>P: success
    else Forbidden
        API-->>P: 403 error
    end
```

## 4) Reports + PDF Export (CMS2/Integration)

```mermaid
sequenceDiagram
    actor U as User
    participant R as Reports.jsx
    participant API as Express API
    participant DB as MySQL
    participant PDF as jsPDF

    U->>R: Open Reports
    R->>API: GET /api/ateliers
    R->>API: GET /api/lignes
    R->>API: GET /api/kpis
    API->>DB: SELECT ateliers/lignes/kpis
    DB-->>API: datasets
    API-->>R: initial lists

    U->>R: Set filters (atelier/date/kpi/ligne)
    R->>API: GET /api/kpi-history?...params
    API->>DB: Query KPI history
    DB-->>API: rows
    API-->>R: chart/table data

    U->>R: Click Export PDF CMS2 + Integration
    R->>R: Filter ateliers by name (cms2/integration)
    loop For each target atelier
        R->>API: GET /api/kpi-history for atelier
        API->>DB: Query history
        DB-->>API: rows
        API-->>R: rows
    end
    R->>PDF: Build pages + autoTable
    PDF-->>U: Download PDF file
```

## Optional PlantUML Starter

```plantuml
@startuml
actor User
participant Frontend
participant API
database DB

User -> Frontend: Action
Frontend -> API: HTTP request
API -> DB: SQL query
DB --> API: Result
API --> Frontend: JSON response
Frontend --> User: UI update
@enduml
```
