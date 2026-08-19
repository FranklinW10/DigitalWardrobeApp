export const formatTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diff = now.getTime() - created.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
export const formatCommentCentralTime = (isoString: string) => {
  return new Date(isoString).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export function formatDate(dateInput: string | Date): string {
  let year: number, month: number, day: number;

  if (typeof dateInput === "string") {
    // Parse YYYY-MM-DD directly to avoid UTC shifting
    const [y, m, d] = dateInput.split("T")[0].split("-").map(Number);
    year = y;
    month = m - 1;
    day = d;
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  }

  const date = new Date(year, month, day); // local time, no UTC shift
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  const sameYear = year === today.getFullYear();

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
export const daysAgo = (postDate: string): string => {
  const parseDateOnly = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const postMidnight = parseDateOnly(postDate);

  console.log("postDate string:", postDate);
  console.log("todayMidnight:", todayMidnight);
  console.log("postMidnight:", postMidnight);
  // Calculate days difference directly without milliseconds
  const days = Math.floor(
    (todayMidnight.getTime() - postMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days >= 2 && days <= 7) {
    return postMidnight.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  return "Over a week ago";
};
