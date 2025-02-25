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

## Environment Configuration

env
PORT=5001
OPENAI_API_KEY=sk-
FRONTEND_URL=https://swtlabs.pl
NODE_ENV=production

## Key Architecture
1. **Layered Structure**
   - Routes → Controllers → Services
   - Custom middleware pipeline
2. **Security**
   - Production CORS whitelisting
   - Input validation
   - Error handling hierarchy
3. **AI Integration**
   - GPT-4 model with strict token limits
   - Temperature-controlled responses
   - API error mapping

## Deployment
- **Render.com** configuration:
  - Free tier web service
  - Auto-rebuild on Git push
  - Port 10000 exposure
  - Zero-downtime deployments

## Observability
- Request/response logging
- Error stack traces
- API call monitoring
- OpenAI connection testing