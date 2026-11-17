// robots.txt matching (RFC 9309): use the groups for our agent (else "*"); Allow/Disallow support
// "*" wildcards and a trailing "$"; the longest matching rule wins and Allow wins ties.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function compile(v) {
  const end = v.endsWith("$");
  return new RegExp("^" + (end ? v.slice(0, -1) : v).split("*").map(escape).join(".*") + (end ? "$" : ""));
}
export function parseRobots(text, ua) {
  const groups = []; let cur = null, inAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim(); const i = line.indexOf(":"); if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (key === "user-agent") { if (!inAgents) groups.push((cur = { agents: [], rules: [] })); cur.agents.push(v.toLowerCase()); inAgents = true; }
    else { inAgents = false; if (cur && (key === "allow" || key === "disallow") && v) cur.rules.push({ allow: key === "allow", len: v.length, re: compile(v) }); }
  }
  const name = ua.toLowerCase().split("/")[0];
  const own = groups.filter((g) => g.agents.some((a) => a !== "*" && name.startsWith(a)));
  return (own.length ? own : groups.filter((g) => g.agents.includes("*"))).flatMap((g) => g.rules);
}
export function robotsAllows(rules, pathAndQuery) {
  let best = null;
  for (const r of rules) if (r.re.test(pathAndQuery) && (!best || r.len > best.len || (r.len === best.len && r.allow))) best = r;
  return !best || best.allow;
}
