"use client"

import { useRouter } from "next/navigation";
import { User } from "@/components/types";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/Buttons";
import { SignalSource } from "@/components/types";
import { SourceType } from "@/components/types";
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
  LogOut,
  ArrowRight,
  Check,
  Shield,
  Lock,
  Trash,
  Signal
} from 'lucide-react';
import { access } from "fs";


type ViewState = "OVERVIEW" | "SIGNALS" | "COMPUTE" | "TRIGGERS" | "ADD SOURCE";

interface SignalProps{
    user: User;
    onLogout: () => void;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export const SignalsPage: React.FC<SignalProps> = ({ user, onLogout }) => {
    const [ currentView, setCurrentView ] = useState<ViewState>('SIGNALS');
    const [ currentTime, setCurrentTime ] = useState<Date>(new Date());

    // Overall user Signals list
    const [ sources, setSources ] = useState<SignalSource[]>([]);

    // Signal information
    const [ newSignalType, setNewSignalType ] = useState<SourceType | null>(null);
    const [ newSignalName, setNewSignalName ] = useState<string>('');
    
    const [ status, setStatus ] = useState<string>('');
    const router = useRouter();

    // Utility Functions  
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

    const deleteSignal = async(id:string) => {
      // Calling the API to delete the singal from DB
      const response = await fetch(`/api/database/delete/signal/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error(`Deletion failed with status ${response.status}:`, errorData);
        throw new Error(`Failed to delete signal: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      const fresh = await signalSources();
      setSources(fresh);
      return data; // Return data if successful
    }

    const openAuthPopupAndWait= async () => {
      setStatus('Loading PopUp');
      console.log("openAuthPopuAndWait function call")

      const r = await fetch(`/api/auth/calendar/url?userID=${encodeURIComponent(user.userID)}&signalName=${encodeURIComponent(newSignalName)}&signalType=${encodeURIComponent(newSignalType!)}`);
      const { url, state } = await r.json();
      console.log("AUTH URL: ", url);

      const width = 600, height = 650;
      const left  = window.screenX + (window.innerWidth - width) / 2;
      const top   = window.screenY + (window.innerHeight - height) / 2;

      const popup = window.open(url, "google_auth", `width=${width},height=${height},left=${left},top=${top}`);

      if (!popup){
        setStatus("Popup is blocked");
        return;
      }

      setStatus("waiting-for-auth");

      return new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(()=>{
          window.removeEventListener('message', handler);
          setStatus("Auth Timed out");
          reject(new Error("Auth timed out"));
        }, 2* 60 * 1000);


        const handler = (ev: MessageEvent) => {
          console.log("inside handler");
          if (ev.origin !== window.location.origin) return;

          const data =  ev.data;

          if (data?.type === "GOOGLE_AUTH_COMPLETE"){
            window.clearTimeout(timeout);
            window.removeEventListener('message', handler);

            console.log("user connected status: ", data.connected);

            if (data.connected){
              console.log("handler user Connected")
              setStatus('connected');
              handleAddSignal();
              resolve();

            } else{
              setStatus("user not Connected");
              reject(new Error("User not Connected"));
            }

          }

        }
        

        window.addEventListener('message',  handler);
      });

    }


    const toggleSourceConnection = async (id: string) => {
      // Calling the API to update the DB
      const response = await fetch("/api/database/update/signal/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body:JSON.stringify({signalID:id})
      });

      const data = await response.json();
      if(!data.ok){
        console.log("Error toggling the source connection in the DB: ", data.error);
        return;
      }

      setSources(prev => prev.map(s => {
      if (s.id === id) {
          const newState = !s.connected;
          // addLog('MONITOR', `${s.name} ${newState ? 'Connected' : 'Disconnected'}`);
          return { ...s, connected: newState };
      }
      return s;
      }));

    };

    // Changing between the pages
    const changePage = (view: ViewState) => {
        if (view === "OVERVIEW"){
            router.push('/dashboard');
            return;
        }

        router.push(`/dashboard/${view.toLowerCase()}`);
    }

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

    const handleAddSignal = async() => {
        console.log("Inside handle Add Signal");
        if (!newSignalType) return;

        signalSources().then(fetchedSignals => {
          setSources(fetchedSignals);
        });

        setNewSignalName('');
        setNewSignalType(null);
        setCurrentView('SIGNALS');
    }

    // Render Functions
    const renderAddSource = () => (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => setCurrentView('SIGNALS')} className="pl-0 gap-2 mb-4">
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to Signals
        </Button>
        <h2 className="font-serif text-3xl mb-2">Connect New Signal</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setNewSignalType('GOOGLE_CALENDAR')}
          className={`p-6 rounded-xl border text-left transition-all ${
            newSignalType === 'GOOGLE_CALENDAR'
              ? 'bg-[#C9A66B]/10 border-[#C9A66B]'
              : 'bg-[#0F292F]/40 border-[#E8E4D9]/10 hover:border-[#E8E4D9]/30'
          }`}
        >
          <Calendar className={`w-8 h-8 mb-4 ${newSignalType === 'GOOGLE_CALENDAR' ? 'text-[#C9A66B]' : 'text-[#E8E4D9]/60'}`} />
          <div className="font-medium text-lg">Google Calendar</div>
          <div className="text-sm text-[#E8E4D9]/50 mt-2 font-mono">Trigger compute based on event titles and attendees.</div>
        </button>

        <button
          onClick={() => setNewSignalType('SLACK')}
          className={`p-6 rounded-xl border text-left transition-all opacity-60 cursor-not-allowed ${
            newSignalType === 'SLACK'
              ? 'bg-[#C9A66B]/10 border-[#C9A66B]'
              : 'bg-[#0F292F]/40 border-[#E8E4D9]/10'
          }`}
        >
          <MessageSquare className="w-8 h-8 mb-4 text-[#E8E4D9]/60" />
          <div className="font-medium text-lg">Slack Channel</div>
          <div className="text-sm text-[#E8E4D9]/50 mt-2 font-mono">Monitor channels for deployment commands.</div>
        </button>
      </div>

      {newSignalType === 'GOOGLE_CALENDAR' && (
        <div className="glass-panel p-8 rounded-xl border border-[#E8E4D9]/10 animate-fade-in">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#E8E4D9]/10">
            <Shield className="w-5 h-5 text-[#C9A66B]" />
            <h3 className="font-medium">Credential Configuration</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Signal Name</label>
              <input 
                type="text" 
                value={newSignalName}
                onChange={(e) => setNewSignalName(e.target.value)}
                placeholder='e.g., "Marketing Team Calendar"'
                className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
              />
            </div>

            {/* <div>
              <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Calendar ID (Email)</label>
              <input 
                type="text" 
                value={newSignalIdentifier}
                onChange={(e) => setNewSignalIdentifier(e.target.value)}
                placeholder='e.g., marketing-team@company.com'
                className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
              />
            </div> */}

            {/* <div>
              <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Service Account Key (Optional)</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={newSignalKey}
                  onChange={(e) => setNewSignalKey(e.target.value)}
                  placeholder='••••••••••••••••••••••••'
                  className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono pr-10"
                />
                <Lock className="w-4 h-4 text-[#E8E4D9]/30 absolute right-3 top-3.5" />
              </div>
              <p className="text-[10px] text-[#E8E4D9]/40 mt-2">If left blank, public calendar access will be attempted.</p>
            </div> */}

            <div className="bg-[#061418]/50 p-4 rounded border border-[#E8E4D9]/10 mt-6">
              <div className="text-xs font-mono text-[#E8E4D9]/40 mb-3">REQUESTED PERMISSIONS</div>
              <ul className="space-y-2">
                 <li className="flex items-center gap-2 text-sm text-[#E8E4D9]/80">
                   <Check className="w-4 h-4 text-emerald-500" /> View events on all calendars
                 </li>
                 <li className="flex items-center gap-2 text-sm text-[#E8E4D9]/80">
                   <Check className="w-4 h-4 text-emerald-500" /> View attendees
                 </li>
                 <li className="flex items-center gap-2 text-sm text-[#E8E4D9]/80">
                   <Check className="w-4 h-4 text-emerald-500" /> See settings
                 </li>
              </ul>
            </div>

            <div className="pt-4 flex justify-end">
               <Button 
                 onClick={() => {openAuthPopupAndWait()}}
                 disabled={!newSignalName}
               >
                 Authorize & Connect
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

    const renderSources = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-8">
         <div>
          <h2 className="font-serif text-3xl mb-2">Signaling Sources</h2>
          <p className="text-[#E8E4D9]/60 font-mono">Connect platforms to generate workload triggers.</p>
         </div>
         <Button onClick={() => setCurrentView("ADD SOURCE")} className="gap-2">
        <Plus className="w-4 h-4" /> Add Signal
        </Button>
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
            
            {/* 💡 MODIFICATION: Group the two buttons together */}
            <div className="flex items-center gap-3 ml-auto">
                <Button
                  variant={source.connected ? "secondary" : "primary"}
                  onClick={() => toggleSourceConnection(source.id)}
                  className={`
                    transition-colors duration-150
                    ${source.connected 
                      ? "hover:bg-red-500 text-white" 
                      : "hover:bg-green-600 text-white"
                    }
                    bg-[#061418]
                  `}
                >
                  {source.connected ? "Disconnect" : "Connect Provider"}
                </Button>

                <button
                  onClick={() => deleteSignal(source.id)}
                  className="
                    h-13 w-10 flex items-center justify-center
                    rounded-lg 
                    bg-[#061418] 
                    border border-[#E8E4D9]/10 
                    hover:border-red-500 
                    hover:text-red-500 
                    transition-colors duration-150
                    text-[#E8E4D9]/40
                  "
                >
                  {/* Increased padding from p-1 to p-2 for a better click target */}
                  <Trash className="w-4 h-4" /> 
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
      );
    
    // All the useEffect hooks
    useEffect(() => {
        const fetchedSources = async() => {
          const signalsFromDB = await signalSources();
          setSources(signalsFromDB);
        }

        fetchedSources();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
        setCurrentTime(new Date());
        }, 1000); // update every 1 second

        return () => clearInterval(interval); // cleanup on unmount
    }, []);

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
                    {currentView === "SIGNALS" && renderSources()}
                    {currentView === "ADD SOURCE" && renderAddSource()}
                    
                 </div>
              </main>
        
            </div>
          );
};