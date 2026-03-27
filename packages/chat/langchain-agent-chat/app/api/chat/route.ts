import { createAgent } from "@/lib/agent";
import { HumanMessage } from "@langchain/core/messages";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  const agent = createAgent();

  // Stream the agent's response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await agent.invoke({
          messages: [new HumanMessage(lastMessage.content)],
        });

        // Extract the final AI message and any intermediate steps
        const agentMessages = result.messages;

        // Build a structured response showing the reasoning chain
        const parts: string[] = [];

        for (const msg of agentMessages) {
          if (msg._getType() === "ai") {
            const aiMsg = msg as any;
            // Tool calls
            if (aiMsg.tool_calls?.length) {
              for (const tc of aiMsg.tool_calls) {
                parts.push(`\n**[Tool Call: ${tc.name}]**\nArgs: \`${JSON.stringify(tc.args)}\`\n`);
              }
            }
            // Text content
            if (aiMsg.content && typeof aiMsg.content === "string" && aiMsg.content.trim()) {
              parts.push(aiMsg.content);
            }
          } else if (msg._getType() === "tool") {
            // Tool result - show a brief summary
            const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            const preview = content.length > 200 ? content.slice(0, 200) + "..." : content;
            parts.push(`\n*[Tool Result]*: \`${preview}\`\n`);
          }
        }

        const fullResponse = parts.join("\n");

        // Stream as Vercel AI SDK compatible data stream
        const data = `0:${JSON.stringify(fullResponse)}\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
      } catch (e: any) {
        const errorData = `0:${JSON.stringify(`Error: ${e.message}`)}\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
