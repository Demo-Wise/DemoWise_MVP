"use client";

import React, { useState, useEffect } from 'react';
import { CalendarEvent, ComputeStatus, OptimizationLog, User, SignalSource, ComputeResource, OrchestrationRule } from '@/components/types';
import { MOCK_EVENTS, WORKSTREAM_SOURCES, MOCK_RESOURCES, INITIAL_RULES } from '@/components/constants';
import { Button } from '@/components/Buttons';
// import { analyzeScheduleForCompute } from '../services/geminiService';
import { 
  Calendar, 
  LogOut, 
  Zap, 
  CheckCircle2, 
  Clock,
  Server,
  Activity,
  MessageSquare,
  LayoutDashboard,
  Radio,
  Cpu,
  Workflow,
  Plus,
  ArrowRight,
  AlertCircle,
  Plug
} from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ViewState = 'OVERVIEW' | 'SOURCES' | 'COMPUTE' | 'TRIGGERS' | 'CREATE_TRIGGER';

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<ViewState>('OVERVIEW');
  
  // Data State
  const [sources, setSources] = useState<SignalSource[]>(WORKSTREAM_SOURCES);
  const [resources, setResources] = useState<ComputeResource[]>(MOCK_RESOURCES);
  const [rules, setRules] = useState<OrchestrationRule[]>(INITIAL_RULES);
  
  // Operational State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [logs, setLogs] = useState<OptimizationLog[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [targetEventIds, setTargetEventIds] = useState<Set<string>>(new Set());

  // Trigger Creation Form State
  const [newTriggerSourceId, setNewTriggerSourceId] = useState<string>('');
  const [newTriggerKeyword, setNewTriggerKeyword] = useState('');
  const [newTriggerResourceId, setNewTriggerResourceId] = useState<string>('');

  // --- Simulation Logic ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(prev => new Date(prev.getTime() + 1000 * 60)); 
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addLog = (action: OptimizationLog['action'], reason: string) => {
    const newLog: OptimizationLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      action,
      reason
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Check Orchestration (Simulated)
  useEffect(() => {
    const calendarSource = sources.find(s => s.type === 'GOOGLE_CALENDAR');
    const awsResource = resources.find(r => r.provider === 'AWS'); // Simplified for demo

    if (!calendarSource?.connected) return;

    // // If we haven't loaded events yet, load them
    // if (events.length === 0 && !analyzing) {
    //   setAnalyzing(true);
    //   // Simulate Fetch
    //   setTimeout(async () => {
    //     setEvents(MOCK_EVENTS);
    //     // const result = await analyzeScheduleForCompute(MOCK_EVENTS);
    //     if (result && result.requiredComputeEventIds) {
    //       setTargetEventIds(new Set(result.requiredComputeEventIds));
    //       addLog('MONITOR', `AI Analysis: ${result.reasoning}`);
    //     }
    //     setAnalyzing(false);
    //   }, 1500);
    // }

    // Basic Activation Logic
    if (awsResource?.connected) {
       const activeRule = rules.find(r => r.sourceId === calendarSource.id && r.targetResourceId === awsResource.id);
       
       if (activeRule) {
          const BUFFER_MS = activeRule.durationBuffer * 60 * 1000;
          let shouldBeActive = false;

          events.forEach(event => {
            if (!targetEventIds.has(event.id)) return;
            const timeUntilStart = event.start.getTime() - currentTime.getTime();
            const timeSinceEnd = currentTime.getTime() - event.end.getTime();

            if ((timeUntilStart <= BUFFER_MS && timeUntilStart > 0) || (timeUntilStart <= 0 && timeSinceEnd < 0)) {
              shouldBeActive = true;
            }
          });

          const resourceIndex = resources.findIndex(r => r.id === awsResource.id);
          if (resourceIndex === -1) return;

          const currentStatus = resources[resourceIndex].status;

          if (shouldBeActive && currentStatus !== ComputeStatus.ACTIVE) {
            const newRes = [...resources];
            newRes[resourceIndex].status = ComputeStatus.ACTIVE;
            setResources(newRes);
            addLog('START', `Triggered by rule "${activeRule.triggerName}"`);
          } else if (!shouldBeActive && currentStatus === ComputeStatus.ACTIVE) {
            const newRes = [...resources];
            newRes[resourceIndex].status = ComputeStatus.IDLE;
            setResources(newRes);
            addLog('STOP', 'Event concluded. Scaling down.');
          }
       }
    }
  }, [currentTime, events, sources, resources, rules, targetEventIds]);

  // --- Actions ---

  const toggleSourceConnection = (id: string) => {
    setSources(prev => prev.map(s => {
      if (s.id === id) {
        const newState = !s.connected;
        addLog('MONITOR', `${s.name} ${newState ? 'Connected' : 'Disconnected'}`);
        return { ...s, connected: newState };
      }
      return s;
    }));
  };

  const toggleResourceConnection = (id: string) => {
    setResources(prev => prev.map(r => {
      if (r.id === id) {
        const newState = !r.connected;
        const newStatus = newState ? ComputeStatus.IDLE : ComputeStatus.OFFLINE;
        addLog('MONITOR', `${r.name} ${newState ? 'provisioned' : 'deprovisioned'}`);
        return { ...r, connected: newState, status: newStatus };
      }
      return r;
    }));
  };

  const handleCreateTrigger = () => {
    if (!newTriggerSourceId || !newTriggerResourceId || !newTriggerKeyword) return;
    
    const newRule: OrchestrationRule = {
      id: Math.random().toString(36).substr(2, 9),
      triggerName: `${newTriggerKeyword} Trigger`,
      sourceId: newTriggerSourceId,
      triggerKeyword: newTriggerKeyword,
      targetResourceId: newTriggerResourceId,
      durationBuffer: 15
    };

    setRules([...rules, newRule]);
    addLog('MONITOR', `Created new orchestration rule: ${newRule.triggerName}`);
    setCurrentView('TRIGGERS');
    
    // Reset form
    setNewTriggerKeyword('');
    setNewTriggerSourceId('');
    setNewTriggerResourceId('');
  };

  const checkSourceAndProceed = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    setNewTriggerSourceId(sourceId);
    
    if (source && !source.connected) {
      // Redirect flow
      return false; 
    }
    return true;
  };


  // --- Sub-Components (Renderers) ---

  const SidebarItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: ViewState }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
        currentView === view 
        ? 'bg-[#C9A66B]/10 text-[#C9A66B] border border-[#C9A66B]/20' 
        : 'text-[#E8E4D9]/60 hover:bg-[#E8E4D9]/5 hover:text-[#E8E4D9]'
      }`}
    >
      <Icon className={`w-5 h-5 ${currentView === view ? 'text-[#C9A66B]' : 'group-hover:text-[#C9A66B] transition-colors'}`} />
      <span className="font-mono text-sm tracking-wider">{label}</span>
    </button>
  );

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      
      {/* Column 1: Calendar (Vertical) */}
      <div className="lg:col-span-3 flex flex-col gap-4 h-full">
        <div className="glass-panel p-4 rounded-xl border border-[#E8E4D9]/10 bg-[#0F292F]/40 h-full overflow-hidden flex flex-col">
           <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#E8E4D9]/10">
              <Calendar className="w-4 h-4 text-[#C9A66B]" />
              <h3 className="font-serif text-lg">Daily Schedule</h3>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {events.length === 0 ? (
                <div className="text-center py-10 text-[#E8E4D9]/30 text-xs font-mono">
                  {sources.find(s => s.type === 'GOOGLE_CALENDAR')?.connected 
                    ? 'Syncing events...' 
                    : 'Connect Calendar source to view schedule.'}
                </div>
              ) : (
                events.map(event => {
                   const isTarget = targetEventIds.has(event.id);
                   const isActive = currentTime >= event.start && currentTime <= event.end;
                   return (
                     <div key={event.id} className={`p-3 rounded border-l-2 text-left transition-all ${
                        isActive ? 'bg-[#E8E4D9]/10 border-[#C9A66B]' : 
                        isTarget ? 'bg-[#061418]/40 border-[#C9A66B]/50 opacity-80' : 
                        'bg-transparent border-[#E8E4D9]/10 opacity-40'
                     }`}>
                        <div className="text-xs font-mono text-[#E8E4D9]/50 mb-1">
                          {event.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </div>
                        <div className={`text-sm font-medium leading-tight ${isActive ? 'text-[#C9A66B]' : 'text-[#E8E4D9]'}`}>
                          {event.title}
                        </div>
                        {isTarget && <div className="mt-2 text-[10px] uppercase tracking-widest text-[#C9A66B] flex items-center gap-1"><Zap className="w-3 h-3"/> GPU</div>}
                     </div>
                   )
                })
              )}
           </div>
        </div>
      </div>

      {/* Column 2: Orchestration & Connected Resources */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        
        {/* Resource Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 bg-[#0F292F]/40 flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                 <Server className="w-6 h-6 text-emerald-400" />
                 <span className="text-xs font-mono text-[#E8E4D9]/40 uppercase">Total Active</span>
              </div>
              <div className="text-4xl font-serif">{resources.filter(r => r.status === ComputeStatus.ACTIVE).length} / {resources.filter(r => r.connected).length}</div>
              <div className="text-xs text-[#E8E4D9]/60">Connected Clusters</div>
           </div>

           <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 bg-[#0F292F]/40 flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                 <Activity className="w-6 h-6 text-[#C9A66B]" />
                 <span className="text-xs font-mono text-[#E8E4D9]/40 uppercase">Est. Savings</span>
              </div>
              <div className="text-4xl font-serif text-[#C9A66B]">$142.50</div>
              <div className="text-xs text-[#E8E4D9]/60">This Month (Optimized)</div>
           </div>

           <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 bg-[#0F292F]/40 flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                 <Radio className="w-6 h-6 text-blue-400" />
                 <span className="text-xs font-mono text-[#E8E4D9]/40 uppercase">Signals</span>
              </div>
              <div className="text-4xl font-serif">{sources.filter(s => s.connected).length}</div>
              <div className="text-xs text-[#E8E4D9]/60">Active Input Streams</div>
           </div>
        </div>

        {/* Orchestration Visualization */}
        <div className="glass-panel flex-1 rounded-xl border border-[#E8E4D9]/10 bg-[#061418]/40 p-8 relative overflow-hidden">
           <h3 className="font-serif text-xl mb-8 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-[#E8E4D9]/60" />
              Active Orchestration Map
           </h3>

           <div className="relative grid grid-cols-3 gap-8 items-center justify-items-center h-[300px]">
              {/* Background Lines */}
              <div className="absolute top-1/2 left-0 w-full h-px bg-[#E8E4D9]/5 -z-10 transform -translate-y-1/2"></div>

              {/* Step 1: Signal */}
              <div className="flex flex-col gap-4 items-center w-full">
                 <div className="text-xs font-mono text-[#E8E4D9]/40 uppercase tracking-widest mb-2">Signal</div>
                 {sources.filter(s => s.connected).map(source => (
                    <div key={source.id} className="w-full max-w-[180px] p-4 bg-[#0F292F] border border-[#E8E4D9]/20 rounded-lg flex items-center gap-3 shadow-lg relative z-10">
                      <div className="p-2 bg-[#061418] rounded">
                        {source.type === 'GOOGLE_CALENDAR' ? <Calendar className="w-4 h-4 text-[#C9A66B]"/> : <MessageSquare className="w-4 h-4 text-blue-400"/>}
                      </div>
                      <span className="text-sm font-medium">{source.name}</span>
                      
                      {/* Connector Dot */}
                      <div className="absolute -right-1 w-2 h-2 bg-[#E8E4D9]/40 rounded-full"></div>
                    </div>
                 ))}
                 {sources.every(s => !s.connected) && (
                    <div className="p-4 border border-dashed border-[#E8E4D9]/20 rounded text-[#E8E4D9]/30 text-sm">No Signals Connected</div>
                 )}
              </div>

              {/* Step 2: Processor/Logic */}
              <div className="flex flex-col items-center justify-center">
                 <div className="text-xs font-mono text-[#E8E4D9]/40 uppercase tracking-widest mb-4">Logic</div>
                 <div className="w-32 h-32 rounded-full border border-[#C9A66B]/30 bg-[#0F292F]/80 backdrop-blur flex flex-col items-center justify-center relative animate-pulse">
                    <Zap className="w-8 h-8 text-[#C9A66B] mb-2" />
                    <span className="text-xs font-mono text-[#C9A66B]">AI ENGINE</span>
                    
                    {/* Connecting Lines Visual */}
                    <div className="absolute -left-4 top-1/2 w-4 h-px bg-[#C9A66B]/30"></div>
                    <div className="absolute -right-4 top-1/2 w-4 h-px bg-[#C9A66B]/30"></div>
                 </div>
                 <div className="mt-4 text-xs text-[#E8E4D9]/50 font-mono text-center">
                    Detecting "Demo"<br/>& Workload patterns
                 </div>
              </div>

              {/* Step 3: Resource */}
              <div className="flex flex-col gap-4 items-center w-full">
                 <div className="text-xs font-mono text-[#E8E4D9]/40 uppercase tracking-widest mb-2">Compute</div>
                 {resources.filter(r => r.connected).map(res => (
                    <div key={res.id} className={`w-full max-w-[180px] p-4 border rounded-lg flex items-center gap-3 shadow-lg relative z-10 transition-colors ${
                      res.status === ComputeStatus.ACTIVE 
                        ? 'bg-[#0F292F] border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                        : 'bg-[#061418] border-[#E8E4D9]/20'
                    }`}>
                      {/* Connector Dot */}
                      <div className={`absolute -left-1 w-2 h-2 rounded-full ${res.status === ComputeStatus.ACTIVE ? 'bg-emerald-400' : 'bg-[#E8E4D9]/40'}`}></div>

                      <div className="p-2 bg-[#061418] rounded border border-[#E8E4D9]/10">
                        <Server className={`w-4 h-4 ${res.status === ComputeStatus.ACTIVE ? 'text-emerald-400' : 'text-[#E8E4D9]/40'}`}/>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{res.provider}</div>
                        <div className="text-[10px] font-mono text-[#E8E4D9]/50">{res.instanceType}</div>
                      </div>
                    </div>
                 ))}
                 {resources.every(r => !r.connected) && (
                    <div className="p-4 border border-dashed border-[#E8E4D9]/20 rounded text-[#E8E4D9]/30 text-sm">No Compute Connected</div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );

  const renderSources = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-8">
         <div>
          <h2 className="font-serif text-3xl mb-2">Signaling Sources</h2>
          <p className="text-[#E8E4D9]/60">Connect platforms to generate workload triggers.</p>
         </div>
      </div>

      <div className="grid gap-4">
        {sources.map(source => (
          <div key={source.id} className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 flex items-center justify-between group hover:border-[#E8E4D9]/20 transition-all">
            <div className="flex items-center gap-6">
               <div className={`p-4 rounded-xl ${source.connected ? 'bg-[#C9A66B]/20 text-[#C9A66B]' : 'bg-[#E8E4D9]/5 text-[#E8E4D9]/40'}`}>
                  {source.type === 'GOOGLE_CALENDAR' ? <Calendar className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
               </div>
               <div>
                  <h3 className="text-xl font-medium">{source.name}</h3>
                  <p className="text-sm text-[#E8E4D9]/50 font-mono mt-1">
                    {source.connected ? `Synced • Last checked ${currentTime.toLocaleTimeString()}` : 'Not connected'}
                  </p>
               </div>
            </div>
            <Button 
              variant={source.connected ? 'secondary' : 'primary'} 
              onClick={() => toggleSourceConnection(source.id)}
            >
              {source.connected ? 'Disconnect' : 'Connect Provider'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompute = () => (
    <div className="max-w-4xl mx-auto">
       <div className="flex justify-between items-end mb-8">
         <div>
          <h2 className="font-serif text-3xl mb-2">Compute Resources</h2>
          <p className="text-[#E8E4D9]/60">Manage cloud infrastructure pools available for optimization.</p>
         </div>
      </div>

      <div className="grid gap-4">
        {resources.map(resource => (
          <div key={resource.id} className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className={`p-4 rounded-xl ${resource.connected ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[#E8E4D9]/5 text-[#E8E4D9]/40'}`}>
                  <Server className="w-8 h-8" />
               </div>
               <div>
                  <h3 className="text-xl font-medium flex items-center gap-3">
                    {resource.name}
                    <span className="text-xs font-mono px-2 py-1 rounded bg-[#E8E4D9]/10 text-[#E8E4D9]/60">{resource.provider}</span>
                  </h3>
                  <p className="text-sm text-[#E8E4D9]/50 font-mono mt-1 flex gap-4">
                    <span>{resource.region}</span>
                    <span>{resource.instanceType}</span>
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-4">
               {resource.connected && (
                  <div className="text-right mr-4">
                    <div className="text-xs font-mono uppercase text-[#E8E4D9]/40">Status</div>
                    <div className={`font-mono ${resource.status === ComputeStatus.ACTIVE ? 'text-emerald-400 animate-pulse' : 'text-[#E8E4D9]/60'}`}>
                      {resource.status}
                    </div>
                  </div>
               )}
               <Button 
                variant={resource.connected ? 'outline' : 'primary'} 
                onClick={() => toggleResourceConnection(resource.id)}
              >
                {resource.connected ? 'De-provision' : 'Authenticate'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTriggers = () => (
    <div className="max-w-4xl mx-auto">
       <div className="flex justify-between items-end mb-8">
         <div>
          <h2 className="font-serif text-3xl mb-2">Orchestration Triggers</h2>
          <p className="text-[#E8E4D9]/60">Define logic mapping signals to compute actions.</p>
         </div>
         <Button onClick={() => setCurrentView('CREATE_TRIGGER')} className="gap-2">
           <Plus className="w-4 h-4" /> Create Trigger
         </Button>
      </div>

      <div className="grid gap-4">
        {rules.map(rule => {
          const src = sources.find(s => s.id === rule.sourceId);
          const res = resources.find(r => r.id === rule.targetResourceId);
          return (
            <div key={rule.id} className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#E8E4D9]/5 rounded border border-[#E8E4D9]/10">
                       {src?.type === 'GOOGLE_CALENDAR' ? <Calendar className="w-5 h-5 text-[#C9A66B]"/> : <MessageSquare className="w-5 h-5 text-blue-400"/>}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#E8E4D9]/20" />
                    <div className="px-3 py-1 bg-[#C9A66B]/10 border border-[#C9A66B]/30 rounded text-[#C9A66B] font-mono text-xs">
                       "{rule.triggerKeyword}"
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#E8E4D9]/20" />
                    <div className="p-2 bg-[#E8E4D9]/5 rounded border border-[#E8E4D9]/10">
                       <Server className="w-5 h-5 text-emerald-400"/>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">{rule.triggerName}</h3>
                    <p className="text-sm text-[#E8E4D9]/50">Start {res?.name} ({rule.durationBuffer}m buffer)</p>
                  </div>
               </div>
               <Button variant="ghost" size="sm" className="hover:text-red-400 hover:bg-red-400/10">Delete</Button>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderCreateTrigger = () => {
    const selectedSource = sources.find(s => s.id === newTriggerSourceId);
    const isSourceConnected = selectedSource?.connected;

    return (
      <div className="max-w-2xl mx-auto">
         <div className="mb-8">
            <Button variant="ghost" onClick={() => setCurrentView('TRIGGERS')} className="pl-0 gap-2 mb-4">
               <ArrowRight className="w-4 h-4 rotate-180" /> Back to Triggers
            </Button>
            <h2 className="font-serif text-3xl mb-2">New Orchestration</h2>
         </div>

         <div className="space-y-8">
            {/* Step 1: Source */}
            <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 rounded-full bg-[#C9A66B] text-[#061418] flex items-center justify-center font-bold text-sm">1</div>
                  <h3 className="font-medium">Select Signal Source</h3>
               </div>
               <div className="grid grid-cols-2 gap-4 pl-9">
                  {sources.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                         const allowed = checkSourceAndProceed(s.id);
                         if (!allowed) {
                           // We don't set state here immediately to allow UI to show the "Connect" prompt below
                         }
                      }}
                      className={`p-4 rounded border text-left flex items-center gap-3 transition-all ${
                        newTriggerSourceId === s.id 
                        ? 'bg-[#C9A66B]/10 border-[#C9A66B]' 
                        : 'border-[#E8E4D9]/10 hover:bg-[#E8E4D9]/5'
                      }`}
                    >
                       {s.type === 'GOOGLE_CALENDAR' ? <Calendar className="w-5 h-5"/> : <MessageSquare className="w-5 h-5"/>}
                       <span className="font-mono text-sm">{s.name}</span>
                    </button>
                  ))}
               </div>
               
               {/* Logic: Redirect if source not connected */}
               {newTriggerSourceId && !isSourceConnected && (
                  <div className="mt-4 ml-9 p-4 bg-red-500/10 border border-red-500/20 rounded flex items-center justify-between animate-fade-in">
                     <div className="flex items-center gap-3 text-red-200">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">This source is not authenticated yet.</span>
                     </div>
                     <Button size="sm" onClick={() => setCurrentView('SOURCES')}>
                        Connect Now
                     </Button>
                  </div>
               )}
            </div>

            {/* Step 2: Trigger (Only show if source is valid) */}
            {newTriggerSourceId && isSourceConnected && (
               <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-6 h-6 rounded-full bg-[#C9A66B] text-[#061418] flex items-center justify-center font-bold text-sm">2</div>
                     <h3 className="font-medium">Define Trigger Keyword</h3>
                  </div>
                  <div className="pl-9">
                     <input 
                        type="text" 
                        value={newTriggerKeyword}
                        onChange={(e) => setNewTriggerKeyword(e.target.value)}
                        placeholder='e.g. "Demo", "Training", "Render"'
                        className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                     />
                     <p className="text-xs text-[#E8E4D9]/40 mt-2">Platform will scan event titles for this exact keyword.</p>
                  </div>
               </div>
            )}

            {/* Step 3: Resource */}
            {newTriggerKeyword && (
               <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-6 h-6 rounded-full bg-[#C9A66B] text-[#061418] flex items-center justify-center font-bold text-sm">3</div>
                     <h3 className="font-medium">Select Target Resource</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pl-9">
                     {resources.map(r => (
                        <button
                           key={r.id}
                           onClick={() => setNewTriggerResourceId(r.id)}
                           disabled={!r.connected}
                           className={`p-4 rounded border text-left flex flex-col gap-2 transition-all ${
                              newTriggerResourceId === r.id 
                              ? 'bg-[#C9A66B]/10 border-[#C9A66B]' 
                              : !r.connected ? 'opacity-50 cursor-not-allowed border-[#E8E4D9]/5' : 'border-[#E8E4D9]/10 hover:bg-[#E8E4D9]/5'
                           }`}
                        >
                           <div className="flex items-center justify-between w-full">
                              <span className="font-mono text-sm font-bold">{r.provider}</span>
                              {!r.connected && <Plug className="w-3 h-3"/>}
                           </div>
                           <span className="text-xs text-[#E8E4D9]/60">{r.name}</span>
                        </button>
                     ))}
                  </div>
                  {resources.every(r => !r.connected) && (
                     <div className="mt-4 ml-9 text-xs text-[#C9A66B] cursor-pointer hover:underline" onClick={() => setCurrentView('COMPUTE')}>
                        No resources connected. Click here to add one.
                     </div>
                  )}
               </div>
            )}

            <div className="flex justify-end pt-4">
               <Button 
                  disabled={!newTriggerSourceId || !newTriggerKeyword || !newTriggerResourceId || !isSourceConnected}
                  onClick={handleCreateTrigger}
               >
                  Create Orchestration
               </Button>
            </div>
         </div>
      </div>
    );
  }

  // --- Main Layout ---
  return (
    <div className="min-h-screen bg-[#061418] text-[#E8E4D9] font-sans selection:bg-[#C9A66B] selection:text-[#061418] flex">
      
      {/* Left Sidebar Navigation */}
      <aside className="w-64 fixed h-screen border-r border-[#E8E4D9]/10 bg-[#061418]/95 backdrop-blur flex flex-col z-50">
         <div className="h-20 flex items-center gap-3 px-6 border-b border-[#E8E4D9]/10">
            <div className="w-8 h-8 bg-[#E8E4D9] text-[#061418] flex items-center justify-center font-serif italic font-bold text-xl rounded-sm">
              d
            </div>
            <div className="leading-tight">
               <h1 className="font-serif font-bold tracking-wide">Demo</h1>
               <p className="font-mono text-[9px] tracking-widest uppercase opacity-50">Wise</p>
            </div>
         </div>

         <nav className="p-4 space-y-2 flex-1">
            <div className="text-xs font-mono text-[#E8E4D9]/30 uppercase tracking-widest px-4 mb-2 mt-4">Platform</div>
            <SidebarItem icon={LayoutDashboard} label="Dashboard" view="OVERVIEW" />
            <SidebarItem icon={Workflow} label="Triggers" view="TRIGGERS" />
            
            <div className="text-xs font-mono text-[#E8E4D9]/30 uppercase tracking-widest px-4 mb-2 mt-8">Infrastructure</div>
            <SidebarItem icon={Radio} label="Signals" view="SOURCES" />
            <SidebarItem icon={Cpu} label="Compute" view="COMPUTE" />
         </nav>

         <div className="p-4 border-t border-[#E8E4D9]/10">
             <div className="flex items-center gap-3 px-4 py-2">
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-[#E8E4D9]/30" />
                <div className="flex-1 overflow-hidden">
                   <div className="text-sm font-medium truncate">{user.name}</div>
                   <div className="text-xs text-[#E8E4D9]/40 truncate">Pro Plan</div>
                </div>
                <button onClick={onLogout} className="text-[#E8E4D9]/50 hover:text-[#E8E4D9]">
                  <LogOut className="w-4 h-4" />
                </button>
             </div>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
         {/* Top Bar */}
         <header className="h-20 border-b border-[#E8E4D9]/10 flex items-center justify-between px-8 bg-[#061418]/80 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2 text-[#E8E4D9]/50 text-sm font-mono">
               <span>/</span>
               <span className="uppercase tracking-wider text-[#E8E4D9]">{currentView.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#0F292F] border border-[#1A3E44]">
                <Clock className="w-3 h-3 text-[#C9A66B]" />
                <span className="font-mono text-xs tracking-wider">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (SIM)</span>
            </div>
         </header>

         {/* Page Content */}
         <div className="p-8 flex-1 relative">
            {currentView === 'OVERVIEW' && renderOverview()}
            {currentView === 'SOURCES' && renderSources()}
            {currentView === 'COMPUTE' && renderCompute()}
            {currentView === 'TRIGGERS' && renderTriggers()}
            {currentView === 'CREATE_TRIGGER' && renderCreateTrigger()}
         </div>
      </main>

    </div>
  );
};