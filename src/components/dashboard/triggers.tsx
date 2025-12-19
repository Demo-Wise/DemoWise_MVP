"use client"

import { Button } from "@/components/Buttons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@/components/types";
import { OrchestrationRule, SignalSource,ComputeResource  } from "@/components/types";
import { 
  Calendar, 
  Server,
  Clock,
  MessageSquare,
  Plus,
  LayoutDashboard,
  Workflow,
  Radio,
  Cpu,
  AlertCircle,
  LogOut,
  ArrowRight, 
  Plug,
  Pencil
} from 'lucide-react';

type ViewState = 'OVERVIEW' | 'SIGNALS' | 'COMPUTE' | 'TRIGGERS' | 'CREATE_TRIGGER';

interface TriggerProps {
    user: User;
    onLogout: () => void;
}

export const TriggersPage: React.FC<TriggerProps> = ({user, onLogout}) => {
    const [currentView, setCurrentView] = useState<ViewState>("TRIGGERS");
    const [sources, setSources] = useState<SignalSource[]>([]);
    const [resources, setResources] = useState<ComputeResource[]>([]);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    // Creating a new trigger
    const [newTriggerSourceId, setNewTriggerSourceId]     = useState<string>('');
    const [newTriggerKeyword, setNewTriggerKeyword]       = useState('');
    const [newTriggerResourceId, setNewTriggerResourceId] = useState<string>('');
    const [ newTriggerName, setNewTriggerName ]           = useState<string>("");
    const [ offsetTime, setOffsetTime ]                   = useState<number>(0);

    const [rules, setRules] = useState<OrchestrationRule[]>([]);
    const router = useRouter();

    useEffect(() => {
            const interval = setInterval(() => {
            setCurrentTime(new Date());
            }, 1000); // update every 1 second
    
            return () => clearInterval(interval); // cleanup on unmount
        }, []);

    useEffect(() => {
        const fetchedSources = async() => {
            const signalsFromDB = await signalSources();
            setSources(signalsFromDB);
        }

        const fetchedCompute = async() => {
            const computeFromDB = await fetchCompute();
            setResources(computeFromDB);
        }
        
        const fetchedTriggers = async() => {
            const triggersFromDB = await fetchTriggers();
            console.log(triggersFromDB);
            setRules(triggersFromDB);
        }

        fetchedSources();
        fetchedCompute();
        fetchedTriggers();
    }, []);

    // Utility functions

    const signalSources = async() => {
      // retrieving the signal sources from the DB for the user
      const response = await fetch(`/api/database/get/signal/allUserSignals?userID=${encodeURIComponent(user.userID)}`);
      const data     = await response.json();

      // returning empty array if no signals found
      if (!data.signals){
        console.log("No signals found for the user");
        return [];
      }

      // if there are signals, mapping them to SignalSource type
      const fetchedSources: SignalSource[] = data.signals.map((signal:any) => {
        return {
          id       : signal.signalID,
          type     : signal.platform,
          name     : signal.signalName || "Unnamed Signal",
          connected: signal.active,
          icon     : signal.platform === "GOOGLE_CALENDAR" ? 'calendar': 'slack',
        }
      }); 

      return fetchedSources;
    }

    const fetchCompute = async() =>{
      const response = await fetch(`/api/database/get/compute/allUserCompute?userID=${encodeURIComponent(user.userID)}`);
      const data     = await response.json();

      if (!data.compute){
        console.log("No compute resources found for the user");
        return [];
      }

      const fetchedCompute: ComputeResource[] = data.compute.map((comp:any) => ({
        id           : comp.computeID,
        name         : comp.computeName,
        provider     : comp.platform,
        connected    : comp.active,
        region       : comp.region,
        instanceType : JSON.parse(comp.config).instanceType,
        status       : comp.active? "ACTIVE": "INACTIVE"
      }));

      return fetchedCompute;
    }

    const fetchTriggers = async() => {
        
        const response = await fetch(`/api/database/get/trigger/allUserTriggers?userID=${encodeURIComponent(user.userID)}`);
        const data     = await response.json();

        if (!data.triggers){
            console.log("No Triggers found for the user");
            return [];
        }

        const fetchedTriggers: OrchestrationRule[] = data.triggers.map((trigger:any) => {
            return {
                id                : trigger.triggerID,
                sourceId          : trigger.signalID,
                triggerKeyword   : trigger.triggerWord,
                triggerName       : trigger.triggerName,
                targetResourceId : trigger.computeID,
                durationBuffer    : trigger.startOffsetMinutes
            }
        });

        return fetchedTriggers;
        
    }

    const changePage = (view: ViewState) => {
        if (view === "OVERVIEW"){
            router.push('/dashboard');
            return;
        }

        router.push(`/dashboard/${view.toLowerCase()}`);
    }

    const checkSourceAndProceed = (sourceId: string) => {
        const source = sources.find(s => s.id === sourceId);
        setNewTriggerSourceId(sourceId);
        
        if (source && !source.connected) {
        // Redirect flow
        return false; 
        }
        return true;
    };

    const SidebarItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: ViewState }) => (
        <button 
        onClick={() => changePage(view)}
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

    const handleCreateTrigger = async() =>{
        console.log("inside handle create Trigger", newTriggerSourceId, newTriggerResourceId, newTriggerName, newTriggerKeyword, offsetTime);
        if (!newTriggerSourceId || !newTriggerKeyword || !newTriggerResourceId || !newTriggerName || !offsetTime) return;
        // API to create new Trigger in DB
        console.log("Inside handle create trigger after the if condition");
        try {
            const response = await fetch('/api/database/create/trigger',{
                method : "POST",
                headers: {"Content-Type": "application/json"},
                body   : JSON.stringify({
                    userID            : user.userID,
                    signalID          : newTriggerSourceId,
                    computeID         : newTriggerResourceId,
                    triggerWord       : newTriggerKeyword,
                    triggerName       : newTriggerName,
                    startOffsetMinutes: offsetTime,
                    stopOffSetMinutes : offsetTime
                })
            });

            if (response.ok){
               const data =  await response.json();
               console.log("Trigger saved successfully : ", data);
               const trigger = data.trigger;
            }

            fetchTriggers().then(fetchedTriggers => {
                setRules(fetchedTriggers);
            });

            setNewTriggerKeyword("");
            setNewTriggerName("");
            setNewTriggerResourceId('');
            setNewTriggerSourceId("");
            setOffsetTime(0);

            console.log("saved the Triggers");
            setCurrentView("TRIGGERS");
            
        } catch(err:any){
            console.log("Error while saving the Trigger details to DB: ", err);
        }

        
    }

    const deleteTrigger = async(id:string) => {
        const response = await fetch(`/api/database/delete/trigger/${id}`, {
            method: "DELETE"
        });

        if (!response.ok){
            const errorData = await response.json().catch(() => ({message: "Unkown Error"}));
            console.error("Deletion failed with status", response.status, errorData);
            throw new Error("Failed to delete Trigger", errorData.message);
        }

        const data  = await response .json();
        const fresh = await fetchTriggers();
        setRules(fresh);

        return data;
    }   

    const renderTrigger = () => {
        return (
            <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                <h2 className="font-serif text-3xl mb-2">Orchestration Triggers</h2>
                <p className="font-mono text-[#E8E4D9]/60">Define logic mapping signals to compute actions.</p>
                </div>
                <Button onClick={() => setCurrentView("CREATE_TRIGGER")} className="gap-2">
                <Plus className="w-4 h-4" /> Create Trigger
                </Button>
            </div>

            <div className="grid gap-4">
                {rules.map(rule => {
                const src = sources.find(s => s.id === rule.sourceId);
                const res = resources.find(r => r.id === rule.targetResourceId);

                console.log("source: ", sources);
                console.log("resource: ", resources);
                console.log("trigger: ", rule)

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
                                   <div className="flex items-center gap-3 ml-auto">
                                    <button
                                        className="
                                        px-3 py-2 rounded-lg 
                                        bg-[#E8E4D9]/5 border border-[#E8E4D9]/20 
                                        text-[#E8E4D9]/60 flex items-center gap-2
                                        font-mono
                                        transition-all duration-300
                                        hover:text-white hover:border-white hover:bg-white/10
                                        hover:shadow-[0_0_12px_rgba(255,255,255,0.5)]
                                        h-9
                                        "
                                    >
                                        <Pencil className="w-4 h-4" />
                                        {/* <span>Edit</span> */}
                                    </button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="
                                        hover:text-red-400 hover:bg-red-400/10
                                        h-9 px-3
                                        "
                                        onClick={() => deleteTrigger(rule.id)}
                                    >
                                        Delete
                                    </Button>
                                    </div>

                                </div>
                )
                })}
            </div>
            </div>
        );
    }

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
                  <h3 className="font-medium">{sources.length > 0 ? "Select Signal Source": "No Signals are found"}</h3>
                  {
                    sources.length === 0 ? (
                        <button
                        onClick={() => router.push("/dashboard/signals")}   // or your route handler
                        className="px-3 py-1 rounded-md bg-[#C9A66B] text-[#061418] text-sm font-medium hover:bg-[#C9A66B]/80 transition"
                        >
                        Connect
                        </button>
                    ) : (
                        <span className="text-xs text-[#E8E4D9]/40">Choose a signal source to trigger the orchestration.</span>
                    )
                  }
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
                     <Button size="sm" onClick={() => changePage("SIGNALS")}>
                        Connect Now
                     </Button>
                  </div>
               )}
            </div>
            
            {newTriggerSourceId && isSourceConnected && (
               <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-6 h-6 rounded-full bg-[#C9A66B] text-[#061418] flex items-center justify-center font-bold text-sm">2</div>
                     <h3 className="font-medium">Define Trigger Name</h3>
                  </div>
                  <div className="pl-9">
                     <input 
                        type="text" 
                        value={newTriggerName}
                        onChange={(e) => setNewTriggerName(e.target.value)}
                        placeholder='e.g. "Backend production Trigger", "Frontend Development Trigger"'
                        className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                     />
                     <p className="text-xs text-[#E8E4D9]/40 mt-2">This Trigger will be later be referenced using this name.</p>
                  </div>
               </div>
            )}

            {/* Step 2: Trigger (Only show if source is valid) */}
            {newTriggerName && (
               <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-6 h-6 rounded-full bg-[#C9A66B] text-[#061418] flex items-center justify-center font-bold text-sm">3</div>
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
                     <div className="w-6 h-6 rounded-full bg-[#C9A66B] text-[#061418] flex items-center justify-center font-bold text-sm">4</div>
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
                     <div className="mt-4 ml-9 text-xs text-[#C9A66B] cursor-pointer hover:underline" onClick={() => changePage('COMPUTE')}>
                        No resources connected. Click here to add one.
                     </div>
                  )}
               </div>
            )}

            {newTriggerResourceId  && (
               <div className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-6 h-6 rounded-full bg-[#C9A66B] text-[#061418] flex items-center justify-center font-bold text-sm">5</div>
                     <h3 className="font-medium">Define Offset Time in minutes</h3>
                  </div>
                  <div className="pl-9">
                     <input 
                        type="number" 
                        value={offsetTime}
                        onChange={(e) => setOffsetTime(Number(e.target.value))}
                        placeholder='e.g. '
                        className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                     />
                     <p className="text-xs text-[#E8E4D9]/40 mt-2">The connected resouce will be triggered the given offset time before the event and shutdown after the event.</p>
                  </div>
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


    return (
        <div className="min-h-screen bg-[#061418] text-[#E8E4D9] font-sans selection:bg-[#C9A66B] selection:text-[#061418] flex">
              
              {/* Left Sidebar Navigation */}
              <aside className="w-64 fixed h-screen border-r border-[#E8E4D9]/10 bg-[#061418]/95 backdrop-blur flex flex-col z-50">
                <Link href="/dashboard" className='block'>
                    <div className="h-20 flex items-center gap-3 px-6 border-b border-[#E8E4D9]/10">
                        <div className="w-8 h-8 bg-[#E8E4D9] text-[#061418] flex items-center justify-center font-serif italic font-bold text-xl rounded-sm">
                        d
                        </div>
                        <div className="leading-tight">
                        <h1 className="font-serif font-bold tracking-wide">Demo</h1>
                        <p className="font-mono text-[9px] tracking-widest uppercase opacity-50">Wise</p>
                        </div>
                    </div>
                </Link>
                 
        
                 <nav className="p-4 space-y-2 flex-1">
                    <div className="text-xs font-mono text-[#E8E4D9]/30 uppercase tracking-widest px-4 mb-2 mt-4">Platform</div>
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" view="OVERVIEW" />
                    <SidebarItem icon={Workflow} label="Triggers" view="TRIGGERS" />
                    
                    <div className="text-xs font-mono text-[#E8E4D9]/30 uppercase tracking-widest px-4 mb-2 mt-8">Infrastructure</div>
                    <SidebarItem icon={Radio} label="Signals" view="SIGNALS" />
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
                    {currentView === "TRIGGERS" && renderTrigger()}
                    {currentView === "CREATE_TRIGGER" && renderCreateTrigger()}
                    
                 </div>
              </main>
        
            </div>
          );
}