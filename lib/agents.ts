/* ------------------------------------------------------------------ */
/*  lib/agents.ts — Real agent runner via local Ollama                 */
/* ------------------------------------------------------------------ */

import fs from "node:fs/promises";
import path from "node:path";

export type AgentName = "vision" | "scope" | "distribution" | "architecture" | "qa";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

function agentPromptPath(agent: AgentName): string {
  return path.join(process.cwd(), "agents", `${agent}.prompt.md`);
}

async function loadPrompt(agent: AgentName): Promise<string> {
  const p = agentPromptPath(agent);
  return fs.readFile(p, "utf-8");
}

function safeJsonParse(text: string): any {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`Model did not return a JSON object. Raw: ${text.slice(0, 200)}`);
  }
  const sliced = text.slice(first, last + 1);
  return JSON.parse(sliced);
}

async function ollamaChat(systemPrompt: string, inputObj: unknown): Promise<string> {
  const payload = {
    model: OLLAMA_MODEL,
    stream: false,
    options: { temperature: 0 },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          "INPUT_JSON:\\n" +
          JSON.stringify(inputObj, null, 2) +
          "\\n\\nReturn ONLY a single valid JSON object.",
      },
    ],
  };

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Ollama response missing message.content");
  }
  return content;
}

export async function callAgent(agentName: AgentName, input: unknown): Promise<any> {
  const systemPrompt = await loadPrompt(agentName);

  try {
    const raw = await ollamaChat(systemPrompt, input);
    return safeJsonParse(raw);
  } catch (e1: any) {
    const repairPrompt =
      systemPrompt +
      "\\n\\nCRITICAL: Your previous response was invalid. Output ONLY one valid JSON object. No prose. No markdown.";

    const raw2 = await ollamaChat(repairPrompt, input);
    return safeJsonParse(raw2);
  }
}
