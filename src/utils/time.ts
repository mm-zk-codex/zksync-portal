const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
  ["second", 1000]
];

export const formatActivityTime = (timestamp?: number) => {
  if (!timestamp) {
    return "Unknown time";
  }
  const now = Date.now();
  const diff = timestamp - now;
  const abs = Math.abs(diff);
  const isRecent = abs < 1000 * 60 * 60 * 24;
  if (isRecent) {
    for (const [unit, value] of units) {
      if (abs >= value || unit === "second") {
        const amount = Math.round(diff / value);
        return rtf.format(amount, unit);
      }
    }
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
};
