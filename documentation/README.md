# GreenComplAI Documentation

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Getting Started](#getting-started)
5. [Development Guide](#development-guide)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Contributing](#contributing)
9. [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

GreenComplAI is a comprehensive digital solution designed to address sustainable
supply chain development challenges. The platform provides:

- **Sustainability Data Management**: Records and manages sustainability data
  across the entire value chain
- **AI-Powered Validation**: Automatically checks data consistency using
  AI-supported plausibility mechanisms
- **Tamper-Proof Documentation**: Ensures data integrity and auditability
- **Real-Time Analytics**: Central dashboard with key performance indicators
- **Supply Chain Transparency**: Flexible data-based approach for diverse supply
  chain aspects

### Key Features

- Web-based platform for sustainability data management
- AI-supported data validation and consistency checking
- Real-time dashboard with KPIs and analytics
- Resource flow tracking and circularity data
- Product-specific recycling rate monitoring
- Blockchain-based tamper-proof documentation

## 🏗️ Architecture

GreenComplAI follows a microservices architecture with the following components:

### Core Services

1. **Frontend (Angular)**
   - Location: `apps/frontend/`
   - Purpose: User interface for order placement and data visualization
   - Technologies: Angular 19, Angular Material, TailwindCSS, ECharts

2. **Backend for Frontend (BFF)**
   - Location: `apps/bff/`
   - Purpose: API gateway and request routing
   - Technologies: NestJS, AMQP messaging
   - Responsibilities:
     - HTTP request handling
     - Service routing via AMQP
     - Data preparation for frontend

3. **Entity Management Service**
   - Location: `apps/entity-management-svc/`
   - Purpose: Manages companies, products, and other entities
   - Technologies: NestJS, Prisma ORM

### Shared Libraries

- **Database**: `libs/database/` - Database utilities and configurations
- **Configuration**: `libs/configuration/` - Application configuration
  management
- **API Interfaces**: `libs/api-interfaces/` - Shared API type definitions
- **AMQP**: `libs/amqp/` - Message queue utilities
- **Utilities**: `libs/util/` - Common utility functions

### Infrastructure

- **Database**: PostgreSQL 16.1
- **Message Broker**: RabbitMQ 3 with management interface
- **Authentication**: Keycloak
- **Containerization**: Docker & Docker Compose

## 🛠️ Technology Stack

### Frontend

- **Framework**: Angular 19
- **UI Components**: Angular Material 19
- **Styling**: TailwindCSS 3.4
- **Charts**: ECharts 5.6 with ngx-echarts
- **State Management**: RxJS 7.8
- **HTTP Client**: Angular HttpClient with TanStack Query

### Backend

- **Framework**: NestJS 10.4
- **Database ORM**: Prisma 6.6
- **Message Broker**: RabbitMQ with AMQP
- **Authentication**: Keycloak Connect
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator & class-transformer

### Development Tools

- **Monorepo**: Nx 20.3
- **Package Manager**: npm
- **Linting**: ESLint 9.17
- **Code Formatting**: Prettier 3.4
- **Testing**: Jest 29.7, Playwright 1.49
- **TypeScript**: 5.6.3

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 16.1
- **CI/CD**: GitLab CI
- **Version Control**: Git

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Docker & Docker Compose
- Git

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ap2
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start infrastructure services**

   ```bash
   docker compose up -d
   ```

4. **Set up database**

   ```bash
   # For standard setup
   npm run set-up-database

   # For AI-enhanced setup
   npm run set-up-database-ai
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

### Available Scripts

| Script                     | Description                            |
| -------------------------- | -------------------------------------- |
| `npm run dev`              | Start all services in development mode |
| `npm run dev-with-outlier` | Start services with outlier detection  |
| `npm run test`             | Run all tests                          |
| `npm run pretty`           | Format code with Prettier              |
| `npm run fix-lint`         | Fix ESLint issues                      |
| `npm run clean`            | Clean build artifacts and cache        |
| `npm run clean-install`    | Clean install with database setup      |

## 👨‍💻 Development Guide

### Project Structure

```
ap2/
├── apps/                    # Applications
│   ├── frontend/           # Angular frontend
│   ├── bff/               # Backend for frontend
│   ├── entity-management-svc/ # Entity management service
│   └── *-e2e/             # End-to-end tests
├── libs/                   # Shared libraries
│   ├── database/          # Database utilities
│   ├── configuration/     # Configuration management
│   ├── api-interfaces/    # API type definitions
│   ├── amqp/             # Message queue utilities
│   └── util/             # Common utilities
├── prisma/                # Database schema and migrations
├── documentation/         # Project documentation
├── docker/               # Docker configurations
└── scripts/              # Build and utility scripts
```

## 📖 API Documentation

### Backend for Frontend (BFF) API

The BFF service exposes REST endpoints for the frontend:

- **Base URL**: `http://localhost:3000`

### Entity Management Service API

- **Base URL**: `http://localhost:3001`
- **Purpose**: CRUD operations for entities

### Message Queue (AMQP)

- **Broker**: RabbitMQ
- **Port**: 5672 (AMQP), 15672 (Management UI)
- **Queues**: Defined in `libs/amqp/`

## 🗄️ Database Schema

The database schema is defined in `prisma/schema.prisma` and includes:

### Core Entities

- **Companies**: Organization information
- **Products**: Product definitions and metadata
- **Orders**: Order management
- **Sustainability Data**: Environmental metrics
- **Users**: User management and authentication

### Key Features

- **Relationships**: Proper foreign key relationships
- **Indexing**: Optimized database indexes
- **Migrations**: Version-controlled schema changes
- **Seeding**: Sample data for development

### Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma db push --force-reset

# Seed database
npx prisma db seed
```

## 🧪 Testing

### Test Types

1. **Unit Tests**: Jest-based tests for individual components
2. **Integration Tests**: Service integration testing
3. **E2E Tests**: Playwright-based end-to-end testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suite
npx nx test frontend
npx nx test bff

# Run E2E tests
npx nx e2e frontend-e2e
```

## 🤝 Contributing

### Getting Involved

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Write tests**
5. **Submit a pull request**

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Include tests for new features
- Update documentation as needed
- Ensure all tests pass

### Code Review Process

1. Automated checks (linting, tests)
2. Manual code review
3. Approval and merge

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Reset database
npm run set-up-database
```

#### Service Startup Issues

```bash
# Check service logs
docker compose logs <service-name>

# Restart services
docker compose restart
```

#### Build Issues

```bash
# Clean and reinstall
npm run clean-install

# Clear Nx cache
npx nx clear-cache
```

## 📞 Need help

- **Issues**: Create an issue on the repository
- **Documentation**: Check this documentation first

## 📄 License

This project is licensed under the Apache License 2.0. See the
[LICENSE](../LICENSE) file for details.

---

_Last updated: December 2024_
