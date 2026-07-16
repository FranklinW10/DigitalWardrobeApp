import { supabase } from "@/lib/supabase/client";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  profileImage?: string;
  isPrivate?: boolean;
  onboardingCompleated?: boolean;
  friendsStepCompleted?: boolean;
  PhoneAsked?: boolean;
}

interface AuthContextType {
  user: User | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const checkSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      if (!data) {
        console.error("No data returned");
        return null;
      }
      const authUser = await supabase.auth.getUser();
      if (!authUser.data.user) {
        console.error("No auth user found");
        return null;
      }
      return {
        id: data.id,
        name: data.name,
        username: data.username,
        email: authUser.data.user.email || "",
        phone: data.phone || "",
        profileImage: data.profile_image_url,
        isPrivate: data.isPrivate,
        onboardingCompleated: data.on_boarding_completed,
        friendsStepCompleted: data.friends_step_completed,
        PhoneAsked: data.PhoneAsked,
      };
    } catch (error) {
      console.error("Error in fethchUserProfile:", error);
      return null;
    }
  };
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      setUser(profile);
    }
  };

  const signInWithPhoneOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  };

  // Confirms the SMS code and completes the session.
  const verifyPhoneOtp = async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) throw error;
    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      setUser(profile);
    }
  };
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      setUser(profile);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (userData.name !== undefined) updateData.name = userData.name;
      if (userData.username !== undefined)
        updateData.username = userData.username;
      if (userData.profileImage !== undefined)
        updateData.profile_image_url = userData.profileImage;
      if (userData.isPrivate !== undefined)
        updateData.isPrivate = userData.isPrivate;
      if (userData.onboardingCompleated !== undefined)
        updateData.on_boarding_completed = userData.onboardingCompleated;
      if (userData.PhoneAsked !== undefined)
        updateData.PhoneAsked = userData.PhoneAsked;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.friendsStepCompleted !== undefined)
        updateData.friends_step_completed = userData.friendsStepCompleted;
      const { error, data } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const profile = await fetchUserProfile(data.id);
        setUser(profile);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        signUp,
        signIn,
        signInWithPhoneOtp,
        verifyPhoneOtp,
        updateUser,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("must be inside the provider");
  }
  return context;
};
