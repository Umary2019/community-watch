import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: Categories,
});

function Categories() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: async () => (await supabase.from("crime_categories").select("*").order("name")).data ?? [],
  });

  const add = useMutation({
    mutationFn: async (fd: FormData) => {
      const name = String(fd.get("name") || "").trim();
      if (!name) throw new Error("Name required");
      const { error } = await supabase.from("crime_categories").insert({
        name, description: String(fd.get("description") || "") || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category added"); qc.invalidateQueries({ queryKey: ["categories-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("crime_categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories-admin"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crime_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["categories-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">Crime categories</h1>
      <Card>
        <CardHeader><CardTitle>Add category</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); add.mutate(new FormData(e.currentTarget)); (e.currentTarget as HTMLFormElement).reset(); }} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <Input name="name" placeholder="Name" required />
            <Input name="description" placeholder="Description (optional)" />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.description}</TableCell>
                  <TableCell><Switch checked={c.is_active} onCheckedChange={(v) => toggle.mutate({ id: c.id, is_active: v })} /></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => confirm(`Delete ${c.name}?`) && remove.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}