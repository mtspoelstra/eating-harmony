import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { REACTION_OPTIONS } from "@/components/ui/ReactionBadge";
import { TextField } from "@/components/ui/TextField";
import { useAddCookLogMutation } from "@/hooks/useCookLogs";
import { Reaction } from "@/lib/types";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const TODAY = isoDate(new Date());
const YESTERDAY = isoDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

export default function LogCookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addCookLog = useAddCookLogMutation(id);

  const [cookedOn, setCookedOn] = useState(TODAY);
  const [reaction, setReaction] = useState<Reaction>("great");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSave = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cookedOn)) {
      Alert.alert("Check the date", "Use the format YYYY-MM-DD.");
      return;
    }
    setSubmitting(true);
    try {
      await addCookLog.mutateAsync({
        cooked_on: cookedOn,
        reaction,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save that log.";
      Alert.alert("Couldn't save", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-cream-50"
      contentContainerClassName="p-5 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="mb-2 text-sm font-medium text-ink-600">When did you cook it?</Text>
        <View className="mb-3 flex-row gap-2">
          <Chip label="Today" selected={cookedOn === TODAY} onPress={() => setCookedOn(TODAY)} />
          <Chip
            label="Yesterday"
            selected={cookedOn === YESTERDAY}
            onPress={() => setCookedOn(YESTERDAY)}
          />
        </View>
        <TextField
          value={cookedOn}
          onChangeText={setCookedOn}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-ink-600">How did your body respond?</Text>
        <View className="gap-2.5">
          {REACTION_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={`${opt.emoji}  ${opt.label}`}
              tone="sage"
              selected={reaction === opt.value}
              onPress={() => setReaction(opt.value)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="How it tasted, any tweaks, how you felt after..."
        multiline
        numberOfLines={4}
        className="min-h-24"
        textAlignVertical="top"
      />

      <Button label="Save" onPress={onSave} loading={submitting} />
    </ScrollView>
  );
}
