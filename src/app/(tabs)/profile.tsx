import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import {
  ModalHaulPostCard,
  ModalPostCard,
  ProfilePostCard,
} from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { Liker } from "@/hooks/useLikes";
import { Post, usePosts } from "@/hooks/usePosts";
import { supabase } from "@/lib/supabase/client";

import { uploadProfileImage } from "@/lib/supabase/storage";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProfileUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export default function Profile() {
  const [refreshing, setRefreshing] = useState(false);
  const { refreshPosts } = usePosts();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const { user, updateUser, signOut } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"fits" | "hauls">("fits");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Separate loading state for the form submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilter, setShowFilter] = useState(true);
  const filteredPosts = posts.filter((post) =>
    activeTab === "fits" ? post.isoutfit_post : !post.isoutfit_post,
  );
  const [likerPostId, setLikerPostId] = useState<string | null>(null);
  const tabScrollRef = useRef<ScrollView>(null); // tab pager
  const [showOptions, setShowOptions] = useState(false);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isLoadingLikers, setIsLoadingLikers] = useState(false);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | null>(
    null,
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPosts();
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };
  const choosefilteredPosts = posts
    .filter((post) =>
      activeTab === "fits" ? post.isoutfit_post : !post.isoutfit_post,
    )
    .filter((post) => {
      if (filter === "public") return post.is_public;
      if (filter === "private") return !post.is_public;
      return true;
    });

  const handleOpenLikers = async (postId: string) => {
    setLikerPostId(postId);
    setIsLoadingLikers(true);
    const { data } = await supabase
      .from("likes")
      .select("user_id, profiles(username, name, profile_image_url)")
      .eq("post_id", postId);
    setLikers((data as any) ?? []);
    setIsLoadingLikers(false);
  };

  // Pass a callback down into your modal post cards
  const handleOpenComments = (postId: string, postOwnerId: string) => {
    console.log("postId:", postId, "postOwnerId:", postOwnerId);
    setCommentPostId(postId);
    setCommentPostOwnerId(postOwnerId);
  };

  const renderExplorePost = ({ item }: { item: Post }) => (
    <ProfilePostCard
      post={item}
      currentUserId={user?.id}
      onPress={() => {
        (setSelectedPost(item), setShowFilter(false));
      }}
    />
  );
  useEffect(() => {
    if (showModal && user) {
      setName(user.name);
      setUsername(user.username);
      setIsPrivate(user.isPrivate ?? false);
    }
  }, [showModal, user]);

  const handleUpdateProfileImage = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera roll permissions to select an Image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setIsUpdating(true);
      try {
        const imageUrl = await uploadProfileImage(
          user.id,
          result.assets[0].uri,
        );
        await updateUser({ profileImage: imageUrl });
        Alert.alert("Success", "Profile Image Updated");
      } catch (error) {
        console.error("Error updating profile image:", error);
        Alert.alert(
          "Error",
          "Failed to update profile image. Please try again.",
        );
      } finally {
        setIsUpdating(false);
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, username, profile_image_url")
        .eq("id", user?.id)
        .single();
      if (profileError) throw profileError;
      setProfileUser(profile);

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*, profiles(*), images(*)")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("post_date", { ascending: false });
      if (postsError) throw postsError;
      setPosts(postsData ?? []);

      // Load follower count
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user?.id)
        .eq("status", true);
      setFollowerCount(followers ?? 0);

      // Load following count
      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user?.id)
        .eq("status", true);
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

  const tabSwitcher = (
    <View style={styles.tabSwitcher}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "fits" && styles.activeTab]}
        onPress={() => {
          setActiveTab("fits");
          tabScrollRef.current?.scrollTo({ x: 0, animated: true });
        }}
      >
        <Text
          style={[styles.tabText, activeTab === "fits" && styles.activeTabText]}
        >
          Fits
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "hauls" && styles.activeTab]}
        onPress={() => {
          setActiveTab("hauls");
          tabScrollRef.current?.scrollTo({
            x: SCREEN_WIDTH,
            animated: true,
          });
        }}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "hauls" && styles.activeTabText,
          ]}
        >
          Hauls
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleComplete = async () => {
    if (!name || !username) {
      Alert.alert("Error", "Please fill in all fields");
      return; // ← was missing
    }
    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return; // ← was missing
    }

    setIsSubmitting(true);
    try {
      if (!user) throw new Error("User not authenticated");

      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .single();

      if (existingUser) {
        Alert.alert(
          "Error",
          "This username is taken, please choose another one.",
        );
        return;
      }

      await updateUser({
        name,
        username,
        isPrivate,
      });
      setProfileUser((prev) =>
        prev ? { ...prev, name, username, isPrivate } : prev,
      );
      setShowModal(false); // ← close modal on success
    } catch (error) {
      Alert.alert("Error", "Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostOptions = (post: Post) => {
    const options = [
      {
        text: post.is_public ? "Switch to archive" : "Switch to Public",
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_public: !post.is_public })
            .eq("id", post.id);
          setSelectedPost(null);
        },
      },
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
          setSelectedPost(null);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };
  const handleOldPostOptions = (post: Post) => {
    const options = [
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
          setSelectedPost(null);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };
  console.log("user.isPrivate:", user?.isPrivate);
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {selectedPost && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPost(null)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            {selectedPost.isoutfit_post ? (
              <ModalPostCard
                post={selectedPost}
                currentUserId={user?.id}
                onNavigateAway={() => setSelectedPost(null)}
                onOpenComments={handleOpenComments}
                onOpenLikers={handleOpenLikers}
              />
            ) : (
              <ModalHaulPostCard
                post={selectedPost}
                currentUserId={user?.id}
                onNavigateAway={() => setSelectedPost(null)}
                onOpenComments={handleOpenComments}
                onOpenLikers={handleOpenLikers}
              />
            )}
          </View>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => {
              if (selectedPost.ispostedontime === false) {
                handleOldPostOptions(selectedPost);
              } else {
                handlePostOptions(selectedPost);
              }
            }}
          >
            <Text style={styles.exploreButtonText}>Post Options</Text>
          </TouchableOpacity>
        </View>
      )}

      <CommentsSheet
        postId={commentPostId ?? ""}
        postOwnerId={commentPostOwnerId ?? ""}
        visible={commentPostId !== null}
        onClose={() => {
          setCommentPostId(null);
          setCommentPostOwnerId(null);
        }}
      />
      <LikersSheet
        likers={likers}
        isLoading={isLoadingLikers}
        visible={likerPostId !== null}
        onClose={() => setLikerPostId(null)}
      />
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.push("/(profile)/suggestedFriends")}
        >
          <Ionicons name="person-add-outline" size={20} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topHeaderUsername}>@{user?.username}</Text>
        <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
          <Ionicons name="menu" size={26} color="#000" />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <FlatList
          key={activeTab + filter}
          numColumns={3}
          data={choosefilteredPosts}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: 2 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleUpdateProfileImage}
                disabled={isUpdating}
              >
                <View>
                  {user?.profileImage ? (
                    <Image
                      source={{ uri: user.profileImage }}
                      style={styles.profileImage}
                      cachePolicy={"memory"}
                    />
                  ) : (
                    <View
                      style={[
                        styles.profileImage,
                        styles.profileImagePlaceholder,
                      ]}
                    >
                      <Text style={styles.profileImageText}>
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </Text>
                    </View>
                  )}

                  <View style={styles.editBadge}>
                    <Text style={styles.editBadgeText}>Edit</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Name + username */}
              <Text style={styles.name}>{profileUser?.name}</Text>
              <Text style={styles.username}>@{profileUser?.username}</Text>

              {/* Follower counts */}
              <View style={styles.statsRow}>
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: "/(profile)/followList",
                      params: { initialTab: "followers" },
                    });
                  }}
                >
                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>{followerCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: "/(profile)/followList",
                      params: { initialTab: "following" },
                    });
                  }}
                >
                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>{followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{posts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
              </View>

              {/* Follow button */}

              <TouchableOpacity
                style={styles.followButton}
                onPress={() => {
                  setName(profileUser?.name ?? "");
                  setUsername(profileUser?.username ?? "");
                  setShowModal(true);
                }}
              >
                <Text style={styles.followButtonText}>{"Edit Profile"}</Text>
              </TouchableOpacity>

              {/* <TouchableOpacity
              style={styles.followButton}
              onPress={() => setShowCalendar(true)}
            >
              <CalendarView
                posts={posts}
                visible={showCalendar}
                onClose={() => setShowCalendar(false)}
              />
            </TouchableOpacity> */}

              {tabSwitcher}
            </View>
          }
          renderItem={renderExplorePost}
          ListEmptyComponent={
            <View>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          }
        />
        {/* Floating options button + pill dropdown */}

        {!selectedPost && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => setShowOptions(!showOptions)}
            >
              <Ionicons name="options-outline" size={18} color="#000" />
            </TouchableOpacity>
            {showOptions && (
              <View style={styles.optionsPill}>
                {[
                  { value: "all", icon: "grid-outline" },
                  { value: "public", icon: "earth-outline" },
                  { value: "private", icon: "lock-closed-outline" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.pillOption}
                    onPress={() => setFilter(opt.value as any)}
                  >
                    {filter === opt.value && (
                      <View style={styles.pillSelector} />
                    )}
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={filter === opt.value ? "#fff" : "#888"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      <Modal visible={showModal} transparent animationType="slide">
        {/* ← Backdrop — closes modal on press */}
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          {/* ← Stop press from bubbling up and closing when tapping inside */}
          <TouchableOpacity activeOpacity={1} style={styles.editModalContent}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your information</Text>

            <View style={styles.form}>
              <TouchableOpacity
                style={styles.imagecontainer}
                onPress={handleUpdateProfileImage}
              >
                {user?.profileImage ? (
                  <Image
                    cachePolicy="memory"
                    source={{ uri: user.profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.placeholderimage}>
                    <Text style={styles.placeholderText}>+</Text>
                  </View>
                )}
                {user?.profileImage && (
                  <View style={styles.editEditBadge}>
                    <Text style={styles.editBadgeText}>Edit</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.inputHeader}>Full Name</Text>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoCapitalize="words"
              />
              <Text style={styles.inputHeader}>Username</Text>
              <TextInput
                placeholder="Username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
              />
              <View style={styles.privacyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputHeader}>Private Account</Text>
                  <Text style={styles.privacyHint}>
                    {" "}
                    Only approved followers can see your posts
                  </Text>
                </View>
                <Switch value={isPrivate} onValueChange={setIsPrivate} />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleComplete}>
                {isSubmitting ? (
                  <ActivityIndicator size={24} color="#fff" />
                ) : (
                  <Text style={styles.buttontext}>Save Changes</Text>
                )}
              </TouchableOpacity>

              {/* Cancel button */}
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    position: "absolute",
    top: 350,
    right: 8,
    alignItems: "flex-end",
    zIndex: 10,
  },
  optionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  optionsPill: {
    backgroundColor: "rgba(240,240,240,0.95)",
    borderRadius: 24,
    marginTop: 6,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  pillOption: {
    width: 36,
    height: 36,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  pillSelector: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000",
  },
  pillOptionActive: {
    backgroundColor: "#000",
  },
  pillDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#e0e0e0",
  },
  whitespace: {
    padding: 5,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 32,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: 40,
    fontWeight: "600",
    color: "#666",
  },
  editBadge: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: [{ translateX: -22 }],
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editEditBadge: {
    position: "absolute",
    bottom: 10,
    left: "15%",
    transform: [{ translateX: -22 }],
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#000",
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#999",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 18,
    color: "#999",
  },
  settingValue: {
    fontSize: 18,
    color: "#999",
  },
  signOutButton: {
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
  },
  signOutText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  deleteText: {
    fontSize: 16,
    color: "#ff3b30",
    fontWeight: "500",
  },

  header: {
    alignItems: "center",
    padding: 20,
    marginBottom: -30,
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
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  topHeaderUsername: {
    fontSize: 18,
    fontWeight: "700",
  },

  tabSwitcher: {
    flexDirection: "row",
    marginHorizontal: -26,
    marginBottom: 9,

    padding: 1,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  privacyHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  activeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 8,
  },
  tabText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#888",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "600",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  postContainer: {
    backgroundColor: "#fff",

    overflow: "hidden",
    marginBottom: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  modalButtons: {
    marginTop: 8,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  helloworldTitle: {
    color: "red",
  },
  image: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "95%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    color: "#666",
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  imagecontainer: {
    marginBottom: 32,
    position: "relative",
  },

  placeholderimage: {
    width: 120,
    height: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 48,
    color: "#999",
  },

  editText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f5f5f5",
    width: "100%",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  button: {
    backgroundColor: "#000",
    width: "100%",

    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  linkbutton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkbuttontext: {
    color: "#666",
    fontSize: 14,
  },
  linkbuttontextbold: {
    fontWeight: "600",
    color: "#000",
  },
  buttontext: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  editModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "85%",
    overflow: "hidden",
    padding: 24,
    paddingTop: 32,
  },

  cancelModalButton: {
    marginTop: 12,
    width: "100%",
    padding: 16,
    alignItems: "center",
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: "#666",
  },

  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalPostContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "95%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  inputHeader: {
    fontSize: 16,

    alignSelf: "flex-start",
    color: "#666",
    padding: 5,
  },
});
