import { EngineState, PageData, RecordData, PAGE_CAPACITY, LogEntry, IndexType, SimulationStep } from '../types';

// --- Helpers ---

const createPage = (id: number, type: IndexType): PageData => ({
  id,
  indexType: type,
  records: [],
  nextPageId: null,
  prevPageId: null,
});

const addLog = (logs: LogEntry[], message: string, type: LogEntry['type'] = 'info'): LogEntry[] => {
  return [
    { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), message, type },
    ...logs.slice(0, 49)
  ];
};

// --- Core Logic ---

export const initializeEngine = (): EngineState => {
  // We start with TWO pages: One for Primary Index, One for Secondary Index
  const primaryPage = createPage(1, 'PRIMARY');
  const secondaryPage = createPage(2, 'SECONDARY');
  
  return {
    pages: [primaryPage, secondaryPage],
    logs: addLog([], 'InnoDB Engine Initialized. Created Primary Clustered Index and Secondary Index (Name).', 'success'),
    pageCounter: 2,
  };
};

/**
 * Generic function to insert a record into a specific chain of pages (Linked List)
 * and handle splitting logic.
 */
const insertIntoIndex = (
  pages: PageData[],
  indexType: IndexType,
  record: RecordData,
  compareFn: (a: RecordData, b: RecordData) => number,
  pageCounter: number,
  logBuffer: LogEntry[]
): { pages: PageData[], newPageCounter: number, logs: LogEntry[] } => {
  
  let currentPages = [...pages];
  let counter = pageCounter;
  let logs = [...logBuffer];

  // 1. Find Target Page (Linear scan of the specific index type chain)
  // In a real B+Tree, we traverse internal nodes. Here we scan the linked list of leaves.
  const indexPages = currentPages.filter(p => p.indexType === indexType);
  
  // Start at the head
  let head = indexPages.find(p => p.prevPageId === null);
  if (!head && indexPages.length > 0) head = indexPages[0];

  let targetPageId = -1;
  let current = head;

  while (current) {
    // If this is the last page, or the next page starts with a value larger than ours, we fit here.
    if (current.nextPageId === null) {
      targetPageId = current.id;
      break;
    }
    
    // Look ahead
    const nextPage = currentPages.find(p => p.id === current!.nextPageId);
    if (nextPage && nextPage.records.length > 0 && compareFn(nextPage.records[0], record) > 0) {
      targetPageId = current.id;
      break;
    }
    
    // Move next
    current = nextPage;
  }

  if (targetPageId === -1) return { pages: currentPages, newPageCounter: counter, logs };

  const pageIndex = currentPages.findIndex(p => p.id === targetPageId);
  const targetPage = currentPages[pageIndex];

  // Check for duplicate PK in Primary Index (Strict)
  if (indexType === 'PRIMARY' && targetPage.records.some(r => r.id === record.id)) {
    logs = addLog(logs, `Duplicate Key Error: ID ${record.id} exists.`, 'error');
    return { pages: currentPages, newPageCounter: counter, logs };
  }

  // 2. Insert and Sort
  const updatedRecords = [...targetPage.records, record].sort(compareFn);
  
  currentPages[pageIndex] = {
    ...targetPage,
    records: updatedRecords,
    isDirty: true,
    isSplitting: false
  };

  // 3. Check Split
  if (updatedRecords.length > PAGE_CAPACITY) {
    logs = addLog(logs, `[${indexType}] Page ${targetPageId} full. Splitting...`, 'warning');
    
    counter++;
    const newPageId = counter;
    const newPage = createPage(newPageId, indexType);

    const splitIndex = Math.ceil(updatedRecords.length / 2);
    const keepRecords = updatedRecords.slice(0, splitIndex);
    const moveRecords = updatedRecords.slice(splitIndex);

    // Update Old Page
    currentPages[pageIndex] = {
      ...currentPages[pageIndex],
      records: keepRecords,
      isSplitting: true,
      nextPageId: newPageId
    };

    // Update New Page
    newPage.records = moveRecords;
    newPage.nextPageId = targetPage.nextPageId;
    newPage.prevPageId = targetPage.id;
    newPage.isDirty = true;

    // Fix pointer of the page after the new one (if exists)
    if (targetPage.nextPageId !== null) {
      const nextNextPageIndex = currentPages.findIndex(p => p.id === targetPage.nextPageId);
      if (nextNextPageIndex !== -1) {
        currentPages[nextNextPageIndex] = {
          ...currentPages[nextNextPageIndex],
          prevPageId: newPageId
        };
      }
    }

    currentPages.push(newPage);
    logs = addLog(logs, `[${indexType}] Split Complete. Page ${targetPageId} -> Page ${newPageId}.`, 'success');
  }

  return { pages: currentPages, newPageCounter: counter, logs };
};


export const insertRecord = (state: EngineState, id: number, value: string): EngineState => {
  let { pages, pageCounter, logs } = state;
  
  // Clean flags
  pages = pages.map(p => ({ ...p, isDirty: false, isSplitting: false, isHighlighted: false, records: p.records.map(r => ({...r, isNew: false, isHighlighted: false})) }));

  // 1. Insert into Clustered Index (Primary) - Sorted by ID
  const primaryResult = insertIntoIndex(
    pages, 
    'PRIMARY', 
    { id, value, isNew: true }, 
    (a, b) => a.id - b.id, 
    pageCounter, 
    logs
  );

  pages = primaryResult.pages;
  pageCounter = primaryResult.newPageCounter;
  logs = primaryResult.logs;

  // 2. Insert into Secondary Index (Name) - Sorted by Value, then ID
  // In secondary index, we only really store {value, id}.
  const secondaryResult = insertIntoIndex(
    pages,
    'SECONDARY',
    { id, value, isNew: true },
    (a, b) => a.value.localeCompare(b.value) || a.id - b.id,
    pageCounter,
    logs
  );

  pages = secondaryResult.pages;
  pageCounter = secondaryResult.newPageCounter;
  
  logs = addLog(logs, `Transaction Committed: Inserted (${id}, "${value}").`, 'info');

  return {
    pages,
    logs,
    pageCounter
  };
};

// --- Query Simulation Logic ---

export const simulateSelectQuery = (
  state: EngineState, 
  type: 'BY_ID' | 'BY_NAME' | 'BY_NAME_COVERING', 
  param: string | number
): SimulationStep[] => {
  const steps: SimulationStep[] = [];
  let stepId = 0;

  // Helper to push step
  const addStep = (msg: string, pageId: number, type: SimulationStep['type'], recordId?: number) => {
    steps.push({ stepId: stepId++, message: msg, targetPageId: pageId, type, targetRecordId: recordId });
  };

  const pages = state.pages;

  if (type === 'BY_ID') {
    // Simple Clustered Index Scan
    const id = Number(param);
    addStep(`QUERY: SELECT * FROM table WHERE id = ${id}`, 0, 'FINISHED');
    
    // Find Head of Primary
    let current = pages.find(p => p.indexType === 'PRIMARY' && p.prevPageId === null);
    
    while (current) {
      addStep(`Scanning Primary Page ${current.id}...`, current.id, 'SCAN_PAGE');
      
      const found = current.records.find(r => r.id === id);
      if (found) {
        addStep(`Found Record ${id} in Page ${current.id}. Returning Data.`, current.id, 'FOUND_DATA', id);
        return steps;
      }

      // Check if we need to go to next page
      if (current.nextPageId) {
        const maxId = current.records[current.records.length - 1]?.id;
        if (maxId < id) {
          const next = pages.find(p => p.id === current!.nextPageId);
          current = next;
          continue;
        }
      }
      break; // Not found or passed range
    }
    addStep(`Record ${id} not found in Primary Index.`, 0, 'FINISHED');
  }

  else if (type === 'BY_NAME' || type === 'BY_NAME_COVERING') {
    const name = String(param);
    const isCovering = type === 'BY_NAME_COVERING';
    const queryStr = isCovering 
      ? `SELECT id FROM table WHERE name = '${name}'`
      : `SELECT * FROM table WHERE name = '${name}'`;
    
    addStep(`QUERY: ${queryStr}`, 0, 'FINISHED');

    // 1. Search Secondary Index
    let current = pages.find(p => p.indexType === 'SECONDARY' && p.prevPageId === null);
    let foundPk: number | null = null;

    while (current) {
      addStep(`Scanning Secondary Index Page ${current.id}...`, current.id, 'SCAN_PAGE');

      const found = current.records.find(r => r.value === name);
      if (found) {
        addStep(`Found Index Entry ('${name}', PK: ${found.id}) in Page ${current.id}.`, current.id, 'FOUND_INDEX_ENTRY', found.id);
        foundPk = found.id;
        break;
      }

      // Check next
      if (current.nextPageId) {
        // Simplified string range check visual
        current = pages.find(p => p.id === current!.nextPageId);
      } else {
        break;
      }
    }

    if (foundPk === null) {
      addStep(`Name '${name}' not found in Index.`, 0, 'FINISHED');
      return steps;
    }

    // 2. Decision Point
    if (isCovering) {
      addStep(`Covering Index optimization! We only need ID. No table lookup required.`, current!.id, 'FINISHED', foundPk);
    } else {
      // 3. Table Lookup (回表)
      // Note: We pass foundPk as targetRecordId so UI can draw line from it
      addStep(`Need full row data. Performing Table Lookup (回表) for PK: ${foundPk}...`, current!.id, 'JUMP_TO_PK', foundPk);

      // Search Primary
      current = pages.find(p => p.indexType === 'PRIMARY' && p.prevPageId === null);
      while (current) {
        addStep(`Scanning Primary Page ${current.id} for PK ${foundPk}...`, current.id, 'SCAN_PAGE');
        const record = current.records.find(r => r.id === foundPk);
        if (record) {
          addStep(`Lookup Successful: Retrieved full row for ${foundPk} from Clustered Index.`, current.id, 'FOUND_DATA', foundPk);
          return steps;
        }
        if (current.nextPageId) {
            // Optimization for sim: just jump to next
            current = pages.find(p => p.id === current!.nextPageId);
        } else {
            break;
        }
      }
    }
  }

  return steps;
};

export const resetEngine = (): EngineState => initializeEngine();

export const generateRandomData = () => {
  const id = Math.floor(Math.random() * 50) + 1;
  const values = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan'];
  const val = values[Math.floor(Math.random() * values.length)];
  return { id, val };
};