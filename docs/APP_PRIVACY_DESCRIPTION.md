# App Privacy Description for App Store Connect

This document describes the data collection and usage for App Store Connect App Privacy section.

## Data Collection Summary

**ExGo does NOT collect any user data or personal information.**

All data is stored locally on the user's device. We do not transmit, share, or sell any user data.

## Detailed Privacy Information

### Data NOT Collected

We do NOT collect:
- ❌ Personal information (name, email, address)
- ❌ Financial data (transactions, amounts, categories)
- ❌ Location data
- ❌ Contact information
- ❌ User content
- ❌ Identifiers (user ID, device ID)
- ❌ Usage data
- ❌ Diagnostics data (except error logs via Sentry - see below)

### Error Tracking (Sentry)

**What we collect:**
- Error messages and stack traces (technical diagnostic data)
- Device information (device model, OS version, app version)
- Timestamp of errors

**Why we collect it:**
- To identify and fix bugs
- To improve app stability
- Technical diagnostics

**How we use it:**
- Error analysis and debugging
- App improvement

**Data linked to user:**
- ❌ No - error logs are not linked to user identity
- Error logs contain no personal or financial information

**Tracking:**
- ❌ No - we do not use this data for tracking or advertising

**Third-party sharing:**
- ✅ Yes - Sentry (error tracking service)
- Purpose: Error tracking and diagnostics
- Data shared: Error logs, device info, app version
- Privacy policy: https://sentry.io/privacy/

## App Store Connect App Privacy Answers

### Data Collection

**Do you collect data?**
- ✅ Yes (only error tracking via Sentry)

**What data do you collect?**
- Diagnostics (Error logs, device information)

**Is data linked to user identity?**
- ❌ No

**Is data used for tracking?**
- ❌ No

**Is data shared with third parties?**
- ✅ Yes (Sentry - error tracking service only)

### Data Types (if applicable)

If App Store Connect requires you to specify data types:

**Diagnostics:**
- Crash logs: ✅ Yes (via Sentry)
- Performance data: ✅ Yes (error performance data via Sentry)
- Other diagnostic data: ✅ Yes (stack traces, device info)

**Purpose:**
- App Functionality: ✅ Yes (error tracking for app stability)

**Linked to User:**
- ❌ No

**Used for Tracking:**
- ❌ No

**Third-Party Sharing:**
- ✅ Yes (Sentry)

## Local Data Storage

**What is stored locally:**
- Transaction data (expenses, income, savings)
- User settings (currency, income, theme)
- Custom categories
- Authentication settings (if enabled)

**Where it's stored:**
- Device local storage (AsyncStorage)
- Encrypted at rest using device security

**Who has access:**
- Only the user
- Data is not accessible to us or third parties

## User Rights

Since all data is stored locally:
- Users can delete all data at any time
- Users can export data (PDF export feature)
- Users can uninstall the app to remove all data
- No data retention by us (data only exists on user's device)

## Privacy Policy

Link to Privacy Policy: [Your Privacy Policy URL]

Example: `https://yourapp.com/privacy` or `https://github.com/yourusername/exgo/blob/main/docs/PRIVACY_POLICY.md`

## Contact Information

For privacy-related questions:
- Email: [Your support email]
- Website: [Your website URL]

---

## Notes for App Store Submission

1. **Be transparent**: Clearly state that you only collect error tracking data
2. **Link Privacy Policy**: Provide a link to your Privacy Policy
3. **Be specific**: Specify exactly what data is collected and why
4. **No tracking**: Clearly state that no data is used for tracking
5. **Third-party disclosure**: Disclose Sentry as a third-party service

## iOS Privacy Manifest

For iOS apps, you may need to create a `PrivacyInfo.xcprivacy` file. This file should declare:

- **NSPrivacyAccessedAPITypes**: APIs accessed (if any)
- **NSPrivacyCollectedDataTypes**: Data collected (error logs only)
- **NSPrivacyTracking**: Tracking status (false)
- **NSPrivacyTrackingDomains**: Tracking domains (none)

---

**Important**: Review and customize this document according to your specific implementation. Ensure compliance with App Store and Google Play Store requirements.


