"use client";
import { useId, useState } from "react";
import { productReviews, starFills } from "./review-model";
import type { ProductFeedback } from "./review-model";
import styles from "./reviews.module.css";

const STAR =
  "m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5Z";
export function StarRating({ rating }: { rating: number | null }) {
  return (
    <span
      className={styles.stars}
      role="img"
      aria-label={
        rating === null
          ? "No ratings yet"
          : `${rating.toFixed(1)} out of 5 stars`
      }
    >
      {starFills(rating).map((fill, index) => (
        <span className={styles.star} key={index} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <path d={STAR} />
          </svg>
          <span className={styles.filled} style={{ width: `${fill}%` }}>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <path d={STAR} />
            </svg>
          </span>
        </span>
      ))}
    </span>
  );
}
export function ProductReviews({
  productId,
  feedback,
}: {
  productId: string;
  feedback: readonly ProductFeedback[];
}) {
  const summary = productReviews(feedback, productId);
  const headingId = useId();
  return (
    <section className={styles.reviews} aria-labelledby={headingId}>
      <h2 id={headingId}>Customer reviews</h2>
      <p className={styles.disclosure}>
        Fictional reviews from this demo’s shop activity.
      </p>
      {summary.count ? (
        <div className={styles.layout}>
          <div className={styles.summary}>
            <div className={styles.score}>
              <strong>{summary.average!.toFixed(1)}</strong>
              <span>/ 5</span>
            </div>
            <StarRating rating={summary.average} />
            <p>
              Based on {summary.count}{" "}
              {summary.count === 1 ? "review" : "reviews"}
            </p>
          </div>
          <ReviewList key={productId} reviews={summary.reviews} />
        </div>
      ) : (
        <div className={styles.empty}>
          <StarRating rating={null} />
          <p>No reviews yet.</p>
        </div>
      )}
    </section>
  );
}
function ReviewList({ reviews }: { reviews: readonly ProductFeedback[] }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  return (
    <div className={styles.list}>
      <ul id={listId}>
        {(expanded ? reviews : reviews.slice(0, 3)).map((review) => (
          <li key={review.id}>
            <article className={styles.review} aria-label="Demo review">
              <header>
                <StarRating rating={review.rating} />
                <time dateTime={review.at}>
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(review.at))}
                </time>
              </header>
              {review.comment ? (
                <p>{review.comment}</p>
              ) : (
                <p className={styles.disclosure}>Rating only</p>
              )}
            </article>
          </li>
        ))}
      </ul>
      {reviews.length > 3 && (
        <button
          className={styles.more}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "Show fewer reviews"
            : `Show all ${reviews.length} reviews`}
        </button>
      )}
    </div>
  );
}
