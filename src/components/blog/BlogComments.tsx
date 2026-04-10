import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  slug: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
  liked_by_me?: boolean;
}

const BlogComments = ({ slug }: { slug: string }) => {
  const { user } = useProfile();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("blog_comments")
      .select("*")
      .eq("slug", slug)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch profiles and likes
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
    
    let myLikes: string[] = [];
    if (user) {
      const { data: likes } = await supabase
        .from("blog_comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", data.map(c => c.id));
      myLikes = (likes || []).map(l => l.comment_id);
    }

    const enriched = data.map(c => ({
      ...c,
      profile: profiles?.find(p => p.user_id === c.user_id),
      liked_by_me: myLikes.includes(c.id),
    }));
    setComments(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [slug, user]);

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("blog_comments").insert({
      slug, user_id: user.id, content: newComment.trim(),
    });
    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      setNewComment("");
      fetchComments();
    }
    setSubmitting(false);
  };

  const toggleLike = async (commentId: string, liked: boolean) => {
    if (!user) return;
    if (liked) {
      await supabase.from("blog_comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
    } else {
      await supabase.from("blog_comment_likes").insert({ comment_id: commentId, user_id: user.id });
    }
    fetchComments();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("blog_comments").delete().eq("id", id);
    fetchComments();
  };

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <h3 className="font-heading text-base sm:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        Commentaires ({comments.length})
      </h3>

      {user ? (
        <div className="mb-6 space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Écrire un commentaire..."
            className="text-sm min-h-[80px]"
          />
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !newComment.trim()} className="text-xs">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Publier
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-lg bg-muted text-center">
          <p className="text-xs text-muted-foreground mb-2">Connectez-vous pour commenter</p>
          <Link to="/auth"><Button size="sm" variant="hero" className="text-xs">Se connecter</Button></Link>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Soyez le premier à commenter !</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary">
                    {(c.profile?.full_name || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{c.profile?.full_name || "Utilisateur"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => toggleLike(c.id, !!c.liked_by_me)}
                    className={`flex items-center gap-1 text-xs transition-colors ${c.liked_by_me ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                    disabled={!user}
                  >
                    <Heart className={`w-3.5 h-3.5 ${c.liked_by_me ? "fill-current" : ""}`} />
                    {c.likes_count > 0 && <span>{c.likes_count}</span>}
                  </button>
                  {user && c.user_id === user.id && (
                    <button onClick={() => deleteComment(c.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogComments;
