export type Prayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerTimeInfo {
  key: Prayer;
  name: string;
  hour: number;
  minute: number;
  displayTime: string;
}

/**
 * Average prayer times across Kerala (IST):
 * - Fajr:    05:00 AM (05:00)
 * - Dhuhr:   12:25 PM (12:25)
 * - Asr:     03:45 PM (15:45)
 * - Maghrib: 06:30 PM (18:30)
 * - Isha:    07:45 PM (19:45)
 */
export const KERALA_PRAYER_TIMES: Record<Prayer, PrayerTimeInfo> = {
  fajr: {
    key: "fajr",
    name: "Fajr",
    hour: 5,
    minute: 0,
    displayTime: "05:00 AM",
  },
  dhuhr: {
    key: "dhuhr",
    name: "Dhuhr",
    hour: 12,
    minute: 25,
    displayTime: "12:25 PM",
  },
  asr: {
    key: "asr",
    name: "Asr",
    hour: 15,
    minute: 45,
    displayTime: "03:45 PM",
  },
  maghrib: {
    key: "maghrib",
    name: "Maghrib",
    hour: 18,
    minute: 30,
    displayTime: "06:30 PM",
  },
  isha: {
    key: "isha",
    name: "Isha",
    hour: 19,
    minute: 45,
    displayTime: "07:45 PM",
  },
};

/**
 * Returns current date and minutes in IST (Asia/Kolkata).
 */
export function getIstCurrentTime(): { todayYmd: string; currentMinutes: number } {
  const now = new Date();
  const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, "0");
  const dd = String(istDate.getDate()).padStart(2, "0");
  const todayYmd = `${yyyy}-${mm}-${dd}`;
  const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();
  return { todayYmd, currentMinutes };
}

/**
 * Checks whether a prayer is blocked for submission on the given date string (YYYY-MM-DD).
 */
export function isPrayerBlocked(
  prayer: Prayer,
  selectedDateYmd: string,
): { blocked: boolean; message: string; availableAt: string } {
  const { todayYmd, currentMinutes } = getIstCurrentTime();

  if (selectedDateYmd > todayYmd) {
    return {
      blocked: true,
      message: "Future dates cannot be recorded",
      availableAt: "Future date",
    };
  }

  if (selectedDateYmd === todayYmd) {
    const info = KERALA_PRAYER_TIMES[prayer];
    const prayerMinutes = info.hour * 60 + info.minute;
    if (currentMinutes < prayerMinutes) {
      return {
        blocked: true,
        message: `Available after ${info.displayTime}`,
        availableAt: info.displayTime,
      };
    }
  }

  return { blocked: false, message: "", availableAt: "" };
}
