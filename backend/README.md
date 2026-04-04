# Taskflow Backend

A production-ready REST API built with Django and Django REST Framework, powering the Taskflow task management application.

🌐 **Live API:** https://taskflow-backend-production-5345.up.railway.app/api/
🖥️ **Frontend:** https://taskflowmanaager.netlify.app

---

## Tech Stack

- **Python 3.11**
- **Django 4.2** — web framework
- **Django REST Framework** — API layer
- **Simple JWT** — authentication
- **MySQL** — database (Railway)
- **Gunicorn** — production server
- **Whitenoise** — static file serving
- **Railway** — deployment

---

## Features

- 🔐 JWT authentication (register, login, token refresh)
- 👤 User profiles with avatar upload
- 🔑 Password change endpoint
- ✅ Full CRUD for tasks
- 📂 Full CRUD for categories
- 🔍 Search, filter, and sort tasks
- 📄 Paginated task list
- 🛡️ Row-level security (users only see their own data)

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register/` | Create a new account |
| POST | `/api/token/` | Login and get JWT token |
| POST | `/api/token/refresh/` | Refresh JWT token |
| POST | `/api/change-password/` | Change password |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/` | Get own profile |
| PATCH | `/api/profile/` | Update bio or avatar |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/` | List tasks (paginated) |
| POST | `/api/tasks/` | Create a task |
| GET | `/api/tasks/{id}/` | Get a task |
| PATCH | `/api/tasks/{id}/` | Update a task |
| DELETE | `/api/tasks/{id}/` | Delete a task |

**Query params:** `?search=`, `?priority=`, `?done=`, `?category=`, `?ordering=`, `?page=`

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/` | List categories |
| POST | `/api/categories/` | Create a category |
| GET | `/api/categories/{id}/` | Get a category |
| PATCH | `/api/categories/{id}/` | Update a category |
| DELETE | `/api/categories/{id}/` | Delete a category |

---

## Local Setup

### Prerequisites
- Python 3.11+
- MySQL

### Installation

```bash
# Clone the repo
git clone https://github.com/Tots8388/taskflow-backend.git
cd taskflow-backend

# Install dependencies
pip install -r requirements.txt

# Create MySQL database
mysql -u root -p
CREATE DATABASE taskflow CHARACTER SET utf8mb4;
exit
```

### Environment Variables

Create a `.env` file or set these in your environment:

```
SECRET_KEY=your-secret-key
DEBUG=True
MYSQLHOST=localhost
MYSQLPORT=3306
MYSQLUSER=root
MYSQLPASSWORD=your-password
MYSQLDATABASE=taskflow
```

### Run

```bash
python manage.py migrate
python manage.py runserver
```

API will be available at `http://127.0.0.1:8000/api/`

---

## Deployment

Deployed on **Railway** with a MySQL plugin.

Environment variables set on Railway:
- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

---

## Project Structure

```
taskflow-backend/
├── backend/              # Django config
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── api/                  # Main app
│   ├── models.py         # Task, Category, UserProfile
│   ├── serializers.py    # DRF serializers
│   ├── views.py          # ViewSets and API views
│   └── urls.py           # API routes
├── manage.py
├── requirements.txt
├── Dockerfile
└── start.sh
```

---

## Author

**Tots8388** — [github.com/Tots8388](https://github.com/Tots8388)