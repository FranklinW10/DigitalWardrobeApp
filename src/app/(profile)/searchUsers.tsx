import { useFollows } from "@/hooks/useFollows";
import { SearchUser, useSearch } from "@/hooks/useSearch";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { results, isLoading, searchUsers } = useSearch();
  const { addFollow, unfollowUser, isFollowing } = useFollows();
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (text: string) => {
    setQuery(text);
    searchUsers(text);
  };

  const renderUser = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push(`/(profile)/${item.id}`)}
    >
      {item.profile_image_url ? (
        <Image source={{ uri: item.profile_image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.name?.[0]?.toUpperCase() || "U"}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          isFollowing(item.id) && styles.followingButton,
        ]}
        onPress={() =>
          isFollowing(item.id) ? unfollowUser(item.id) : addFollow(item.id)
        }
      >
        <Text
          style={[
            styles.followButtonText,
            isFollowing(item.id) && styles.followingButtonText,
          ]}
        >
          {isFollowing(item.id) ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or username..."
        value={query}
        onChangeText={handleSearch}
        autoCapitalize="none"
        onPress={() => router.push("/searchUsers")}
      />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListEmptyComponent={
            query.length > 0 ? (
              <Text style={styles.emptyText}>No users found</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "600",
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: "600",
    fontSize: 15,
  },
  username: {
    color: "#888",
    fontSize: 13,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
  },
  followingButton: {
    backgroundColor: "#000",
  },
  followButtonText: {
    fontWeight: "600",
    fontSize: 13,
  },
  followingButtonText: {
    color: "#fff",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },
});
