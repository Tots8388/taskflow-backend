# Taskflow Frontend

A clean, modern task management frontend built with vanilla HTML, CSS and JavaScript — no frameworks, no dependencies.

🌐 **Live App:** https://taskflowmanaager.netlify.app
🔧 **Backend Repo:** https://github.com/Tots8388/taskflow-backend

---

## Tech Stack

- **HTML5**
- **CSS3** — custom properties, grid, flexbox, animations
- **Vanilla JavaScript** — fetch API, localStorage, DOM manipulation
- **Chart.js** — dashboard charts
- **Netlify** — deployment

---

## Features

- 🔐 Sign up and sign in with JWT authentication
- ✅ Add, edit, delete and complete tasks
- 📂 Create and manage categories with custom colors
- 🎯 Filter by status, priority, category and overdue
- 📊 Dashboard with completion stats and charts
- 👤 Profile page with bio and avatar upload
- 🔑 Change password
- 📄 Paginated task list
- 💾 Persists data in a real backend database
- 📱 Responsive design

---

## Screenshots

> Tasks view with sidebar filters and priority indicators

> Dashboard with doughnut and bar charts

> Categories management with color coding

---

## Local Setup

1. Clone the repo
```bash
git clone https://github.com/Tots8388/taskflow-frontend.git
cd taskflow-frontend
```

2. Open `app.js` and set your backend URL:
```js
const API = 'http://127.0.0.1:8000/api';
```

3. Open `index.html` in your browser — that's it!

Make sure the backend is running locally first. See the [backend repo](https://github.com/Tots8388/taskflow-backend) for setup instructions.

---

## Project Structure

```
taskflow-frontend/
├── index.html      # App structure and markup
├── style.css       # All styles
├── app.js          # All JavaScript logic
└── netlify.toml    # Netlify config
```

---

## Deployment

Deployed on **Netlify** via GitHub integration. Every push to `main` triggers an automatic redeploy.

---

## Author

**Tots8388** — [github.com/Tots8388](https://github.com/Tots8388)