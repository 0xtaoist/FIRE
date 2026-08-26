import { redirect } from "next/navigation";

// The old technical docs page described a superseded version of the protocol
// (4% buy tax, LP/payout split, burn governor — all obsolete). It's replaced
// by the plain-language guide at /how-it-works. This redirect keeps every
// existing /docs link and bookmark working, pointing at the current page.
export default function DocsRedirect() {
  redirect("/how-it-works");
}
