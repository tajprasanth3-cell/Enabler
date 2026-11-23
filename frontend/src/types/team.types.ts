export interface Team {
  id: string;
  name: string;
  teamLeadId?: string | null;
  teamLeadName?: string | null;
  bdeCount: number;
  activeLeadsCount: number;
  convertedLeadsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'TEAM_LEAD' | 'BDE';
  status: 'ACTIVE' | 'INACTIVE';
  currentAssignedLeads: number;
  pendingLeads: number;
  convertedLeads: number;
  isPunchedInToday: boolean;
}
