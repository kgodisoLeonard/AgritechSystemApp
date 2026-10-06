# Grounded Lema chat

`POST /api/chat` accepts `{ "prompt": "What seeds are available?", "context": "Optional current farmer ledger summary" }`.

Before calling Qwen, `FarmKnowledgeService` uses PostgreSQL English full-text search to retrieve up to three relevant farming/app guides and three public supplier-product listings. Listings include their current database prices and any open group-order terms. Search uses bound parameters, stemming and stop-word removal; it does not require an embedding service or schema migration.

`ChatService` sends the retrieved text and optional farmer-supplied figures to the Python LangChain service, which invokes Ollama/Qwen through `ChatOllama` and `create_agent`, with a separate, always-present farming-only system instruction. Missing facts must be acknowledged, not invented. Farmer figures are client-supplied, not independently verified. No other farmer accounts, ledger records or passwords are retrieved. See [LangChain setup](../../langchain-service/README.md).

The response includes `model`, `response` and `sources` (source IDs and titles). Sources identify material supplied to the model, not independently verified citations for every generated sentence. The frontend displays these titles beneath the answer.

Questions with no matching source are not sent to an unrestricted model: the API returns a farming/app redirect labelled `Lema` rather than falsely attributing it to Qwen. Expand the guide corpus to support additional farming topics.

The curated guides live in `FarmKnowledgeService.java`. Update them when app behaviour changes. They provide general guidance, not current weather, pesticide prescriptions, guaranteed yields or locally verified planting schedules. Catalogue data is retrieved fresh on each question; a listing does not prove stock availability.

Run focused tests with `./mvnw -Dtest=ChatServiceTest,FarmKnowledgeServiceTest test`.

RAG reduces unsupported answers but does not make an LLM infallible. Verify important recommendations against the underlying records and local agricultural expertise.
