export type IssueCategory = 'vehicle' | 'student' | 'route' | 'safety' | 'other';
export type IssuePriority = 'normal' | 'high' | 'emergency';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Issue {
  id: string;
  category: IssueCategory;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  vehicleId?: string;
  routeId?: string;
  tripId?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface NewIssue {
  category: IssueCategory;
  title: string;
  description: string;
  priority: IssuePriority;
  tripId?: string;
  photoUri?: string;
}
