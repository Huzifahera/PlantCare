# 🌿 PlantCare — AI-Powered Plant Health & Care Management System

PlantCare is a full-stack capstone project that connects a Vanilla JavaScript frontend to a Django REST Framework backend. It enables users to register, manage their plant garden, set care reminders, and track plant health — all secured with JWT authentication.

---

## 📁 Project Structure

```
PlantCare/
├── index.html              # Single-page frontend (all sections)
├── css/
│   └── styles.css          # All UI styles including Stage 5 additions
├── js/
│   ├── plantData.js        # Static plant encyclopedia & mock data
│   ├── app.js              # Main app logic + Stage 5 integration bootstrap
│   ├── api.js              # API base URL, JWT token helpers, fetch wrapper
│   ├── auth.js             # Login, Register, Logout modal & events
│   ├── profile.js          # User profile view/edit/image upload
│   ├── plants.js           # Plant CRUD, care log, garden grid rendering
│   └── reminders.js        # Reminder CRUD, complete, delete, filter
└── backend/
    ├── manage.py
    ├── config/             # Django settings, URLs, permissions
    ├── accounts/           # User registration, JWT login, profile
    ├── plants/             # Plant & CareLog models, APIs
    ├── diagnosis/          # Plant disease diagnosis records
    ├── plant_health/       # Health score records
    ├── weather/            # Weather records
    ├── reminders/          # Care reminders with complete action
    ├── chatbot/            # Chat history records
    ├── API_DOCUMENTATION.md
    └── venv/               # Python virtual environment
```

---

## 🚀 How to Run

### Step 1 — Start the Django Backend

Open **PowerShell** (or Command Prompt) and run:

```powershell
cd "E:\Fall-26\Capstone Project\PlantCare\backend"
venv\Scripts\activate
python manage.py runserver 8000
```

The API will be available at: `http://127.0.0.1:8000`

> **Note:** Keep this terminal open while using the app.

---

### Step 2 — Serve the Frontend

Open a **second** PowerShell window and run:

```powershell
cd "E:\Fall-26\Capstone Project\PlantCare"
python -m http.server 8080
```

Then open your browser at: **`http://localhost:8080`**

> ⚠️ Always open the frontend via `http://localhost:8080` — **not** as a `file://` URL. JWT authentication requires a proper HTTP origin.

---

## 🔐 Authentication

PlantCare uses **JWT (JSON Web Tokens)** via `djangorestframework-simplejwt`.

| Token | Storage | Key |
|-------|---------|-----|
| Access Token | `localStorage` | `plantcare_access_token` |
| Refresh Token | `localStorage` | `plantcare_refresh_token` |
| Username | `localStorage` | `plantcare_username` |

- Access tokens are automatically refreshed on 401 responses.
- On session expiry, users are shown the login modal.
- Logout clears all tokens from `localStorage`.

---

## 🌐 API Endpoints

| Feature | Method | Endpoint |
|---------|--------|----------|
| Register | POST | `/api/accounts/register/` |
| Login | POST | `/api/accounts/login/` |
| Token Refresh | POST | `/api/accounts/token/refresh/` |
| Profile | GET / PATCH | `/api/accounts/profile/` |
| Plants | GET / POST | `/api/plants/` |
| Plant Detail | GET / PATCH / DELETE | `/api/plants/{id}/` |
| Care Logs | GET / POST | `/api/plants/care-logs/` |
| Diagnosis | GET / POST | `/api/diagnosis/` |
| Plant Health | GET / POST | `/api/plant-health/` |
| Weather | GET / POST | `/api/weather/` |
| Reminders | GET / POST | `/api/reminders/` |
| Complete Reminder | POST | `/api/reminders/{id}/complete/` |
| Chat History | GET / POST | `/api/chatbot/` |

Full documentation: [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md)

---

## ✅ Integrated Features (Stage 5)

| Feature | Status |
|---------|--------|
| User Registration | ✅ Connected |
| User Login (JWT) | ✅ Connected |
| Auto Token Refresh | ✅ Connected |
| Logout | ✅ Connected |
| User Profile View & Edit | ✅ Connected |
| Profile Image Upload | ✅ Connected |
| Plant Garden (My Plants) | ✅ Connected |
| Add Plant with Image | ✅ Connected |
| Edit Plant | ✅ Connected |
| Delete Plant | ✅ Connected |
| Log Watering (Care Log) | ✅ Connected |
| Reminders Panel | ✅ Connected |
| Create Reminder | ✅ Connected |
| Mark Reminder Complete | ✅ Connected |
| Delete Reminder | ✅ Connected |
| Filter Reminders by Plant | ✅ Connected |
| Filter Reminders by Status | ✅ Connected |
| Navbar Auth State (Login/Logout UI) | ✅ Connected |
| Data Isolation per User | ✅ Enforced |

---

## 🛡️ Security

- JWT `IsAuthenticated` required on all protected endpoints
- `request.user` is automatically assigned (never trusted from client)
- Plant ownership verified before creating related records (reminders, care logs, diagnosis)
- Queryset-level filtering ensures users only see their own data
- CORS configured: `CORS_ALLOW_ALL_ORIGINS = True` (suitable for local development)
- Password hashing via Django's `create_user()` — never stored in plain text
- Password field is write-only in all API responses

---

## 🗄️ Database

- **Engine:** SQLite (`backend/db.sqlite3`)
- Run migrations if needed:
  ```powershell
  python manage.py migrate
  ```
- Create a superuser for Django Admin:
  ```powershell
  python manage.py createsuperuser
  ```
- Django Admin: `http://127.0.0.1:8000/admin/`

---

## 🧪 Running Backend Tests

```powershell
cd "E:\Fall-26\Capstone Project\PlantCare"
backend\venv\Scripts\python.exe backend\manage.py test accounts plants diagnosis plant_health weather reminders chatbot -v 2
```

**34 tests pass** (19 serializer tests + 15 API tests).

---

## ⚙️ Configuration

### API Base URL

Located in [`js/api.js`](js/api.js) line 3:

```javascript
const API_BASE_URL = 'http://127.0.0.1:8000';
```

Change this if your backend runs on a different host or port.

### Media Files

Uploaded images (plant photos, profile pictures) are stored in `backend/media/` and served at `http://127.0.0.1:8000/media/`.

---

## 📦 Backend Dependencies

```
Django==6.1.3
djangorestframework
djangorestframework-simplejwt
django-cors-headers
Pillow
```

Install with:
```powershell
pip install -r requirements.txt
```

---

## 👩‍💻 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | Python, Django 6.1.3 |
| API | Django REST Framework |
| Auth | JWT via djangorestframework-simplejwt |
| Database | SQLite |
| Images | Pillow |

---

*PlantCare Capstone Project — Stage 5 Frontend–Backend Integration Complete*
