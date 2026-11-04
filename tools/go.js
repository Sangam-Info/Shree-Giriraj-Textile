const admin=require("firebase-admin");
const fs=require("fs"),path=require("path");
const PROJECT="shree-giriraj-textile";
const A=path.join(__dirname,"accounts.json");
if(!fs.existsSync(A)){console.error("Missing accounts.json next to this script");process.exit(1);}
const accounts=require(A);
admin.initializeApp({projectId:PROJECT});
const auth=admin.auth(),db=admin.firestore();
const ROLES=["admin","supervisor","packaging"];
(async()=>{
  console.log("Project:",PROJECT);
  for(const a of accounts.users){
    if(ROLES.indexOf(a.role)<0){console.error("Bad role:",a.role);process.exit(1);}
    if(String(a.password).length<6||/CHANGE_ME/.test(a.password)){console.error("Set a real password (6+ chars) for "+a.email+" in accounts.json");process.exit(1);}
    let u;
    try{u=await auth.getUserByEmail(a.email);await auth.updateUser(u.uid,{password:a.password,displayName:a.name||""});console.log("updated "+a.email);}
    catch(e){if(e.code==="auth/user-not-found"){u=await auth.createUser({email:a.email,password:a.password,displayName:a.name||""});console.log("created "+a.email);}else throw e;}
    await db.collection("users").doc(u.uid).set({role:a.role,active:true,name:a.name||""},{merge:true});
    console.log("  role="+a.role+" uid="+u.uid);
  }
  await db.collection("meta").doc("settings").set({company:"Shree Girijaj Textile Services",setupAt:new Date().toISOString()},{merge:true});
  console.log("DONE - sign in on the site now.");process.exit(0);
})().catch(e=>{const m=(e&&e.message)||String(e);if(/default credentials|Could not load|invalid_grant/i.test(m))console.error("Credentials issue - run: gcloud auth application-default login");else console.error("Failed:",m);process.exit(1);});
