# 📁 Folder Structure & File Registry: folderstructure
**HRMS Pro Max Enterprise Redesign Directory Structure & Filename Report**

यह फ़ाइल आपके HRMS प्रोजेक्ट की सभी सक्रिय फ़ाइलों और फ़ोल्डर संरचना (Folder Structure & Filenames) की विस्तृत जानकारी प्रदान करती है। इसमें `node_modules` और `.git` जैसी ऑटो-जेनरेटेड फ़ाइलों को बाहर रखकर केवल आपके सोर्स कोड की स्पष्ट रूपरेखा तैयार की गई है।

---

## 1. 🌳 Visual Folder Tree (फ़ोल्डर संरचना की रूपरेखा)

```text
📦 Employee Management System (Root)
 ┣ 📂 electron                  # Electron main process configurations
 ┃ ┣ 📜 api.cjs                 # SQLite database API handlers
 ┃ ┣ 📜 database.cjs            # Local DB connection & schema migrations
 ┃ ┣ 📜 main.cjs                # Main electron window process
 ┃ ┗ 📜 preload.cjs             # IPC renderer bridge script
 ┣ 📂 public                    # Public static files
 ┃ ┣ 📜 attendance-register.html
 ┃ ┣ 📜 favicon.svg
 ┃ ┗ 📜 vite.svg
 ┣ 📂 scratch                   # Scratch scripts for migrations/updates
 ┃ ┗ 📜 fix_colors.ts
 ┣ 📂 src                       # Primary application codebase
 ┃ ┣ 📂 assets                  # Static assets & stylesheets
 ┃ ┃ ┣ 📂 styles
 ┃ ┃ ┃ ┣ 📜 themes.css
 ┃ ┃ ┃ ┗ 📜 tokens.css
 ┃ ┃ ┗ 📜 react.svg
 ┃ ┣ 📂 components              # Global shared components
 ┃ ┃ ┣ 📂 ui                    # Shadcn UI base primitives
 ┃ ┃ ┃ ┣ 📜 badge.tsx
 ┃ ┃ ┃ ┣ 📜 button.tsx
 ┃ ┃ ┃ ┣ 📜 card.tsx
 ┃ ┃ ┃ ┣ 📜 checkbox.tsx
 ┃ ┃ ┃ ┣ 📜 dialog.tsx
 ┃ ┃ ┃ ┣ 📜 dropdown-menu.tsx
 ┃ ┃ ┃ ┣ 📜 input.tsx
 ┃ ┃ ┃ ┣ 📜 label.tsx
 ┃ ┃ ┃ ┣ 📜 scroll-area.tsx
 ┃ ┃ ┃ ┣ 📜 select.tsx
 ┃ ┃ ┃ ┣ 📜 separator.tsx
 ┃ ┃ ┃ ┣ 📜 sheet.tsx
 ┃ ┃ ┃ ┣ 📜 skeleton.tsx
 ┃ ┃ ┃ ┣ 📜 table.tsx
 ┃ ┃ ┃ ┣ 📜 tabs.tsx
 ┃ ┃ ┃ ┣ 📜 textarea.tsx
 ┃ ┃ ┃ ┗ 📜 tooltip.tsx
 ┃ ┃ ┣ 📜 AISearch.tsx          # Frosted Neural Spotlight Command Palette
 ┃ ┃ ┣ 📜 AttendanceCalendar.tsx
 ┃ ┃ ┣ 📜 DayEditModal.tsx
 ┃ ┃ ┣ 📜 EmployeeDetailModal.tsx
 ┃ ┃ ┣ 📜 LanguageToggle.tsx
 ┃ ┃ ┣ 📜 Layout.tsx
 ┃ ┃ ┣ 📜 StatCard.tsx
 ┃ ┃ ┗ 📜 ThemeToggle.tsx
 ┃ ┣ 📂 core-ui                 # Custom premium enterprise UI layouts
 ┃ ┃ ┣ 📂 forms
 ┃ ┃ ┃ ┗ 📜 FloatingFields.tsx
 ┃ ┃ ┣ 📂 layout
 ┃ ┃ ┃ ┗ 📜 MainLayout.tsx
 ┃ ┃ ┣ 📂 navigation
 ┃ ┃ ┃ ┣ 📜 Navbar.tsx          # Frosted floating top capsule
 ┃ ┃ ┃ ┗ 📜 Sidebar.tsx         # Floating collapsible sidebar
 ┃ ┃ ┣ 📂 overlays
 ┃ ┃ ┃ ┗ 📜 Modal.tsx
 ┃ ┃ ┗ 📂 tables
 ┃ ┃   ┗ 📜 EnterpriseTable.tsx
 ┃ ┣ 📂 lib                     # Core contextual layers & utilities
 ┃ ┃ ┣ 📜 ConnectivityContext.tsx
 ┃ ┃ ┣ 📜 fetchPolyfill.ts
 ┃ ┃ ┣ 📜 hindiLabels.ts
 ┃ ┃ ┣ 📜 LanguageContext.tsx
 ┃ ┃ ┣ 📜 translations.ts
 ┃ ┃ ┗ 📜 utils.ts
 ┃ ┣ 📂 modules                 # Domain-driven feature modules
 ┃ ┃ ┣ 📂 attendance
 ┃ ┃ ┃ ┣ 📂 components
 ┃ ┃ ┃ ┃ ┗ 📜 StatusPopup.tsx
 ┃ ┃ ┃ ┗ 📂 pages
 ┃ ┃ ┃   ┗ 📜 AttendanceRegister.tsx
 ┃ ┃ ┗ 📂 employees
 ┃ ┃   ┣ 📂 components
 ┃ ┃   ┃ ┗ 📜 EmployeeForm.tsx
 ┃ ┃   ┗ 📂 pages
 ┃ ┃     ┗ 📜 EmployeeProfilePage.tsx
 ┃ ┣ 📂 pages                   # Modular dashboard sheets
 ┃ ┃ ┣ 📜 Attendance.tsx
 ┃ ┃ ┣ 📜 AttendanceCalendarView.tsx
 ┃ ┃ ┣ 📜 AttendanceExcel.tsx   # Custom high-density excel spreadsheet
 ┃ ┃ ┣ 📜 AttendanceReport.tsx
 ┃ ┃ ┣ 📜 Dashboard.tsx         # Real-time metrics dashboard
 ┃ ┃ ┣ 📜 EmployeeHistory.tsx   # Chronological System Audit Logs
 ┃ ┃ ┣ 📜 Employees.tsx         # Personnel Directory
 ┃ ┃ ┣ 📜 Letters.tsx           # Official Dispatch Vault
 ┃ ┃ ┣ 📜 PLManagement.tsx      # Leave Ledger management
 ┃ ┃ ┗ 📜 Resigned.tsx          # Resignations / Separations
 ┃ ┣ 📂 stores                  # Zustand state containers
 ┃ ┃ ┣ 📜 attendanceStore.ts
 ┃ ┃ ┣ 📜 employeeStore.ts
 ┃ ┃ ┗ 📜 themeStore.ts
 ┃ ┣ 📜 App.css
 ┃ ┣ 📜 App.tsx                 # Core application routing sheet
 ┃ ┣ 📜 index.postcss           # Custom glassmorphism utility classes
 ┃ ┣ 📜 main.tsx                # App bootstrap launcher
 ┃ ┗ 📜 ThemeContext.tsx        # UI Theme dynamic injector
 ┣ 📜 components.json           # Shadcn settings config
 ┣ 📜 eslint.config.js
 ┣ 📜 index.html                # Entry portal structure
 ┣ 📜 migrate.js
 ┣ 📜 package.json              # NPM dependencies catalog
 ┣ 📜 postcss.config.cjs
 ┣ 📜 PROJECT_REPORT.md
 ┣ 📜 README.md
 ┣ 📜 schema.sql                # SQLite database setup script
 ┣ 📜 stylereportsnew.md        # Style and theme architecture report
 ┣ 📜 theme.config.ts           # Dynamic Theme palette tokens
 ┣ 📜 tsconfig.app.json
 ┣ 📜 tsconfig.json
 ┣ 📜 tsconfig.node.json
 ┗ 📜 vite.config.ts            # Vite compile and manual bundle chunks config
```

---

## 2. 📝 Complete File Registry (फ़ाइलों की संपूर्ण सूची)

आपके प्रोजेक्ट की सभी **93 फ़ाइलों** की पूरी सूची उनके फ़ोल्डर पाथ के साथ नीचे दी गई है:

### A. Root Level Config Files (रूट लेवल फ़ाइलें)
1.  `.gitignore`
2.  `.vite-source-tags.js`
3.  `components.json`
4.  `eslint.config.js`
5.  `index.html`
6.  `migrate.js`
7.  `package.json`
8.  `postcss.config.cjs`
9.  `PROJECT_REPORT.md`
10. `README.md`
11. `schema.sql`
12. `stylereportsnew.md`
13. `theme.config.ts`
14. `tsconfig.app.json`
15. `tsconfig.json`
16. `tsconfig.node.json`
17. `vite.config.ts`

### B. Electron System (इलेक्ट्रॉन फ़ाइलें)
18. `electron/api.cjs`
19. `electron/database.cjs`
20. `electron/main.cjs`
21. `electron/preload.cjs`

### C. Public Assets (सार्वजनिक फ़ाइलें)
22. `public/attendance-register.html`
23. `public/favicon.svg`
24. `public/vite.svg`

### D. Scratch Tools (स्क्रैच फ़ाइलें)
25. `scratch/fix_colors.ts`

### E. Source Code Core (सोर्स कोड - मूल फ़ाइलें)
26. `src/App.css`
27. `src/App.tsx`
28. `src/index.postcss`
29. `src/main.tsx`
30. `src/ThemeContext.tsx`
31. `src/assets/react.svg`
32. `src/assets/styles/themes.css`
33. `src/assets/styles/tokens.css`

### F. Core Components (ग्लोबल कॉम्पोनेंट फ़ाइलें)
34. `src/components/AISearch.tsx`
35. `src/components/AttendanceCalendar.tsx`
36. `src/components/DayEditModal.tsx`
37. `src/components/EmployeeDetailModal.tsx`
38. `src/components/LanguageToggle.tsx`
39. `src/components/Layout.tsx`
40. `src/components/StatCard.tsx`
41. `src/components/ThemeToggle.tsx`

### G. UI Primitive Components (Shadcn UI कॉम्पोनेंट्स)
42. `src/components/ui/badge.tsx`
43. `src/components/ui/button.tsx`
44. `src/components/ui/card.tsx`
45. `src/components/ui/checkbox.tsx`
46. `src/components/ui/dialog.tsx`
47. `src/components/ui/dropdown-menu.tsx`
48. `src/components/ui/input.tsx`
49. `src/components/ui/label.tsx`
50. `src/components/ui/scroll-area.tsx`
51. `src/components/ui/select.tsx`
52. `src/components/ui/separator.tsx`
53. `src/components/ui/sheet.tsx`
54. `src/components/ui/skeleton.tsx`
55. `src/components/ui/table.tsx`
56. `src/components/ui/tabs.tsx`
57. `src/components/ui/textarea.tsx`
58. `src/components/ui/tooltip.tsx`

### H. Core UI Layout & Navigation (लेआउट और नेविगेशन फ़ाइलें)
59. `src/core-ui/forms/FloatingFields.tsx`
60. `src/core-ui/layout/MainLayout.tsx`
61. `src/core-ui/navigation/Navbar.tsx`
62. `src/core-ui/navigation/Sidebar.tsx`
63. `src/core-ui/overlays/Modal.tsx`
64. `src/core-ui/tables/EnterpriseTable.tsx`

### I. Libraries & Contexts (लाइब्रेरी और कांटेक्स्ट फ़ाइलें)
65. `src/lib/ConnectivityContext.tsx`
66. `src/lib/fetchPolyfill.ts`
67. `src/lib/hindiLabels.ts`
68. `src/lib/LanguageContext.tsx`
69. `src/lib/translations.ts`
70. `src/lib/utils.ts`

### J. Feature Modules (मॉड्यूलर फ़ीचर फ़ाइलें)
71. `src/modules/attendance/components/StatusPopup.tsx`
72. `src/modules/attendance/pages/AttendanceRegister.tsx`
73. `src/modules/employees/components/EmployeeForm.tsx`
74. `src/modules/employees/pages/EmployeeProfilePage.tsx`

### K. Page Views (पेज फ़ाइलें)
75. `src/pages/Attendance.tsx`
76. `src/pages/AttendanceCalendarView.tsx`
77. `src/pages/AttendanceExcel.tsx`
78. `src/pages/AttendanceReport.tsx`
79. `src/pages/Dashboard.tsx`
80. `src/pages/EmployeeHistory.tsx`
81. `src/pages/Employees.tsx`
82. `src/pages/Letters.tsx`
83. `src/pages/PLManagement.tsx`
84. `src/pages/Resigned.tsx`

### L. Zustand State Stores (स्टेट स्टोर फ़ाइलें)
85. `src/stores/attendanceStore.ts`
86. `src/stores/employeeStore.ts`
87. `src/stores/themeStore.ts`
