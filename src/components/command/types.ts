import type { Dispatch, SetStateAction } from 'react';
import type { DemoWorkspace } from '@/lib/demo-crm-data';

export type CommandViewProps = {
  workspace: DemoWorkspace;
  setWorkspace: Dispatch<SetStateAction<DemoWorkspace>>;
  demoEnabled: boolean;
  isOwner: boolean;
  displayName: string;
};
