import React, { useState, useEffect, useRef } from 'react';
import { Database, Play, RefreshCw, Plus, Wand2, Terminal, Activity, Search, HelpCircle, ArrowDown } from 'lucide-react';
import { PageCard } from './components/PageCard';
import { TutorialModal } from './components/TutorialModal';
import { EngineState, SimulationStep } from './types';
import { initializeEngine, insertRecord, resetEngine, generateRandomData, simulateSelectQuery } from './services/innodb';
import { analyzeEngineState } from './services/gemini';

const App: React.FC = () => {
  const [engine, setEngine] = useState<EngineState>(initializeEngine());
  const [inputId, setInputId] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [isAutoInserting, setIsAutoInserting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Query Sim State
  const [queryId, setQueryId] = useState('');
  const [queryName, setQueryName] = useState('');
  const [simSteps, setSimSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [simMessage, setSimMessage] = useState('');

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [engine.logs, simMessage]);

  // Auto-insert effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoInserting) {
      interval = setInterval(() => {
        const { id, val } = generateRandomData();
        handleInsert(id, val);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAutoInserting, engine.pageCounter]); 

  // Simulation Player Effect
  useEffect(() => {
    if (simSteps.length > 0 && currentStepIndex < simSteps.length) {
      const timer = setTimeout(() => {
        const step = simSteps[currentStepIndex];
        applySimulationStep(step);
        
        if (currentStepIndex < simSteps.length - 1) {
           setCurrentStepIndex(prev => prev + 1);
        } else {
           // Finish
           setTimeout(() => {
             setSimMessage(prev => prev + " [DONE]");
             setSimSteps([]);
             setCurrentStepIndex(-1);
             // Clear Highlights after delay
             setTimeout(() => {
               setEngine(prev => ({
                 ...prev,
                 pages: prev.pages.map(p => ({...p, isHighlighted: false, records: p.records.map(r => ({...r, isHighlighted: false}))}))
               }));
               setSimMessage('');
             }, 2000);
           }, 1000);
        }
      }, 1200); // Slightly slower step to see animation
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, simSteps]);

  const applySimulationStep = (step: SimulationStep) => {
    setSimMessage(step.message);
    
    setEngine(prev => {
        const newPages = prev.pages.map(p => {
            // Highlight Page
            const isTargetPage = p.id === step.targetPageId;
            // Highlight Record if needed
            const records = p.records.map(r => ({
                ...r,
                isHighlighted: isTargetPage && step.targetRecordId === r.id
            }));
            return { ...p, isHighlighted: isTargetPage, records };
        });
        return { ...prev, pages: newPages };
    });
  };

  const handleInsert = (id: number, val: string) => {
    if (isNaN(id) || !val) return;
    // Stop sim if running
    setSimSteps([]); 
    setEngine(prev => insertRecord(prev, id, val));
  };

  const handleManualInsert = (e: React.FormEvent) => {
    e.preventDefault();
    handleInsert(parseInt(inputId), inputValue || 'User Data');
    setInputId('');
    setInputValue('');
  };

  const runQuery = (type: 'BY_ID' | 'BY_NAME' | 'BY_NAME_COVERING') => {
    // Clear old highlights
    setEngine(prev => ({
        ...prev,
        pages: prev.pages.map(p => ({...p, isHighlighted: false, records: p.records.map(r => ({...r, isHighlighted: false}))}))
    }));

    const param = type === 'BY_ID' ? queryId : queryName;
    if (!param) return;

    const steps = simulateSelectQuery(engine, type, param);
    setSimSteps(steps);
    setCurrentStepIndex(0);
  };

  const handleReset = () => {
    setEngine(resetEngine());
    setAiAnalysis(null);
    setIsAutoInserting(false);
    setSimSteps([]);
    setQueryId('');
    setQueryName('');
  };

  const handleAskAI = async () => {
    setIsAnalyzing(true);
    const analysis = await analyzeEngineState(engine);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  // Sorting for display
  const getSortedPages = (type: 'PRIMARY' | 'SECONDARY') => {
    const pagesOfType = engine.pages.filter(p => p.indexType === type);
    const sorted = [];
    let current = pagesOfType.find(p => p.prevPageId === null);
    const visited = new Set();
    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        sorted.push(current);
        if (current.nextPageId) {
            current = pagesOfType.find(p => p.id === current!.nextPageId);
        } else {
            current = undefined;
        }
    }
    const remaining = pagesOfType.filter(p => !visited.has(p.id));
    return [...sorted, ...remaining];
  };

  const primaryPages = getSortedPages('PRIMARY');
  const secondaryPages = getSortedPages('SECONDARY');

  // Determine if we should show the "Lookup" arrow
  const currentStep = simSteps[currentStepIndex];
  const isLookupStep = currentStep?.type === 'JUMP_TO_PK';

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 flex flex-col overflow-hidden font-inter">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      {/* Header */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-4 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1 rounded shadow-lg shadow-blue-500/20">
            <Database size={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-xs tracking-tight text-white flex items-center gap-2">
                InnoDB Visualizer
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {/* Insert Controls */}
           <div className="flex items-center gap-1 bg-slate-800/50 p-0.5 rounded border border-slate-700">
             <form onSubmit={handleManualInsert} className="flex items-center gap-1">
                <input 
                  type="number" 
                  placeholder="ID" 
                  value={inputId}
                  onChange={e => setInputId(e.target.value)}
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] focus:border-blue-500 focus:outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Name" 
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] focus:border-blue-500 focus:outline-none"
                />
                <button 
                  type="submit" 
                  disabled={!inputId}
                  className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white disabled:opacity-50"
                >
                  <Plus size={12} />
                </button>
             </form>
           </div>

           <button 
              onClick={() => setIsAutoInserting(!isAutoInserting)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition-all ${
                isAutoInserting 
                ? 'bg-red-500/10 border-red-500/50 text-red-400' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
              }`}
           >
              <Play size={10} />
              {isAutoInserting ? 'Stop' : 'Auto'}
           </button>
           
           <div className="w-px h-4 bg-slate-700"></div>

           <button 
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-700 transition-colors"
           >
              <HelpCircle size={12} />
              <span>Tutorial / Help</span>
           </button>

           <button 
              onClick={handleReset}
              className="text-slate-400 hover:text-white"
              title="Reset"
           >
              <RefreshCw size={12} />
           </button>
        </div>
      </header>

      {/* Query Bar */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center gap-4 shadow-md z-20">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Search size={12} /> Query
        </div>
        
        {/* Query ID */}
        <div className="flex items-center gap-1 pl-3 border-l border-slate-800">
            <span className="text-[10px] font-mono text-blue-400">WHERE ID=</span>
            <input 
                type="number" 
                className="w-10 bg-slate-900 border border-slate-700 rounded px-1 text-[10px]" 
                value={queryId} onChange={e => setQueryId(e.target.value)} 
            />
            <button onClick={() => runQuery('BY_ID')} className="px-2 py-0.5 bg-blue-900/30 border border-blue-800 hover:bg-blue-800 text-blue-200 text-[9px] rounded">
                Run
            </button>
        </div>

        {/* Query Name */}
        <div className="flex items-center gap-1 pl-3 border-l border-slate-800">
            <span className="text-[10px] font-mono text-purple-400">WHERE Name=</span>
            <input 
                type="text" 
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-[10px]" 
                value={queryName} onChange={e => setQueryName(e.target.value)} 
            />
            <button onClick={() => runQuery('BY_NAME')} className="px-2 py-0.5 bg-purple-900/30 border border-purple-800 hover:bg-purple-800 text-purple-200 text-[9px] rounded">
                Lookup (回表)
            </button>
            <button onClick={() => runQuery('BY_NAME_COVERING')} className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-800 hover:bg-emerald-800 text-emerald-200 text-[9px] rounded">
                Covering
            </button>
        </div>
        
        {/* Simulation Message */}
        {simMessage && (
             <div className="ml-auto bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <Activity size={10} className="animate-pulse" />
                {simMessage}
             </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0b1120]">
        
        {/* 1. TOP SECTION: CLUSTERED INDEX (Primary Key) */}
        <div className="flex-1 relative border-b border-slate-800/50 bg-slate-900/10 flex flex-col justify-center">
             {/* Label */}
             <div className="absolute top-2 left-4">
                <span className="px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-800 text-blue-300 text-[10px] font-bold uppercase tracking-wide">
                    Clustered Index (Primary Key)
                </span>
             </div>

             {/* Visual Root Node (Static Representation) */}
             <div className="flex justify-center mb-4 relative z-10">
                <div className="w-24 h-10 border border-blue-700 bg-blue-900/20 rounded flex flex-col items-center justify-center shadow-[0_0_15px_rgba(30,64,175,0.3)]">
                    <span className="text-[8px] text-blue-200 font-bold">ROOT</span>
                    <div className="flex gap-1 mt-1">
                        <div className="w-3 h-3 bg-slate-800 border border-blue-800"></div>
                        <div className="w-3 h-3 bg-slate-800 border border-blue-800"></div>
                    </div>
                </div>
                {/* SVG Connectors to Leaves */}
                <div className="absolute top-full left-0 w-full h-8 pointer-events-none">
                    <svg width="100%" height="100%">
                        <line x1="50%" y1="0" x2="20%" y2="100%" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.4" />
                        <line x1="50%" y1="0" x2="80%" y2="100%" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.4" />
                    </svg>
                </div>
             </div>

             {/* Leaf Nodes Row */}
             <div className="flex items-start px-8 overflow-x-auto pb-4 min-h-[160px] z-10">
                {primaryPages.map((page, index) => (
                    <PageCard key={page.id} page={page} isHead={index===0} isTail={index===primaryPages.length-1} />
                ))}
             </div>
        </div>

        {/* Lookup Animation Arrow (Absolute Overlay) */}
        {isLookupStep && (
           <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-full">
                 {/* We use a CSS animation to simulate the 'jump' */}
                 <div className="w-[2px] h-32 bg-gradient-to-t from-purple-500 to-blue-500 absolute bottom-0 left-0 animate-[ping_1s_ease-in-out_infinite] opacity-50"></div>
                 <ArrowDown className="text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-180 animate-bounce" size={32} />
                 <div className="absolute top-[45%] left-6 bg-yellow-900 text-yellow-200 text-[10px] px-2 py-1 rounded border border-yellow-600 whitespace-nowrap">
                    Lookup (回表): Found ID, fetching Row...
                 </div>
              </div>
           </div>
        )}

        {/* 2. BOTTOM SECTION: SECONDARY INDEX (Name) */}
        <div className="flex-1 relative bg-slate-900/30 flex flex-col justify-center">
            {/* Label */}
            <div className="absolute top-2 left-4">
                <span className="px-1.5 py-0.5 rounded bg-purple-900/30 border border-purple-800 text-purple-300 text-[10px] font-bold uppercase tracking-wide">
                    Secondary Index (Name)
                </span>
             </div>

             {/* Visual Root Node */}
             <div className="flex justify-center mb-4 relative z-10">
                <div className="w-24 h-10 border border-purple-700 bg-purple-900/20 rounded flex flex-col items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                    <span className="text-[8px] text-purple-200 font-bold">ROOT (Name)</span>
                    <div className="flex gap-1 mt-1">
                         <div className="w-3 h-3 bg-slate-800 border border-purple-800"></div>
                         <div className="w-3 h-3 bg-slate-800 border border-purple-800"></div>
                    </div>
                </div>
                 {/* SVG Connectors to Leaves */}
                 <div className="absolute top-full left-0 w-full h-8 pointer-events-none">
                    <svg width="100%" height="100%">
                        <line x1="50%" y1="0" x2="20%" y2="100%" stroke="#581c87" strokeWidth="1" strokeOpacity="0.4" />
                        <line x1="50%" y1="0" x2="80%" y2="100%" stroke="#581c87" strokeWidth="1" strokeOpacity="0.4" />
                    </svg>
                </div>
             </div>

             {/* Leaf Nodes Row */}
             <div className="flex items-start px-8 overflow-x-auto pb-4 min-h-[160px] z-10">
                {secondaryPages.map((page, index) => (
                    <PageCard key={page.id} page={page} isHead={index===0} isTail={index===secondaryPages.length-1} />
                ))}
             </div>
        </div>

        {/* AI Assistant Box */}
        <div className="absolute bottom-40 right-4 w-72 z-40 flex flex-col gap-2">
            <button 
                onClick={handleAskAI}
                disabled={isAnalyzing}
                className="bg-indigo-600/90 hover:bg-indigo-500 text-white py-1.5 px-3 rounded shadow-lg flex items-center justify-center gap-2 text-[10px] font-bold transition-all backdrop-blur"
            >
                <Wand2 size={12} />
                {isAnalyzing ? 'Analyzing...' : 'Explain State'}
            </button>
            
            {aiAnalysis && (
                <div className="bg-slate-900/95 backdrop-blur border border-indigo-500/30 p-3 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-indigo-400 font-bold text-[9px] uppercase mb-1 flex items-center gap-1">
                        <Wand2 size={10} /> Analysis
                    </h3>
                    <p className="text-[10px] text-slate-300 leading-relaxed max-h-32 overflow-y-auto">{aiAnalysis}</p>
                    <button onClick={() => setAiAnalysis(null)} className="text-[9px] text-slate-500 mt-1 hover:text-slate-300 underline">Close</button>
                </div>
            )}
        </div>

        {/* Console / Logs Panel */}
        <div className="h-24 bg-slate-950 border-t border-slate-800 flex flex-col flex-shrink-0 z-30">
           <div className="h-5 bg-slate-900 border-b border-slate-800 px-4 flex items-center gap-2">
              <Terminal size={10} className="text-slate-500" />
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Engine Log</span>
           </div>
           <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto p-2 font-mono text-[9px] space-y-0.5"
           >
              {[...engine.logs].reverse().map((log) => (
                 <div key={log.id} className={`flex gap-2 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-orange-400' :
                    log.type === 'success' ? 'text-emerald-400' :
                    'text-slate-500'
                 }`}>
                    <span className="opacity-50 w-12 shrink-0">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                    <span>{log.message}</span>
                 </div>
              ))}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;