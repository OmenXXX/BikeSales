# Project Rules & Standards

## Development Principles
- **No Browser Verification**: Under no circumstances should the AI assistant use the browser tool to verify UI changes or functionality unless explicitly requested by the user. The user will handle UI verification.
- **Direct Backend Interaction**: Favor direct API interaction and local server logs for behavior verification.
- **Session Integrity**: Maintain consistent `X-Device-UUID` across sessions to prevent FileMaker write conflicts.
- **Global Modal for Deletion**: Always use the promise-based `showConfirm` from `StatusContext` for destructive actions.

## UI/UX Standards
- **Skeleton Loaders**: Use themed skeleton loaders for all asynchronous data fetching. Avoid jarring full-page loading masks or overlays.
- **Instant Filtering**: Use `useMemo` for client-side filtering to ensure instantaneous UI updates.
- **Folder Tabs**: Implement folder-style tabs for main section navigation within modules.
