# SWT Labs Server Documentation

## Overview
Node.js/Express backend providing AI-powered cost estimation services. Built with TypeScript and deployed on Render.com.

### Key Features
- OpenAI GPT-4 integration for cost predictions
- Automated API health monitoring
- Structured logging with emoji indicators
- CORS configuration for production/development environments
- Environment variable management

## Technical Stack
| Component          | Technology               |
|--------------------|--------------------------|
| Runtime            | Node.js 18+              |
| Framework          | Express 4.x              |
| Language           | TypeScript 5.x           |
| AI Provider        | OpenAI API               |
| Deployment         | Render.com               |
| Monitoring         | Structured JSON logging  |

## Core Endpoints
| Endpoint           | Method | Description                          |
|--------------------|--------|--------------------------------------|
| `/api/health`      | GET    | System health check + OpenAI status  |
| `/api/estimate`    | POST   | AI-powered cost estimation           |
| `/`                | GET    | Basic service status                 |
