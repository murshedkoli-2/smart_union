# Smart Union - Union Management System

A comprehensive digital management system for Union (municipality) administration in Bangladesh. Smart Union streamlines citizen registration, certificate issuance, relief program management, tax administration, and financial tracking through an intuitive web-based platform.

## Overview

Smart Union is a full-stack Next.js application designed to digitize and automate the administrative processes of union administration. It provides role-based access control, multi-language support (Bengali/English), and comprehensive audit logging for governance and accountability.

## Key Features

### Citizen Management
- Comprehensive citizen registration and profile management
- Support for Bengali and English names and addresses
- Personal information including family details, education level, and blood type
- Housing and financial information tracking
- National ID and birth certificate integration
- Multi-level address hierarchy (Village, Post Office, Thana, District)

### Certificate System
- Digital certificate generation and management
- QR code integration for certificate verification
- PDF rendering and export capabilities
- Certificate templates for customization
- Public verification interface
- Certificate issuance workflow

### Relief & Social Programs
- Relief program management and beneficiary tracking
- Relief list creation and administration
- Beneficiary enrollment and status monitoring

### Tax Administration
- Tax record management and tracking
- Payment integration with cashbook

### Cashbook & Financial Management
- Financial transaction logging
- Income and expense tracking
- Payment records management

### Warish Applications
- Inheritance/succession application management
- Application workflow and status tracking

### User & Access Management
- Multi-level role-based access control (Admin, Officer, User)
- User authentication with JWT
- User profile and permission management
- Password security with bcrypt hashing

### Audit & Compliance
- Comprehensive audit logging
- System activity tracking
- User action history
- Accountability and governance features

### System Settings
- Configurable system parameters
- Administrative settings management

## Technology Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) 16.2.1
- **UI Framework**: React 19.2.4
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API
- **Form Validation**: Zod 4.3.6
- **PDF Generation**: react-pdf, jspdf, html2canvas
- **QR Code**: qrcode 1.5.4
- **Toast Notifications**: react-hot-toast

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Database**: MongoDB with Mongoose 9.3.2
- **Authentication**: JWT (jsonwebtoken)
- **Password Security**: bcryptjs
- **Template Engine**: Handlerbars

### Development Tools
- **Language**: TypeScript 5
- **Linting**: ESLint 9
- **Build**: Next.js built-in build system
- **Database Utilities**: tsx for running scripts

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB instance running locally or remote
- Environment variables configured

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart_union
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables by creating a `.env.local` file:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/smart_union

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Run database setup (optional):
```bash
npm run seed        # Seed initial data
npm run fix-indexes # Create database indexes
```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build & Production

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── (auth)/         # Authentication pages (login, register)
│   ├── (dashboard)/    # Main dashboard and features
│   │   ├── admin/      # Admin panel
│   │   ├── citizens/   # Citizen management
│   │   ├── certificates/
│   │   ├── relief/     # Relief programs
│   │   ├── tax/        # Tax management
│   │   ├── payments/   # Payment tracking
│   │   ├── cashbook/   # Financial records
│   │   └── warish/     # Inheritance applications
│   ├── api/            # API routes
│   └── verify/         # Public certificate verification
├── components/         # Reusable React components
│   ├── forms/         # Form components
│   ├── layout/        # Layout components
│   ├── ui/            # UI components
│   └── certificates/  # Certificate-specific components
├── models/            # MongoDB schemas
├── services/          # Business logic services
├── middleware/        # Authentication and authorization
├── lib/              # Utilities and helpers
│   ├── auth/         # JWT and password utilities
│   ├── db/           # Database connection
│   └── i18n/         # Internationalization
├── types/            # TypeScript type definitions
├── hooks/            # Custom React hooks
└── constants/        # Application constants
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint validation |
| `npm run seed` | Populate database with initial data |
| `npm run fix-indexes` | Create required MongoDB indexes |

## API Documentation

The API follows RESTful conventions and returns consistent response formats:

```typescript
interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

### Key API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/citizens` - Create citizen record
- `GET /api/citizens` - List citizens (paginated)
- `GET /api/certificates` - Certificate management
- `POST /api/certificates` - Issue certificate
- `GET /api/relief` - Relief programs
- `GET /api/tax` - Tax records
- `POST /api/payments` - Record payment
- `GET /api/audit-logs` - Audit trail

## Authentication

The application uses JWT-based authentication:

1. Users log in with credentials
2. Server validates and returns JWT token
3. Token stored in HTTP-only cookie
4. Subsequent requests include token for authorization
5. Middleware validates token for protected routes

## Database Schema

The application uses MongoDB with the following main collections:

- **Users** - User accounts and authentication
- **Citizens** - Citizen registration data
- **Certificates** - Issued certificates
- **CertificateTemplates** - Certificate templates
- **Relief Programs & Beneficiaries** - Relief management
- **Tax Records** - Tax information
- **Payments** - Payment tracking
- **Cashbook** - Financial transactions
- **WarishApplications** - Inheritance applications
- **AuditLogs** - System activity history
- **SystemSettings** - Configuration parameters

## Multi-Language Support

The application supports both Bengali and English:
- All citizen records store translated names and addresses
- UI can be toggled between languages
- Reports generated in selected language

## Security Features

- JWT-based session management
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Request validation with middleware
- Audit logging for all operations
- Input validation with Zod schemas
- CORS protection

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes and commit: `git commit -m "Add feature description"`
3. Push to branch: `git push origin feature/your-feature-name`
4. Submit a pull request

## License

This project is proprietary and confidential.

## Support

For issues, questions, or contributions, please contact the development team or create an issue in the project repository.
