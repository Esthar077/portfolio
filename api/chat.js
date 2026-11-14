// Vercel serverless function: keeps the Gemini API key on the server.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const PORTFOLIO_CONTEXT = `
Candidate: Zhanthark Esthar Rani S., based in Chennai, India.
Profile: Senior Business Systems Engineer / software engineer with an Integrated MSc in Computer Science. Focus areas include backend engineering, PostgreSQL, AWS, data platforms, enterprise integrations and AI automation.

Experience:
- Senior Business Systems Engineer, SysCloud (Jun 2026–present): works on a unified revenue/customer data layer and AI workflows, including RAG, agents, quote and purchase-order automation, and a Microsoft Teams assistant.
- Senior Software Engineer, SysCloud (Jul 2025–Jun 2026): managed subscription plan creation and pricebook maintenance across Salesforce and Chargebee; rebuilt audit logging with templates/placeholders and multilingual descriptions; implemented EventBridge event routing and Amazon SES notifications; built Azure DevOps/Grafana delivery dashboards.
- Software Engineer, SysCloud (Aug 2022–Jul 2025): designed database-level credential migration across 2,000+ production PostgreSQL databases; built Cognito onboarding, resource provisioning and Restore-Export capabilities.
- Engineering Intern, Data Layer, SysCloud (Sep 2021–Aug 2022): supported customer migration from Microsoft SQL Server to PostgreSQL using AWS DMS.

Selected projects:
- Database credential migration: moved from shared server-level credentials to per-database roles and secrets, with automated role creation, secret management, validation and rotation. Technologies: PostgreSQL, AWS Secrets Manager, RDS, Lambda.
- Unified revenue data layer: integrated Salesforce, HubSpot, Salesloft, Gmail, Outlook, Fireflies and Chargebee; ETL pipelines clean data and store embeddings in PostgreSQL for retrieval-augmented generation (RAG) and agents. Workflows support meeting preparation/minutes and revenue/customer insights.
- Microsoft Teams AI assistant: Teams app forwards messages to AWS Lambda, which routes questions to a relevant RAG knowledge source and Amazon Bedrock; responses return as Adaptive Cards. Enhancements include prompt caching, feedback capture and scheduled reports.
- Quote automation: extracts products, customer interests, pricing and quantities from meeting transcripts to prepare draft Salesforce quotes for human review; reported accuracy around 90%.
- Purchase-order processing: validates PO line items/prices against quotes, checks tax-exemption certificates, updates CRM fields and attaches documents; saves roughly 15–20 minutes per PO.
- Audit logging: template-based descriptions and dynamic placeholders to separate log text from application code and support multilingual output.
- Event routing/notifications: EventBridge centralizes application events; SES handles event-driven and scheduled emails.
- Tenant onboarding and Restore-Export: Cognito onboarding, tenant isolation, provisioning dedicated databases/S3 buckets/KMS keys, and configuration-driven recovery workflows.
- Delivery dashboards: Azure DevOps and Grafana dashboards for delivery progress, effort, project health and velocity.

Skills: Node.js, TypeScript, Python, SQL, PostgreSQL, React, AWS Lambda, Step Functions, EventBridge, RDS, Cognito, DMS, S3, KMS, Secrets Manager, SES, Amazon Bedrock, RAG, embeddings, vector search, LangChain, Langflow, Salesforce, HubSpot, Chargebee, Azure DevOps and Grafana.
Education: Integrated MSc in Computer Science, Pondicherry University (2017–2022). AWS Certified Developer – Associate.
Contact: esthar077@gmail.com; LinkedIn: linkedin.com/in/zhanthark-esthar-rani-s-1b5011218/; GitHub: github.com/Esthar077.

Answer only using this context. Be concise, conversational and factual. Do not invent metrics, responsibilities, dates, tools or outcomes. If a detail is absent, say it is not listed and suggest contacting the candidate. Do not claim access to private source code. For questions unrelated to this portfolio, politely say this assistant is limited to the candidate's professional portfolio.
`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI_NOT_CONFIGURED" });
  }

  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question || question.length > 1000) {
    return res.status(400).json({ error: "INVALID_QUESTION" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PORTFOLIO_CONTEXT }] },
          contents: [{ role: "user", parts: [{ text: question }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 300
          }
        })
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const quotaError = response.status === 429 ||
        payload?.error?.status === "RESOURCE_EXHAUSTED";
      console.error("Gemini API request failed:", response.status, payload?.error?.status || "");
      return res.status(quotaError ? 429 : 503).json({
        error: quotaError ? "GEMINI_QUOTA_EXHAUSTED" : "GEMINI_UNAVAILABLE"
      });
    }

    const answer = (payload?.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return res.status(503).json({ error: "EMPTY_MODEL_RESPONSE" });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Gemini request error:", error?.message || "Unknown error");
    return res.status(503).json({ error: "GEMINI_UNAVAILABLE" });
  }
};
