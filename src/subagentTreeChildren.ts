import { Session, SubAgent } from './types';
import { splitSubagentsByStatus } from './subagentGrouping';
import { SubAgentGroupTreeItem, SubAgentTreeItem } from './treeItems';

/**
 * Children-list builders for the subagent-facing tree levels (extracted from
 * sessionTreeDataProvider.ts's getChildren purely to keep that file under its line budget — all
 * functions are pure and only touch what they are passed, no provider state).
 */

/**
 * Level 3: the Working Agents / Completed Agents folders under a session. Each subagent (own or
 * nested) is bucketed by its own tracked status — see subagentGrouping.ts's doc comment for why the
 * parent session's overall status must never override that.
 */
export function getSessionGroupChildren(session: Session, nested: SubAgent[]): SubAgentGroupTreeItem[] {
  const { working, completed } = splitSubagentsByStatus(session, nested);

  const groups: SubAgentGroupTreeItem[] = [];
  if (working.length > 0) {
    groups.push(new SubAgentGroupTreeItem('working', working, session));
  }
  if (completed.length > 0) {
    groups.push(new SubAgentGroupTreeItem('completed', completed, session));
  }
  return groups;
}

/** Level 4: subagents inside a Working/Completed group folder. */
export function getSubAgentGroupChildren(element: SubAgentGroupTreeItem): SubAgentTreeItem[] {
  return element.subagents.map((sub) => new SubAgentTreeItem(sub, element.parentSession));
}

/**
 * Level 5: "grandchildren" — subagents launched BY this subagent, one level deep only
 * (subagentMetadata.ts's attachNestedSubagents truncates anything deeper). Listed flat, not
 * grouped into Working/Completed sub-folders like level 4: their status is best-effort (mtime of
 * the sidecar's sibling .jsonl, not a parsed transcript — see SidecarMetadata.childStatus in
 * subagentMetadata.ts), and observed real-world counts are modest (~11 in the largest known
 * forked-skill-teammate case), so a whole extra grouping level would cost a click without adding
 * confidence the underlying status signal doesn't actually have. Reuses SubAgentTreeItem itself
 * (recursively) so a grandchild renders with the exact same icon/badge/tooltip logic as any
 * other subagent, for free.
 */
export function getNestedSubAgentChildren(element: SubAgentTreeItem): SubAgentTreeItem[] {
  const children = element.subagent.children ?? [];
  return children.map((child) => new SubAgentTreeItem(child, element.parentSession));
}
