import type { User } from "../../lib/types";
import { GOpostClassic } from "./GOpostClassic";

export function GOpostApp({ user }: { user: User }) {
  return <GOpostClassic user={user} embedded />;
}
