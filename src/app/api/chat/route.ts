export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSseEvent(payload: unknown, event?: string) {
  const eventLine = event ? `event: ${event}\n` : "";
  return `${eventLine}data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let index = 0;

      const push = (data: unknown, event?: string) => {
        controller.enqueue(encoder.encode(createSseEvent(data, event)));
      };

      push({ message: "connected" }, "status");

      const interval = setInterval(() => {
        index += 1;
        push({ token: `chunk-${index}`, done: false }, "message");

        if (index >= 5) {
          clearInterval(interval);
          push({ done: true }, "done");
          controller.close();
        }
      }, 350);

      const onAbort = () => {
        clearInterval(interval);
        controller.close();
      };

      request.signal.addEventListener("abort", onAbort, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
