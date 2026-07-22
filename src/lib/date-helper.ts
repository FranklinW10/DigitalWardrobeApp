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
export const daysAgo = (timestamp: string): string => {
  const now = new Date();

  // Get today's date at midnight Central time
  const centralFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const toMidnightCentral = (date: Date): Date => {
    const parts = centralFormatter.formatToParts(date);
    const y = parts.find((p) => p.type === "year")!.value;
    const m = parts.find((p) => p.type === "month")!.value;
    const d = parts.find((p) => p.type === "day")!.value;
    // Midnight Central = start of that day in Chicago
    return new Date(`${y}-${m}-${d}T00:00:00-05:00`); // CST; CDT is -06:00
  };

  const todayMidnight = toMidnightCentral(now);
  const postMidnight = toMidnightCentral(new Date(timestamp));

  const days = Math.round(
    (todayMidnight.getTime() - postMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === 2) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${formatted}`;
  }
  if (days === 3) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${formatted}`;
  }
  if (days === 4) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${formatted} (4 days ago)`;
  }
  if (days === 5) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${formatted}`;
  }
  if (days === 6) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${formatted}`;
  }
  if (days === 7) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${formatted}`;
  }
  return `expired`;
};
