import { Post } from "@/hooks/usePosts";

export const getStreakPostIds = (posts: Post[]) => {
  const streakPostIds = new Set<string>();

  const outfitPosts = posts.filter((p) => p.isoutfit_post);

  for (const post of outfitPosts) {
    const streak = Number(post.streak);

    if (!streak || streak < 3) continue;

    const postDate = new Date(post.created_at);

    for (let i = 0; i < streak; i++) {
      const streakDate = new Date(postDate);
      streakDate.setDate(postDate.getDate() - i);

      const matchingPost = outfitPosts.find((p) => {
        const pDate = new Date(p.created_at);

        return (
          pDate.getFullYear() === streakDate.getFullYear() &&
          pDate.getMonth() === streakDate.getMonth() &&
          pDate.getDate() === streakDate.getDate()
        );
      });

      if (matchingPost) {
        streakPostIds.add(matchingPost.id);
      }
    }
  }

  return streakPostIds;
};
