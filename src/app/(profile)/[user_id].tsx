import { useFollows } from "@/hooks/useFollows";
import { Post } from "@/hooks/usePosts";
import { supabase } from "@/lib/supabase/client";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ProfileUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export default function UserProfileScreen() {
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { addFollow, unfollowUser, isFollowing } = useFollows();

  useEffect(() => {
    loadProfile();
  }, [user_id]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, username, profile_image_url")
        .eq("id", user_id)
        .single();
      if (profileError) throw profileError;
      setProfileUser(profile);

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*, profiles(*), images(*)")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (postsError) throw postsError;
      setPosts(postsData ?? []);

      // Load follower count
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user_id);
      setFollowerCount(followers ?? 0);

      // Load following count
      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user_id);
      setFollowingCount(following ?? 0);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Avatar */}
          {profileUser?.profile_image_url ? (
            <Image
              source={{ uri: profileUser.profile_image_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {profileUser?.name?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
          )}

          {/* Name + username */}
          <Text style={styles.name}>{profileUser?.name}</Text>
          <Text style={styles.username}>@{profileUser?.username}</Text>

          {/* Follower counts */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          {/* Follow button */}
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing(user_id) && styles.followingButton,
            ]}
            onPress={() =>
              isFollowing(user_id) ? unfollowUser(user_id) : addFollow(user_id)
            }
          >
            <Text
              style={[
                styles.followButtonText,
                isFollowing(user_id) && styles.followingButtonText,
              ]}
            >
              {isFollowing(user_id) ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.postsHeader}>Posts</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.postImage}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.postImage}
            contentFit="cover"
          />
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No posts yet</Text>}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: "#000",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "600",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
  },
  username: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 16,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
  },
  followButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 24,
  },
  followingButton: {
    backgroundColor: "#000",
  },
  followButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  followingButtonText: {
    color: "#fff",
  },
  postsHeader: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 300,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },
});
