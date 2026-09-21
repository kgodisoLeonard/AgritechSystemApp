# Day 4 AI Engineering Progress

## Date
21 September 2026

## Project
AgriTech System Application

## Day 4 objective
Extend the existing application with a Spring Boot integration point for Microsoft Foundry / Azure OpenAI, while documenting Speech, Computer Vision, Information Extraction, and Foundry IQ as planned AI capabilities.

## Existing project state
The project already contains:

- PostgreSQL schema and seed data
- A Node.js/Express API on port 3000
- Docker Compose configuration for PostgreSQL and the existing API

The Day 4 work adds a separate Spring Boot AI service on port 8080. The existing API is preserved so the team can migrate gradually or use the Spring service as the AI-focused backend.

## AI services selected

### 1. Generative AI and agents
Azure OpenAI models deployed through Microsoft Foundry are the primary AI service. The Spring Boot service exposes `POST /api/ai/chat` and forwards a prompt to the configured model deployment.

### 2. Speech
Azure Speech is planned for speech-to-text farmer notes and text-to-speech feedback. It is an optional extension and is not required for the Azure OpenAI chat endpoint.

### 3. Computer Vision
Azure AI Vision is planned for OCR and image analysis of crop photographs. It is an optional extension and is not required for the Azure OpenAI chat endpoint.

### 4. Information extraction
Azure Language capabilities are planned to extract key phrases and structured information from farmer notes, such as low soil moisture or crop symptoms.

### 5. Microsoft Foundry IQ
Foundry IQ is treated as the orchestration and knowledge workflow layer. It can combine retrieval, language analysis, vision, and generative responses after the core chat integration is working.

## Spring Boot implementation

The new service is in `spring-ai-service/` and uses:

- Java 8
- Spring Boot 2.7.18
- Spring Web
- Spring Web `RestTemplate` calling the OpenAI-compatible Foundry endpoint
- Maven
- Docker

Spring Boot 2.7 was selected because the current workstation reports Java 8. Spring Boot 3 requires Java 17 or newer.

## Configuration

The service reads these environment variables and never hard-codes credentials:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `PORT`

The API key must be supplied through a local environment file or deployment secret. It must not be committed to Git.

## Endpoints

### AI health check

```http
GET http://localhost:8080/api/ai/health
```

This reports whether the Azure OpenAI endpoint, key, and deployment name are configured. It does not call Azure.

### Chat completion

```http
POST http://localhost:8080/api/ai/chat
Content-Type: application/json
```

Request:

```json
{
  "prompt": "Give a farmer three practical tips for improving soil moisture."
}
```

When Azure is configured, the service sends the deployment name as the `model` value to the OpenAI-compatible endpoint and the response is:

```json
{
  "response": "...model-generated answer..."
}
```

Without credentials, the endpoint returns HTTP `503 Service Unavailable` with a configuration message. An empty prompt returns HTTP `400 Bad Request`.

## Docker image decision

Azure OpenAI and Microsoft Foundry are managed cloud services. The model itself is not pulled as a local Docker image. The image built for this task is the Spring Boot integration container, based on Maven and Eclipse Temurin Java 8 images.

The existing project also uses a PostgreSQL container and a Node.js API container. Speech and Vision Azure containers are optional and require Azure billing credentials and supported container access. They should only be pulled when the team decides to run those services locally; they are not needed for the primary Foundry chat integration.

## Docker Compose services

- `db`: PostgreSQL database
- `api`: existing Node.js/Express API
- `ai-service`: Spring Boot Azure OpenAI integration

The AI service is exposed on port `8080`.

## Postman testing plan

1. Start the stack:

```bash
docker compose up -d --build
```

2. Check AI service configuration:

```http
GET http://localhost:8080/api/ai/health
```

3. Send a prompt:

```http
POST http://localhost:8080/api/ai/chat
```

with the JSON body shown above.

4. Test an empty prompt and confirm HTTP `400`.
5. Test without Azure credentials and confirm HTTP `503`.
6. With a valid Azure deployment configured, confirm HTTP `200` and a generated response.

## Evidence to capture

- Microsoft Learn module completion screenshots
- Docker Compose output showing `agritech_ai_service` running
- Postman response for `/api/ai/health`
- Postman response for `/api/ai/chat`
- The `AI_DAY4.md` document and relevant source files

## Security notes

- Do not commit API keys.
- Use environment variables or deployment secrets.
- Rotate any key that is accidentally exposed.
- Use HTTPS when the service is deployed publicly.
- Add authentication before exposing the chat endpoint outside a trusted development environment.

## Current limitation

The service is fully scaffolded and can run without Azure credentials, but a real model response requires the Foundry endpoint URL, deployment name, and API key. Those values must be supplied through environment variables.
