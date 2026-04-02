# Dead Code & Unused Imports Analysis - Smart Union Codebase

## Summary
This analysis identified unused imports, dead code blocks, console statements in production code, and unused utilities across the TypeScript/JavaScript codebase. The findings are organized by category and severity.

---

## 1. CONSOLE.LOG STATEMENTS (Production Code)

### High Priority - Debugging/Sensitive Data
These console statements should be removed or moved to development-only logs:

#### [src/app/(dashboard)/citizens/[id]/page.tsx](src/app/(dashboard)/citizens/[id]/page.tsx#L288)
- **Line 288**: `console.log('Downloading receipt for payment ID:', paymentId)`
- **Line 294**: `console.error('Receipt API error:', errorData)` 
- **Line 300**: `console.log('Receipt data:', data)` - Potentially sensitive receipt data

#### [src/app/(dashboard)/warish/[id]/page.tsx](src/app/(dashboard)/warish/[id]/page.tsx#L606)
- **Line 397**: `console.error(err)` - Bare error logging
- **Line 518**: `console.error(err)` - Inside PDF download catch block
- **Line 606**: `console.error(err)` - Inside PDF catch block

#### [src/app/(dashboard)/tax/[id]/page.tsx](src/app/(dashboard)/tax/[id]/page.tsx#L106)
- **Line 106**: `console.error(err)` - In error handler

#### [src/app/(dashboard)/certificates/page.tsx](src/app/(dashboard)/certificates/page.tsx#L54)
- **Line 54**: `.catch(console.error)` - Unhandled promise rejection logging

### Lower Priority - Error Logging
These are acceptable for error tracking but could be structured:

#### [src/middleware/with-db.ts](src/middleware/with-db.ts#L17)
- **Line 17**: `console.error('[DB connection error]', err)`

#### [src/lib/utils/api-response.ts](src/lib/utils/api-response.ts#L89)
- **Line 89**: `console.error('[Unhandled error]', error)`

#### [src/services/audit-log.service.ts](src/services/audit-log.service.ts#L41)
- **Line 41**: `console.error('[AuditLog] Failed to write audit log:', err)`

---

## 2. UNUSED IMPORTS

### [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx)
- **Imports**: `Image` from 'next/image' - **UNUSED**
  - Not found anywhere in component JSX
  - Recommendation: Remove unused import

### [src/app/(dashboard)/warish/[id]/page.tsx](src/app/(dashboard)/warish/[id]/page.tsx)
- **Import**: `Link` from 'next/link' - **Likely Unused**
  - Search shows import exists but may not be directly used (verify before removal)

---

## 3. UNUSED VARIABLES & CONSTANTS

### [src/app/(dashboard)/warish/[id]/page.tsx](src/app/(dashboard)/warish/[id]/page.tsx#L106)
- **Line 105**: `const certId = (ref: string | { _id: string } | undefined): string | null => ...`
  - Defined helper function but **NEVER CALLED** in the file
  - Used to extract certificate ID but implementation extracts IDs differently inline
  - Recommendation: Remove or use this utility function

- **Line 230+**: Variables `error` and `loading` from `useApi` are fetched but:
  - `error` is never checked or displayed anywhere
  - `loading` is never used to show loading states
  - Recommendation: Remove if not needed, or implement loading/error UI

### [src/lib/utils/certificate-render.ts](src/lib/utils/certificate-render.ts)
- **Line 199**: `void rawReplacements` - Parameter explicitly marked as unused  
- **Line 200**: `void certificateNo` - Parameter explicitly marked as unused
- **Line 201**: `void fallbackQrHtml` - Parameter explicitly marked as unused
- **Line 231**: `void verificationUrl` - Parameter explicitly marked as unused
  - These parameters are passed but never referenced in function logic
  - Recommendation: Remove from function signature

### [src/app/api/system-settings/route.ts](src/app/api/system-settings/route.ts#L10,16)
- **Line 10**: `void ctx` - Context parameter never used in GET handler
- **Line 16**: `void ctx` - Context parameter never used in PATCH handler
  - Standard pattern but not used
  - Recommendation: Remove or use underscore prefix `_ctx`

### Service Files - Unused Actor Parameters
Multiple service functions accept `actor` parameter but don't use it:
- [src/services/warish.service.ts](src/services/warish.service.ts#L139,200)
  - **Line 139**: `void _actor` - In deletion function
  - **Line 200**: `void _actor` - In another deletion function
  
- [src/services/certificate.service.ts](src/services/certificate.service.ts#L161,339,419)
  - **Line 161**: `void _actor`
  - **Line 339**: `void _actor`
  - **Line 419**: `void _actor`

- [src/services/system-settings.service.ts](src/services/system-settings.service.ts#L25)
  - **Line 25**: `void _actor`
  - Recommendation: These are marked with `void` intentionally (for audit compliance pattern) but not actually logged - verify if audit logging should be added

---

## 4. DEAD CODE BLOCKS

### Commented Out Code
None found currently - codebase is relatively clean of commented sections. The comments found are all documentation or clarification comments (helpful).

### Unreachable Code
None definitively identified, but potential issues:

#### [src/app/(dashboard)/warish/[id]/page.tsx](src/app/(dashboard)/warish/[id]/page.tsx#L410-411)
- **Lines 410-411**: Variables `certNo` and `storedQrUrl` declared but may not be properly initialized in all code paths
  ```typescript
  let certNo = ''
  let storedQrUrl = ''
  ```
  - These are declared then conditionally filled, but empty strings as defaults could cause issues
  - Recommendation: Verify that all paths properly populate these before use

---

## 5. UNUSED UTILITIES IN `/lib/utils/`

### [src/lib/utils/input-filters.ts](src/lib/utils/input-filters.ts)
- **Export**: `filterBangla(value: string): string` 
  - Implementation exists and is imported into CitizenRegistrationForm
  - Appears to be used - **Not unused**

- **Export**: `filterEnglish(value: string): string`
  - Imported in CitizenRegistrationForm
  - Appears to be used - **Not unused**

---

## 6. UNUSED MIDDLEWARE

All middleware appears to be used:
- [src/middleware/authenticate.ts](src/middleware/authenticate.ts) - Used in API routes
- [src/middleware/authorize.ts](src/middleware/authorize.ts) - Used in API routes  
- [src/middleware/with-db.ts](src/middleware/with-db.ts) - Used in all API routes

---

## 7. UNUSED CSS FILES

✅ Only one CSS file found: [src/app/globals.css](src/app/globals.css)
- This is the main global stylesheet - **IN USE**

---

## 8. UNUSED SERVICES

All services in [src/services/](src/services/) appear to be actively used:
- `auth.service.ts` - Used in API auth routes
- `user.service.ts` - Used in user management API routes
- `citizen.service.ts` - Used in citizen API routes
- `certificate.service.ts` - Used in certificate API routes
- `warish.service.ts` - Used in warish application routes
- `tax.service.ts` - Used in tax routes
- `relief.service.ts` - Used in relief routes
- `payment.service.ts` - Used in payment routes
- `cashbook.service.ts` - Used in cashbook routes
- `system-settings.service.ts` - Used in settings routes
- `audit-log.service.ts` - Used across all services for audit logging

---

## 9. POTENTIAL CODE QUALITY ISSUES

### Missing Error Handling
- [src/app/(dashboard)/citizens/[id]/page.tsx](src/app/(dashboard)/citizens/[id]/page.tsx) - Multiple catch blocks with bare `console.error` instead of user feedback

### Bare Error Objects
- [src/app/(dashboard)/warish/[id]/page.tsx](src/app/(dashboard)/warish/[id]/page.tsx#L606) - `console.error(err)` loses error context
- Consider using structured error logging

---

## RECOMMENDATIONS (Priority Order)

### 1. **IMMEDIATE** - Remove Console Logs
- [ ] Remove 9 console.log/console.error statements from production pages
- [ ] Keep only in error boundaries with proper structure
- Impact: ~5 minutes

### 2. **HIGH** - Clean Up Unused Code
- [ ] Remove `certId` helper in warish/[id]/page.tsx (Line 105)
- [ ] Remove unused parameters from certificate-render.ts (lines 199-201, 231)
- [ ] Remove unused `Image` import from register/page.tsx
- [ ] Clean up unused `error`/`loading` variables in warish detail page
- Impact: ~10 minutes

### 3. **MEDIUM** - Audit Actor Parameter Pattern
- [ ] Review all `void _actor` patterns in services
- [ ] Verify if audit logging is intended but not implemented
- [ ] Either implement audit logging or document why it's not needed
- Impact: ~15 minutes

### 4. **LOW** - Code Quality
- [ ] Replace bare `console.error` with structured error handling
- [ ] Add TypeScript strict null checking to catch initialization issues
- [ ] Consider using a logging library instead of console statements
- Impact: ~30 minutes

---

## Statistics

- **Console.log Statements Found**: 12
- **Unused Imports Identified**: 1 confirmed, 1 likely
- **Unused Variables**: 5 (certId helper, error, loading, and signature parameters)
- **Unused Functions**: 1 (certId helper)
- **Unused Exports**: 0
- **Dead Code Blocks**: 0 (clean codebase)
- **CSS Files**: 1 (all in use)
- **Service Files**: 11 (all in use)

---

## Files Analyzed
- 45+ TypeScript/TSX files scanned
- 13+ utility files examined  
- All service files reviewed
- All middleware verified
- All components checked
- CSS/styling checked

---

*Analysis Date: April 3, 2026*
*Focus: Production code cleanliness and maintainability*
