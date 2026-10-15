"use client";
import { formatUsd } from "@retailor/commerce/money";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import { MetricStrip } from "./record-photo";
import { expenseRegister, monthLabel, titleCase } from "./register-model";
import styles from "./registers.module.css";
export function ExpenseRegister() {
  const { controller, state, ownerExpenseFilters } = useSession();
  const { graph } = state,
    model = expenseRegister(graph, ownerExpenseFilters);
  return (
    <>
      <MetricStrip
        items={[
          {
            label: "Net posted expenses",
            value: formatUsd(model.total),
            note: "For the selected period and category",
          },
          { label: "Posted entries", value: model.rows.length },
          {
            label: "Unposted drafts",
            value: graph.expenseDrafts.length,
            note: "Not included in posted totals",
          },
        ]}
      />
      <div className={styles.filters} aria-label="Expense filters">
        <label>
          Month
          <select
            aria-label="Expense month"
            value={ownerExpenseFilters.month}
            onChange={(e) =>
              controller.setOwnerExpenseFilters({ month: e.target.value })
            }
          >
            <option value="">All months</option>
            {model.months.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            aria-label="Expense category"
            value={ownerExpenseFilters.category}
            onChange={(e) =>
              controller.setOwnerExpenseFilters({
                category: e.target.value as typeof ownerExpenseFilters.category,
              })
            }
          >
            {["all", "marketing", "packaging", "platform", "operations"].map(
              (value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All categories" : titleCase(value)}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Order
          <select
            aria-label="Expense date order"
            value={ownerExpenseFilters.sort}
            onChange={(e) =>
              controller.setOwnerExpenseFilters({
                sort: e.target.value as typeof ownerExpenseFilters.sort,
              })
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        {(ownerExpenseFilters.month ||
          ownerExpenseFilters.category !== "all") && (
          <Button
            variant="quiet"
            onClick={() =>
              controller.setOwnerExpenseFilters({ month: "", category: "all" })
            }
          >
            Clear filters
          </Button>
        )}
      </div>
      {graph.expenseDrafts.length > 0 && (
        <section className={styles.drafts} aria-label="Unposted expense drafts">
          <h3>
            Drafts <span>{graph.expenseDrafts.length}</span>
          </h3>
          <p>Undated and unposted. Ready when you are.</p>
          {graph.expenseDrafts.map((e) => (
            <article className={styles.expenseCard} key={e.id}>
              <div className={styles.expenseIdentity}>
                <span className={styles.categoryIcon}>
                  <Icon name="expense" />
                </span>
                <div>
                  <h4>{e.note || `${titleCase(e.category)} expense`}</h4>
                  <small>{titleCase(e.category)} · Draft</small>
                </div>
                <strong>{formatUsd(e.amount)}</strong>
              </div>
              <div className={styles.rowActions}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    controller.openOwnerOperation("saveExpenseDraft", e.id)
                  }
                >
                  Edit draft
                </Button>
                <Button
                  onClick={() =>
                    controller.openOwnerOperation("postExpense", e.id)
                  }
                >
                  Post expense
                </Button>
                <Button
                  variant="quiet"
                  onClick={() =>
                    controller.openOwnerOperation("deleteExpenseDraft", e.id)
                  }
                >
                  Delete draft
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
      <div aria-live="polite" className={styles.resultCount}>
        {model.rows.length} posted{" "}
        {model.rows.length === 1 ? "entry" : "entries"} ·{" "}
        {formatUsd(model.total)} net
      </div>
      {model.groups.map((group) => (
        <section
          className={styles.month}
          key={group.month}
          aria-label={monthLabel(group.month)}
        >
          <header>
            <h3>{monthLabel(group.month)}</h3>
            <strong>{formatUsd(group.total)}</strong>
          </header>
          {group.entries.map((e) => (
            <article className={styles.expenseCard} key={e.id}>
              <div className={styles.expenseIdentity}>
                <span className={styles.categoryIcon}>
                  <Icon name="expense" />
                </span>
                <div>
                  <h4>{e.note || `${titleCase(e.category)} expense`}</h4>
                  <small>
                    {titleCase(e.category)} ·{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(e.at))}{" "}
                    · {titleCase(e.kind)}
                  </small>
                </div>
                <strong data-credit={e.amount < 0 || undefined}>
                  {formatUsd(e.amount)}
                </strong>
              </div>
              <details className={styles.history}>
                <summary>Record details</summary>
                <p>
                  {e.origin === "seeded_scenario"
                    ? "Synthetic shop activity"
                    : "Local demo action"}{" "}
                  · {e.id}
                  {e.parentId ? ` · Linked to ${e.parentId}` : ""}
                </p>
              </details>
              {e.kind === "posting" &&
                !graph.expenses.some(
                  (v) => v.parentId === e.id && v.kind === "void",
                ) && (
                  <div className={styles.rowActions}>
                    <Button
                      variant="quiet"
                      onClick={() =>
                        controller.openOwnerOperation("correctExpense", e.id)
                      }
                    >
                      Correct amount
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() =>
                        controller.openOwnerOperation("voidExpense", e.id)
                      }
                    >
                      Void expense
                    </Button>
                  </div>
                )}
            </article>
          ))}
        </section>
      ))}
      {!model.rows.length && (
        <div className={styles.empty}>
          <h3>No posted expenses in this view.</h3>
          <p>Try another month or category. Drafts are shown separately.</p>
        </div>
      )}
    </>
  );
}
