# 💰 Finku - Personal Finance Management

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma)

A modern personal finance management application built with Next.js 16, featuring transaction tracking, budget management, and beautiful visualizations.

---

## ✨ Features

### 📊 Dashboard
- Real-time financial overview (balance, income, expenses, savings)
- Interactive charts for 6-month financial trends
- Budget progress tracking with visual indicators

### 💳 Transaction Management
- Add, edit, and delete transactions
- Bulk delete functionality
- Category-based organization with custom icons and colors
- Excel/CSV import with data preview

### 💰 Budget Planning
- Monthly budget allocation per category
- Visual progress bars with percentage tracking
- Automatic overspending alerts

### 📈 Analytics
- Monthly trend charts
- Category-wise expense breakdown
- Savings progress visualization

### 🎨 User Experience
- Light/Dark theme support
- Fully responsive design
- Smooth animations with Framer Motion
- Real-time data updates

### 👤 Admin Features
- User management dashboard
- Role-based access control

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | PostgreSQL (Supabase) / SQLite |
| ORM | Prisma |
| State | Zustand + TanStack Query |
| Auth | Custom JWT (jose) |
| Animation | Framer Motion |
| Charts | Recharts |

---

## 📦 Installation

### Prerequisites
- Node.js 20+ or Bun
- PostgreSQL database (Supabase recommended) or SQLite for development

### Quick Start

```bash
# Clone the repository
git clone https://github.com/rizqiwidi/finku.git
cd finku

# Install dependencies
bun install
# or
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma client and push schema
bun run db:generate
bun run db:push

# (Optional) Seed database with sample data
bun run db:seed

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/database"

# For SQLite (development)
# DATABASE_URL="file:./db/custom.db"

# JWT Secret
JWT_SECRET="your-secret-key-here"
```

---

## 🚀 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rizqiwidi/finku)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy!

### Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase-schema.sql` in SQL Editor
3. Copy connection strings to environment variables
4. Redeploy on Vercel

---

## 📁 Project Structure

```
finku/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   └── page.tsx        # Main page
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── auth/           # Authentication
│   │   ├── finance/        # Finance components
│   │   └── ...
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities
│   └── types/              # TypeScript types
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts            # Seed data
└── public/                 # Static assets
```

---

## 📸 Screenshots

| Dashboard (Light) | Dashboard (Dark) |
|-------------------|------------------|
| ![Dashboard Light](https://via.placeholder.com/400x250?text=Dashboard+Light) | ![Dashboard Dark](https://via.placeholder.com/400x250?text=Dashboard+Dark) |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**rizqiwidi**
- GitHub: [@rizqiwidi](https://github.com/rizqiwidi)

---

<div align="center">

**[⬆ Back to Top](#-finku---personal-finance-management)**

Made with ❤️ using Next.js

</div>
