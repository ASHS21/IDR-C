# First Login

> Log in for the first time, change your password, and complete the onboarding wizard.

## Prerequisites

- Identity Radar is installed and running at `http://localhost:3000`
- You have the default admin credentials

## Step 1: Navigate to the Login Page

Open your browser and go to **http://localhost:3000**. You will see the Identity Radar login page.

## Step 2: Enter Default Credentials

| Field | Value |
|-------|-------|
| Email | `admin@acmefs.sa` |
| Password | `admin123` |

Click **Sign in**.

## Step 3: Change Your Password

You will be prompted to set a new password. Choose a strong password with at least 12 characters including uppercase, lowercase, numbers, and symbols.

## Step 4: Onboarding Wizard

After signing in, the Quick Start checklist appears at the top of the dashboard. It guides you through six steps:

1. **Create your account** -- already complete
2. **Set organization name** -- click to go to Settings and configure your org
3. **Connect a data source** -- link Active Directory, Azure AD, or import a CSV
4. **Review tier violations** -- examine AD tiering compliance
5. **Run AI analysis** -- generate your first AI-powered remediation plan
6. **Invite a team member** -- add colleagues to your organization

You can dismiss the checklist at any time and return to it later.

## Step 5: Set Organization Details

Navigate to **Settings > Organization** and configure:

- **Organization name**: Your company name
- **Domain**: Your primary domain (e.g., `acmefs.sa`)
- **Industry**: Select your industry
- **Regulatory frameworks**: Select applicable frameworks (NCA ECC, SAMA CSF, PDPL)

## Verification

- The dashboard overview loads with metric cards (they will show zero until data is imported)
- Your organization name appears in the Settings page
- The Quick Start checklist shows your progress

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Invalid credentials error | Ensure you are using exactly `admin@acmefs.sa` / `admin123` |
| Blank page after login | Clear browser cache and cookies, then retry |
| Onboarding checklist not visible | It may have been dismissed. Check localStorage key `idr-quickstart-dismissed`. |

## Next Steps

- [Connect Your First Data Source](./connect-first-source.md)
- [Your First 15 Minutes](./first-15-minutes.md)
