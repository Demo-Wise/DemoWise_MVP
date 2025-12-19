import { NextFetchEvent, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { EC2Client, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { verifySignatureAppRouter, VerifySignatureConfig } from "@upstash/qstash/dist/nextjs";

async function handler(req: Request){
    try{
        const body = await req.json().catch(() => null);

        if (!body){
            return NextResponse.json({error: "invalid json"}, {status:400})
        }

        const { jobID } = body;

        const job  =  await prisma.eventLogger.findUnique({
            where:{
                id : jobID
            },
            include:{
                compute: true
            }
        });

        if (!job){
            return NextResponse.json({error: "No Job found in the event Logger"}, {status: 404});
        }

        const compute = job.compute;
        
        if (!compute){
            await prisma.eventLogger.update({where: {id: jobID}, data:{status:"ERROR"}});
            return NextResponse.json({error: "NO compute found for the corresponding job"}, {status:400});
        }

        if (compute.provider !== "AWS"){
            await prisma.eventLogger.update({where: {id: jobID}, data:{status: "ERROR"}});
            return NextResponse.json({error: `Unsupported compute provider: ${compute.provider}. Only AWS is supoorted`}, {status:400});
        }

        const computeConfig = JSON.parse(compute.config);
        const { arn, accountID, instanceID, instanceType, region } = computeConfig;

        const stsClient = new STSClient({region: region});
        const assumeRoleCommand = new AssumeRoleCommand({
            RoleArn        : arn,
            RoleSessionName: "DemoWise_Session",
            ExternalId     : job.triggerID ?? undefined
        });

        const stsResponse =  await stsClient.send(assumeRoleCommand);
        const credentials =  stsResponse.Credentials;

        if (instanceType !== "ec-2"){
            await prisma.eventLogger.update({where:{id: jobID}, data:{status:"ERROR"}});
            console.log("Currently we only support EC-2 instances only");
            return NextResponse.json({error: `AWS Instance is not EC-2: ${instanceType}`}, {status:400});
        }

        if (!credentials){
            await prisma.eventLogger.update({where: {id: jobID}, data:{status:"ERROR"}});
            console.error("Failed to get the temp credentials");
            return NextResponse.json({error: "Failed to obtain temprorary credentials"}, {status: 400});
        }

        const ec2Client = new EC2Client({
            region: region,
            credentials: {
                accessKeyId    : credentials.AccessKeyId!,
                secretAccessKey: credentials.SecretAccessKey!,
                sessionToken   : credentials.SessionToken
            }
        })

        console.log(`Acting as ${arn} to ${job.action} at Instance: ${instanceID}`);

        if (job.action === "START"){
            await ec2Client.send( new StartInstancesCommand({InstanceIds: instanceID}));
        } else{
            await ec2Client.send( new StopInstancesCommand({InstanceIds: [instanceID]}));
        }

        await prisma.eventLogger.update({
            where:{
                id: jobID
            },
            data:{
                status: "COMPLETED"
            }
        });

        return NextResponse.json({success: true, action:job.action}, {status : 200});

    } catch(err:any){
        console.log("Error completing the action: ", err.message);
        return NextResponse.json({error: "internal server error", details: err.message}, {status: 500});
    }
}

export const POST = verifySignatureAppRouter(handler);