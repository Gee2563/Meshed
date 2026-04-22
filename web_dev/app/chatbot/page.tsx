"use client";

import { useState } from "react";

type ChatMessage = {
  from: "user" | "assistant";
  text: string;
  highlights?: string[];
};

type ChatbotReply = {
  answer: string;
  highlights: string[];
  intent: string;
};

const samplePrompts = [
  "Which LP has the most exposure to Music and live events?",
  "Which founder should I reach out to?",
  "Which companies are most connected in this network?",
];

export default function ChatbotPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "assistant",
      text: "Ask me anything about the node graph. Try one of the prompts below.",
      highlights: ["LP exposure", "Founder recommendations", "Bridge and connected-company insights"],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(question: string) {
    if (!question.trim() || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setMessages((previous) => [...previous, { from: "user", text: question }, { from: "assistant", text: "Analyzing your graph..." }]);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ query: question }),
      });
      const payload = await response.json();
      const resolved = payload as {
        ok: boolean;
        data?: ChatbotReply;
        error?: string;
      };

      setMessages((previous) => {
        const next = previous.slice(0, -1);
        if (!resolved.ok) {
          return [...next, { from: "assistant", text: resolved.error ?? "Unexpected error. Please try again." }];
        }
        if (!resolved.data) {
          return [...next, { from: "assistant", text: "No answer available right now. Please try again." }];
        }
        return [
          ...next,
          {
            from: "assistant",
            text: resolved.data.answer,
            highlights: resolved.data.highlights,
          },
        ];
      });
    } catch (err) {
      setError((err as Error).message);
      setMessages((previous) => {
        const next = previous.slice(0, -1);
        return [...next, { from: "assistant", text: "I couldn&apos;t reach the graph assistant endpoint. Please try again." }];
      });
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  return (
    <main className="mx-auto mt-4 max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
        <h1 className="text-3xl font-bold text-ink">Meshed Graph Copilot</h1>
        <p className="mt-2 text-sm text-slate">
          Demo chatbot over the portfolio graph. Use it to explore LP exposure and founder or bridge opportunities.
        </p>

        <div className="mt-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.from}-${index}`}
              className={
                message.from === "user"
                  ? "ml-auto max-w-3xl rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm"
                  : "mr-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              }
            >
              <p className="leading-6 text-ink">{message.text}</p>
              {message.highlights?.length ? (
                <ul className="mt-3 space-y-1 text-sm text-slate">
                  {message.highlights.map((highlight) => (
                    <li key={highlight} className="rounded bg-white px-3 py-1">
                      {highlight}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask(input);
          }}
          className="mt-6 space-y-4"
        >
          <label htmlFor="chat-message" className="sr-only">
            Ask a graph question
          </label>
          <textarea
            id="chat-message"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            disabled={loading}
            className="h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            placeholder="Type your question..."
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentStrong disabled:opacity-50"
            >
              {loading ? "Asking..." : "Ask"}
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-3">
          {samplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                void ask(prompt);
              }}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate transition hover:border-indigo-400 hover:text-indigo-700"
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
