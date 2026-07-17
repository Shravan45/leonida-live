const MODERATION_SYSTEM_PROMPT =
  "You moderate submissions for a public, anonymous GTA6 fan community map. " +
  "Flag content ONLY if it contains hate speech, harassment, slurs, threats, or " +
  "other clearly abusive language. Do NOT flag content for being political, " +
  "controversial, crude humor, or GTA-style satire of real-world culture — this " +
  "is a game fan site and that kind of content is expected and fine here.";

export interface ModerationResult {
  flagged: boolean;
  categories?: string[];
}

// Fails open (treats content as clean) on moderation errors — an anonymous
// fan-map isn't high-stakes enough to block a submission over an API
// hiccup; admins can still delete anything that slips through. Uses
// forced tool-calling for reliable structured output, since the Messages
// API has no dedicated JSON-mode like some providers.
export async function moderateText(text: string): Promise<ModerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set — skipping moderation check.");
    return { flagged: false };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: MODERATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
        tools: [
          {
            name: "classify_content",
            description: "Classify content for abusive/hateful language.",
            input_schema: {
              type: "object",
              properties: {
                flagged: { type: "boolean" },
                categories: { type: "array", items: { type: "string" } },
              },
              required: ["flagged"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "classify_content" },
      }),
    });

    if (!res.ok) {
      console.error("Moderation API request failed:", res.status, await res.text());
      return { flagged: false };
    }

    const data = await res.json();
    const toolUse = data?.content?.find((block: { type: string }) => block.type === "tool_use");

    return {
      flagged: Boolean(toolUse?.input?.flagged),
      categories: toolUse?.input?.categories,
    };
  } catch (err) {
    console.error("Moderation check failed, allowing content through:", err);
    return { flagged: false };
  }
}
