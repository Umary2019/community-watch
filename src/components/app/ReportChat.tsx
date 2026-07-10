import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

type Msg = {
  id: string;
  report_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function ReportChat({
  reportId,
  currentUserId,
  reporterId,
  officerId,
}: {
  reportId: string;
  currentUserId: string;
  reporterId: string;
  officerId: string | null;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["report-messages", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_messages")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`report-messages-${reportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_messages", filter: `report_id=eq.${reportId}` },
        () => qc.invalidateQueries({ queryKey: ["report-messages", reportId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId, qc]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark unread messages (from other party) as read
  useEffect(() => {
    const unread = messages.filter((m) => m.sender_id !== currentUserId && !m.read_at);
    if (unread.length === 0) return;
    supabase
      .from("report_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((m) => m.id))
      .then(({ error }) => {
        if (error) console.warn("mark read failed", error.message);
      });
  }, [messages, currentUserId]);

  const canSend =
    currentUserId === reporterId ||
    (officerId !== null && currentUserId === officerId);

  async function send() {
    const text = body.trim();
    if (!text) return;
    if (text.length > 2000) return toast.error("Message too long (2000 chars max)");
    setSending(true);
    const { error } = await supabase
      .from("report_messages")
      .insert({ report_id: reportId, sender_id: currentUserId, body: text });
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
    qc.invalidateQueries({ queryKey: ["report-messages", reportId] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case messages</CardTitle>
        <p className="text-xs text-muted-foreground">
          Private conversation between the reporter and the assigned officer.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-72 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 space-y-2">
          {isLoading ? (
            <div className="text-xs text-muted-foreground">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              No messages yet. {canSend ? "Say hello to get things moving." : ""}
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <div
                      className={`text-[10px] mt-1 ${
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatDate(m.created_at)}
                      {mine && m.read_at ? " · read" : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {canSend ? (
          !officerId && currentUserId === reporterId ? (
            <div className="text-xs text-muted-foreground italic">
              Messaging opens once an officer has been assigned to your case.
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Write a message…  (Cmd/Ctrl+Enter to send)"
                rows={2}
                maxLength={2000}
                className="flex-1"
              />
              <Button onClick={send} disabled={sending || !body.trim()} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          )
        ) : (
          <div className="text-xs text-muted-foreground italic">
            You are viewing this conversation in a read-only capacity.
          </div>
        )}
      </CardContent>
    </Card>
  );
}