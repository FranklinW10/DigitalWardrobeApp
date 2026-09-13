import { useTheme } from "@/context/ThemeContext";
import { ReportTargetType, useReports } from "@/hooks/useReports";
import { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const REASONS = [
  "Spam",
  "Harassment or bullying",
  "Bein to fly",
  "Nudity or sexual content",
  "That ain't a fit",
  "Hate speech",
  "Abduction",
  "Murder",
  "Impersonation",
  "Other",

];

export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  postId,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  postId?: string;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { submitReport } = useReports();
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async (reason: string) => {
    setSubmitting(true);

    // Build context based on target type
    const context = {
      postId: targetType === "post" ? targetId : undefined,
      commentId: targetType === "comment" ? targetId : undefined,
      reportedUserId: targetType === "user" ? targetId : undefined,
    };

    const { error } = await submitReport(
      targetType,
      targetId,
      reason,
      undefined,
      context,
    );
    setSubmitting(false);

    if (error) {
      Alert.alert("Error", "Couldn't submit report. Please try again.");
      return;
    }
    Alert.alert("Reported", "Thanks, we'll review this.");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Report {targetType}</Text>
          {REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={styles.option}
              disabled={submitting}
              onPress={() => handleReport(reason)}
            >
              <Text style={styles.optionText}>{reason}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
      textAlign: "center",
    },
    option: {
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    optionText: { fontSize: 15, color: colors.text, textAlign: "center" },
    cancel: { paddingVertical: 14, marginTop: 8 },
    cancelText: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
      fontWeight: "600",
    },
  });
