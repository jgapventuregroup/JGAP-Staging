import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async (request: Request) => {
 const origin=request.headers.get("Origin");
 const cors=origin==="https://jgapventuregroup.github.io"?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}:{};
 const headers={"Content-Type":"application/json","Cache-Control":"no-store",...cors};
 const respond=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(request.method!=="POST")return respond(405,{error:"Method not allowed"});
 const bearer=request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
 if(!bearer)return respond(401,{error:"Authentication required"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!secret)return respond(503,{error:"Service unavailable"});
 const auth=createClient(url,anon,{auth:{persistSession:false}});
 const {data:{user},error}=await auth.auth.getUser(bearer);
 if(error||!user)return respond(401,{error:"Invalid session"});
 if(!user.email_confirmed_at)return respond(403,{error:"Verify your email first"});
 let body:unknown;
 try{body=await request.json()}catch{return respond(400,{error:"Invalid request"})}
 const companyId=typeof body==="object"&&body!==null&&"company_id" in body?(body as {company_id:unknown}).company_id:null;
 if(typeof companyId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId))return respond(400,{error:"Invalid company"});
 const admin=createClient(url,secret,{auth:{persistSession:false}});
 const membership=await admin.from("company_members").select("company_id").eq("company_id",companyId).eq("user_id",user.id).maybeSingle();
 if(membership.error)return respond(503,{error:"Membership check unavailable"});
 if(!membership.data)return respond(403,{error:"Company access denied"});
 const prior=await admin.from("free_membership_eligibility").select("status,company_id").eq("user_id",user.id).maybeSingle();
 if(prior.error)return respond(503,{error:"Eligibility check unavailable"});
 if(prior.data)return respond(409,{error:"Eligibility request already exists",status:prior.data.status});
 const inserted=await admin.from("free_membership_eligibility").insert({user_id:user.id,company_id:companyId,status:"pending_review"}).select("status").single();
 if(inserted.error){if(inserted.error.code==="23505")return respond(409,{error:"Eligibility request already exists"});return respond(503,{error:"Unable to submit request"})}
 return respond(202,{status:"pending_review",message:"Request received for review; no automatic approval"});
});