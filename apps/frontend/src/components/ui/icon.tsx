const paths = {
  arrow: "M5 12h14m-5-5 5 5-5 5",
  down: "M12 5v14m-5-5 5 5 5-5",
  expand: "M14 3h7v7 M21 3l-7 7 M10 21H3v-7 M3 21l7-7",
  restore: "M21 3l-7 7 M14 3v7h7 M3 21l7-7 M3 14h7v7",
  sparkle: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  bag: "M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2",
  close: "m6 6 12 12M6 18 18 6",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5",
  check: "m5 12 4 4L19 6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  garment: "m8 3-5 3-2 5 4 2 1-3v11h12V10l1 3 4-2-2-5-5-3a4 4 0 0 1-8 0Z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 7h6 M9 11h6 M9 15h3",
  returns: "M8 7H3l5-5 M3 7h11a7 7 0 0 1 0 14h-3",
  reset: "M3 10a9 9 0 1 1 2.6 8.4 M3 4v6h6",
  inventory: "m3 7 9-4 9 4v10l-9 4-9-4V7Z m0 0 9 4 9-4 M12 11v10 M7 5l9 4",
  expense: "M3 6h17v14H3V6Z M3 6V4h14v2 M15 11h6v5h-6v-5Z M17 13.5h1",
  customers:
    "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21v-2a7 7 0 0 1 14 0v2 M17 5a4 4 0 0 1 0 7 M18 15a5 5 0 0 1 4 4v2",
  feedback: "M3 3h18v14H9l-6 4V3Z M7 8h10 M7 12h6",
  design: "m14 3 7 7-9 9-9 2 2-9 9-9Z M11 6l7 7 M5 12l7 7",
  sidebar: "M4 3h16v18H4V3Z M9 3v18 m7-13-3 4 3 4",
  menu: "M4 6h16 M4 12h16 M4 18h16",
} as const;
export function Icon({
  name,
  size = 20,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
