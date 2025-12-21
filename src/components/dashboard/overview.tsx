import { 
  Calendar, 
  LogOut, 
  Zap, 
  Clock,
  Server,
  Activity,
  MessageSquare,
  LayoutDashboard,
  Radio,
  Cpu,
  Workflow,
  ArrowRight,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { User, CalendarEvent, SignalSource, ComputeResource, ComputeStatus, OrchestrationRule } from '../types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OverviewProps {
    user : User;
    onLogout: () => void;
}

type ViewState = 'OVERVIEW' | 'SIGNALS' | 'COMPUTE' | 'TRIGGERS';

export const Overview: React.FC<OverviewProps> = ({user, onLogout}) => {
    const [sources, setSources] = useState<SignalSource[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [resources, setResources] = useState<ComputeResource[]>([]);
    const [targetEventIds, setTargetEventIds] = useState<Set<string>>(new Set());
    const [triggers, setTriggers] = useState<OrchestrationRule[]>([]);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false); // Visual loading state

    const connectorRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [dims, setDims] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null); // Ref for the parent 'glass-panel'

    const router = useRouter();
    const currentView:ViewState = 'OVERVIEW';

    // 1. Clock Ticker
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const changePage = (view: ViewState) => {
        router.push(`/dashboard/${view.toLowerCase()}`);
    }

    // 2. Define Fetch Functions with useCallback so they can be reused
    const fetchSignals = useCallback(async() => {
        const response = await fetch(`/api/database/get/signal/allUserSignals?userID=${encodeURIComponent(user.userID)}`);
        const data     = await response.json();
        if (!data.signals) return [];

        return data.signals.map((signal:any) => ({
            id       : signal.signalID,
            type     : signal.platform,
            name     : signal.signalName || "Unnamed Signal",
            connected: signal.active,
            icon     : signal.platform === "GOOGLE_CALENDAR" ? 'calendar': 'slack',
        })); 
    }, [user.userID]);

    const fetchEvents = useCallback(async(signalID: string) => {
        // Fetch 60 days of events
        const response = await fetch(`/api/calendar/getEvents?signalID=${encodeURIComponent(signalID)}&days=${encodeURIComponent(60)}`);
        const data     = await response.json().catch(() => null);

        if (!data || !data.events) return [];

        return data.events.map((event:any) => ({
            id          : event.id,
            title       : event.summary,
            start       : event.start,
            end         : event.end,
            description : event.description,
            attendees   : event.attendees  
        }));
    }, []);

    const fetchCompute = useCallback(async() =>{
        const response = await fetch(`/api/database/get/compute/allUserCompute?userID=${encodeURIComponent(user.userID)}`);
        const data     = await response.json();
        if (!data.compute) return [];

        return data.compute.map((comp:any) => ({
            id           : comp.computeID,
            name         : comp.computeName,
            provider     : comp.platform,
            connected    : comp.active,
            region       : comp.region,
            instanceType : JSON.parse(comp.config).instanceType,
            status       : comp.active? "ACTIVE": "INACTIVE"
        }));
    }, [user.userID]);

    const fetchTriggers = useCallback(async() => {
        const response = await fetch(`/api/database/get/trigger/allUserTriggers?userID=${encodeURIComponent(user.userID)}`);
        const data     = await response.json();
        if (!data.triggers) return [];

        return data.triggers.map((trigger:any) => ({
            id                : trigger.triggerID,
            sourceId          : trigger.signalID,
            triggerKeyword    : trigger.triggerWord,
            triggerName       : trigger.triggerName,
            targetResourceId  : trigger.computeID,
            durationBuffer    : trigger.startOffsetMinutes
        }));
    }, [user.userID]);


    // 3. Master Data Refresh Function
    const refreshAllData = useCallback(async () => {
        // Don't show loading spinner on background polls, only initial
        const signalsFromDB = await fetchSignals();
        setSources(signalsFromDB);
        
        const signalID = signalsFromDB.find((s:any) => s.type === "GOOGLE_CALENDAR")?.id;
        
        if (signalID){
            const calendarEvents = await fetchEvents(signalID);
            // Simple check to avoid re-rendering if data hasn't changed could go here
            setEvents(calendarEvents); 
        }

        const computeFromDB = await fetchCompute();
        setResources(computeFromDB);

        const triggersFromDB = await fetchTriggers();
        setTriggers(triggersFromDB);

    }, [fetchSignals, fetchEvents, fetchCompute, fetchTriggers]);


    // 4. Initial Load & Polling Interval (Auto-Reload)
    useEffect(() => {
        const init = async () => {
            setIsRefreshing(true);
            await refreshAllData();
            setIsRefreshing(false);
        };
        init();

        // POLL every 10 seconds to check for new events from Webhook updates
        const pollInterval = setInterval(() => {
            refreshAllData(); 
        }, 10000); 

        return () => clearInterval(pollInterval);
    }, [refreshAllData]);


    // ... [SidebarItem helper remains same] ...
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

    function center(el: HTMLElement) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }

    // 2. ADD THIS EFFECT: Triggers the re-render after mount
    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                // This setDims call forces React to run the render loop again,
                // this time WITH the refs populated.
                setDims({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        // Wait 100ms for the DOM to settle, then update
        const timeout = setTimeout(update, 100);
        
        // Also update if the user resizes the window
        window.addEventListener('resize', update);
        
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', update);
        };
    }, [sources, resources, triggers]); // Re-calculate if data changes

    function orchestrationMap() {
        // 1. Filter active lists to match what is rendered in the DOM
        const activeSources = sources.filter(s => s.connected);
        const activeResources = resources.filter(r => r.connected);

        // 2. Helper to calculate Y position based on index (assuming ~100px height+gap per item, centered in 300px container)
        // Center of container is 150px. Item spacing approx 90px.
        const getY = (index: number, total: number) => {
            const centerY = 150;
            const itemHeight = 90; 
            const startY = centerY - ((total - 1) * itemHeight) / 2;
            return startY + (index * itemHeight);
        };

        return (
            <div className="glass-panel flex-1 rounded-xl border border-[#E8E4D9]/10 bg-[#061418]/40 p-8 relative overflow-hidden">
                {/* Inline Styles for the flow animation */}
                <style jsx>{`
                    @keyframes flow-animation {
                        to { stroke-dashoffset: -20; }
                    }
                    .animate-flow {
                        animation: flow-animation 1s linear infinite;
                    }
                `}</style>

                <h3 className="font-serif text-xl mb-8 flex items-center gap-2 relative z-10">
                    <Workflow className="w-5 h-5 text-[#E8E4D9]/60" />
                    Active Orchestration Map
                </h3>

                <div ref={containerRef} className="glass-panel flex-1 rounded-xl border border-[#E8E4D9]/10 bg-[#061418]/40 p-8 relative overflow-hidden">
        
        {/* ... Header and other UI ... */}

        <div className="relative grid grid-cols-3 gap-8 items-center justify-items-center h-[300px]">
            
            {/* 5. THE SVG OVERLAY */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {(() => {
                    // Safety: If we haven't measured dimensions yet, waiting for re-render
                    if (dims.width === 0) return null;
                    if (!connectorRefs.current) return null;

                    const uniquePairs = new Map();
                    triggers.forEach(t => {
                        const key = `${t.sourceId}__${t.targetResourceId}`;
                        if (!uniquePairs.has(key)) {
                            uniquePairs.set(key, { sourceId: t.sourceId, targetId: t.targetResourceId });
                        }
                    });

                    return Array.from(uniquePairs.values()).map(({ sourceId, targetId }) => {
                        const s = connectorRefs.current[`signal-${sourceId}`];
                        const aiIn = connectorRefs.current["ai-left"];
                        const aiOut = connectorRefs.current["ai-right"];
                        const c = connectorRefs.current[`compute-${targetId}`];

                        if (!s || !aiIn || !aiOut || !c) return null;

                        const p1 = center(s);
                        const p2 = center(aiIn);
                        const p3 = center(aiOut);
                        const p4 = center(c);

                        return (
                            <g key={`${sourceId}-${targetId}`}>
                                <path
                                    d={`M ${p1.x} ${p1.y} C ${(p1.x + p2.x) / 2} ${p1.y}, ${(p1.x + p2.x) / 2} ${p2.y}, ${p2.x} ${p2.y}`}
                                    stroke="#C9A66B"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeOpacity="0.4"
                                />
                                <path
                                    d={`M ${p3.x} ${p3.y} C ${(p3.x + p4.x) / 2} ${p3.y}, ${(p3.x + p4.x) / 2} ${p4.y}, ${p4.x} ${p4.y}`}
                                    stroke="#C9A66B"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeOpacity="0.4"
                                />
                            </g>
                        );
                    });
                })()}
            </svg>


                    {/* Background Center Line (Subtle) */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-[#E8E4D9]/5 -z-10 transform -translate-y-1/2"></div>

                    {/* Column 1: Signal */}
                    <div className="flex flex-col gap-4 items-center w-full justify-center z-10">
                        <div className="text-xs font-mono text-[#E8E4D9]/40 uppercase tracking-widest mb-2">Signal</div>
                        {activeSources.map(source => (
                            <div key={source.id} className="w-full max-w-[180px] p-4 bg-[#0F292F] border border-[#E8E4D9]/20 rounded-lg flex items-center gap-3 shadow-lg relative">
                                <div className="p-2 bg-[#061418] rounded">
                                    {source.type === 'GOOGLE_CALENDAR' ? <Calendar className="w-4 h-4 text-[#C9A66B]"/> : <MessageSquare className="w-4 h-4 text-blue-400"/>}
                                </div>
                                <span className="text-sm font-mono font-medium">{source.name}</span>
                                
                                {/* Connector Dot (Right Side) */}
                                <div ref={(el) => {
                                        if (el) connectorRefs.current[`signal-${source.id}`] = el;
                                        else delete connectorRefs.current[`signal-${source.id}`];
                                    }} 
                                    className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#061418] border border-[#C9A66B] rounded-full z-20 
                                    ${triggers.some(t => t.sourceId === source.id) ? 'shadow-[0_0_8px_#C9A66B]' : 'opacity-50'}`}>
                                    <div className="w-full h-full bg-[#C9A66B] rounded-full transform scale-50"></div>
                                </div>
                            </div>
                        ))}
                         {activeSources.length === 0 && (
                            <div className="p-4 border border-dashed border-[#E8E4D9]/20 rounded text-[#E8E4D9]/30 text-sm">No Signals</div>
                        )}
                    </div>

                    {/* Column 2: Logic (Center) */}
                    <div className="flex flex-col items-center justify-center ai-logic z-10">
                        <div className="text-xs font-mono text-[#E8E4D9]/40 uppercase tracking-widest mb-4">Logic</div>
                        <div className={`w-32 h-32 rounded-full border border-[#C9A66B]/30 bg-[#0F292F]/80 backdrop-blur flex flex-col items-center justify-center relative 
                            ${triggers.length > 0 ? 'shadow-[0_0_30px_rgba(201,166,107,0.15)]' : ''}`}>
                            
                            <Zap className={`w-8 h-8 mb-2 transition-colors ${triggers.length > 0 ? 'text-[#C9A66B] animate-pulse' : 'text-[#E8E4D9]/20'}`} />
                            <span className="text-xs font-mono text-[#C9A66B]">AI ENGINE</span>
                            
                            {/* Static Connectors on Circle */}
                            <div ref={(el) => {
                                    if (el) connectorRefs.current["ai-left"] = el;
                                    else delete connectorRefs.current["ai-left"];
                                }} 
                                className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#C9A66B] rounded-full shadow-[0_0_10px_#C9A66B]"></div>
                            
                            <div ref={(el) => {
                                    if (el) connectorRefs.current["ai-right"] = el;
                                    else delete connectorRefs.current["ai-right"];
                                }} 
                                className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#C9A66B] rounded-full shadow-[0_0_10px_#C9A66B]"></div>
                        </div>
                    </div>

                    {/* Column 3: Compute */}
                    <div className="flex flex-col gap-4 items-center w-full justify-center z-10">
                        <div className="text-xs font-mono text-[#E8E4D9]/40 uppercase tracking-widest mb-2">Compute</div>
                        {activeResources.map(res => (
                            <div key={res.id} className={`w-full max-w-[180px] p-4 border rounded-lg flex items-center gap-3 shadow-lg relative transition-colors ${
                            res.status === ComputeStatus.ACTIVE 
                                ? 'bg-[#0F292F] border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                                : 'bg-[#061418] border-[#E8E4D9]/20'
                            }`}>
                                {/* Connector Dot (Left Side) */}
                                <div ref={(el) => {
                                        if (el) connectorRefs.current[`compute-${res.id}`] = el;
                                        else delete connectorRefs.current[`compute-${res.id}`];
                                    }} 
                                    className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#061418] border rounded-full z-20 
                                    ${triggers.some(t => t.targetResourceId === res.id) ? 'border-[#C9A66B] shadow-[0_0_8px_#C9A66B]' : 'border-[#E8E4D9]/40 opacity-50'}`}>
                                    <div className={`w-full h-full rounded-full transform scale-50 ${triggers.some(t => t.targetResourceId === res.id) ? 'bg-[#C9A66B]' : 'bg-[#E8E4D9]/40'}`}></div>
                                </div>

                                <div className="p-2 bg-[#061418] rounded border border-[#E8E4D9]/10">
                                    <Server className={`w-4 h-4 ${res.status === ComputeStatus.ACTIVE ? 'text-emerald-400' : 'text-[#E8E4D9]/40'}`}/>
                                </div>
                                <div>
                                    <div className="text-sm font-mono font-medium">{res.name}</div>
                                    <div className="text-[10px] font-mono text-[#E8E4D9]/50">{res.instanceType}</div>
                                </div>
                            </div>
                        ))}
                         {activeResources.length === 0 && (
                            <div className="p-4 border border-dashed border-[#E8E4D9]/20 rounded text-[#E8E4D9]/30 text-sm">No Compute</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const renderOverview = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
            
            {/* Column 1: Calendar (BEAUTIFIED) */}
            <div className="lg:col-span-3 flex flex-col gap-4 h-full min-h-0">
                <div className="glass-panel rounded-xl border border-[#E8E4D9]/10 bg-[#0F292F]/40 h-full flex flex-col overflow-hidden min-h-0 shadow-xl">

                    {/* Header */}
                    <div className="p-4 pb-2 border-b border-[#E8E4D9]/10 flex justify-between items-center bg-[#061418]/50">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#C9A66B]" />
                            <h3 className="font-serif text-lg tracking-wide">Schedule</h3>
                        </div>
                        {isRefreshing && <RefreshCw className="w-3 h-3 text-[#E8E4D9]/30 animate-spin"/>}
                    </div>

                    {/* Calendar List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar min-h-0 bg-gradient-to-b from-[#061418]/20 to-transparent">

                        {events.length === 0 ? (
                            <div className="text-center py-20 flex flex-col items-center">
                                <Calendar className="w-8 h-8 text-[#E8E4D9]/10 mb-2"/>
                                <span className="text-[#E8E4D9]/30 text-xs font-mono">No upcoming events</span>
                            </div>
                        ) : (
                            (() => {
                                const grouped: Record<string, typeof events> = {};
                                events.forEach(ev => {
                                    const key = new Date(ev.start).toISOString().split("T")[0];
                                    if (!grouped[key]) grouped[key] = [];
                                    grouped[key].push(ev);
                                });

                                return Object.entries(grouped).map(([date, dayEvents]) => {
                                    const dateObj = new Date(date);
                                    const isToday = dateObj.toDateString() === new Date().toDateString();

                                    return (
                                        <div key={date} className="relative">
                                            {/* Date Sticky Header */}
                                            <div className="sticky top-0 z-10 flex items-center gap-2 mb-3 bg-[#0F292F]/90 backdrop-blur py-1 rounded">
                                                <span className={`text-xs font-bold font-mono uppercase tracking-wider ${isToday ? 'text-[#C9A66B]' : 'text-[#E8E4D9]/50'}`}>
                                                    {isToday ? 'Today' : dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                                                </span>
                                                <span className="text-[10px] text-[#E8E4D9]/30 font-mono">
                                                    {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                                <div className="h-px bg-[#E8E4D9]/10 flex-1"></div>
                                            </div>

                                            {/* Events Stack */}
                                            <div className="space-y-3 pl-2 border-l border-[#E8E4D9]/5 ml-1">
                                                {dayEvents.map(event => {
                                                    const isActive = currentTime >= new Date(event.start) && currentTime <= new Date(event.end);
                                                    const isTarget = targetEventIds.has(event.id); // Or logic to verify keyword match
                                                    const isTriggerKeyword = triggers.some(t => event.title.toLowerCase().includes(t.triggerKeyword.toLowerCase()));

                                                    return (
                                                        <div key={event.id} className="group relative pl-4">
                                                            
                                                            {/* Timeline Indicator (Replaces Dot) */}
                                                            <div className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-sm border transform rotate-45 transition-all duration-300
                                                                ${isActive 
                                                                    ? 'bg-[#C9A66B] border-[#C9A66B] shadow-[0_0_10px_#C9A66B]' 
                                                                    : 'bg-[#061418] border-[#E8E4D9]/30'
                                                                }`} 
                                                            />

                                                            {/* Event Card */}
                                                            <div className={`
                                                                relative p-3 rounded-lg border transition-all duration-300 overflow-hidden
                                                                ${isActive 
                                                                    ? 'bg-[#C9A66B]/10 border-[#C9A66B]/50' 
                                                                    : 'bg-[#061418]/60 border-[#E8E4D9]/10 hover:border-[#E8E4D9]/30 hover:bg-[#061418]'
                                                                }
                                                            `}>
                                                                {/* Active Pulse Background */}
                                                                {isActive && <div className="absolute inset-0 bg-[#C9A66B]/5 animate-pulse"></div>}

                                                                <div className="relative z-10 flex justify-between items-start">
                                                                    <div>
                                                                        <div className={`text-xs font-mono mb-1 ${isActive ? 'text-[#C9A66B]' : 'text-[#E8E4D9]/40'}`}>
                                                                            {new Date(event.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                                                                            <span className="opacity-50 mx-1">-</span>
                                                                            {new Date(event.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                                        </div>
                                                                        
                                                                        <div className={`text-sm font-medium leading-tight mb-1 ${isActive ? 'text-white' : 'text-[#E8E4D9]/90'}`}>
                                                                            {event.title}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Status Footer */}
                                                                {(isTriggerKeyword || isActive) && (
                                                                    <div className="relative z-10 mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                                                                         {isActive && (
                                                                             <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                                                                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                                                                                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wide">Live</span>
                                                                             </div>
                                                                         )}
                                                                         
                                                                         {isTriggerKeyword && (
                                                                             <div className="flex items-center gap-1 text-[10px] text-[#C9A66B]">
                                                                                 <Zap className="w-3 h-3" />
                                                                                 <span className="uppercase tracking-wider font-mono">Trigger</span>
                                                                             </div>
                                                                         )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            })()
                        )}
                    </div>
                </div>
            </div>

            {/* Column 2: Orchestration & Connected Resources */}
            <div className="lg:col-span-9 flex flex-col gap-6">
                 {/* ... Stats Row (Kept same) ... */}
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
                        <div className="text-4xl font-serif text-[#C9A66B]">$124.50</div>
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
                {orchestrationMap()}
            </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#061418] text-[#E8E4D9] font-sans selection:bg-[#C9A66B] selection:text-[#061418] flex">
              
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
              <main className="flex-1 ml-64 h-screen flex flex-col min-h-0 overflow-hidden">
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
        
                 <div className="p-8 flex-1 relative min-h-0 overflow-hidden">
                    {renderOverview()}
                 </div>
              </main>
        
            </div>
          );
}