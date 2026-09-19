

## Current State Assessment

**Existing Pages:**
- `/` - Main consultation chat interface
- `/vault` - Research Vault (saved citations)
- `/settings` - Profile, Appearance, Notifications (basic)
- `*` - 404 Not Found

**Current Settings:**
- Profile (name, avatar, role, specialization, region)
- Notifications (2 simple toggles - guidance alerts, weekly digest)
- Appearance (theme, fonts)
- Security & Subscription buttons (currently just show toast notifications - not functional)

---

## Recommended Enhancements & New Pages

### 1. **Security Settings Page** `/settings/security` (HIGH PRIORITY)
You mentioned this specifically. Currently the Security button does nothing. This page needs:
- **Password Management** - Change password, password strength indicator
- **Two-Factor Authentication (2FA)** - TOTP setup with QR code (critical for medical data)
- **Active Sessions** - View and revoke logged-in devices
- **Security Log** - Recent login activity, IP addresses, device info
- **Backup Codes** - For 2FA recovery

*Why: Medical data requires heightened security standards*

### 2. **Subscription & Billing Page** `/settings/billing` (HIGH PRIORITY)
Currently just a toast. Needs:
- **Current Plan Card** - Plan name, renewal date, status
- **Usage Metrics** - Queries used this month, vault storage utilized
- **Upgrade/Downgrade** - Tier comparison table (Free/Pro/Enterprise)
- **Payment Methods** - Add/edit cards (Stripe integration ready)
- **Invoice History** - Downloadable PDF invoices

*Why: You're building a SaaS product - this is essential monetization infrastructure*

### 3. **Data & Privacy Page** `/settings/privacy` (HIGH PRIORITY for medical app)
- **Data Export** - Download all queries, vault items, history (GDPR compliance)
- **Data Retention** - Auto-delete queries after X days setting
- **Privacy Controls** - Opt out of analytics, anonymize data toggle
- **Delete Account** - Full account deletion with confirmation

*Why: Healthcare professionals need control over patient-related query data*

### 4. **Help & Support Page** `/help` (MEDIUM PRIORITY)
- **Quick Start Guide** - How to craft effective medical queries
- **Keyboard Shortcuts** - Reference modal (Ctrl+K search, Ctrl+N new convo)
- **FAQ Section** - Common questions about citations, sources, accuracy
- **Contact Form** - Direct support ticket submission
- **Changelog** - What's new in recent updates

### 5. **Enhanced Notification Settings** `/settings/notifications` (MEDIUM)
Expand the current 2 toggles into a full page:
- **Email Preferences** - Digest frequency (daily/weekly/monthly), guidance sources (ICMR/CDC/WHO)
- **Alert Types** - New citations matching saved queries, guideline updates in specialty
- **Quiet Hours** - Do not disturb schedule
- **Push Notifications** - Browser notification permissions

### 6. **API Access Page** `/settings/api` (MEDIUM - for power users)
- **API Keys** - Generate/revoke keys for programmatic access
- **Usage Dashboard** - Requests per day, rate limit status
- **Documentation Link** - API reference
- **Webhook Configuration** - Real-time citation alerts

---

## Suggested Implementation Order

1. **Security Settings** (password, 2FA, sessions)
2. **Subscription/Billing** (plan management, invoices)
3. **Privacy & Data** (export, retention, delete account)
4. **Help Page** (shortcuts, FAQ, support)
5. **Enhanced Notifications** (granular email preferences)

---

## Navigation Structure

```
Settings (current) - Profile, Appearance
├── Security        - Password, 2FA, Sessions, Activity Log
├── Notifications   - Granular alert preferences
├── Billing         - Subscription, Usage, Invoices
├── Privacy         - Data export, Retention, Delete account
└── API Access      - Keys, Webhooks, Documentation
```

Separate page:
```
Help (/help)       - FAQ, Shortcuts, Support, Changelog
```

