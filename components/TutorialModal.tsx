import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen, Database, Activity, Search, Layers, ArrowDown } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const concepts = [
  {
    title: "Overview: InnoDB B+Tree",
    icon: <Database className="text-blue-400" size={24} />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <p className="leading-relaxed">
          This visualizer simulates the <strong>Leaf Nodes</strong> of the InnoDB storage engine. 
          In InnoDB, data is stored in "Pages" (typically 16KB, here capacity is 4 records).
        </p>
        <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>
                <strong>Pages</strong> are connected in a <strong>Doubly Linked List</strong>.
            </li>
            <li>
                We visualize two indexes simultaneously: The <strong>Clustered Index</strong> (Primary) and a <strong>Secondary Index</strong>.
            </li>
        </ul>
        <div className="bg-slate-800/50 p-3 rounded border-l-2 border-blue-500 text-xs">
           <strong>Visual Note:</strong> We hide the upper "Branch Nodes" of the B+Tree to focus on how data is stored and chained at the bottom level.
        </div>
      </div>
    )
  },
  {
    title: "1. Clustered Index (Primary)",
    icon: <Layers className="text-blue-400" size={24} />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-slate-900 border border-blue-800"></div>
            <strong className="text-blue-300">Top Row (Blue Pages)</strong>
        </div>
        <p>
            In InnoDB, the table <strong>IS</strong> the Clustered Index.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Rows are physically sorted by <strong>Primary Key (ID)</strong>.</li>
            <li>The leaf nodes contain the <strong>Full Row Data</strong> (e.g., Name, Age, etc.).</li>
            <li>Searching by ID is very fast because it goes directly here.</li>
        </ul>
      </div>
    )
  },
  {
    title: "2. Secondary Index (Auxiliary)",
    icon: <Layers className="text-purple-400" size={24} />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
         <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-slate-900 border border-purple-800"></div>
            <strong className="text-purple-300">Bottom Row (Purple Pages)</strong>
        </div>
        <p>
            Created when you add an index on a column (e.g., <code>Name</code>).
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Records are sorted by the <strong>Indexed Value (Name)</strong>.</li>
            <li>CRITICAL: The leaf nodes <strong>DO NOT</strong> contain the full row.</li>
            <li>They only store: <code>Value</code> + <code>Primary Key</code>.</li>
            <li>It acts as a pointer system back to the Clustered Index.</li>
        </ul>
      </div>
    )
  },
  {
    title: "3. Table Lookup (回表)",
    icon: <ArrowDown className="text-yellow-400" size={24} />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <p>What happens when you run <code>SELECT * WHERE Name='Alice'</code>?</p>
        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2">
                <span className="bg-purple-900/50 text-purple-300 px-1 rounded">1</span>
                <span>Search Secondary Index for 'Alice' -> Found PK: 5</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-yellow-900/50 text-yellow-300 px-1 rounded">2</span>
                <span><strong>JUMP (Lookup)</strong> to Clustered Index using PK: 5</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-blue-900/50 text-blue-300 px-1 rounded">3</span>
                <span>Retrieve full row data from Clustered Index</span>
            </div>
        </div>
        <p className="text-yellow-400/90 text-xs mt-2">
            * Look for the animated yellow arrow in the simulator!
        </p>
      </div>
    )
  },
  {
    title: "4. Page Splitting (Limit 4)",
    icon: <Activity className="text-red-400" size={24} />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <p>
            Pages have a fixed size. In this visualizer, capacity is <strong>4 records</strong>.
        </p>
        <p><strong>When a page is full and you insert data:</strong></p>
        <ol className="list-decimal pl-5 space-y-2 text-slate-400">
            <li>The engine creates a new page.</li>
            <li>It moves ~50% of the records to the new page.</li>
            <li>It updates the Linked List pointers (Next/Prev).</li>
        </ol>
        <p className="text-xs text-slate-500 mt-2">
            (Real InnoDB splits are more complex, but the principle is the same).
        </p>
      </div>
    )
  }
];

const guide = [
    {
        title: "How to Insert Data",
        content: "Use the inputs at the top left to add a Record (ID + Name). Or click 'Auto' to let the simulator randomize data."
    },
    {
        title: "Run Query: By ID",
        content: "Enter an ID and click 'Run'. The simulation will scan only the Blue (Primary) pages. This is the fastest path."
    },
    {
        title: "Run Query: Lookup (回表)",
        content: "Enter a Name and click 'Lookup'. Watch the simulation search the Purple pages, find the ID, then 'Jump' to the Blue pages."
    },
    {
        title: "Run Query: Covering Index",
        content: "Click 'Covering'. This simulates `SELECT id FROM ...`. Since the ID is already in the Purple pages, it never jumps to the Blue pages. Efficient!"
    }
];

export const TutorialModal: React.FC<Props> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'guide'>('concepts');
  const [slideIndex, setSlideIndex] = useState(0);

  const activeSlides = activeTab === 'concepts' ? concepts : guide;
  const currentSlide = activeSlides[slideIndex];

  const handleTabChange = (tab: 'concepts' | 'guide') => {
      setActiveTab(tab);
      setSlideIndex(0);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden h-[500px]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
                <BookOpen size={20} className="text-blue-500" />
                <span>Knowledge Base</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900">
            <button 
                onClick={() => handleTabChange('concepts')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'concepts' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Core Concepts (原理)
            </button>
            <button 
                onClick={() => handleTabChange('guide')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'guide' ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                User Guide (使用说明)
            </button>
        </div>

        {/* Content Area */}
        <div className="p-8 flex-1 flex flex-col justify-center">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                     {activeTab === 'concepts' && concepts[slideIndex].icon}
                     {activeTab === 'guide' && <Search className="text-emerald-400" size={24} />}
                     <h2 className="text-xl font-bold text-white">{activeSlides[slideIndex].title}</h2>
                </div>
                
                {activeTab === 'concepts' ? (
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 min-h-[180px]">
                         {currentSlide.content}
                    </div>
                ) : (
                    <div className="bg-emerald-950/20 p-6 rounded-lg border border-emerald-900/30 min-h-[180px] flex items-center">
                        <p className="text-slate-300 leading-relaxed">{
                            // @ts-ignore
                            currentSlide.content
                        }</p>
                    </div>
                )}
            </div>
        </div>

        {/* Footer / Navigation */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
            <div className="flex gap-1.5">
                {activeSlides.map((_, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all ${idx === slideIndex ? (activeTab === 'concepts' ? 'w-6 bg-blue-500' : 'w-6 bg-emerald-500') : 'w-2 bg-slate-800 hover:bg-slate-700'}`} 
                    />
                ))}
            </div>

            <div className="flex gap-3">
                <button 
                    disabled={slideIndex === 0}
                    onClick={() => setSlideIndex(prev => prev - 1)}
                    className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    disabled={slideIndex === activeSlides.length - 1}
                    onClick={() => setSlideIndex(prev => prev + 1)}
                    className={`p-2 rounded-full border text-white transition-all shadow-lg flex items-center gap-2 px-4 ${
                        activeTab === 'concepts' 
                        ? 'bg-blue-600 border-blue-500 hover:bg-blue-500' 
                        : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500'
                    } disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:border-slate-800`}
                >
                    <span className="text-xs font-bold">Next</span>
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};