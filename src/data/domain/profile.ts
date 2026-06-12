export interface StaffDocument { id: string; label: string; value: string; ok?: boolean; }
export interface Profile { documents: StaffDocument[]; }
