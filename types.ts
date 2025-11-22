export type IndexType = 'PRIMARY' | 'SECONDARY';

export interface RecordData {
  id: number; // Primary Key
  value: string;
  isNew?: boolean; // For animation highlighting
  isHighlighted?: boolean; // For query visualization
}

export interface PageData {
  id: number;
  indexType: IndexType;
  records: RecordData[];
  nextPageId: number | null;
  prevPageId: number | null;
  isDirty?: boolean; 
  isSplitting?: boolean;
  isHighlighted?: boolean; // For query visualization
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface EngineState {
  pages: PageData[]; // Contains both Primary and Secondary pages
  logs: LogEntry[];
  pageCounter: number;
}

export const PAGE_CAPACITY = 4;

// Simulation Types for Visualizing Queries
export type SimulationStepType = 'SCAN_PAGE' | 'FOUND_INDEX_ENTRY' | 'JUMP_TO_PK' | 'FOUND_DATA' | 'FINISHED';

export interface SimulationStep {
  stepId: number;
  message: string;
  targetPageId: number;
  targetRecordId?: number; // If finding a specific row
  type: SimulationStepType;
}
