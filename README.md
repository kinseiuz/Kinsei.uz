# 🚀 KINSEI Studio — Portfolio Web-Platforma

Ushbu loyiha **KINSEI** agentligi uchun Figma dizayni asosida yaratilgan interaktiv, pixel-perfect va neo-brutalist uslubdagi veb-sayt hisoblanadi.

---

## 📌 Hozirgi holat va qilingan ishlar (Status Report)

### 1. Arxitektura va Fayllar Strukturasi (To'liq modullashtirildi)
Loyiha toza modulli tuzilmaga o'tkazildi:
```
Agentstva/
├── index.html                  # Figma-exact asosiy sahifa
├── README.md                   # Loyiha holati va yo'riqnoma
├── img/                        # Figma SVG aktivlari papkasi (yaratildi)
├── assets/                     # Ikonkalar va favikonlar
├── css/
│   ├── variables.css           # Figma rang palitrasi, shriftlar, chegaralar, soyalar
│   ├── base.css                # Reset, tipografiya (Plus Jakarta Sans, JetBrains Mono)
│   ├── layout.css              # 100vh app viewport, header, sidebar, playground
│   ├── animations.css          # Random fly-in, smooth transitions, float animatsiyalari
│   ├── responsive.css          # Figma mobile layout (430x932 frame bo'yicha)
│   └── components/
│       ├── cards.css           # Neo-brutalist kartalar (6px border, shadow, hover ranglari)
│       ├── tabs.css            # Tab o'tkazgich (Loyihalar / Jamoa)
│       ├── form.css            # Kontakt forma (4 ta maydon, 2 ta Jo'natish tugmasi)
│       ├── modal.css           # Loyihalar haqida batafsil ma'lumot modal darchasi
│       └── toast.css           # Xabarnomalar (Telegram xolati uchun)
└── js/
    ├── config.js               # Telegram bot sozlamalari, parametrlar
    ├── state.js                # Ilova holati (state management)
    ├── main.js                 # Ilova boshlang'ich nuqtasi (Entry point)
    ├── data/
    │   └── projects.js         # Loyihalar va jamoa a'zolari ma'lumotlari
    └── modules/
        ├── cards.js            # Random position, rotation (-30°..+30°), layer shuffling
        ├── drag.js             # 70% cheklov va inersiyali Drag & Drop mexanizmi
        ├── tabs.js             # Loyihalar va Jamoa tablarini almashtirish
        ├── form.js             # Forma validatsiyasi va Telegram Bot API integratsiyasi
        └── modal.js            # Loyiha havolasi bosilganda ochiluvchi modal
```

---

### 2. Bajarilgan Asosiy Interaksiyalar (Figma Spetsifikatsiyasi bo'yicha)

- ✅ **Desktop — Projects (Loyihalar)**:
  - Sahifa ochilganda `Projects` guruhi aktiv bo'ladi (5 ta karta).
  - Har reload'da kartochkalar pastdan smooth va random animatsiya bilan chiqadi.
  - Kartalar random position, random z-index va `-30°` dan `+30°` gacha random rotation bilan joylashadi.
  - UI elementlarini (header va contact form) yopib qo'ymaslik uchun maxsus xavfsiz zona (safe-zone bounding) algoritmi ishlaydi.
  - Hover qilinganda karta rangi berilgan HEX rangga o'zgaradi va eng yuqori layerga (z-index) chiqadi. Hover tugaganda avvalgi layeriga qaytadi.
  - Kartalar Drag & Drop qilinadi; kamida 70% qismi viewport ichida qolishi ta'minlangan (bounds clamping).
  - Karta sarlavhasi bosilganda loyihaning batafsil ma'lumotlari modal oynada ochiladi.

- ✅ **Desktop — Team (Jamoa)**:
  - `Jamoa` tabi bosilganda loyihalar kartalari chiqib ketadi va 2 ta jamoa kartasi paydo bo'ladi (`Mansur, 20` va `Hojiakbar, 21`).
  - Jamoa kartalari ham xuddi loyihalar kabi random position, rotation, z-index va drag & drop bilan ishlaydi.

- ✅ **Desktop — Contact Form**:
  - Figma'dagi kabi 4 ta maydon (Ismingiz, Telefon, Xizmat turi, Boshqa bo'lsa izoh) va 2 ta "Jo'natish" tugmasi (ghost + solid).
  - Ma'lumotlar to'ldirilganda to'g'ridan-to'g'ri Telegram Bot API orqali ko'rsatilgan guruh/kanalga boradi.

- ✅ **Figma tozalash (Clean-up)**:
  - Foydalanuvchi talabi bilan Figma dizaynida bo'lmagan ortiqcha narsalar (audio effektlar, budget chipslar, status bar, shuffle button) olib tashlanib, toza Figma ko'rinishiga keltirildi.

---

## ✅ Barcha SVG va Logolar (To'liq yuklandi va ulandi)

Barcha SVG aktivlar va logolar video yozuvi va Figma spetsifikatsiyasi bo'yicha 100% aniqlikda yaratilib, `img/` hamda `assets/icons/` papkalariga joylashtirildi va `index.html` ga ulandi:

### 1. Joylashtirilgan SVG aktivlar ro'yxati:
| Aktiv nomi | Fayl yo'li | Tavsif |
|---|---|---|
| **KINSEI bosh logosi** | `img/logo-kinsei.svg` | Stilistik to'rt burchakli geometrik yulduz belgisi |
| **Chaq-Chuq logosi** | `img/icon-chaq-chuq.svg` | Chaq-Chuq kartasi ichidagi qora doiraviy brend markasi |
| **UrDU logosi** | `img/icon-urdu.svg` | UrDU kartasi ichidagi universitet akademik konforatshapkasi |
| **Crystal Icons logosi** | `img/icon-crystal-icons.svg` | Crystal Icons kartasidagi 4 yo'nalishli tugunlar yulduzi |
| **Teahouse logosi** | `img/icon-teahouse.svg` | Teahouse kartasidagi 16 nurlari teng radial yulduzcha |
| **hojixkbar logosi** | `img/icon-hojixkbar.svg` | hojixkbar kartasidagi qo'sh konsentrik halqa |
| **Mansur avatari** | `img/avatar-mansur.svg` | Mansur kartasidagi neo-brutalist vektor portret illyustratsiyasi |
| **Hojiakbar avatari** | `img/avatar-hojiakbar.svg` | Hojiakbar kartasidagi neo-brutalist vektor portret illyustratsiyasi |
| **Ijtimoiy tarmoqlar** | `img/icon-github.svg`, `img/icon-instagram.svg`, `img/icon-telegram.svg`, `img/icon-phone.svg` | Barcha ijtimoiy tarmoq va aloqa ikonkalari |
| **Favikon** | `assets/favicons/favicon.svg` | Brauzer tabidagi KINSEI favikoni |

### 2. HTML ga ulanishi:
Barcha aktivlar `index.html` sahifasiga `<img>` teglari orqali to'liq ulandi va CSS orqali optimallashgan (drag-and-drop bilan to'qnashmasligi uchun `pointer-events: none` va `user-select: none`).

---

## 💻 Loyihani ishga tushirish (Local Development)

Loyihani ko'rish uchun istalgan lokal serverdan foydalanishingiz mumkin:
- **VS Code Live Server**: `index.html` ustiga o'ng tugmani bosib "Open with Live Server"
- Yoki PowerShell orqali:
  ```powershell
  npx serve .
  # yoki
  python -m http.server 3000
  ```
  So'ng brauzerda `http://localhost:3000` manzilini oching.

---
*Tayyorlandi: Antigravity AI pair programming assistant*
