import { Post } from "@/hooks/usePosts";
import { useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CalendarSheetProps {
  posts: Post[];
  visible: boolean;
  onClose: () => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const CalendarView = ({
  posts,
  visible,
  onClose,
}: CalendarSheetProps) => {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // last day of month

  // Build the grid
  const cells = [
    ...Array(firstDayOfMonth).fill(null), // empty padding
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1), // 1..31
  ];
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const postByDay = posts.reduce<Record<number, Post>>((acc, p) => {
    const d = new Date(p.created_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      acc[d.getDate()] = p;
    }
    return acc;
  }, {});
  return (
    <Modal visible={visible} transparent>
      <TouchableOpacity style={styles.backdrop} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.calendarContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={styles.dayLabelsRow}>
            {DAYS.map((d) => (
              <Text key={d} style={styles.dayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((day, ci) => (
                <View key={ci} style={styles.cell}>
                  {day !== null && (
                    <>
                      {postByDay[day] ? (
                        <Image
                          source={{ uri: postByDay[day].image_url }}
                          style={[
                            styles.dayThumb,
                            isToday(day) && styles.todayThumb,
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.dayCircle,
                            isToday(day) && styles.todayCircle,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isToday(day) && styles.todayText,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                      )}
                      {postByDay[day] && (
                        <Text style={styles.dayOverlay}>{day}</Text>
                      )}
                    </>
                  )}
                </View>
              ))}
            </View>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 20, // all corners rounded now, not just top
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    width: "90%", // keeps it from stretching edge-to-edge
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  navBtn: {
    padding: 8,
  },
  navArrow: {
    fontSize: 24,
    color: "#555",
    lineHeight: 26,
  },

  // Day labels
  dayLabelsRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
  },

  // Grid
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    minHeight: 44,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: {
    backgroundColor: "#007AFF",
  },
  dayText: {
    fontSize: 14,
    color: "#111",
  },
  todayText: {
    color: "#fff",
    fontWeight: "600",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#007AFF",
    marginTop: 2,
  },
  dayThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  todayThumb: {
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  dayOverlay: {
    fontSize: 10,
    color: "#555",
    marginTop: 2,
  },
});
