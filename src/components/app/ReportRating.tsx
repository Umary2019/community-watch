import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export function ReportRating({
  reportId,
  reporterId,
  currentUserId,
  status,
}: {
  reportId: string;
  reporterId: string;
  currentUserId: string;
  status: string;
}) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");

  const { data: rating } = useQuery({
    queryKey: ["report-rating", reportId],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_ratings")
        .select("*")
        .eq("report_id", reportId)
        .maybeSingle();
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (stars < 1) throw new Error("Please pick a star rating");
      const { error } = await supabase.from("report_ratings").insert({
        report_id: reportId,
        reporter_id: currentUserId,
        stars,
        feedback: feedback.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you for your feedback");
      qc.invalidateQueries({ queryKey: ["report-rating", reportId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isReporter = currentUserId === reporterId;
  const isClosed = status === "resolved" || status === "closed";

  // Nothing to render for reporter until closure and if no rating exists
  if (!rating && (!isReporter || !isClosed)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service satisfaction</CardTitle>
      </CardHeader>
      <CardContent>
        {rating ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-5 w-5 ${
                    n <= rating.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating.stars}/5 · submitted {formatDate(rating.created_at)}
              </span>
            </div>
            {rating.feedback && (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">"{rating.feedback}"</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your case has been {status}. Please rate how it was handled.
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setStars(n)}
                  className="p-1"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-7 w-7 transition ${
                      (hover || stars) >= n
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Optional feedback (what went well, what could improve)…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <Button onClick={() => submit.mutate()} disabled={submit.isPending || stars < 1}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit rating
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}