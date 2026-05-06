# Pitchonix

AI-Powered Presentation Generator - Generate professional business presentations with AI

## Features

- 🚀 Lightning fast pitch deck generation
- ✨ Smart content creation
- 📊 Data-driven insights
- 📄 Export to PPTX and PDF
- 🎨 Multiple design themes
- 15+ document types (pitch decks, business plans, proposals, reports, etc.)

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript, Prisma
- **Database**: PostgreSQL
- **Export**: PPTX, PDF, DOCX

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional)

### Installation

1. Clone the repository:
```bash
git clone git@github.com:shadikamal997/Pitchonix.git
cd Pitchonix
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
```bash
# Backend (.env)
DATABASE_URL="postgresql://user:password@localhost:5432/pitchonix"
JWT_SECRET="your-secret-key"

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

5. Run database migrations:
```bash
cd backend
npx prisma migrate dev
```

### Running the Application

#### Backend (Port 3001):
```bash
cd backend
npm run start:dev
```

#### Frontend (Port 3002):
```bash
cd frontend
npm run dev
```

Access the application at http://localhost:3002

## Project Structure

```
Pitchonix/
├── backend/          # NestJS backend
│   ├── src/
│   │   ├── auth/     # Authentication module
│   │   ├── generation/ # Content generation
│   │   ├── export/   # Export functionality
│   │   └── templates/ # Template management
│   └── prisma/       # Database schema
│
└── frontend/         # Next.js frontend
    ├── app/          # App router pages
    ├── components/   # React components
    ├── lib/          # Utilities
    └── hooks/        # Custom hooks
```

## License

MIT

## Author

Shadi Kamal
