import { createContext, useState, ReactNode } from "react";
export const PostContext = createContext<{
  imageUri: string | undefined;
  description: string;
  alreadyPosted: boolean;
  tags?: any[]; // ← Add this
  setPostData: (uri: string, desc: string, alreadyPosted: boolean, tags?: any[]) => void;
  clearPostData: () => void;
}>({
  imageUri: undefined,
  description: "",
  alreadyPosted: false,
  tags: undefined,
  setPostData: () => {},
  clearPostData: () => {},
});

export function PostProvider({ children }: { children: ReactNode }) {
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [alreadyPosted, setAlreadyPosted] = useState(false);
  const [tags, setTags] = useState<any[] | undefined>(undefined);

  return (
    <PostContext.Provider
      value={{
        imageUri,
        description,
        alreadyPosted,
        tags,
        setPostData: (uri, desc, posted, t) => {
          setImageUri(uri);
          setDescription(desc);
          setAlreadyPosted(posted);
          setTags(t);
        },
        clearPostData: () => {
          setImageUri(undefined);
          setDescription("");
          setAlreadyPosted(false);
          setTags(undefined);
        },
      }}
    >
      {children}
    </PostContext.Provider>
  );
}