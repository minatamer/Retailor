"use client";
import { useMemo } from "react";
import { useSession } from "../session/context";
import { roleOf } from "./context";
import { Reply } from "./reply";
import { FormShell } from "../operations/form-shell";
import { OperationResult } from "./operation-result";
import { dashboardModel } from "../dashboard/model";
import styles from "./tailor.module.css";
export function ConversationPanel() {
  const {
      controller,
      state,
      assistantDraft,
      assistantBusy,
      assistantNotice,
      ownerForm,
      ownerSurface,
      ownerResult,
    } = useSession(),
    role = roleOf(state);
  const messages = state.conversation.filter((m) => m.role === role);
  const context = controller.assistantContext();
  const model = useMemo(
    () =>
      role === "owner"
        ? dashboardModel(state.graph, state.dashboard.period)
        : null,
    [role, state.graph, state.dashboard.period],
  );
  return (
    <section className={styles.chat} aria-label={`${role} conversation`}>
      <div className={styles.shortcuts} aria-label="Local Tailor shortcuts">
        <button onClick={() => controller.tailorShortcut("summary")}>
          {role === "owner"
            ? "Business summary"
            : role === "creator"
              ? "Explain my choices"
              : "Collection at a glance"}
        </button>
        <button onClick={() => controller.tailorShortcut("sources")}>
          Show sources
        </button>
        <button onClick={() => controller.tailorShortcut("tour")}>
          Take a tour
        </button>
        <button onClick={() => controller.tailorShortcut("help")}>
          What can you help with?
        </button>
      </div>
      {role === "owner" && ownerForm && ownerSurface === "tailor" && (
        <FormShell inline key={ownerForm.id} />
      )}
      {role === "owner" && ownerForm && ownerSurface === "dashboard" && (
        <button
          className={styles.resumeDraft}
          onClick={() => controller.moveOwnerForm("tailor")}
        >
          Continue your current draft here
        </button>
      )}
      {role === "owner" && !ownerForm && ownerResult && <OperationResult />}
      <div className={styles.history} aria-label="Conversation history">
        {messages.map((message) => (
          <Reply
            key={message.id}
            message={message}
            context={context}
            model={model}
          />
        ))}
      </div>
      {assistantBusy && (
        <p role="status" className={styles.thinking}>
          <span />
          Checking this view and its sources…
        </p>
      )}
      {assistantNotice && (
        <p role="status" className={styles.chatNotice}>
          {assistantNotice}
        </p>
      )}
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          void controller.sendAssistant();
        }}
      >
        <label htmlFor="tailor-prompt">
          Ask Tailor <small>{assistantDraft.length}/2000</small>
        </label>
        <textarea
          id="tailor-prompt"
          rows={3}
          maxLength={2000}
          value={assistantDraft}
          onChange={(event) => controller.assistantInput(event.target.value)}
          placeholder={
            role === "owner"
              ? "Explain this chart day’s operating result…"
              : role === "creator"
                ? "Help me choose a look for my collection…"
                : "Show me the jeans under €80…"
          }
        />
        <p className={styles.note}>
          {state.fixture
            ? "Development examples read this catalogue and support a limited set of prompts. Local shortcuts are always available."
            : "Send shares this demo’s records, prompt and recent role messages with OpenAI for this one answer. Photos are excluded. A maximum of twelve live turns is shared across roles."}
        </p>
        <div className={styles.composerActions}>
          <button
            type="submit"
            disabled={
              assistantBusy ||
              !assistantDraft.trim() ||
              !controller.canAttemptAi()
            }
          >
            {assistantBusy
              ? "Investigating…"
              : state.fixture
                ? "Try development example"
                : "Send to Tailor"}{" "}
            →
          </button>
          {assistantBusy && (
            <button type="button" onClick={() => controller.cancelAssistant()}>
              Cancel request
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
