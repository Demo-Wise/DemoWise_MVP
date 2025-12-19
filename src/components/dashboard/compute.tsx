"use client"

import { useRouter } from "next/navigation";
import { ComputeProviderType, User, ComputeResource } from "@/components/types";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/Buttons";
import  CustomSelect  from "@/components/customSelect";

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
  AlertTriangle,
  Copy, 
  ExternalLink,
  Lock,
  Trash,
  Cloud
} from 'lucide-react';


type ViewState = "OVERVIEW" | "SIGNALS" | "COMPUTE" | "TRIGGERS" | "ADD COMPUTE";

interface ComputeProps{
    user: User;
    onLogout: () => void;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const AWS_SERVICE_TYPES = [
  { value: 'ec2', label: 'EC2 Instance (Virtual Machine)' },
  { value: 'rds', label: 'RDS Database (Coming Soon)', disabled: true },
  { value: 'lambda', label: 'Lambda Function (Coming Soon)', disabled: true },
];

export const ComputePage: React.FC<ComputeProps> = ({ user, onLogout }) => {
    const [ currentView, setCurrentView ] = useState<ViewState>('COMPUTE');
    const [ currentTime, setCurrentTime ] = useState<Date>(new Date());
    const [ status, setStatus ]           = useState<string>('');
    const [step, setStep] = useState(1);

    // Inputs from Create Compute
    const [ computeResources, setComputeResources ] = useState<ComputeResource[]>([]);
    const [ newResourceType, setNewResourceType ]   = useState<ComputeProviderType | null>(null);
    const [ newResourceName, setNewResourceName ]   = useState<string>('');

    // AWS specifics
    const [ newComputeARN, setComputeARN ]    = useState<string>('');
    const [ newAccountID, setAccountID ]      = useState<string>('');
    const [ InstanceID, setInstanceID ]       = useState<string>("");
    const [ InstanceType, setInstanceType ]   = useState<string>("");
    const [ region, setRegion]                = useState<string>("");
    const [externalId, setExternalId]         = useState('');

    const router = useRouter();

    useEffect(() => {
        const interval = setInterval(() => {
        setCurrentTime(new Date());
        }, 1000); // update every 1 second

        return () => clearInterval(interval); // cleanup on unmount
    }, []);

    useEffect(() => {
      const loadCompute = async() => {
        const fetchedCompute = await fetchCompute();
        setComputeResources(fetchedCompute);
      }
      loadCompute();
    }, []);

    // utility functions
    const deleteCompute = async(id:string) => {
      const response = await fetch(`/api/database/delete/compute/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error(`Deletion failed with status ${response.status}:`, errorData);
        throw new Error(`Failed to delete compute: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      const fresh = await fetchCompute();
      setComputeResources(fresh);
      return data; // Return data if successful

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
        status       : "ACTIVE"
      }));

      return fetchedCompute;
    }

    const saveCredentials= async () => {
      if (!newResourceName) return;

      let config = {};

      if (newResourceType === "AWS"){
        config = {
            arn         : newComputeARN,
            accountID   : newAccountID,
            instanceID  : InstanceID,
            instanceType: InstanceType,
            region      : region

          };
      }

      try {
        const response = await fetch ("/api/database/create/compute", {
          method : "POST", 
          headers: {"Content-Type":"application/json"},
          body   :JSON.stringify({
            userID     : user.userID,
            computeID  : externalId,
            platform   : newResourceType,
            computeName: newResourceName,
            config     : JSON.stringify(config),
          })
        });

        if (response.ok){
          const data = await response.json();
          console.log("Compute saved successfuly: ", data);
        }

        if(newResourceType === 'AWS'){
          setComputeARN('');
          setAccountID('');
          setInstanceID('');
          setInstanceType('');
          setRegion('');
          setStep(1);
          setExternalId("");
        }

        setNewResourceType(null);
        setNewResourceName('');

        fetchCompute().then(fetchedCompute => {
          setComputeResources(fetchedCompute);
        });

        setCurrentView("COMPUTE");

      }catch(err:any){
        console.log("Error saving compute credentails to database: ", err);
      }
    }

    const toggleSourceConnection = async (id: string) => {
      // Calling the API to update the DB
      const response = await fetch("/api/database/update/compute/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body:JSON.stringify({computeID:id})
      });

      const data = await response.json();
      if(!data.ok){
        console.log("Error toggling the source connection in the DB: ", data.error);
        return;
      }

      setComputeResources(prev => prev.map(s => {
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

    // rendering functions
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

    useEffect(() => {
          // Generate a unique ID that will act as both the DB Primary Key AND the AWS External ID
          setExternalId(crypto.randomUUID()); 
        }, [currentView]);

    const renderAddSource= () => {
              // 1: Info/Gen ID, 2: Input Details
        // The "Handshake" ID (External ID)
        // We generate this once when the component mounts so it stays consisten
        const handleCopy = (text: string) => {
          navigator.clipboard.writeText(text);
          // Optional: Add a toast notification here
        };

        const renderStepOne = () => (
          <div className="glass-panel p-8 rounded-xl border border-[#E8E4D9]/10 animate-fade-in space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-3 pb-6 border-b border-[#E8E4D9]/10">
              <div className="bg-[#C9A66B]/20 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-[#C9A66B]" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Step 1: Create Secure Access</h3>
                <p className="text-sm text-[#E8E4D9]/50">Create a permission role in your AWS account.</p>
              </div>
            </div>

            {/* Instruction 1: External ID */}
            <div className="bg-[#061418] border border-[#C9A66B]/30 rounded-lg p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Lock className="w-24 h-24 text-[#C9A66B]" />
              </div>
              
              <h4 className="text-[#C9A66B] font-mono text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Crucial Security Step
              </h4>
              <p className="text-[#E8E4D9]/80 text-sm mb-4 max-w-md">
                When creating the IAM Role, select <strong>"Another AWS Account"</strong> and paste this <strong>External ID</strong> in the options. This prevents anyone else from using your role.
              </p>

              <div className="flex items-center gap-2 bg-black/40 p-3 rounded border border-[#C9A66B]/20">
                <code className="flex-1 font-mono text-[#C9A66B] text-lg">{externalId}</code>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(externalId)} className="hover:bg-[#C9A66B]/20 hover:text-[#C9A66B]">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Instruction 2: Trust Policy */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-[#E8E4D9]">
                <span className="bg-[#E8E4D9]/10 w-6 h-6 rounded-full flex items-center justify-center text-xs">A</span>
                AWS Account ID to Trust
              </h4>
              <div>
                {/* <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Compute Name</label> */}
                <input 
                  type="text" 
                  value={newAccountID}
                  onChange={(e) => setAccountID(e.target.value)}
                  placeholder='e.g., "123456789012"'
                  className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                />
              </div>
              <p className="text-xs text-[#E8E4D9]/40 mt-2">Copy Paste this from IAM console.</p>
            </div>

            {/* Instruction 3: Permissions */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-[#E8E4D9]">
                <span className="bg-[#E8E4D9]/10 w-6 h-6 rounded-full flex items-center justify-center text-xs">B</span>
                Permissions to Attach
              </h4>
              <div className="bg-[#061418] p-4 rounded border border-[#E8E4D9]/10 font-mono text-xs text-[#E8E4D9]/60 relative group">
                  <pre>{`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "ec2:StartInstances",
              "ec2:StopInstances",
              "ec2:DescribeInstances"
            ],
            "Resource": "*"
          }
        ]
      }`}</pre>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#E8E4D9]/10 hover:bg-[#E8E4D9]/20"
                  onClick={() => handleCopy(`{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": [ "ec2:StartInstances", "ec2:StopInstances", "ec2:DescribeInstances" ], "Resource": "*" } ] }`)}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy JSON
                </Button>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-[#E8E4D9]/10">
              <a href="https://console.aws.amazon.com/iam/home#/roles/create" target="_blank" rel="noreferrer" className="text-xs text-[#C9A66B] flex items-center gap-1 hover:underline">
                  Open AWS IAM Console <ExternalLink className="w-3 h-3" />
              </a>
              <Button onClick={() => setStep(2)} className="bg-[#C9A66B] text-black hover:bg-[#C9A66B]/90"  disabled={!newAccountID}>
                I have created the role <ArrowRight className="w-4 h-4 ml-2"/>
              </Button>
            </div>
          </div>
        );

        const renderStepTwo = () => (
          <div className="glass-panel p-8 rounded-xl border border-[#E8E4D9]/10 animate-fade-in space-y-6">
            <div className="flex items-center gap-3 pb-6 border-b border-[#E8E4D9]/10">
              <div className="bg-[#C9A66B]/20 p-2 rounded-lg">
                <Server className="w-6 h-6 text-[#C9A66B]" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Step 2: Connect Instance</h3>
                <p className="text-sm text-[#E8E4D9]/50">Enter the details of the Role and EC2 instance.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Compute Name</label>
                <input 
                  type="text" 
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  placeholder='e.g., "Production GPU Cluster"'
                  className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Role ARN</label>
                <input 
                  type="text" 
                  value={newComputeARN}
                  onChange={(e) => setComputeARN(e.target.value)}
                  placeholder='arn:aws:iam::123456789:role/MyVelaiRole'
                  className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                />
                <p className="text-[10px] text-[#E8E4D9]/40 mt-1">The ARN of the role you just created.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Instance ID</label>
                  <input 
                      type="text" 
                      value={InstanceID}
                      onChange={(e) => setInstanceID(e.target.value)}
                      placeholder='i-0abcdef123456'
                      className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                  />
                  </div>

                  <div>
                  <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Region</label>
                  <input 
                      type="text" 
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder='us-east-1'
                      className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                  />
                  </div>
              </div>

              {/* AWS Service Type Selector */}
              <div className="mb-4">
                <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">
                  AWS Service
                </label>
                
                <CustomSelect 
                  value={InstanceType}
                  onChange={setInstanceType}
                  options={AWS_SERVICE_TYPES}
                  placeholder="Select AWS Service..."
                />
                
                <p className="text-[10px] text-[#E8E4D9]/40 mt-2">
                  Currently, only EC2 Start/Stop operations are supported.
                </p>
              </div>

              <div className="pt-6 flex justify-between items-center">
                  <Button variant="ghost" onClick={() => setStep(1)} className="text-[#E8E4D9]/50 hover:text-[#E8E4D9]">
                      Back to Instructions
                  </Button>
                  <Button 
                      onClick={() => {saveCredentials()}}
                      className="bg-[#C9A66B] text-black hover:bg-[#C9A66B]/90"
                      disabled={!newResourceName || !newComputeARN || !InstanceID || !region}
                  >
                      Connect Compute
                  </Button>
              </div>
            </div>
          </div>
        );

        return (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <Button variant="ghost" onClick={() => setCurrentView('COMPUTE')} className="pl-0 gap-2 mb-4">
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Compute
              </Button>
              <h2 className="font-serif text-3xl mb-2">Connect New Compute</h2>
            </div>

            {/* Provider Selector - Only show if in step 1 */}
            {step === 1 && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button
                  onClick={() => setNewResourceType('AWS')}
                  className={`p-6 rounded-xl border text-left transition-all ${
                      newResourceType === 'AWS'
                      ? 'bg-[#C9A66B]/10 border-[#C9A66B]'
                      : 'bg-[#0F292F]/40 border-[#E8E4D9]/10 hover:border-[#E8E4D9]/30'
                  }`}
                  >
                  <Server className={`w-8 h-8 mb-4 ${newResourceType === 'AWS' ? 'text-[#C9A66B]' : 'text-[#E8E4D9]/60'}`} />
                  <div className="font-medium text-lg font-serif">Amazon Web Services (AWS)</div>
                  <div className="text-sm text-[#E8E4D9]/50 mt-2 font-mono">Manage EC2 instances via IAM Role.</div>
                  </button>

                  <button
                  onClick={() => setNewResourceType('GCP')}
                  className={`p-6 rounded-xl border text-left transition-all opacity-60 cursor-not-allowed ${
                      newResourceType === 'GCP'
                      ? 'bg-[#C9A66B]/10 border-[#C9A66B]'
                      : 'bg-[#0F292F]/40 border-[#E8E4D9]/10'
                  }`}
                  >
                  <Cloud className="w-8 h-8 mb-4 text-[#E8E4D9]/60" />
                  <div className="font-medium text-lg font-serif">Google Cloud Platform (GCP)</div>
                  <div className="text-sm text-[#E8E4D9]/50 mt-2 font-mono">Coming soon.</div>
                  </button>
              </div>
            )}

            {newResourceType === 'AWS' ? (
                step === 1 ? renderStepOne() : renderStepTwo()
            ) : (
                <div className="glass-panel p-8 text-center text-[#E8E4D9]/40 font-mono">
                    GCP integration is currently under development.
                </div>
            )}
          </div>
        );
      };

    const renderSources = () => (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-end mb-8">
             <div>
              <h2 className="font-serif text-3xl mb-2">Compute Resources</h2>
              <p className="text-[#E8E4D9]/60 font-mono">Manage cloud infrastructure pools available for optimization.</p>
             </div>
             <Button onClick={() => setCurrentView("ADD COMPUTE")} className="gap-2">
            <Plus className="w-4 h-4" /> Add Compute
            </Button>
          </div>
    
          <div className="grid gap-4">
            {computeResources.map(source => (
              <div key={source.id} className="glass-panel p-6 rounded-xl border border-[#E8E4D9]/10 flex items-center justify-between group hover:border-[#E8E4D9]/20 transition-all">
                <div className="flex items-center gap-6">
                   <div className={`p-4 rounded-xl ${source.connected ? 'bg-[#C9A66B]/20 text-[#C9A66B]' : 'bg-[#E8E4D9]/5 text-[#E8E4D9]/40'}`}>
                      {source.provider === 'AWS' ? <Server className="w-8 h-8" /> : <Cloud className="w-8 h-8" />}
                   </div>
                   <div>
                      <h3 className="text-xl font-medium">{source.name}</h3>
                      <p className="text-sm text-[#E8E4D9]/50 font-mono mt-1">
                        {source.connected ? `Synced • Last checked ${currentTime.toLocaleTimeString()}` : 'Not connected'}
                      </p>
                   </div>
                </div>
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
                  onClick={() => deleteCompute(source.id)}
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
                    {currentView === "COMPUTE" && renderSources()}
                    {currentView === "ADD COMPUTE" && renderAddSource()}
                    
                 </div>
              </main>
        
            </div>
          );
};