"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function ChatPage() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending || !text.trim()) return;

    const message = text;
    const conversation = [
      ...messages.map(({ role, text }) => ({ role, content: text })),
      { role: "user" as const, content: message },
    ];
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const detail =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to send your message. Please try again.";
        throw new Error(detail);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("answer" in data) ||
        typeof data.answer !== "string"
      ) {
        throw new Error("The server returned an invalid reply. Please try again.");
      }

      const answer = data.answer;
      setMessages((previous) => [
        ...previous,
        { role: "user", text: message },
        { role: "assistant", text: answer },
      ]);
      setText("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to send your message. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="chat-page">
      <header className="chat-nav">
        <Link className="chat-wordmark" href="/" aria-label="Support desk home">
          <span className="chat-wordmark-mark">SD</span>
          <span className="chat-wordmark-name">SUPPORT<br />DESK / 01</span>
        </Link>
        <Link className="chat-triage-link" href="/triage">
          TICKET TRIAGE
        </Link>
      </header>

      <section className="chat-heading">
        <p className="chat-eyebrow">
          <span>01</span> SUPPORT / CONVERSATION
        </p>
        <h1>
          Support <span>chat.</span>
        </h1>
      </section>

      <section className="chat-console">
        <header className="chat-console-heading">
          <div>
            <span className="chat-panel-index">CHANNEL / 01</span>
            <h2>Conversation</h2>
          </div>
          <span className="chat-console-status">
            {isSending ? "WAITING" : messages.length ? "ACTIVE" : "READY"}
          </span>
        </header>

        <section
          className="chat-thread"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <span aria-hidden="true">--</span>
              <p>NO MESSAGES YET</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <article
                className={`chat-message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                <header>
                  <strong>{message.role === "user" ? "YOU" : "ASSISTANT"}</strong>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </header>
                <p>{message.text}</p>
              </article>
            ))
          )}
        </section>

        <form
          className="chat-composer"
          onSubmit={sendMessage}
          aria-busy={isSending}
        >
          <label htmlFor="message">YOUR MESSAGE</label>
          <textarea
            id="message"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write a message..."
            rows={3}
            required
            disabled={isSending}
          />
          <div className="chat-composer-footer">
            {error ? (
              <p className="chat-error" role="alert">
                {error}
              </p>
            ) : (
              <span className="chat-composer-note">MESSAGE / TEXT</span>
            )}
            <button
              className="chat-send"
              type="submit"
              disabled={isSending || !text.trim()}
            >
              {isSending ? "SENDING..." : "SEND MESSAGE"}
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </form>
      </section>

      <footer className="chat-footer">
        <span>SUPPORT SYSTEMS</span>
        <span>CHAT / V1</span>
      </footer>
    </main>
  );
}