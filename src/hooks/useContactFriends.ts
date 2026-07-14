import { supabase } from "@/lib/supabase/client";
import * as Contacts from "expo-contacts/legacy";
import { useState } from "react";
import { Alert } from "react-native";

export interface MatchedContact {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

// Strips everything except digits and a leading +. Assumes numbers are
// stored in Supabase in E.164-ish format (e.g. +15551234567). If your
// user base is international, swap this for libphonenumber-js instead.
const normalizePhone = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  return `+1${digits.replace(/^1/, "")}`;
};

export const useContactFriends = () => {
  const [matches, setMatches] = useState<MatchedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const findFriendsFromContacts = async () => {
    setIsLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need contacts access to find friends who are already here.",
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      const phoneNumbers = Array.from(
        new Set(
          data
            .flatMap((c) => c.phoneNumbers?.map((p) => p.number) ?? [])
            .filter((n): n is string => !!n)
            .map(normalizePhone),
        ),
      );

      if (phoneNumbers.length === 0) {
        setMatches([]);
        return;
      }

      const { data: matchedUsers, error } = await supabase.rpc(
        "match_contacts",
        { phone_numbers: phoneNumbers },
      );
      if (error) throw error;

      setMatches(matchedUsers ?? []);
    } catch (error) {
      console.error("Error finding friends from contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { matches, isLoading, findFriendsFromContacts };
};
