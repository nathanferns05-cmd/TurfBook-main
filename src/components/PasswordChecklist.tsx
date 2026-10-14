import { PASSWORD_RULES } from "@/lib/password";
import { Check, Circle } from "lucide-react";

export function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs ${
              ok ? "text-success" : "text-muted-foreground"
            }`}
          >
            {ok ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}