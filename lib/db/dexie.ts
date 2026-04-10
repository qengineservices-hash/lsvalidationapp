import Dexie, { type Table } from "dexie";

export interface LocalValidation {
  id: string; // matches uuid from supabase
  request_id: string;
  project_id: string;
  sync_status: "pending" | "synced" | "failed";
  last_modified: number;
  data: any; // the full validation state
}

export interface LocalPhoto {
  id: string;
  validation_id: string;
  room_id?: string;
  category: string;
  blob: Blob;
  annotations: any[];
  sync_status: "pending" | "synced" | "failed";
  captured_at: number;
}

export class LSServicesDB extends Dexie {
  validations!: Table<LocalValidation>;
  photos!: Table<LocalPhoto>;

  constructor() {
    super("LSServicesApp");
    this.version(1).stores({
      validations: "id, request_id, project_id, sync_status, last_modified",
      photos: "id, validation_id, room_id, sync_status",
    });
  }
}

export const db = new LSServicesDB();
