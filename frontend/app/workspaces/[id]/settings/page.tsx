import { WorkspaceSettingsPage } from '@/features/workspaces/WorkspaceSettingsPage';

// Phase 39 — workspace settings route.
//   /workspaces/{id}/settings  →  Settings, Members, Invitations, Activity tabs.
//   The page handles its own loading / error states.

export default function Page({ params }: { params: { id: string } }) {
  return <WorkspaceSettingsPage workspaceId={params.id} />;
}
