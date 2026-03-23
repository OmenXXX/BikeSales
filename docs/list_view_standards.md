# ERP List View Design Standards

To maintain consistency across the Nexora ERP platform, all list views must adhere to the following structural and aesthetic guidelines.

## 1. Structural Hierarchy

### Global Header Section
- **Branding**: The module icon and title are integrated into the global app header.
- **Typography**: 
  - Module Title MUST be in **UPPERCASE** (e.g., "BUSINESS PARTNERS").
  - Title color MUST match the module's theme color (e.g., `text-teal-600`).
  - Use maximum font weight (`font-[1000]`) for premium depth.
- **Redundancy**: Remove sub-taglines or page-level headers that duplicate the global header title.

### Page Layout (The "Boxup" Feel)
- **Background**: Use a subtle off-white canvas (e.g., `bg-slate-100`) to create depth.
- **Layering**: Main UI components (Filters, Tables) must be contained in **solid white** cards that "pop" against the canvas.
- **Elevation**: Use deep, custom **outer shadows** (e.g., `shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)]`) rather than heavy borders.

### Unified Control Bar
- **Consolidation**: Filters, Pagination, and Module actions must be housed within a **single elevated white box**.
- **Corner Radius**: Use high rounding (`rounded-[2.5rem]`).
- **Responsive Layout**: Stack vertically on mobile, horizontal on desktop. Use `hidden md:block` for non-critical labels like "SHOWING".

### Data Table
- **Container**: Elevated white card with high rounding (`rounded-[3rem]`).
- **Column Headers**: Text MUST use the module theme color, heavy weight (`font-[1000]`), and high tracking.
- **Selection**: Include a checkbox column (left-most) if bulk actions are supported.

## 2. Theme & Aesthetics

- **Color Coordination**: Primary theme color MUST match the module's Command Hub hexagon.
- **Chips & Badges**: Use `rounded-full` capsules with light tinted backgrounds and matching borders/dots for status (e.g., `bg-emerald-50 text-emerald-600`).
- **Tooltips**: **ALWAYS** provide tooltips for buttons and icon-only actions.

## 3. Interaction & States

### Row Interactions
- **Hover**: Rows should use a subtle theme-tinted background (e.g., `hover:bg-teal-50/20`).
- **Selection**: Selected rows should have a distinct, slightly darker tint (e.g., `bg-teal-50/40`).

### Empty States
- **Visuals**: Use a centered layout with a large, muted icon (e.g., `cloud_off` or `search_off`).
- **Messaging**: Use a bold, uppercase tagline with high tracking (e.g., "ZERO MATCHES DISCOVERED").

### Loading Patterns
- **Table Data**: Use pulse skeletons (`animate-pulse`) for row structure during background fetches.
- **Full Refresh**: Use a theme-colored spinner for total page reloads.

## 4. Typography & Formatting

- **Entity Names**: Display primary names in **UPPERCASE** with maximum weight (`font-[1000]`) and tabular spacing.
- **Data Detail**: Use `tabular-nums` for numeric and contact fields (Email, Phone, IDs) to ensure vertical alignment.
- **Scaling**: Use small font sizes (`text-[10px]` or `text-[11px]`) for labels to maintain a high-density "pro" look.

## 5. Technical Logic (FileMaker)

- **Search Persistence**: Always use wildcard searches (`_find`) for initial loads.
- **Pagination**: Maintain a consistent `pageSize` (default 10 or 12).
- **Record Counts**: Display counts in a pill format (e.g., "12 Records Synchronized").

## 6. Alignment & Density

- **Field Alignment**:
  - **Names/Descriptions**: Left-aligned (default).
  - **Status/Badges**: Center-aligned for visual balance.
  - **Numeric/Price Data**: Right-aligned (tabular-nums).
  - **Action Buttons**: Always Right-aligned in the last column.
- **Data Density**:
  - Use `py-3` for table rows to maintain a "breathable" but high-density professional look.
  - Minimize vertical padding in the control bar to keep the table as the primary focus.
