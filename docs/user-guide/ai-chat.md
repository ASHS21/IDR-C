# AI Chat

> For all users: ask natural-language questions about your identity posture.

## Prerequisites

- Signed in to Identity Radar
- AI model running (local or cloud)

## Opening the Chat Panel

Click the **brain icon** in the top navigation bar, or navigate to **AI Chat** in the sidebar under Intelligence.

## Asking Questions

Type your question in natural language. The AI has access to your identity data and can answer questions such as:

- "Which service accounts have Domain Admin access?"
- "Show me dormant identities in the Finance department"
- "What is the blast radius if john.smith's credentials are compromised?"
- "List all Tier 0 identities without MFA"
- "How many violations were remediated last month?"

## Understanding Results

The AI responds with:

- **Result Cards**: Structured data tables matching your query
- **Suggested Actions**: Clickable actions you can take on the results (e.g., "Revoke access", "Trigger review")
- **Follow-up Questions**: Related queries to explore further

## Chat Sessions

Conversations are saved as chat sessions. You can:

- Start a **New Chat** for a fresh conversation
- Return to previous sessions from the **Chat History** sidebar
- Delete sessions you no longer need

## Example Queries

| Query | What it returns |
|-------|----------------|
| "Top 10 riskiest identities" | Table of identities sorted by risk score |
| "Unused service accounts" | NHIs with no authentication in 90+ days |
| "Tier violations in IT department" | Cross-tier access violations filtered by department |
| "Compare my posture this month vs last month" | Trend comparison of key metrics |
| "What would happen if we revoke all expired certifications?" | Posture simulation |

## Verification

The AI chat responds to queries with data from your organization's identity store, not generic information.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| AI not responding | Check AI model status in Settings. Ensure Ollama is running or Anthropic API key is configured. |
| Results seem inaccurate | The AI uses your current data snapshot. Ensure data sources are synced recently. |
| Chat history lost | Chat sessions are stored in the database. Check your database connection. |

## Next Steps

- [AI Analysis](./ai-analysis.md)
- [Attack Paths](./attack-paths.md)
- [Search (Cmd+K)](./search.md)
