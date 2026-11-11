# 🌿 PlantCare - Smart Garden Plant Tracker & AI Botanist

Welcome to **PlantCare**! This frontend homepage was built specifically for tracking small garden plants with instant name searching, photo uploads, live health diagnosis, care streak tracking, and an integrated **Qwen AI Botanist**.

---

## 🎨 Design Highlights
- **Vibrant & Colorful**: Botanical background with animated ambient glowing blobs and natural garden accents.
- **Glassmorphic Cards**: Modern frosted glass (`backdrop-filter: blur`, translucent borders, soft luminous shadows).
- **Light Leaf Green Accent**: Signature light leaf green buttons (`#70C160` / `#7AD565`) with gentle hover lift and organic glow.
- **Real Plant Photography**: High-resolution Unsplash photography featuring Monstera, Snake Plant, Basil, Calathea, Peace Lily, Aloe Vera, and more.
- **Completely Free to Build**: Pure HTML5, CSS3, and modern Vanilla ES6+ JavaScript. No paid frameworks, subscriptions, or external build steps required.

---

## 🚀 Key Features

### 1. 🔍 Instant Plant Search & Encyclopedia
- Search by plant common name, scientific name, or description.
- Filter by tags: *Indoor Foliage, Low Maintenance, Flowering, Fresh Herbs, Succulents, Pet Friendly*.
- Modal view with in-depth care tips (watering frequency, sunlight levels, optimal temperature, humidity, and pet safety).
- Bookmark favorites with heart button (persisted in `localStorage`).

### 2. 📸 Photo Snap & AI Laser Scanner (Qwen Vision Demo)
- Drop or upload plant photos directly from your device or camera.
- Interactive laser scan animation simulating live botanical diagnostic analysis.
- 4 real-world test scenarios:
  - *Healthy Monstera Deliciosa* (Optimal growth)
  - *Yellowing Pothos* (Overwatering warning)
  - *Dehydrated Boston Fern* (Moisture deficit)
  - *Haworthia Succulent* (Sunlight test)
- Real-time diagnostic breakdown and actionable step-by-step care steps.
- One-click button to add scanned plants directly into your Garden Tracker.

### 3. 🌱 My Garden Tracker (Live Dashboard)
- Track your small garden plants with active hydration countdowns and visual progress meters.
- **"Water Now"** button instantly resets hydration cycles and increases your **Care Streak** (e.g. 14+ days 🔥).
- Fully persisted via `localStorage` so plants stay saved when refreshing.

### 4. 🤖 "Ask Qwen AI" Interactive Botanist Assistant
- Conversational chat powered by the Qwen LLM persona.
- Quick-prompt chips for common garden dilemmas:
  - *"Why are leaves turning yellow?"*
  - *"How often should I water?"*
  - *"How to propagate pothos in water?"*
  - *"Organic pest treatment"*
  - *"Plant fertilizer guide"*
- Ready to plug into live Qwen API endpoints (Hugging Face / OpenRouter free tiers) by your backend team members.

---

## 📁 Project Structure

```
PlantCare/
├── index.html          # Semantic HTML5 home page
├── css/
│   └── styles.css      # Glassmorphism, animations, light leaf green styling
├── js/
│   ├── plantData.js    # Plant species database, diagnostic presets, Qwen knowledge base
│   └── app.js          # Interactive search, scanner simulation, chat, and garden logic
└── README.md           # Documentation for the 3-member team
```

---

## 💻 How to Run
Simply double-click `index.html` in your file explorer to open it in Chrome, Edge, Safari, or Firefox, or use VS Code Live Server / `python -m http.server 8000`.

