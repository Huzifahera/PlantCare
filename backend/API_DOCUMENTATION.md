# PlantCare REST API Documentation

**Base URL:** `/api/`  
**Authentication:** JWT Bearer Token (`djangorestframework-simplejwt`)  
Include the access token in protected requests:
```http
Authorization: Bearer <access_token>
```

---

## 1. Accounts API (`/api/accounts/`)

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/accounts/register/` | `POST` | No (`AllowAny`) | Register a new user and create `UserProfile` |
| `/api/accounts/login/` | `POST` | No (`AllowAny`) | Obtain JWT `access` and `refresh` tokens |
| `/api/accounts/token/refresh/` | `POST` | No (`AllowAny`) | Refresh an expired `access` token |
| `/api/accounts/profile/` | `GET` | Yes (`JWT`) | Retrieve authenticated user's profile |
| `/api/accounts/profile/` | `PUT`, `PATCH` | Yes (`JWT`) | Update profile fields & upload `profile_image` |

### Example: Register (`POST /api/accounts/register/`)
**Request (`application/json`):**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "StrongPassword!2026"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com"
}
```

### Example: Login (`POST /api/accounts/login/`)
**Request (`application/json`):**
```json
{
  "username": "alice",
  "password": "StrongPassword!2026"
}
```
**Response (`200 OK`):**
```json
{
  "refresh": "<refresh_token>",
  "access": "<access_token>"
}
```

### Example: Profile Update (`PATCH /api/accounts/profile/`)
**Request (`multipart/form-data` or `application/json`):**
- `full_name`: `"Alice Green"`
- `phone_number`: `"01711111111"`
- `location`: `"Dhaka"`
- `profile_image`: `<file>`

**Response (`200 OK`):**
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "full_name": "Alice Green",
  "phone_number": "01711111111",
  "location": "Dhaka",
  "profile_image": "/media/profiles/avatar.png",
  "created_at": "2026-11-27T15:00:00Z",
  "updated_at": "2026-11-27T15:05:00Z"
}
```

---

## 2. Plants & Care Logs API (`/api/plants/`)

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/plants/` | `GET` | Yes | List authenticated user's plants |
| `/api/plants/` | `POST` | Yes | Create a plant (supports `plant_image` upload) |
| `/api/plants/{id}/` | `GET` | Yes | Retrieve a plant owned by the user |
| `/api/plants/{id}/` | `PUT`, `PATCH` | Yes | Update a plant owned by the user |
| `/api/plants/{id}/` | `DELETE` | Yes | Delete a plant owned by the user |
| `/api/plants/care-logs/` | `GET` | Yes | List care logs (optional `?plant={id}`) |
| `/api/plants/care-logs/` | `POST` | Yes | Create a care log for an owned plant |
| `/api/plants/care-logs/{id}/` | `GET`, `PUT`, `PATCH`, `DELETE` | Yes | Retrieve, update, or delete an owned care log |

### Example: Create Plant (`POST /api/plants/`)
**Request (`multipart/form-data` or `application/json`):**
```json
{
  "plant_name": "Monstera Deliciosa",
  "scientific_name": "Monstera deliciosa",
  "plant_type": "Indoor",
  "location": "Living Room",
  "health_status": "healthy"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "plant_name": "Monstera Deliciosa",
  "scientific_name": "Monstera deliciosa",
  "plant_type": "Indoor",
  "plant_image": null,
  "location": "Living Room",
  "health_status": "healthy",
  "date_added": "2026-11-27T15:10:00Z",
  "updated_at": "2026-11-27T15:10:00Z"
}
```

### Example: Create Care Log (`POST /api/plants/care-logs/`)
**Request (`application/json`):**
```json
{
  "plant": 1,
  "care_type": "watering",
  "description": "Watered 250ml",
  "care_date": "2026-11-27T15:12:00Z"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "plant": 1,
  "plant_name": "Monstera Deliciosa",
  "care_type": "watering",
  "description": "Watered 250ml",
  "care_date": "2026-11-27T15:12:00Z",
  "created_at": "2026-11-27T15:12:05Z"
}
```

---

## 3. Diagnosis API (`/api/diagnosis/`)

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/diagnosis/analyze/` | `POST` | No (`AllowAny`, rate limited) | **Hugging Face Vision AI**: Upload photo to identify plant species, symptoms, health score, and care advice |
| `/api/diagnosis/` | `GET` | Yes | List diagnosis history (optional `?plant={id}`) |
| `/api/diagnosis/` | `POST` | Yes | Create diagnosis record (`original_image`, optional `segmented_image`) |
| `/api/diagnosis/{id}/` | `GET` | Yes | Retrieve a specific diagnosis record |

### Example: Live AI Vision Analysis (`POST /api/diagnosis/analyze/`)
**Request (`multipart/form-data`):**
- `image`: `<image file (JPEG, PNG, WEBP, max 10MB)>`

**Response (`200 OK`):**
```json
{
  "plant_name": "Jackfruit (Artocarpus heterophyllus)",
  "confidence": "High",
  "health_status": "Healthy / Vigorous",
  "health_score": 90,
  "diagnosis": "Visual evaluation shows healthy leathery foliage with no critical fungal pathogens.",
  "symptoms": "Minor dust accumulation on upper surface, no chlorosis or necrosis.",
  "possible_causes": "Normal tropical indoor / outdoor environment.",
  "qwen_advice": [
    "Ensure bright, direct sunlight for at least 6 hours daily.",
    "Allow top 2-3 inches of well-draining soil to dry between waterings."
  ],
  "uncertainty_note": "Visual analysis via photograph cannot detect root-bound status, microbial soil pathogens, or sub-surface insect larvae. Treat this as an observational screening."
}
```

### Example: Create Diagnosis (`POST /api/diagnosis/`)
**Request (`multipart/form-data`):**
- `plant`: `1`
- `original_image`: `<file>`
- `segmented_image`: `<file>` (optional)
- `disease_name`: `"Leaf Spot"`
- `confidence_score`: `92.5` (0–100)
- `severity`: `"moderate"`
- `affected_area_percentage`: `18.0` (0–100)
- `recommendation`: `"Remove affected leaves."`
- `model_version`: `"v1.0"`

**Response (`201 Created`):**
```json
{
  "id": 1,
  "plant": 1,
  "plant_name": "Monstera Deliciosa",
  "original_image": "/media/diagnosis/original/leaf.png",
  "segmented_image": null,
  "disease_name": "Leaf Spot",
  "confidence_score": 92.5,
  "severity": "moderate",
  "affected_area_percentage": 18.0,
  "recommendation": "Remove affected leaves.",
  "model_version": "v1.0",
  "diagnosis_date": "2026-11-27T15:15:00Z"
}
```

---

## 4. Plant Health API (`/api/plant-health/`)

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/plant-health/` | `GET` | Yes | List health records (optional `?plant={id}`) |
| `/api/plant-health/` | `POST` | Yes | Create a health record |
| `/api/plant-health/{id}/` | `GET`, `PUT`, `PATCH`, `DELETE` | Yes | Retrieve, update, or delete an owned health record |

### Example: Create Health Record (`POST /api/plant-health/`)
**Request (`application/json`):**
```json
{
  "plant": 1,
  "health_status": "healthy",
  "health_score": 88.5,
  "notes": "Vibrant green foliage"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "plant": 1,
  "plant_name": "Monstera Deliciosa",
  "health_status": "healthy",
  "health_score": 88.5,
  "notes": "Vibrant green foliage",
  "recorded_at": "2026-11-27T15:18:00Z"
}
```

---

## 5. Weather API (`/api/weather/`)

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/weather/` | `GET` | Yes | List weather records (optional `?plant={id}`) |
| `/api/weather/` | `POST` | Yes | Create weather record (`plant` optional/`null`) |
| `/api/weather/{id}/` | `GET` | Yes | Retrieve a weather record |

### Example: Create Weather Record (`POST /api/weather/`)
**Request (`application/json`):**
```json
{
  "plant": null,
  "temperature": 28.5,
  "humidity": 72.0,
  "rainfall": 0.0,
  "wind_speed": 10.5,
  "weather_condition": "Partly Cloudy",
  "location": "Dhaka"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "plant": null,
  "plant_name": null,
  "temperature": 28.5,
  "humidity": 72.0,
  "rainfall": 0.0,
  "wind_speed": 10.5,
  "weather_condition": "Partly Cloudy",
  "location": "Dhaka",
  "recorded_at": "2026-11-27T15:20:00Z"
}
```

---

## 6. Reminders API (`/api/reminders/`)

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/reminders/` | `GET` | Yes | List reminders (filters: `?plant={id}`, `?is_completed=true|false`) |
| `/api/reminders/` | `POST` | Yes | Create a reminder for an owned plant |
| `/api/reminders/{id}/` | `GET`, `PUT`, `PATCH`, `DELETE` | Yes | Retrieve, update, or delete an owned reminder |
| `/api/reminders/{id}/complete/` | `POST`, `PATCH` | Yes | Mark reminder as completed |

### Example: Create Reminder (`POST /api/reminders/`)
**Request (`application/json`):**
```json
{
  "plant": 1,
  "title": "Water Monstera",
  "reminder_type": "watering",
  "description": "Check top 2 inches of soil first",
  "reminder_date": "2026-11-28T09:00:00Z"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "plant": 1,
  "plant_name": "Monstera Deliciosa",
  "title": "Water Monstera",
  "reminder_type": "watering",
  "description": "Check top 2 inches of soil first",
  "reminder_date": "2026-11-28T09:00:00Z",
  "is_completed": false,
  "created_at": "2026-11-27T15:22:00Z",
  "updated_at": "2026-11-27T15:22:00Z"
}
```

---

## 7. Chatbot API (`/api/chatbot/`)

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/chatbot/ask/` | `POST` | No (`AllowAny`, rate limited) | **Hugging Face AI Botanist**: Ask gardening questions to Qwen2.5-72B-Instruct. Auto-persists to history if JWT provided |
| `/api/chatbot/` | `GET` | Yes | List authenticated user's chat history (optional `?plant={id}`) |
| `/api/chatbot/` | `POST` | Yes | Save a `user` or `bot` message (optional `plant`) |
| `/api/chatbot/{id}/` | `GET` | Yes | Retrieve a specific chat message owned by user |

### Example: Ask AI Botanist (`POST /api/chatbot/ask/`)
**Request (`application/json`):**
```json
{
  "message": "Why are my Monstera leaves turning yellow with brown tips?",
  "plant_id": 1,
  "history": [
    {"role": "user", "content": "How often should I water Monstera?"},
    {"role": "assistant", "content": "Water when the top 2-3 inches of soil feel dry."}
  ]
}
```
**Response (`200 OK`):**
```json
{
  "reply": "Yellowing leaves with brown tips in a Monstera usually indicate overwatering or poor drainage causing root stress...",
  "plant_id": 1,
  "model": "Qwen/Qwen2.5-72B-Instruct"
}
```

### Example: Save Message (`POST /api/chatbot/`)
**Request (`application/json`):**
```json
{
  "plant": 1,
  "message_type": "user",
  "message": "How often should I water my Monstera?"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "plant": 1,
  "plant_name": "Monstera Deliciosa",
  "message_type": "user",
  "message": "How often should I water my Monstera?",
  "created_at": "2026-11-27T15:25:00Z"
}
```

---

## Standard Error Responses

- **401 Unauthorized** (Missing or invalid JWT):
```json
{
  "detail": "Authentication credentials were not provided."
}
```
- **400 Bad Request** (Validation or cross-user plant assignment):
```json
{
  "plant": [
    "You do not have permission to add or modify care logs for this plant."
  ]
}
```
- **404 Not Found** (Resource does not exist or belongs to another user):
```json
{
  "detail": "No Plant matches the given query."
}
```
