# 📊 Style Report: stylereportsnew
**HRMS Pro Max Enterprise Redesign Style & Architecture Report**

यह रिपोर्ट आपके Employee Management System (HRMS) में इस्तेमाल किए गए CSS CDN, Dynamic Theme Configurations, `index.html` स्ट्रक्चर, और Vite बिल्ड सेटिंग्स की संक्षिप्त और सटीक जानकारी (Limited Summary) प्रदान करती है।

---

## 1. 🌐 index.html & External CSS CDNs की जानकारी
`index.html` फ़ाइल आपके पूरे React-Electron एप्लिकेशन का प्रवेश द्वार (Entry Point) है, जिसमें निम्नलिखित CDN और फॉन्ट्स का उपयोग किया गया है:

*   **Bootstrap 5.3.3 CDN:**
    *   **CSS:** `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css` (Bootstrap ग्रिड सिस्टम और फॉर्म लेआउट के लिए)।
    *   **JS Bundle:** `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js` (Bootstrap कॉम्पोनेंट्स के इंटरेक्शन्स के लिए)।
*   **Google Fonts Integrations:**
    *   **Inter:** प्रीमियम यूटिलिटी और बॉडी टेक्स्ट के लिए।
    *   **Noto Sans Devanagari:** हिंदी और अंग्रेजी अनुवादों (Bilingual translations) की स्पष्ट पठनीयता सुनिश्चित करने के लिए।
    *   **Fira Code & Fira Sans:** मोनोस्पेस डेटा रिकॉर्ड्स और टेक्निकल मैट्रिक्स प्रदर्शन के लिए।
*   **Mount Point:** React को सीधे `<div id="root"></div>` पर माउंट किया गया है जो `/src/main.tsx` को ट्रिगर करता है।

---

## 2. ⚡ Vite Configuration (vite.config.ts) की जानकारी
Vite बिल्ड टूल आपके पूरे एप्लिकेशन को अत्यंत तेज लोडिंग गति प्रदान करने के लिए कॉन्फ़िगर किया गया है:

*   **Vite Version:** `v7.3.2`
*   **React Plugin:** `@vitejs/plugin-react` का उपयोग JSX ट्रांसफॉर्म के लिए किया गया है।
*   **Relative Pathing (base: './'):** एप्लिकेशन को पूर्ण रूप से ऑफलाइन-फर्स्ट और एंबेडेड इलेक्ट्रॉन एनवायरनमेंट में चलाने के लिए बेस पाथ को रिलेटिव रखा गया है।
*   **Rollup Code Splitting (Manual Chunks):**
    *   `vendor-react`: `react`, `react-dom`, `react-router-dom` को एक अलग बंडल में विभाजित करता है।
    *   `vendor-utils`: `lucide-react`, `zustand`, `clsx` जैसी यूटिलिटीज को स्वतंत्र रूप से लोड करता है।
*   **Server Configuration:** Strict Port `5173` पर रन होता है।

---

## 3. 🎨 Active Theme System (theme.config.ts & Tailwind CSS)
पूरे एप्लिकेशन का थीम आर्किटेक्चर डायनेमिक CSS वेरिएबल्स `:root` पर आधारित है, जो **Tailwind CSS** और `src/index.postcss` के साथ मिलकर रेंडर होते हैं:

*   **Dual-Mode Support:**
    1.  **Pro Max Dark Theme (OLED Optimized + Frosted Glass):**
        *   **Base Background:** `#020617` (Deep Black)
        *   **Glass Panels:** `rgba(15, 23, 42, 0.45)` (frosted slate-900 with backdrop-blur)
        *   **Accent Lights:** Blue (`#3b82f6`), Emerald Green (`#22c55e`), Rose Red (`#ef4444`), Lavender Purple (`#8b5cf6`), and Orange (`#f59e0b`).
    2.  **Light Theme (Frosted White Glass):**
        *   **Base Background:** `#f8fafc` (Light Slate)
        *   **Glass Panels:** `rgba(255, 255, 255, 0.55)` (white frosted glass)
*   **CSS Variable Injection:** `generateCSSVariables(mode)` के द्वारा सभी स्टाइल प्रॉपर्टीज को रनटाइम पर इंजेक्ट किया जाता है (जैसे: `var(--bg-primary)`, `var(--border-primary)`)।

---

## 4. 📄 Pages का Theme और CSS से जुड़ाव (Mapping)
प्रत्येक पेज इन CSS वेरिएबल्स और थीम टोकन्स से किस प्रकार जुड़ा है, उसका विवरण निम्नलिखित है:

| क्र.सं. | फ़ाइल / पेज का नाम | मुख्य थीम कनेक्शन (CSS Variables & Elements) | विजुअल फीचर्स |
| :--- | :--- | :--- | :--- |
| 1 | **Dashboard.tsx** | `var(--bg-secondary)`, `var(--accent-blue)`, `var(--accent-green)` | रीचार्ट्स एनालिटिक्स कार्ड्स, एनिमेटेड प्रोग्रेस रिंग्स और नियॉन बॉर्डर्स। |
| 2 | **Employees.tsx** | `var(--bg-card)`, `var(--border-primary)`, Tailwind utilities | फ्रॉस्टेड टेबल ग्रिड, एनिमेटेड एक्टिव राउट कैप्सूल और राउंडेड इनिशियल प्रोफाइल बैज। |
| 3 | **PLManagement.tsx** | `var(--accent-purple)`, `var(--bg-tertiary)`, custom leave classes | हाई-डेंसिटी ईयर-वाइज लीव मेट्रिक्स कार्ड्स, ग्लोइंग फॉर्म इनपुट बॉक्स। |
| 4 | **Letters.tsx** | `var(--accent-red)` (Outgoing), `var(--accent-green)` (Incoming) | क्लासिफाइड ट्रांसलूसेंट टैग्स, ऑफिशियल डिस्पैचर आर्काइव टेबल और फ्रॉस्टेड सबमिशन ओवरले। |
| 5 | **Resigned.tsx** | `var(--accent-red)`, Gradient: Rose-400 to Rose-500 | रोज़ ग्रेडिएंट हेडर, म्यूटेड सर्विस ड्यूरेशन स्पैन और termination रीज़न ब्लॉक्स। |
| 6 | **EmployeeHistory.tsx**| `status-cell` (Emerald, Sky, Rose, Amber) | रियल-टाइम ऑडिट ट्रेल्स, ऑपरेशन टाइप के अनुसार बदलते कलर-बैज और स्टेट-ट्रांजिशन एरोज। |
| 7 | **AttendanceExcel.tsx** | `var(--bg-secondary)`, `custom-scrollbar` | अत्यंत घनी, एक्सेल जैसी रिस्पॉन्सिव स्प्रेडशीट टेबल, फ्रीज हेडर और स्मूथ स्क्रॉलिंग। |
| 8 | **EmployeeProfilePage.tsx**| `var(--bg-card)`, `var(--border-secondary)` | इंफॉर्मेशन हायरेरकी को दर्शाने वाले फ्रॉस्टेड सेगमेंटेड टाइल्स। |
