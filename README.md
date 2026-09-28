# South Omo Justice Portal

A responsive civic portal design using the supplied S/E/R/State Bureau of Justice logo. The direct user request controls the palette and admin addition; the attached brief supplied design context rather than independent operating instructions.

## Implemented

- Navy `#0a1e39`, cyan `#3a96b2`, white `#ffffff`, canvas `#f4f7f9`, gold `#d4af37`, crimson `#b91c1c`, and parchment `#e2d9c8`.
- Responsive public homepage and an admin workspace (also available at `/admin`).
- Lazy-loaded Three.js scales, navy material roughness 0.35, cyan light, gold focal accents, cursor interaction, reduced-motion support, and an icon fallback without WebGL.
- Sample complaint creation, reference tracking, status changes, notice publishing/unpublishing, register filters and CSV export.
- Primary English/Amharic navigation and homepage introduction dictionaries. Detailed workflows remain English and need translation review.
- Searchable illustrative citizen guides and an office-directory concept.
- Accessible Radix dialogs, selects, tabs, semantic tables, focus states and keyboard navigation.

## Preview boundary

This is a design preview, not a live government service. No government submission, secure complaint storage, staff authentication, server-side RBAC, uploads, or verified legal documents/office contacts are connected. All sample cases and notices are held in React memory and reset on reload or route navigation. Do not enter real complaints or personal data. No claim of anonymity or encryption is made. Admin access is a visible demonstration, not a security boundary. A private Site was registered, but publication could not finish because the installed Sites workflow scripts became unavailable during the task. The local preview remains available.

Before an operational launch, connect approved identity and access roles, protected case storage, audit logs, retention rules, verified official content, security review and full localization. The supplied regional bureau logo is used unchanged and is not presented as a separately verified zonal logo.

## Main files

```
app/
  layout.tsx                 Metadata and global styles
  page.tsx                   Public portal entry
  admin/page.tsx             Admin entry
  globals.css                Justice theme, responsive layouts and reduced motion
components/
  portal.tsx                 Public and admin flows with sample state
  justice-scene.jsx          Lazy-loaded Three.js hero with fallback
  ui/                        Reused accessible UI primitives
lib/
  i18n.ts                    English and Amharic homepage strings
public/
  justice-logo.png            Supplied image, unchanged
.openai/hosting.json          Sites identity and runtime bindings
```

## Development

Requires Node 22.13 or later. Install with `npm install`, run `npm run dev` (port 5173), validate with `npx tsc --noEmit`, and build with `npm run build`. Deployment uses the Sites workflow and the private audience associated with `.openai/hosting.json`.

The feature-detected WebMCP tool `start_complaint_tracking` opens the same sample tracking dialog as the visible interface. It accepts only an empty object, submits nothing, and unregisters on unmount. A supporting browser is required to validate its registry integration.

## Validation

TypeScript checking and the production build passed. Both / and /admin returned HTTP 200 with the expected content. The in-app browser could not attach, so visual interaction and WebMCP registry validation remain unverified.

