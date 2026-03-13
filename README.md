# SafeRx-AI
SafeRx-AI est un système d’aide à la décision clinique (CDSS) qui analyse les prescriptions médicales en temps réel pour détecter surdosages, interactions et contre-indications. Il combine règles médicales, IA et RAG pour générer des alertes pertinentes, réduire l’alert-fatigue et améliorer la sécurité des prescriptions.

```bash
├── 📁 backend
│   ├── 📁 app
│   │   ├── 📁 api
│   │   │   ├── 📁 endpoints
│   │   │   │   ├── 🐍 account.py
│   │   │   │   ├── 🐍 auth.py
│   │   │   │   ├── 🐍 drugs.py
│   │   │   │   ├── 🐍 patients.py
│   │   │   │   └── 🐍 prescriptions.py
│   │   │   ├── 🐍 deps.py
│   │   │   └── 🐍 router.py
│   │   ├── 📁 core
│   │   │   ├── 🐍 config.py
│   │   │   └── 🐍 security.py
│   │   ├── 📁 db
│   │   │   ├── 🐍 base.py
│   │   │   ├── 🐍 init_db.py
│   │   │   └── 🐍 session.py
│   │   ├── 📁 models
│   │   │   ├── 🐍 cds_alert.py
│   │   │   ├── 🐍 drug.py
│   │   │   ├── 🐍 drug_interaction.py
│   │   │   ├── 🐍 patient.py
│   │   │   ├── 🐍 prescription.py
│   │   │   └── 🐍 user.py
│   │   ├── 📁 schemas
│   │   │   ├── 🐍 clinical_schemas.py
│   │   │   └── 🐍 user.py
│   │   └── 📁 services
│   │       ├── 🐍 cds_engine.py
│   │       ├── 🐍 email_service.py
│   │       ├── 🐍 prescription_service.py
│   │       └── 🐍 user_service.py
│   └── 🐍 main.py
├── 📁 data
│   ├── 📁 processed
│   │   ├── 📁 dci_components
│   │   │   └── 📄 dci_components.csv
│   │   ├── 📁 drugs_ma_clean
│   │   │   └── 📄 drugs_ma_clean.csv
│   │   └── 📄 interactions_ansm.csv
│   └── 📁 raw
│       ├── 📄 all_drugs_med_ma.csv
│       └── 📕 thesaurus_ansm_2023.pdf
├── 📁 etl
│   ├── 🐳 Dockerfile
│   ├── 🐍 load_interactions.py
│   ├── 🐍 load_med_ma.py
│   ├── 🐍 parse_thesaurus_ansm.py
│   ├── 📄 requirements.txt
│   └── 🐍 transform_med_ma.py
├── 📁 frontend
│   ├── 📁 public
│   │   └── 🖼️ vite.svg
│   ├── 📁 src
│   │   ├── 📁 api
│   │   │   └── 📄 api.js
│   │   ├── 📁 assets
│   │   │   └── 🖼️ react.svg
│   │   ├── 📁 pages
│   │   │   ├── 📄 AdminDashboard.jsx
│   │   │   ├── 📄 ChangePassword.jsx
│   │   │   ├── 📄 DoctorDashboard.jsx
│   │   │   └── 📄 Login.jsx
│   │   ├── 📁 services
│   │   │   └── 📄 AuthService.js
│   │   ├── 🎨 App.css
│   │   ├── 📄 App.jsx
│   │   ├── 🎨 index.css
│   │   └── 📄 main.jsx
│   ├── ⚙️ .gitignore
│   ├── 🐳 Dockerfile
│   ├── 📝 README.md
│   ├── 📄 eslint.config.js
│   ├── 🌐 index.html
│   ├── ⚙️ package-lock.json
│   ├── ⚙️ package.json
│   ├── 📄 postcss.config.js
│   ├── 📄 src - Raccourci.lnk
│   ├── 📄 tailwind.config.js
│   └── 📄 vite.config.js
├── 📁 scraping
│   ├── 🐳 Dockerfile
│   ├── 📄 requirements.txt
│   └── 🐍 scraper_med_ma.py
├── ⚙️ .env.example
├── ⚙️ .gitignore
├── 🐳 Dockerfile
├── 📝 README.md
├── ⚙️ docker-compose.yml
└── 📄 requirements.txt
```