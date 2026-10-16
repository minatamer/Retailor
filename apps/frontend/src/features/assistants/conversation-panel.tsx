"use client";
import { useMemo } from "react";
import { useSession } from "../session/context";
import { roleOf } from "./context";
import { Reply } from "./reply";
import { FormShell } from "../operations/form-shell";
import { OperationResult } from "./operation-result";
import { dashboardModel } from "../dashboard/model";
import { Icon } from "../../components/ui/icon";
import styles from "./tailor.module.css";
export function ConversationPanel() {
  const {
      controller,
      state,
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
    </section>
  );
}

export function ConversationComposer() {
  const { controller, state, assistantDraft, assistantBusy, logoBusy } =
    useSession();
  const role = roleOf(state);
  const canSend =
    !assistantBusy &&
    !logoBusy &&
    Boolean(assistantDraft.trim()) &&
    controller.canAttemptAi();
  return (
    <form
      className={styles.composer}
      data-tailor-composer
      aria-label="Message Tailor"
      onSubmit={(event) => {
        event.preventDefault();
        void controller.sendAssistant();
      }}
    >
      <label htmlFor="tailor-prompt">
        Ask Tailor <small>{assistantDraft.length}/2000</small>
      </label>
      <div className={styles.composerBox}>
        <textarea
          id="tailor-prompt"
          rows={3}
          maxLength={2000}
          aria-describedby="tailor-prompt-hint"
          value={assistantDraft}
          onChange={(event) => controller.assistantInput(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key !== "Enter" ||
              event.shiftKey ||
              event.nativeEvent.isComposing ||
              event.keyCode === 229
            )
              return;
            event.preventDefault();
            if (!event.repeat && canSend)
              event.currentTarget.form?.requestSubmit();
          }}
          placeholder={
            role === "owner"
              ? "Explain this chart day’s operating result…"
              : role === "creator"
                ? "Help me choose a look for my collection…"
                : "Show me the jeans under €80…"
          }
        />
        <button
          className={styles.sendButton}
          type={assistantBusy ? "button" : "submit"}
          disabled={!assistantBusy && !canSend}
          aria-label={assistantBusy ? "Cancel request" : "Send message"}
          title={assistantBusy ? "Cancel request" : "Send message (Enter)"}
          data-cancel={assistantBusy || undefined}
          onClick={
            assistantBusy ? () => controller.cancelAssistant() : undefined
          }
        >
          <Icon name={assistantBusy ? "close" : "arrow"} size={16} />
        </button>
      </div>
      <p id="tailor-prompt-hint" className={styles.srOnly}>
        Enter to send · Shift+Enter for a new line
      </p>
      {!state.fixture && (
        <p className={styles.note}>
          Send shares this demo’s records, prompt and recent role messages with
          OpenAI for this one answer. Photos are excluded. A maximum of twelve
          live turns is shared across roles.
        </p>
      )}
    </form>
  );
}
