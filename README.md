# 🍕 Pizza 42 — Auth0 Identity Demo

A full-stack pizza ordering app built to demonstrate Auth0's identity platform capabilities including authentication, authorization, MFA, progressive profiling, marketing enrichment, and Salesforce CRM integration.

---

## 🚀 Features

### Authentication & Authorization
- **Universal Login** — Auth0-hosted login with custom branding
- **Social Login** — Sign in with Google
- **Passkeys** — Passwordless authentication via biometrics
- **Email Verification** — Blocks unverified users from placing orders
- **Scoped API Access** — Spring Boot API protected with `place:order` JWT scope

### Security
- **Step-Up MFA** — Orders over $30 require multi-factor authentication

### Identity Data Enrichment
- **Post-Login Action** — Tracks login count, first login date, and customer segment
- **Customer Segmentation** — Automatic tier classification (New / Regular / Loyal)
- **Progressive Profiling** — Collects favourite pizza, birthday, and marketing consent on 2nd login
- **user_metadata Storage** — Preferences, addresses, and order history persisted in Auth0

### CRM Integration
- **Salesforce Leads** — Auth0 Marketplace (Kilterset) auto-creates Salesforce Leads on login
- **Order History** — Orders persisted to Auth0 `user_metadata` and restored across server restarts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS SPA (Single Page Application) |
| Backend | Spring Boot 3.3 (Java 21) |
| Identity | Auth0 (Universal Login, Actions, Management API) |
| Security | Spring Security OAuth2 Resource Server |
| CRM | Salesforce via Auth0 Marketplace |
| HTTP Client | Apache HttpClient 5 |

---

## ⚙️ Setup

### Prerequisites
- Java 21
- Maven
- Auth0 account (free tier works)
- Salesforce Developer Edition (optional, for CRM demo)

### 1. Clone the repo
```bash
git clone https://github.com/diptiktareGit/Auth0Demo.git
cd Auth0Demo
```

### 2. Configure Auth0

Create the following in your Auth0 dashboard:

**Single Page Application**
- Allowed Callback URLs: `http://localhost:8080`, 'https://pizza42-auth0-demo-gph0bgbpa8eyfmbh.centralus-01.azurewebsites.net/#'
- Allowed Logout URLs: `http://localhost:8080`, 'https://pizza42-auth0-demo-gph0bgbpa8eyfmbh.centralus-01.azurewebsites.net/#'
- Allowed Web Origins: `http://localhost:8080`, 'https://pizza42-auth0-demo-gph0bgbpa8eyfmbh.centralus-01.azurewebsites.net/#'

**API**
- Identifier: `https://pizza42`
- Permissions: `place:order`

**Machine to Machine Application**
- Authorized for: Auth0 Management API
- Scopes: `read:users`, `update:users`

### 3. Configure application properties

Create `src/main/resources/application.properties`:

```properties
server.port=8080

spring.security.oauth2.resourceserver.jwt.issuer-uri=https://YOUR_DOMAIN.us.auth0.com/
spring.security.oauth2.resourceserver.jwt.audiences=https://pizza42

auth0.domain=YOUR_DOMAIN.us.auth0.com
auth0.management.client-id=YOUR_M2M_CLIENT_ID
auth0.management.client-secret=YOUR_M2M_CLIENT_SECRET
```

### 4. Configure the frontend

In `src/main/resources/static/index.html`, update:
```javascript
const AUTH0_DOMAIN   = 'YOUR_DOMAIN.us.auth0.com';
const AUTH0_CLIENT_ID = 'YOUR_SPA_CLIENT_ID';
const AUTH0_AUDIENCE  = 'https://pizza42';
```

### 5. Run the app
```bash
mvn spring-boot:run
```
---

## 🔐 Auth0 Features Demonstrated

| Feature | Where |
|---|---|
| Universal Login + Branding | Login page |
| Google Social Login | Login page |
| Passkeys | Login page |
| Email Verification gate | Place order flow |
| Step-Up MFA (orders > $30) | Payment page |
| JWT + Scoped API access | Spring Boot `/api/orders` |
| Post-Login Action | Every login |
| Progressive Profiling | 2nd login modal |
| user_metadata persistence | Dashboard preferences |
| app_metadata segmentation | Dashboard customer tier |
| Salesforce CRM sync | Auth0 Marketplace |

---

## 📁 Project Structure

```
pizza42/
├── src/main/
│   ├── java/com/pizza42/
│   │   ├── config/
│   │   │   ├── SecurityConfig.java        # JWT validation + scopes
│   │   │   └── AudienceValidator.java     # Audience claim check
│   │   ├── controller/
│   │   │   ├── OrdersController.java      # POST/GET /api/orders
│   │   │   └── UserMetadataController.java # POST /api/user/metadata
│   │   └── service/
│   │       └── Auth0ManagementService.java # M2M token + Management API
│   └── resources/
│       └── static/
│           └── index.html                 # SPA frontend
├── auth0-actions/                         # Post-Login Action code
├── pom.xml

```

---

## 📊 Marketing Use Case

This demo shows how Auth0 can serve as a **marketing data enrichment engine**:

1. **Every login** → Post-Login Action updates login count and customer segment
2. **2nd login** → Progressive profiling modal collects preferences and consent
3. **All data** → Stored in Auth0 `user_metadata` and `app_metadata`
4. **Salesforce** → Auth0 Marketplace syncs a Lead record automatically

No separate database, no ETL pipeline — identity data flows directly to the CRM.

---

## 🏗️ Architecture

```
Browser (SPA)
    │  Auth Code
    ▼
Auth0 Universal Login
    │  JWT (access token + ID token)
    ▼
Spring Boot API (localhost:8080)
    │  Management API (M2M)
    ▼
Auth0 Management API
    │  user_metadata / app_metadata
    ▼
Auth0 Post-Login Action
    │  Kilterset Marketplace Action
    ▼
Salesforce Leads
```
