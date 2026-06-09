# Graph Report - Employee Management System  (2026-05-22)

## Corpus Check
- 114 files · ~81,026 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 589 nodes · 862 edges · 57 communities (39 shown, 18 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 118 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 82 edges
2. `useLanguage()` - 25 edges
3. `useAuthStore` - 14 edges
4. `useToast()` - 13 edges
5. `2. 📝 Complete File Registry (फ़ाइलों की संपूर्ण सूची)` - 13 edges
6. `useExport()` - 11 edges
7. `hindiLabels` - 11 edges
8. `useTheme()` - 9 edges
9. `Sidebar()` - 9 edges
10. `useConnectivity()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `public/vite.svg` --implements--> `HRMS Pro Max Enterprise System`  [INFERRED]
  public/vite.svg → PROJECT_REPORT.md
- `src/assets/react.svg` --implements--> `HRMS Pro Max Enterprise System`  [INFERRED]
  src/assets/react.svg → PROJECT_REPORT.md
- `Accordion()` --calls--> `cn()`  [INFERRED]
  src/components/Accordion.tsx → src/lib/utils.ts
- `AnimatedCounter()` --calls--> `cn()`  [INFERRED]
  src/components/AnimatedCounter.tsx → src/lib/utils.ts
- `BarChart()` --calls--> `cn()`  [INFERRED]
  src/components/Charts.tsx → src/lib/utils.ts

## Hyperedges (group relationships)
- **Core Desktop Architecture** — concept_hrms_pro_max, concept_electron_bridge, concept_sqlite_database [INFERRED 0.95]
- **Monthly Attendance Ecosystem** — concept_pulse_grid, concept_enterprise_table_virtual, concept_category_validation_rules [INFERRED 0.85]

## Communities (57 total, 18 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (38): AISearchProps, SearchResult, StatCardProps, categories, categoryColors, categoryIcons, EmployeeHistory(), HistoryRecord (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (30): AttendanceCalendarProps, ConfirmModalProps, DayEditModalProps, EmployeeDetailModal(), EmployeeDetailModalProps, LayoutProps, getCategoryColor(), getCategoryLabel() (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (29): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, colorMap, iconMap, ToastContext, ToastContextType, ToastProvider() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): EmployeeForm(), EmployeeFormProps, ExportButton(), ExportButtonProps, LanguageToggle(), ProtectedRoute(), ProtectedRouteProps, SyncStatusBar() (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (19): LeaveBalanceWidgetProps, STYLES, ATTENDANCE_CONFIG, AttendanceCode, attendanceStatusList, calculatePayrollValue(), getStatusConfig(), normalizeStatusCode() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (31): 1. Category Transition & Change Reason Logic, 1. `employees` (Personnel Directory), 1. PROJECT OVERVIEW, 2. `attendance` (Daily Logs), 2. DIRECTORY STRUCTURE, 2. Pulse Grid Keybind Hotkeys, 3. DATABASE MODELS & SCHEMA (SQLITE), 3. `employee_history` (Audit Log) (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (16): cn(), Checkbox(), Label(), ScrollArea(), ScrollBar(), Separator(), Skeleton(), Table() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): Additional Forbidden Patterns, Anti-Patterns (Do NOT Use), Buttons, Cards, code:css (@import url('https://fonts.googleapis.com/css2?family=Fira+C), code:css (/* Primary Button */), code:css (.card {), code:css (.input {) (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (20): ब्रांच एडमिन और एचओ एडमिन के लिए:, 1. अपडेट फीचर का परिचय, सुपर एडमिन के लिए:, विधि 1: पेनड्राइव के माध्यम से, 2. तीनों यूज़र रोल्स में व्यवहार, विधि 2: सुपरबेस (क्लाउड) के माध्यम से, 3. अपडेट अपलोड कैसे करें (Branch Admin / HO Admin के लिए), 4. अपडेट डाउनलोड / इंस्टॉल कैसे करें (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (11): ThemeToggle(), ThemeColors, ThemeMode, themes, ThemeContext, ThemeContextType, ThemeProvider(), useTheme() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (16): 1. 🌳 Visual Folder Tree (फ़ोल्डर संरचना की रूपरेखा), 2. 📝 Complete File Registry (फ़ाइलों की संपूर्ण सूची), A. Root Level Config Files (रूट लेवल फ़ाइलें), B. Electron System (इलेक्ट्रॉन फ़ाइलें), C. Public Assets (सार्वजनिक फ़ाइलें), code:text (📦 Employee Management System (Root)), D. Scratch Tools (स्क्रैच फ़ाइलें), E. Source Code Core (सोर्स कोड - मूल फ़ाइलें) (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (12): Bilingual Translation Engine (EN/HI), Category Transition Validation Logic, Electron IPC Bridge, Virtualized Enterprise Table, Glassmorphism UI Specifications, HRMS Pro Max Enterprise System, Pulse Grid Attendance Tracker, SQLite Database Layer (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (8): DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogSize, DialogTitle(), sizeClasses

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (9): STATUS_OPTIONS, StatusPopup(), StatusPopupProps, AttendanceRegister(), AVATAR_COLORS, STATUS_BADGE, EmployeeProfilePage(), useAttendanceStore (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (6): SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle()

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (8): DataTableSkeleton(), DataTableSkeletonProps, LoadingSpinner(), LoadingSpinnerProps, PageLoader(), PageLoaderProps, SkeletonLoader(), SkeletonLoaderProps

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (7): StatCard(), StatCardProps, Timeline(), TimelineDataEvent, TimelineEvent(), TimelineEventProps, TimelineProps

### Community 18 - "Community 18"
Cohesion: 0.39
Nodes (7): getUserAvatarGradient(), getUserDisplayName(), getUserInitials(), getUserRoleLabel(), navGroups, Sidebar(), SidebarProps

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): CopyToClipboard(), CopyToClipboardProps, ExternalLink(), ExternalLinkProps, Tooltip(), TooltipProps

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (5): KeyboardShortcutsModal(), KeyboardShortcutsModalProps, Shortcut, shortcuts, useKeyboardShortcuts()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): commonCols, newNames, oldNames, { open }, sqlite3

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (5): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger()

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (5): BarChart(), BarChartProps, ChartData, DonutChart(), DonutChartProps

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): 1. 🌐 index.html & External CSS CDNs की जानकारी, 2. ⚡ Vite Configuration (vite.config.ts) की जानकारी, 3. 🎨 Active Theme System (theme.config.ts & Tailwind CSS), 4. 📄 Pages का Theme और CSS से जुड़ाव (Mapping), 📊 Style Report: stylereportsnew

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (3): content, newContent, transparentPercentage

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (4): FilterBar(), FilterBarProps, FilterChip(), FilterChipProps

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (4): FormField(), FormFieldProps, ValidationStatus(), ValidationStatusProps

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (4): FloatingInput(), FloatingInputProps, FloatingSelect(), FloatingSelectProps

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (4): Column, EnterpriseTable(), EnterpriseTableProps, TableRow

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (3): { app, ipcMain }, registerApiHandlers, setupDatabase

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (3): Accordion(), AccordionItem, AccordionProps

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (3): colorMap, QuickAction, quickActions

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (3): Notification, NotificationCenter(), NotificationCenterProps

## Knowledge Gaps
- **206 isolated node(s):** `sqlite3`, `{ open }`, `oldNames`, `newNames`, `commonCols` (+201 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 6` to `Community 1`, `Community 3`, `Community 11`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 22`, `Community 23`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 32`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`?**
  _High betweenness centrality (0.342) - this node is a cross-community bridge._
- **Why does `Letters()` connect `Community 1` to `Community 3`, `Community 6`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `PLManagement()` connect `Community 3` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 81 inferred relationships involving `cn()` (e.g. with `Accordion()` and `AnimatedCounter()`) actually correct?**
  _`cn()` has 81 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `useLanguage()` (e.g. with `SyncStatusBar()` and `Navbar()`) actually correct?**
  _`useLanguage()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `useAuthStore` (e.g. with `SyncStatusBar()` and `Navbar()`) actually correct?**
  _`useAuthStore` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useToast()` (e.g. with `Letters()` and `UserManager()`) actually correct?**
  _`useToast()` has 2 INFERRED edges - model-reasoned connections that need verification._