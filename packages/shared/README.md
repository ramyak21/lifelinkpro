# @lifelink/shared

Code used by both portals. It is **source only** (no build step): each portal's
`vite.config.js` maps `@lifelink/shared` to `packages/shared/src` and dedupes React, so
imports look like:

```js
import Button from "@lifelink/shared/components/ui/Button";
import { manageApi } from "@lifelink/shared/services/lifelink";
```

| Folder | Contents |
|---|---|
| `components/ui` | Button, Card, Badge, Alert, DataTable (browser or server paging, sortable headers), Drawer, ConfirmDialog, SearchInput, SegmentedControl, Toolbar, PageHeader, Empty/Error/Skeleton states, Toast |
| `components/form` | TextField, TextAreaField, PasswordField, ChoiceGroup, FormLayout (FormError, FormActions, FormSection) |
| `components/account` | NameForm and PasswordForm for the signed-in account |
| `components/auth` | SignInForm used by both sign-in pages |
| `components/emergency` | EmergencyProgress (status steps), EmergencyTimeline (history; `viewer="admin"` shows names) |
| `components/layout` | Logo, UserMenu, AuthLayout, PageLoader, RouteEffects |
| `context` | AuthProvider (session state, sign-in/out, session-expired handling) |
| `hooks` | useAsync, usePolling, useForm, useAuth, useToast, useSignOut, useDocumentTitle, … |
| `services/api.js` | axios instance; base URL from `VITE_API_URL` |
| `services/session.js` | `configureSession({ tokenKey, userKey })` and storage helpers |
| `services/lifelink.js` | Every API call the portals make (the single API contract) |
| `utils` | validation rules, formatting, status labels, error messages, `cx` |
| `styles` | design tokens (`tokens.css`) and global styles |

Rules for this package:

- Nothing portal-specific (no routes, no portal URLs, no admin-only screens).
- No secrets and no `VITE_*` variables other than `VITE_API_URL`.
- Lint with `npm run lint -w @lifelink/shared`.
