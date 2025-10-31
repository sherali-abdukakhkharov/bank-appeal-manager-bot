export interface District {
  id: number;
  name_uz: string;
  name_ru: string;
  is_central: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GovernmentOrganization {
  id: number;
  name_uz: string;
  name_ru: string;
  created_at: Date;
  updated_at: Date;
}

export interface MFONumber {
  id: number;
  mfo_code: string;
  district_id: number;
  created_at: Date;
  updated_at: Date;
}
