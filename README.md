# Aria Monorepo

This repository is organized into three primary products:

- `aria-api/` - AI/API backend, Azure infrastructure, deployment assets, Python test suite, and backend docs
- `mobile-backend/` - Node/Express backend service for mobile clients
- `mobile-app/` - Expo React Native mobile client

## Directory Layout

```
Aria/
├── aria-api/
│   ├── src/
│   ├── tests/
│   ├── scripts/
│   ├── infrastructure/
│   ├── docs/
├── mobile-backend/
│   ├── server/
│   ├── shared/
│   └── migrations/
├── mobile-app/
│   ├── app/
│   ├── src/
│   ├── ios/
│   └── mocks/
└── .github/
```

## Quick Start

### AI API

```bash
cd aria-api
pip install -r requirements.txt
python run.py
```

### Mobile App

```bash
cd mobile-app
npm install
npm start
```

## Docker Build

### AI API image

```bash
docker build -f aria-api/Dockerfile aria-api
```

### Mobile backend image

```bash
docker build -f mobile-backend/Dockerfile mobile-backend
```

## CI/CD Image Names

- API image: `aria-api`
- Mobile backend image: `aria-mobile-app`

## Additional Documentation

- API docs: [aria-api/README.md](aria-api/README.md)
- Mobile docs: [mobile-app/README.md](mobile-app/README.md)
- API infrastructure guide: [aria-api/infrastructure/DEPLOYMENT_GUIDE.md](aria-api/infrastructure/DEPLOYMENT_GUIDE.md)
