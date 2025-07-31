# CAD Floor Plan Analyzer

## Overview

A sophisticated web application for processing CAD files (DXF, DWG, PDF) and generating intelligent îlot (workspace pod) layouts for floor plans. The system analyzes architectural drawings, extracts geometric elements like walls and restricted areas, and uses advanced algorithms to optimize space utilization by placing îlots and connecting them with corridor networks. Built with a modern full-stack architecture using React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CAD-specific color variables
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Canvas Rendering**: Custom HTML5 Canvas implementation for CAD visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ES modules
- **File Processing**: Multer for file uploads with support for DXF, DWG, PDF, and image formats
- **Storage**: In-memory storage implementation with interface for future database integration
- **CAD Processing**: Custom DXF parser with geometric analysis algorithms

### Database Schema
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Tables**: 
  - `users` - User authentication and profiles
  - `floor_plans` - CAD file storage and processing status
  - `ilot_layouts` - Generated layouts with îlot and corridor data
  - `project_exports` - Export history and data
- **Data Types**: JSONB for complex geometric data and analytics

### Core Processing Pipeline
- **Phase 1**: CAD file parsing and geometric element extraction
- **Phase 2**: Wall detection, restricted area identification, and space analysis
- **Phase 3**: Intelligent îlot placement using configurable algorithms (intelligent, grid, genetic, simulated annealing)
- **Phase 4**: Corridor network generation with pathfinding optimization

### Geometric Processing
- **Algorithms**: Custom geometric utilities for collision detection, distance calculations, and line intersections
- **Placement Engine**: Multi-algorithm support for different optimization strategies
- **Visualization**: Real-time canvas rendering with layer-based display system

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless database driver
- **drizzle-orm**: Type-safe SQL ORM with PostgreSQL support
- **@tanstack/react-query**: Server state management and caching
- **express**: Web application framework for Node.js
- **multer**: Middleware for handling multipart/form-data file uploads

### UI and Styling
- **@radix-ui/***: Comprehensive collection of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library with consistent design

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling

### File Processing
- **connect-pg-simple**: PostgreSQL session store
- **ws**: WebSocket library for database connections
- **date-fns**: Date manipulation utilities

### Planned Integrations
- **DXF Parser**: External library for parsing DXF CAD files
- **PDF Processing**: PDF parsing capabilities for architectural drawings
- **Export Formats**: Support for PDF, DXF, PNG, and SVG export formats