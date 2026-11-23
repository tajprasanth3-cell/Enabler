export interface BDEMetrics {
  bdeId: string;
  bdeName: string;
  totalLeadsAssigned: number;
  contactedLeads: number;
  interestedLeads: number;
  followUpsCompleted: number;
  successfulConversions: number;
  pendingLeads: number;
  notInterestedLeads: number;
  notReachableLeads: number;
  lostLeads: number;
  conversionPercentage: number;
  attendancePresentDays: number;
  workingDaysTotal: number;
}

export interface TeamLeadMetrics {
  teamId: string;
  teamName: string;
  teamLeadId: string;
  teamLeadName: string;
  totalLeadsReceived: number;
  totalLeadsDistributed: number;
  totalTeamConversions: number;
  teamConversionPercentage: number;
  activeBdeCount: number;
  pendingFollowUps: number;
  bdePerformanceList: BDEMetrics[];
}

export interface AdminOrgMetrics {
  totalLeadsUploaded: number;
  totalLeadsAllocated: number;
  overallConversions: number;
  overallConversionPercentage: number;
  totalActiveBDEs: number;
  totalInactiveBDEs: number;
  totalActiveTeams: number;
  teamPerformanceList: TeamLeadMetrics[];
}
