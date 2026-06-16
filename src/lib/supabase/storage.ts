import {
    File
} from "expo-file-system";
import { supabase } from "@/lib/supabase/client";



export const uploadProfileImage = async (userId: string, imageUri: string) => {
    try{
        const fileExtention = imageUri.split(".").pop() || "jpg";
        const fileName = `${userId}/profile.${fileExtention}`;
        const file = new File(imageUri);
        const bytes = await file.bytes();

        const {error} = await supabase.storage.from('profiles').upload(fileName, bytes, {
            contentType: `image/${fileExtention}`,
            upsert: true,
        });

        if(error){
            throw error;
        }

        const {data: urlData} = supabase.storage
            .from("profiles")
            .getPublicUrl(fileName);
        return `${urlData.publicUrl}?t=${Date.now()}`
    }catch(error){
        console.error("Error uploading profile image:", error);
        throw error;


    }

}

export const uploadPostImage = async (userId: string, imageUri: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Session when uploading:", session?.user?.id);

    try{
        const fileExtention = imageUri.split(".").pop() || "jpg";
        const fileName = `${userId}/${Date.now()}.${fileExtention}`;
        const file = new File(imageUri);
        const bytes = await file.bytes();
        console.log("Uploading to path:", fileName);
        console.log("User ID:", userId);

        const {error} = await supabase.storage.from('posts').upload(fileName, bytes, {
            contentType: `image/${fileExtention}`,
            upsert: false,
        });

        if(error){
            throw error;
        }

        const {data: urlData} = supabase.storage
            .from("posts")
            .getPublicUrl(fileName);
        return urlData.publicUrl
    }catch(error){
        console.error("Error uploading post image:", error);
        throw error;


    }

}