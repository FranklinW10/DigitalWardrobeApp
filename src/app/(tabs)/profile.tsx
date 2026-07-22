import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import {
  ModalHaulPostCard,
  ModalPostCard,
  ProfilePostCard,
} from "@/components/PostCard";
import { palettes, themeMeta, ThemeName } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Liker } from "@/hooks/useLikes";
import { Post, usePosts } from "@/hooks/usePosts";
import { supabase } from "@/lib/supabase/client";
import { uploadProfileImage } from "@/lib/supabase/storage";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform } from "react-native";

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
  phone?: string;
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
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);

  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("light");
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | null>(
    null,
  );
  const { colors, setTheme } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

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
      setPhone(user.phone);
      setIsPrivate(user.isPrivate ?? false);
      setSelectedTheme((user as any).theme ?? "light");
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

    const digits = phone.replace(/\D/g, "");
    if (phone.trim().length > 0 && (digits.length < 10 || digits.length > 15)) {
      setPhoneError("Please enter a valid phone number");
      return;
    }
    setPhoneError(null);

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
      await setTheme(selectedTheme);

      await updateUser({
        name,
        username,
        isPrivate,
        phone: digits.length > 0 ? digits : undefined,
        theme: selectedTheme,
      });
      setProfileUser((prev) =>
        prev
          ? { ...prev, name, username, isPrivate, phone: digits || prev.phone }
          : prev,
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
          <Ionicons name="person-add-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topHeaderUsername}>@{user?.username}</Text>
        <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
          <Ionicons name="menu" size={26} color={colors.text} />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary} // iOS spinner color
              colors={[colors.primary]}
            />
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
              <Ionicons name="options-outline" size={18} color={colors.text} />
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
                      color={
                        filter === opt.value
                          ? colors.background
                          : colors.textMuted
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.editModalContent}
              onPress={Keyboard.dismiss}
            >
              <Text style={styles.title}>Edit Profile</Text>
              <Text style={styles.subtitle}>Update your information</Text>

              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.form}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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
                  ref={nameInputRef}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => usernameInputRef.current?.focus()}
                />

                <Text style={styles.inputHeader}>Username</Text>
                <TextInput
                  ref={usernameInputRef}
                  placeholder="Username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.inputHeader}>Phone Number</Text>
                <TextInput
                  placeholder="Phone Number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (phoneError) setPhoneError(null);
                  }}
                  style={styles.input}
                />
                {phoneError && (
                  <Text style={styles.errorText}>{phoneError}</Text>
                )}

                <View style={styles.privacyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputHeader}>Private Account</Text>
                    <Text style={styles.privacyHint}>
                      Only approved followers can see your posts
                    </Text>
                  </View>
                  <Switch value={isPrivate} onValueChange={setIsPrivate} />
                </View>
                <Text style={styles.inputHeader}>Theme</Text>
                <View style={styles.themeDotRow}>
                  {(Object.keys(palettes) as ThemeName[]).map((name) => {
                    const palette = palettes[name];
                    const isActive = name === selectedTheme;
                    return (
                      <TouchableOpacity
                        key={name}
                        onPress={() => setSelectedTheme(name)}
                        activeOpacity={0.8}
                        style={styles.themeDotWrap}
                      >
                        <View
                          style={[
                            styles.themeStack,
                            {
                              borderColor: isActive
                                ? colors.text
                                : "transparent",
                              borderWidth: isActive ? 2 : 0,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.themeStackDot,
                              { backgroundColor: palette.primary },
                            ]}
                          />
                          <View
                            style={[
                              styles.themeStackDot,
                              styles.themeStackDotMiddle,
                              { backgroundColor: palette.accent },
                            ]}
                          />
                          <View
                            style={[
                              styles.themeStackDot,
                              styles.themeStackDotBack,
                              {
                                backgroundColor: palette.surface,
                                borderWidth: 1,
                                borderColor: palette.border,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.themeStackLabel,
                            { color: colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {themeMeta[name].label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleComplete}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size={24} color={colors.background} />
                  ) : (
                    <Text style={styles.buttontext}>Save Changes</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    imagecontainer: {
      marginBottom: 16,
      position: "relative",
    },
    profileImage: {
      width: 110,
      height: 110,
      borderRadius: 55,
      marginBottom: 16,
    },
    placeholderimage: {
      width: 110,
      height: 110,
      backgroundColor: colors.surface,
      borderRadius: 55,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    placeholderText: {
      fontSize: 40,
      color: colors.secondary,
    },
    inputHeader: {
      fontSize: 13,
      alignSelf: "flex-start",
      color: colors.textMuted,
      paddingHorizontal: 2,
      paddingBottom: 4,
      paddingTop: 6,
    },
    themeDotRow: {
      flexDirection: "row",
      gap: 18,
      marginTop: 6,
      marginBottom: 18,
      alignSelf: "flex-start",
      paddingHorizontal: 2,
    },
    themeDotWrap: {
      alignItems: "center",
      gap: 6,
    },
    themeStack: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    themeStackDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      position: "absolute",
    },
    themeStackDotMiddle: {
      left: 10,
      top: 2,
    },
    themeStackDotBack: {
      left: 14,
      top: 10,
    },
    themeStackLabel: {
      fontSize: 12,
      fontWeight: "500",
    },
    optionsContainer: {
      position: "absolute",
      top: 375,
      right: 8,
      alignItems: "flex-end",
      zIndex: 10,
    },

    editModalContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      width: "100%",
      maxHeight: "85%",
      overflow: "hidden",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    formScroll: {
      width: "100%",
    },
    form: {
      width: "100%",
      alignItems: "center",
      paddingBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 2,
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      marginBottom: 16,
      color: colors.textMuted,
    },

    input: {
      backgroundColor: colors.surface,
      width: "100%",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    privacyRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 4,
      width: "100%",
    },
    privacyHint: {
      fontSize: 11,
      color: colors.secondary,
      marginTop: 1,
    },

    themeDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    button: {
      backgroundColor: colors.primary,
      width: "100%",
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 4,
    },
    cancelModalButton: {
      marginTop: 8,
      width: "100%",
      paddingVertical: 10,
      alignItems: "center",
    },
    themeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      width: "100%",
      marginTop: 8,
      marginBottom: 20,
    },
    themeSwatchCard: {
      width: "48%",
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },

    themeSwatchLabel: {
      fontSize: 13,
      fontWeight: "600",
      marginTop: 8,
    },
    optionsButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface + "EC", // using 92% opacity hex modifier
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    optionsPill: {
      backgroundColor: colors.surface + "F2", // using 95% opacity hex modifier
      borderRadius: 24,
      marginTop: 6,
      paddingVertical: 5,
      shadowColor: colors.primary,
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
      backgroundColor: colors.primary,
    },
    pillOptionActive: {
      backgroundColor: colors.primary,
    },
    pillDivider: {
      width: 1,
      height: 16,
      backgroundColor: colors.border,
    },
    whitespace: {
      padding: 5,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 32,
    },
    profileSection: {
      alignItems: "center",
      marginBottom: 32,
      paddingBottom: 32,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    profileImagePlaceholder: {
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    profileImageText: {
      fontSize: 40,
      fontWeight: "600",
      color: colors.textMuted,
    },
    editBadge: {
      position: "absolute",
      bottom: 10,
      left: "50%",
      transform: [{ translateX: -22 }],
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    editEditBadge: {
      position: "absolute",
      bottom: 10,
      left: "15%",
      transform: [{ translateX: -22 }],
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    errorText: {
      color: colors.error || "#ff3b30",
      fontSize: 12,
      marginTop: 4,
    },
    editBadgeText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
    name: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 4,
      color: colors.text,
    },
    username: {
      fontSize: 16,
      color: colors.textMuted,
      marginBottom: 12,
    },
    email: {
      fontSize: 14,
      color: colors.secondary,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 16,
      color: colors.text,
    },
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
    },
    settingLabel: {
      fontSize: 18,
      color: colors.secondary,
    },
    settingValue: {
      fontSize: 18,
      color: colors.secondary,
    },
    signOutButton: {
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    signOutText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    deleteButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.error || "#ff3b30",
    },
    deleteText: {
      fontSize: 16,
      color: colors.error || "#ff3b30",
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
      color: colors.text,
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      marginBottom: 12,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 36,
      fontWeight: "600",
      color: colors.text,
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
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    followButton: {
      paddingHorizontal: 32,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      marginBottom: 24,
    },
    followingButton: {
      backgroundColor: colors.primary,
    },
    followButtonText: {
      fontWeight: "600",
      fontSize: 14,
      color: colors.primary,
    },
    followingButtonText: {
      color: colors.background,
    },
    postsHeader: {
      alignSelf: "flex-start",
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    postImage: {
      width: "100%",
      height: 300,
      marginBottom: 8,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 40,
    },
    topHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topHeaderUsername: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    tabSwitcher: {
      flexDirection: "row",
      marginHorizontal: -26,
      marginBottom: 9,
      padding: 1,
    },

    activeTab: {
      flex: 1,
      paddingVertical: 6,
      alignItems: "center",
      borderRadius: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
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
      color: colors.textMuted,
    },
    activeTabText: {
      color: colors.text,
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
      backgroundColor: colors.background,
      overflow: "hidden",
      marginBottom: 2,
      shadowColor: colors.primary,
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
      color: colors.text,
      textAlign: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
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
      color: colors.error || "red",
    },
    image: {
      width: 200,
      height: 200,
    },

    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      width: "95%",
      maxHeight: "85%",
      overflow: "hidden",
    },

    editText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },

    linkbutton: {
      marginTop: 24,
      alignItems: "center",
    },
    linkbuttontext: {
      color: colors.textMuted,
      fontSize: 14,
    },
    linkbuttontextbold: {
      fontWeight: "600",
      color: colors.text,
    },
    buttontext: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    modalBackdrop: {
      flex: 1,
      width: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },

    cancelModalButtonText: {
      fontSize: 16,
      color: colors.textMuted,
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
      backgroundColor: colors.background,
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
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    },
    exploreButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: "600",
    },
  });
