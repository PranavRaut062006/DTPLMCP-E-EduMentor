import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

export function ProfilePanel({ departmentLabel = "Department" }: { departmentLabel?: string }) {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <form
      className="panel max-w-2xl p-6"
      onSubmit={(e) => {
        e.preventDefault();
        updateProfile({ fullName, department });
        setSaved(true);
      }}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-base">{initials || "?"}</AvatarFallback>
        </Avatar>
        <div>
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Camera className="mr-2 h-4 w-4" /> Change photo
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">PNG or JPG, up to 2 MB.</p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} readOnly className="opacity-70" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">{departmentLabel}</Label>
          <Input
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder={`Your ${departmentLabel.toLowerCase()}`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" value={user?.role ?? ""} readOnly className="capitalize opacity-70" />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="bio">About</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="A short introduction shown to your classrooms."
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit">Save changes</Button>
        {saved ? <span className="text-sm text-muted-foreground">Profile updated.</span> : null}
      </div>
    </form>
  );
}
