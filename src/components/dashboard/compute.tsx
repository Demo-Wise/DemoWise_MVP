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
  Key,
  UserIcon,
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
    const [ newComputeARN, setComputeARN ]        = useState<string>('');
    const [ newAccountID, setAccountID ]          = useState<string>('');
    const [ InstanceID, setInstanceID ]           = useState<string>("");
    const [ InstanceType, setInstanceType ]       = useState<string>("");
    const [ region, setRegion]                    = useState<string>("");
    const [externalId, setExternalId]             = useState('');
    const [ accessKeyId, setAccessKeyId ]         = useState<string>("");
    const [ secretAccessKey, setSecretAccessKey ] = useState<string>("");

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
            arn             : newComputeARN,
            accountID       : newAccountID,
            instanceID      : InstanceID,
            instanceType    : InstanceType,
            region          : region,
            accessKeyId     : accessKeyId,
            secretAccessKey : secretAccessKey

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
          setAccessKeyId("");
          setSecretAccessKey("");
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

    const renderAddSource = () => {
    // --- Helper for copying text ---
    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      // Optional: toast.success("Copied to clipboard");
    };

    // --- STEP 1: INSTRUCTIONS (User Identity + Role Permissions) ---
    const renderStepOne = () => (
      <div className="glass-panel p-8 rounded-xl border border-[#E8E4D9]/10 animate-fade-in space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-[#E8E4D9]/10">
          <div className="bg-[#C9A66B]/20 p-2 rounded-lg">
            <Shield className="w-6 h-6 text-[#C9A66B]" />
          </div>
          <div>
            <h3 className="font-medium text-lg">Step 1: Configure AWS Access</h3>
            <p className="text-sm text-[#E8E4D9]/50">Create an <strong>IAM User</strong> (Identity) and an <strong>IAM Role</strong> (Permission).</p>
          </div>
        </div>

        <div>
            <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Account ID</label>
            <div className="relative">
                <input 
                type="text" 
                value={newAccountID}
                onChange={(e) => setAccountID(e.target.value)}
                placeholder='123456789012'
                className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono pl-10"
                />
                <Key className="w-4 h-4 text-[#E8E4D9]/30 absolute left-3 top-3.5" />
            </div>
        </div>


        {/* PART A: CREATE USER */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2 text-[#E8E4D9]">
            <span className="bg-[#E8E4D9]/10 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
            Create IAM User (The Identity)
          </h4>
          <div className="bg-[#061418] p-4 rounded border border-[#E8E4D9]/10 text-sm space-y-3">
            <p className="text-[#E8E4D9]/70">
              1. Go to <a href="https://console.aws.amazon.com/iam/home#/users/create" target="_blank" className="text-[#C9A66B] hover:underline">IAM Users</a> and create a user named <span className="font-mono text-white">DemoWiseAgent</span>.
            </p>
            <p className="text-[#E8E4D9]/70">
              2. Attach this <strong>Inline Policy</strong> to allow it to assume roles:
            </p>
            
            <div className="bg-black/40 p-3 rounded border border-[#E8E4D9]/10 font-mono text-xs text-[#E8E4D9]/60 relative group">
              <pre>{`{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "AllowAssumingSpecificRole",
			"Effect": "Allow",
			"Action": "sts:AssumeRole",
			"Resource": "arn:aws:iam::${newAccountID? newAccountID : `YOUR_ACCOUNT_ID`}:role/AI_Infra_Testing"
		}
	]
}`}</pre>
               <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-[#E8E4D9]/10" onClick={() => handleCopy(`{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "AllowAssumingSpecificRole",
			"Effect": "Allow",
			"Action": "sts:AssumeRole",
			"Resource": "arn:aws:iam::${newAccountID? newAccountID : `YOUR_ACCOUNT_ID`}:role/AI_Infra_Testing"
		}
	]
}`)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>

            <p className="text-[#E8E4D9]/70">
              3. Go to <strong>Security Credentials</strong> for this user and create an <strong>Access Key</strong>.
              <br/><span className="text-[#C9A66B]">Keep the Access Key ID and Secret Key ready for Step 2.</span>
            </p>
          </div>
        </div>

        <div className="w-full h-px bg-[#E8E4D9]/10 my-4"></div>

        {/* PART B: CREATE ROLE */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2 text-[#E8E4D9]">
            <span className="bg-[#E8E4D9]/10 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
            Create IAM Role (The Permissions)
          </h4>
          
          <div className="bg-[#061418] p-4 rounded border border-[#E8E4D9]/10 text-sm space-y-3">
             <p className="text-[#E8E4D9]/70">
              1. Create a <strong>Role</strong> with <strong>"Custom Trust Policy"</strong>.
             </p>
             <p className="text-[#E8E4D9]/70">
               2. Paste this Trust Policy (Replace <span className="font-mono text-white">YOUR_ACCOUNT_ID</span> with your AWS Account ID):
             </p>
             {/* EXTERNAL ID BLOCK */}
             <div className="mb-4 p-3 bg-[#0F292F] border border-[#C9A66B]/30 rounded">
                <div className="flex items-center gap-2 text-[#C9A66B] text-xs font-mono uppercase tracking-widest mb-1">
                    <AlertTriangle className="w-3 h-3" /> External ID (Required)
                </div>
                <p className="text-[#E8E4D9]/60 text-xs mb-2">Use this ID when creating the Role (select "Require External ID").</p>
               <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-[#E8E4D9]/10">
                  <code className="flex-1 font-mono text-[#E8E4D9]">{externalId}</code>
                  
                  {/* Use a standard HTML button instead of the custom Component */}
                  <button 
                      type="button"
                      onClick={() => handleCopy(externalId)} 
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#E8E4D9]/10 transition-colors text-[#C9A66B]"
                      title="Copy ID"
                  >
                      <Copy className="w-4 h-4" />
                  </button>
              </div>
             </div>

             {/* Trust Policy JSON */}
             <div className="bg-black/40 p-3 rounded border border-[#E8E4D9]/10 font-mono text-xs text-[#E8E4D9]/60 relative group">
              <pre>{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${newAccountID? newAccountID : `YOUR_ACCOUNT_ID`}:user/DemoWiseAgent"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "${externalId}"
        }
      }
    }
  ]
}`}</pre>
               <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-[#E8E4D9]/10" onClick={() => handleCopy(`{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "AWS": "arn:aws:iam::${newAccountID? newAccountID : `YOUR_ACCOUNT_ID`}:user/DemoWiseAgent" }, "Action": "sts:AssumeRole", "Condition": { "StringEquals": { "sts:ExternalId": "${externalId}" } } } ] }`)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>

            <p className="text-[#E8E4D9]/70">
              3. <strong>Permissions:</strong> Add the inline policy for EC2 control (Start/Stop instances).
            </p>
            <div className="bg-black/40 p-3 rounded border border-[#E8E4D9]/10 font-mono text-xs text-[#E8E4D9]/60 relative group">
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
               <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-[#E8E4D9]/10" onClick={() => handleCopy(`{
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
}`)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end items-center border-t border-[#E8E4D9]/10">
          <Button onClick={() => setStep(2)} className="bg-[#C9A66B] text-black hover:bg-[#C9A66B]/90">
            I have the Keys and ARN <ArrowRight className="w-4 h-4 ml-2"/>
          </Button>
        </div>
      </div>
    );

    // --- STEP 2: CREDENTIAL INPUTS ---
    const renderStepTwo = () => (
      <div className="glass-panel p-8 rounded-xl border border-[#E8E4D9]/10 animate-fade-in space-y-6">
        <div className="flex items-center gap-3 pb-6 border-b border-[#E8E4D9]/10">
          <div className="bg-[#C9A66B]/20 p-2 rounded-lg">
            <Key className="w-6 h-6 text-[#C9A66B]" />
          </div>
          <div>
            <h3 className="font-medium text-lg">Step 2: Enter Credentials</h3>
            <p className="text-sm text-[#E8E4D9]/50">Provide the User Keys and Role details.</p>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* SECTION 1: USER CREDENTIALS */}
          <div className="space-y-4 border-b border-[#E8E4D9]/10 pb-6">
              <h4 className="text-xs font-mono text-[#C9A66B] uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> IAM User Details
              </h4>
              
              <div>
                  <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Access Key ID</label>
                  <div className="relative">
                      <input 
                      type="text" 
                      value={accessKeyId}
                      onChange={(e) => setAccessKeyId(e.target.value)}
                      placeholder='AKIA................'
                      className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono pl-10"
                      />
                      <Key className="w-4 h-4 text-[#E8E4D9]/30 absolute left-3 top-3.5" />
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">Secret Access Key</label>
                  <div className="relative">
                      <input 
                      type="password" 
                      value={secretAccessKey}
                      onChange={(e) => setSecretAccessKey(e.target.value)}
                      placeholder='........................................'
                      className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono pl-10"
                      />
                      <Lock className="w-4 h-4 text-[#E8E4D9]/30 absolute left-3 top-3.5" />
                  </div>
              </div>
          </div>

          {/* SECTION 2: ROLE & INSTANCE */}
          <div className="space-y-4">
              <h4 className="text-xs font-mono text-[#C9A66B] uppercase tracking-widest flex items-center gap-2 mt-2">
                  <Server className="w-3 h-3" /> Resource Details
              </h4>

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
                      placeholder='arn:aws:iam::123456789:role/MyDemoWiseRole'
                      className="w-full bg-[#061418] border border-[#E8E4D9]/20 rounded p-3 text-[#E8E4D9] focus:border-[#C9A66B] focus:outline-none font-mono"
                  />
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
                  {/* INSTANCE TYPE SELECTOR */}
                  <div className="mb-4">
                    <label className="block text-xs font-mono text-[#E8E4D9]/60 uppercase tracking-widest mb-2">
                      AWS Service Type
                    </label>
                    
                    {/* Ensure you have AWS_SERVICE_TYPES defined and CustomSelect imported */}
                    <CustomSelect 
                      value={InstanceType}
                      onChange={setInstanceType}
                      options={AWS_SERVICE_TYPES}
                      placeholder="Select AWS Service..."
                    />
                  </div>
              </div>
          </div>

          <div className="pt-6 flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-[#E8E4D9]/50 hover:text-[#E8E4D9]">
                  Back to Instructions
              </Button>
              <Button 
                  onClick={() => saveCredentials()}
                  className="bg-[#C9A66B] text-black hover:bg-[#C9A66B]/90"
                  disabled={!newResourceName || !newComputeARN || !InstanceID || !region || !accessKeyId || !secretAccessKey}
              >
                  Connect Compute
              </Button>
          </div>
        </div>
      </div>
    );

    // --- MAIN RENDER ---
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setCurrentView('COMPUTE')} className="pl-0 gap-2 mb-4">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Compute
          </Button>
          <h2 className="font-serif text-3xl mb-2">Connect New Compute</h2>
        </div>

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
              <div className="text-sm text-[#E8E4D9]/50 mt-2 font-mono">User Keys & IAM Role.</div>
              </button>

              <button
              disabled
              className="p-6 rounded-xl border text-left transition-all opacity-60 cursor-not-allowed bg-[#0F292F]/40 border-[#E8E4D9]/10"
              >
              <Cloud className="w-8 h-8 mb-4 text-[#E8E4D9]/60" />
              <div className="font-medium text-lg font-serif">Google Cloud Platform (GCP)</div>
              <div className="text-sm text-[#E8E4D9]/50 mt-2 font-mono">Coming soon.</div>
              </button>
          </div>
        )}

        {newResourceType === 'AWS' ? (
          step === 1 ? renderStepOne() : renderStepTwo()
        ) : null}
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