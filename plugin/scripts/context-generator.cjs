"use strict";var zs=Object.create;var K=Object.defineProperty;var Zs=Object.getOwnPropertyDescriptor;var et=Object.getOwnPropertyNames;var st=Object.getPrototypeOf,tt=Object.prototype.hasOwnProperty;var nt=(n,e)=>{for(var s in e)K(n,s,{get:e[s],enumerable:!0})},he=(n,e,s,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of et(e))!tt.call(n,r)&&r!==s&&K(n,r,{get:()=>e[r],enumerable:!(t=Zs(e,r))||t.enumerable});return n};var Y=(n,e,s)=>(s=n!=null?zs(st(n)):{},he(e||!n||!n.__esModule?K(s,"default",{value:n,enumerable:!0}):s,n)),rt=n=>he(K({},"__esModule",{value:!0}),n);var Gt={};nt(Gt,{generateContext:()=>Qs,generateContextWithStats:()=>Le});module.exports=rt(Gt);var Ys=Y(require("path"),1),qs=require("os"),Js=require("fs");var Se=require("bun:sqlite"),ee=require("fs");var R=require("path"),Ee=require("os"),w=require("fs"),De=require("url");var O=require("fs"),fe=require("crypto"),M=require("path");var ot=null;function it(n){return(ot??process.stderr.write.bind(process.stderr))(n)}function X(n){it(n)}var at=process.platform==="win32";function Et(n){return n.replace(/^\uFEFF/,"")}function x(n){return JSON.parse(Et(n))}function _t(n){(0,O.existsSync)(n)||(0,O.mkdirSync)(n,{recursive:!0})}function ae(n,e){let s=n;try{if((0,O.lstatSync)(n).isSymbolicLink())try{s=(0,O.realpathSync)(n)}catch(d){let u=d instanceof Error?d:new Error(String(d));X(`claude-mem: realpathSync failed for ${n}, resolving symlink manually: ${u.message}
`);let p=(0,O.readlinkSync)(n);s=(0,M.resolve)((0,M.dirname)(n),p)}}catch(d){let u=d.code;if(u!=="ENOENT"&&u!=="ENOTDIR")throw d}_t((0,M.dirname)(s));let t=(0,M.dirname)(s),r=(0,M.basename)(s),o=(0,M.join)(t,`.${r}.${process.pid}.${(0,fe.randomBytes)(6).toString("hex")}.tmp`),i=Buffer.from(JSON.stringify(e,null,2)+`
`,"utf-8"),a;try{a=(0,O.statSync)(s).mode&511}catch{}let _;try{_=a!==void 0?(0,O.openSync)(o,"w",a):(0,O.openSync)(o,"w");let d=0;for(;d<i.length;){let u=(0,O.writeSync)(_,i,d,i.length-d);if(u===0)throw new Error(`writeSync stalled at ${d}/${i.length} bytes`);d+=u}if((0,O.fsyncSync)(_),(0,O.closeSync)(_),_=void 0,(0,O.renameSync)(o,s),!at){let u;try{u=(0,O.openSync)(t,"r"),(0,O.fsyncSync)(u)}catch(p){let l=p instanceof Error?p:new Error(String(p));X(`claude-mem: directory fsync failed for ${t}: ${l.message}
`)}finally{if(u!==void 0)try{(0,O.closeSync)(u)}catch{}}}}catch(d){if(_!==void 0)try{(0,O.closeSync)(_)}catch{}try{(0,O.unlinkSync)(o)}catch{}throw d}}var ct={};function dt(){return typeof __dirname<"u"?__dirname:(0,R.dirname)((0,De.fileURLToPath)(ct.url))}var ut=dt();function mt(){if(process.env.CLAUDE_MEM_DATA_DIR)return process.env.CLAUDE_MEM_DATA_DIR;let n=(0,R.join)((0,Ee.homedir)(),".claude-mem"),e=(0,R.join)(n,"settings.json");try{if((0,w.existsSync)(e)){let s=x((0,w.readFileSync)(e,"utf-8")),t=s.env??s;if(t.CLAUDE_MEM_DATA_DIR)return t.CLAUDE_MEM_DATA_DIR}}catch{}return n}var b=mt(),_e=process.env.CLAUDE_CONFIG_DIR||(0,R.join)((0,Ee.homedir)(),".claude"),Kt=(0,R.join)(_e,"plugins","marketplaces","thedotmack"),pt=(0,R.join)(b,"logs"),Yt=(0,R.join)(b,"settings.json"),ve=(0,R.join)(b,"claude-mem.db"),Tt=(0,R.join)(b,"observer-sessions"),de=(0,R.basename)(Tt);function Me(n){(0,w.mkdirSync)(n,{recursive:!0})}function Ue(){return(0,R.join)(ut,"..")}var F={dataDir:()=>b,workerPid:()=>(0,R.join)(b,"worker.pid"),serverPid:()=>(0,R.join)(b,".server-beta.pid"),serverPort:()=>(0,R.join)(b,".server-beta.port"),serverRuntime:()=>(0,R.join)(b,".server-beta.runtime.json"),settings:()=>(0,R.join)(b,"settings.json"),database:()=>(0,R.join)(b,"claude-mem.db"),chroma:()=>(0,R.join)(b,"chroma"),combinedCerts:()=>(0,R.join)(b,"combined_certs.pem"),transcriptsConfig:()=>(0,R.join)(b,"transcript-watch.json"),transcriptsState:()=>(0,R.join)(b,"transcript-watch-state.json"),cloudSyncState:()=>(0,R.join)(b,"cloud-sync-state.json"),corpora:()=>(0,R.join)(b,"corpora"),supervisorRegistry:()=>(0,R.join)(b,"supervisor.json"),envFile:()=>(0,R.join)(b,".env"),logsDir:()=>pt};var U=require("fs"),ye=require("path");var me=(o=>(o[o.DEBUG=0]="DEBUG",o[o.INFO=1]="INFO",o[o.WARN=2]="WARN",o[o.ERROR=3]="ERROR",o[o.SILENT=4]="SILENT",o))(me||{}),ue=null,pe=class{level=null;useColor;logFilePath=null;logFileInitialized=!1;constructor(){this.useColor=process.stdout.isTTY??!1}ensureLogFileInitialized(){if(!this.logFileInitialized){this.logFileInitialized=!0;try{let e=F.logsDir();(0,U.existsSync)(e)||(0,U.mkdirSync)(e,{recursive:!0});let s=new Date().toISOString().split("T")[0];this.logFilePath=(0,ye.join)(e,`claude-mem-${s}.log`)}catch(e){console.error("[LOGGER] Failed to initialize log file:",e instanceof Error?e.message:String(e)),this.logFilePath=null}}}getLevel(){if(this.level===null)try{let e=F.settings();if((0,U.existsSync)(e)){let s=(0,U.readFileSync)(e,"utf-8"),r=(x(s).CLAUDE_MEM_LOG_LEVEL||"INFO").toUpperCase();this.level=me[r]??1}else this.level=1}catch(e){console.error("[LOGGER] Failed to load log level from settings:",e instanceof Error?e.message:String(e)),this.level=1}return this.level}formatData(e){if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return e.toString();if(typeof e=="object"){if(e instanceof Error)return this.getLevel()===0?`${e.message}
${e.stack}`:e.message;if(Array.isArray(e))return`[${e.length} items]`;let s=Object.keys(e);return s.length===0?"{}":s.length<=3?JSON.stringify(e):`{${s.length} keys: ${s.slice(0,3).join(", ")}...}`}return String(e)}formatTool(e,s){if(!s)return e;let t=s;if(typeof s=="string")try{t=JSON.parse(s)}catch{t=s}if(e==="Bash"&&t.command)return`${e}(${t.command})`;if(t.file_path)return`${e}(${t.file_path})`;if(t.notebook_path)return`${e}(${t.notebook_path})`;if(e==="Glob"&&t.pattern)return`${e}(${t.pattern})`;if(e==="Grep"&&t.pattern)return`${e}(${t.pattern})`;if(t.url)return`${e}(${t.url})`;if(t.query)return`${e}(${t.query})`;if(e==="Task"){if(t.subagent_type)return`${e}(${t.subagent_type})`;if(t.description)return`${e}(${t.description})`}return e==="Skill"&&t.skill?`${e}(${t.skill})`:e==="LSP"&&t.operation?`${e}(${t.operation})`:e}formatTimestamp(e){let s=e.getFullYear(),t=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0"),a=String(e.getSeconds()).padStart(2,"0"),_=String(e.getMilliseconds()).padStart(3,"0");return`${s}-${t}-${r} ${o}:${i}:${a}.${_}`}log(e,s,t,r,o){if(e<this.getLevel())return;this.ensureLogFileInitialized();let i=this.formatTimestamp(new Date),a=me[e].padEnd(5),_=s.padEnd(6),d="";r?.correlationId?d=`[${r.correlationId}] `:r?.sessionId&&(d=`[session-${r.sessionId}] `);let u="";if(o!=null)if(o instanceof Error)u=this.getLevel()===0?`
${o.message}
${o.stack}`:` ${o.message}`;else if(this.getLevel()===0&&typeof o=="object")try{u=`
`+JSON.stringify(o,null,2)}catch{u=" "+this.formatData(o)}else u=" "+this.formatData(o);let p="";if(r){let{sessionId:I,memorySessionId:g,correlationId:A,...f}=r;Object.keys(f).length>0&&(p=` {${Object.entries(f).map(([C,v])=>`${C}=${v}`).join(", ")}}`)}let l=`[${i}] [${a}] [${_}] ${d}${t}${p}${u}`;if(this.logFilePath)try{(0,U.appendFileSync)(this.logFilePath,l+`
`,"utf8")}catch(I){let g=I instanceof Error?I:new Error(String(I));X(`[LOGGER] Failed to write to log file: ${g.message}
${g.stack??""}
`)}else X(l+`
`)}debug(e,s,t,r){this.log(0,e,s,t,r)}info(e,s,t,r){this.log(1,e,s,t,r)}warn(e,s,t,r){this.log(2,e,s,t,r)}setErrorSink(e){ue=e}error(e,s,t,r){this.log(3,e,s,t,r),this.routeErrorToSink(s,t,r)}routeErrorToSink(e,s,t){try{if(!ue||!(t instanceof Error))return;ue(t)}catch{}}dataIn(e,s,t,r){this.info(e,`\u2192 ${s}`,t,r)}dataOut(e,s,t,r){this.info(e,`\u2190 ${s}`,t,r)}success(e,s,t,r){this.info(e,`\u2713 ${s}`,t,r)}failure(e,s,t,r){this.error(e,`\u2717 ${s}`,t,r)}},E=new pe;var we=require("crypto");var Xe=require("os");var q=require("fs"),P=Y(require("path"),1);var B={isWorktree:!1,worktreeName:null,parentRepoPath:null,parentProjectName:null};function Fe(n){let e=P.default.join(n,".git"),s;try{s=(0,q.statSync)(e)}catch(u){return u instanceof Error&&u.code!=="ENOENT"&&E.warn("GIT","Unexpected error checking .git",{error:u instanceof Error?u.message:String(u)}),B}if(!s.isFile())return B;let t;try{t=(0,q.readFileSync)(e,"utf-8").trim()}catch(u){return E.warn("GIT","Failed to read .git file",{error:u instanceof Error?u.message:String(u)}),B}let r=t.match(/^gitdir:\s*(.+)$/);if(!r)return B;let i=P.default.resolve(P.default.dirname(e),r[1]).match(/^(.+)[/\\]\.git[/\\]worktrees[/\\]([^/\\]+)$/);if(!i)return B;let a=i[1],_=P.default.basename(n),d=P.default.basename(a);return{isWorktree:!0,worktreeName:_,parentRepoPath:a,parentProjectName:d}}function xe(n){return n==="~"||n.startsWith("~/")?n.replace(/^~/,(0,Xe.homedir)()):n}function lt(n){if(!n||n.trim()==="")return E.warn("PROJECT_NAME","Empty cwd provided, using fallback",{cwd:n}),"unknown-project";let e=xe(n).replace(/\/+$/,"");if(e===""||e==="/"){if(process.platform==="win32"){let s=n.match(/^([A-Z]):\\/i);if(s){let r=`drive-${s[1].toUpperCase()}`;return E.info("PROJECT_NAME","Drive root detected",{cwd:n,projectName:r}),r}}return E.warn("PROJECT_NAME","Root directory detected, using fallback",{cwd:n}),"unknown-project"}return e}function Te(n){let e=lt(n);if(!n)return{primary:e,parent:null,isWorktree:!1,allProjects:[e]};let s=xe(n),t=Fe(s);return t.isWorktree?{primary:e,parent:t.parentProjectName,isWorktree:!0,allProjects:[e]}:{primary:e,parent:null,isWorktree:!1,allProjects:[e]}}function Pe(n,e,s){return(0,we.createHash)("sha256").update([n||"",e||"",s||""].join("\0")).digest("hex").slice(0,16)}var ce=["active","weak","stale","superseded","deprecated"];var ke=["active","weak","stale"];var J=require("fs"),Ne=require("path"),H=require("os");var le={HEALTH_CHECK:3e3,API_REQUEST:3e4,HOOK_READINESS_WAIT:1e4,POST_SPAWN_WAIT:15e3,READINESS_WAIT:3e4,PORT_IN_USE_WAIT:3e3,POWERSHELL_COMMAND:1e4,WINDOWS_MULTIPLIER:1.5};function Ge(n){return process.platform==="win32"?Math.round(n*le.WINDOWS_MULTIPLIER):n}var k=class{static DEFAULTS={CLAUDE_MEM_MODEL:"openai-codex/gpt-5.4-mini",CLAUDE_MEM_CONTEXT_OBSERVATIONS:"50",CLAUDE_MEM_WORKER_PORT:String(37700+(process.getuid?.()??77)%100),CLAUDE_MEM_WORKER_HOST:"127.0.0.1",CLAUDE_MEM_API_TIMEOUT_MS:String(Ge(le.API_REQUEST)),CLAUDE_MEM_SKIP_TOOLS:"ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion",CLAUDE_MEM_PROVIDER:"pi",CLAUDE_MEM_CLAUDE_AUTH_METHOD:"subscription",CLAUDE_MEM_PI_MODEL:"openai-codex/gpt-5.4-mini",CLAUDE_MEM_PI_THINKING:"off",CLAUDE_MEM_PI_TIMEOUT_MS:"120000",CLAUDE_MEM_PI_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_PI_MAX_TOKENS:"100000",CLAUDE_MEM_GEMINI_API_KEY:"",CLAUDE_MEM_GEMINI_MODEL:"gemini-2.5-flash-lite",CLAUDE_MEM_GEMINI_RATE_LIMITING_ENABLED:"true",CLAUDE_MEM_GEMINI_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_GEMINI_MAX_TOKENS:"100000",CLAUDE_MEM_OPENROUTER_API_KEY:"",CLAUDE_MEM_OPENROUTER_MODEL:"xiaomi/mimo-v2-flash:free",CLAUDE_MEM_OPENROUTER_BASE_URL:"",CLAUDE_MEM_OPENROUTER_SITE_URL:"",CLAUDE_MEM_OPENROUTER_APP_NAME:"claude-mem",CLAUDE_MEM_DATA_DIR:(0,Ne.join)((0,H.homedir)(),".claude-mem"),CLAUDE_MEM_LOG_LEVEL:"INFO",CLAUDE_MEM_PYTHON_VERSION:"3.13",CLAUDE_CODE_PATH:"",CLAUDE_MEM_MODE:"code",CLAUDE_MEM_CONTEXT_SHOW_READ_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_WORK_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_PERCENT:"true",CLAUDE_MEM_CONTEXT_FULL_COUNT:"0",CLAUDE_MEM_CONTEXT_FULL_FIELD:"narrative",CLAUDE_MEM_CONTEXT_SESSION_COUNT:"10",CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY:"true",CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE:"false",CLAUDE_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT:"true",CLAUDE_MEM_WELCOME_HINT_ENABLED:"true",CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED:"false",CLAUDE_MEM_FOLDER_USE_LOCAL_MD:"false",CLAUDE_MEM_TRANSCRIPTS_ENABLED:"true",CLAUDE_MEM_TRANSCRIPTS_CONFIG_PATH:(0,Ne.join)((0,H.homedir)(),".claude-mem","transcript-watch.json"),CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION:"false",CLAUDE_MEM_MAX_CONCURRENT_AGENTS:"2",CLAUDE_MEM_HOOK_FAIL_LOUD_THRESHOLD:"3",CLAUDE_MEM_EXCLUDED_PROJECTS:"",CLAUDE_MEM_FOLDER_MD_EXCLUDE:"[]",CLAUDE_MEM_FOLDER_MD_SKELETON_DENYLIST:"[]",CLAUDE_MEM_SEMANTIC_INJECT:"false",CLAUDE_MEM_SEMANTIC_INJECT_LIMIT:"5",CLAUDE_MEM_TIER_ROUTING_ENABLED:"true",CLAUDE_MEM_TIER_SIMPLE_MODEL:"haiku",CLAUDE_MEM_TIER_SUMMARY_MODEL:"",CLAUDE_MEM_TIER_FAST_MODEL:"haiku",CLAUDE_MEM_TIER_SMART_MODEL:"sonnet",CLAUDE_MEM_CHROMA_ENABLED:"true",CLAUDE_MEM_CHROMA_MODE:"local",CLAUDE_MEM_CHROMA_HOST:"127.0.0.1",CLAUDE_MEM_CHROMA_PORT:"8000",CLAUDE_MEM_CHROMA_SSL:"false",CLAUDE_MEM_CHROMA_API_KEY:"",CLAUDE_MEM_CHROMA_TENANT:"default_tenant",CLAUDE_MEM_CHROMA_DATABASE:"default_database",CLAUDE_MEM_CHROMA_PREWARM_TIMEOUT_MS:"120000",CLAUDE_MEM_CLOUD_SYNC_TOKEN:"",CLAUDE_MEM_CLOUD_SYNC_USER_ID:"",CLAUDE_MEM_CLOUD_SYNC_URL:"https://cmem.ai/api/pro/sync",CLAUDE_MEM_CLOUD_SYNC_DEVICE_ID:"",CLAUDE_MEM_CLOUD_SYNC_DEVICE_NAME:(0,H.hostname)(),CLAUDE_MEM_TELEGRAM_ENABLED:"true",CLAUDE_MEM_TELEGRAM_BOT_TOKEN:"",CLAUDE_MEM_TELEGRAM_CHAT_ID:"",CLAUDE_MEM_TELEGRAM_TRIGGER_TYPES:"security_alert",CLAUDE_MEM_TELEGRAM_TRIGGER_CONCEPTS:"",CLAUDE_MEM_QUEUE_ENGINE:"sqlite",CLAUDE_MEM_REDIS_URL:"",CLAUDE_MEM_REDIS_HOST:"127.0.0.1",CLAUDE_MEM_REDIS_PORT:"6379",CLAUDE_MEM_REDIS_MODE:"external",CLAUDE_MEM_QUEUE_REDIS_PREFIX:`claude_mem_${process.env.CLAUDE_MEM_WORKER_PORT??String(37700+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_AUTH_MODE:"api-key",CLAUDE_MEM_RUNTIME:"worker",CLAUDE_MEM_SERVER_URL:`http://127.0.0.1:${process.env.CLAUDE_MEM_SERVER_PORT??String(37877+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_SERVER_API_KEY:"",CLAUDE_MEM_SERVER_PROJECT_ID:"",CLAUDE_MEM_SERVER_BETA_URL:`http://127.0.0.1:${process.env.CLAUDE_MEM_SERVER_PORT??String(37877+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_SERVER_BETA_API_KEY:"",CLAUDE_MEM_SERVER_BETA_PROJECT_ID:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_PROJECT_OBS:"5000",CLAUDE_MEM_OBSERVATION_RECONCILIATION_VECTOR_TOP_K:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_RECENT_LIMIT:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_TOP:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_CANDIDATE_CHUNK_SIZE:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_CANDIDATES:"40",CLAUDE_MEM_OBSERVATION_RECONCILIATION_FULL_SCAN_LLM:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_APPLY_CONFIDENCE:"0.90",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_WEAK_CONFIDENCE:"0.65",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_TERMINAL_EVIDENCE_CHARS:"40",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_SELECTOR_MODEL:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_CLASSIFIER_MODEL:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_DAILY_BUDGET_USD:"0",CLAUDE_MEM_OBSERVATION_RECONCILIATION_KILL_SWITCH:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_CONCURRENCY:"1",CLAUDE_MEM_FALLBACK_CHAIN:"antigravity-tm,antigravity-ghul,codex-spark,minimax-m3,codex-mini",CLAUDE_MEM_GEMINI_CLI_MODEL:"gemini-2.5-flash-lite",CLAUDE_MEM_GEMINI_CLI_MIN_SPACING_MS:"6100",CLAUDE_MEM_ANTIGRAVITY_CLI_MIN_SPACING_MS:"2000",CLAUDE_MEM_PROVIDER_COOLDOWN_MS:"3600000",CLAUDE_MEM_COOLDOWN_QUOTA_EXHAUSTED_MS:"3600000",CLAUDE_MEM_COOLDOWN_RATE_LIMIT_MS:"60000",CLAUDE_MEM_COOLDOWN_TRANSIENT_MS:"90000",CLAUDE_MEM_COOLDOWN_UNRECOVERABLE_MS:"3600000",CLAUDE_MEM_COOLDOWN_AUTH_INVALID_MS:"86400000",CLAUDE_MEM_VALIDATION_RETRIES:"2"};static getAllDefaults(){return{...this.DEFAULTS}}static get(e){return process.env[e]??this.DEFAULTS[e]}static getInt(e){let s=this.get(e);return parseInt(s,10)}static getBool(e){return String(this.get(e)).toLowerCase()==="true"}static applyEnvOverrides(e){let s={...e};for(let t of Object.keys(this.DEFAULTS))process.env[t]!==void 0&&(s[t]=process.env[t]);return s}static applyToProcessEnv(e){for(let s of Object.keys(this.DEFAULTS))process.env[s]===void 0&&e[s]!==void 0&&(process.env[s]=String(e[s]))}static loadFromFile(e,s=!0){try{if(!(0,J.existsSync)(e)){let a=this.getAllDefaults();try{ae(e,a),console.warn("[SETTINGS] Created settings file with defaults:",e)}catch(_){console.warn("[SETTINGS] Failed to create settings file, using in-memory defaults:",e,_ instanceof Error?_.message:String(_))}return s?this.applyEnvOverrides(a):a}let t=(0,J.readFileSync)(e,"utf-8"),r=x(t),o=r;if(r.env&&typeof r.env=="object"){o=r.env;try{ae(e,o),console.warn("[SETTINGS] Migrated settings file from nested to flat schema:",e)}catch(a){console.warn("[SETTINGS] Failed to auto-migrate settings file:",e,a instanceof Error?a.message:String(a))}}let i={...this.DEFAULTS};for(let a of Object.keys(this.DEFAULTS))o[a]!==void 0&&(i[a]=o[a]);return s?this.applyEnvOverrides(i):i}catch(t){console.warn("[SETTINGS] Failed to load settings, using defaults:",e,t instanceof Error?t.message:String(t));let r=this.getAllDefaults();return s?this.applyEnvOverrides(r):r}}};function Be(){return k.getBool("CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED")}var Nt=new Set(ce),Ie=class extends Error{constructor(s,t){super(s);this.invalid=t;this.name="StatusFilterError"}invalid};function He(n,e={}){if(!(e.featureEnabled??Be()))return{statuses:[...ce],filterApplied:!1};if(n==null||n==="")return{statuses:[...ke],filterApplied:!0};let t=n.split(",").map(o=>o.trim()).filter(Boolean),r=t.filter(o=>!Nt.has(o));if(r.length>0)throw new Ie(`Unknown status values: ${r.join(",")}`,r);return{statuses:t,filterApplied:!0}}function $e(n,e={}){let s=e.columnExpr??"COALESCE(status, 'active')";if(n.length===0)return{sql:"1=0",params:[]};let t=n.map(()=>"?").join(",");return{sql:`${s} IN (${t})`,params:[...n]}}var T="claude";function It(n){return n.trim().toLowerCase().replace(/\s+/g,"-")}function L(n){if(!n)return T;let e=It(n);return e?e==="transcript"||e.includes("codex")?"codex":e.includes("cursor")?"cursor":e.includes("claude")?"claude":e:T}function je(n){let e=["claude","codex","cursor"];return[...n].sort((s,t)=>{let r=e.indexOf(s),o=e.indexOf(t);return r!==-1||o!==-1?r===-1?1:o===-1?-1:r-o:s.localeCompare(t)})}function We(n,e,s,t,r){let o=Date.now()-t,i=r!==void 0?"up.session_db_id = ?":"up.content_session_id = ?",a=r??e;return n.prepare(`
    SELECT
      up.*,
      s.memory_session_id,
      s.project,
      COALESCE(s.platform_source, '${T}') as platform_source
    FROM user_prompts up
    JOIN sdk_sessions s ON up.session_db_id = s.id
    WHERE ${i}
      AND up.prompt_text = ?
      AND up.created_at_epoch >= ?
    ORDER BY up.created_at_epoch DESC
    LIMIT 1
  `).get(a,s,o)??void 0}var Ye=["private","claude-mem-context","system_instruction","system-instruction","persisted-output","system-reminder"],Ve=new RegExp(`<(${Ye.join("|")})\\b[^>]*>[\\s\\S]*?</\\1>`,"g"),qe=/<system-reminder>[\s\S]*?<\/system-reminder>/g,Ke=100;function Ot(n){let e=Object.fromEntries(Ye.map(r=>[r,0]));Ve.lastIndex=0;let s=0,t=n.replace(Ve,(r,o)=>(e[o]=(e[o]??0)+1,s+=1,""));return s>Ke&&E.warn("SYSTEM","tag count exceeds limit",void 0,{tagCount:s,maxAllowed:Ke,contentLength:n.length}),{stripped:t.trim(),counts:e}}function Je(n){return Ot(n).stripped}var St=["task-notification"],An=new RegExp(`^\\s*<(${St.join("|")})\\b[^>]*>(?:(?!<\\1\\b|</\\1\\b)[\\s\\S])*</\\1>\\s*$`),bn=256*1024;var Oe=4e3;function Q(n){let e=n.trim(),t=Je(n).trim()||e;return t.length<=Oe?t:(E.debug("DB","Truncated stored prompt text to the configured cap",{originalLength:t.length,storedLength:Oe}),`${t.slice(0,Oe-1)}\u2026`)}var Rt=require("bun:sqlite");var gt=5e3,At=4194304;function bt(n){return n.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    LIMIT 1
  `).get()!=null}function G(n,e,s){try{n.run(e)}catch(t){let r=t instanceof Error?t:new Error(String(t));throw E.warn("DB",`Failed to apply SQLite pragma ${s}`,{sql:e},r),t}}function Qe(n,e={}){let{enableWal:s=!0,enableIncrementalAutoVacuum:t=!0}=e;G(n,`PRAGMA busy_timeout = ${gt}`,"busy_timeout"),G(n,"PRAGMA foreign_keys = ON","foreign_keys"),G(n,"PRAGMA synchronous = NORMAL","synchronous"),G(n,`PRAGMA journal_size_limit = ${At}`,"journal_size_limit"),t&&!bt(n)&&G(n,"PRAGMA auto_vacuum = INCREMENTAL","auto_vacuum"),s&&G(n,"PRAGMA journal_mode = WAL","journal_mode")}var Ze=33;var ze=new WeakSet;function es(n){if(ze.has(n))return;n.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      root_path TEXT UNIQUE,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at_epoch INTEGER NOT NULL,
      updated_at_epoch INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at_epoch INTEGER NOT NULL,
      updated_at_epoch INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member', 'viewer')),
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS server_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      content_session_id TEXT,
      memory_session_id TEXT,
      platform_source TEXT NOT NULL DEFAULT 'claude',
      title TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'failed')),
      metadata TEXT NOT NULL DEFAULT '{}',
      started_at_epoch INTEGER NOT NULL,
      completed_at_epoch INTEGER,
      updated_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      server_session_id TEXT,
      source_type TEXT NOT NULL CHECK(source_type IN ('hook', 'worker', 'provider', 'server', 'api')),
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      content_session_id TEXT,
      memory_session_id TEXT,
      occurred_at_epoch INTEGER NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(server_session_id) REFERENCES server_sessions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS memory_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      server_session_id TEXT,
      legacy_observation_id INTEGER,
      kind TEXT NOT NULL CHECK(kind IN ('observation', 'summary', 'prompt', 'manual')),
      type TEXT NOT NULL,
      title TEXT,
      subtitle TEXT,
      text TEXT,
      narrative TEXT,
      facts TEXT NOT NULL DEFAULT '[]',
      concepts TEXT NOT NULL DEFAULT '[]',
      files_read TEXT NOT NULL DEFAULT '[]',
      files_modified TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at_epoch INTEGER NOT NULL,
      updated_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(server_session_id) REFERENCES server_sessions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS memory_sources (
      id TEXT PRIMARY KEY,
      memory_item_id TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('observation', 'session_summary', 'user_prompt', 'manual', 'import')),
      legacy_table TEXT,
      legacy_id INTEGER,
      source_uri TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(memory_item_id) REFERENCES memory_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      project_id TEXT,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      prefix TEXT,
      scopes TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
      last_used_at_epoch INTEGER,
      expires_at_epoch INTEGER,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at_epoch INTEGER NOT NULL,
      updated_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      project_id TEXT,
      actor_type TEXT NOT NULL CHECK(actor_type IN ('user', 'api_key', 'system')),
      actor_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE SET NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
    );
  `),n.run("CREATE INDEX IF NOT EXISTS idx_projects_root_path ON projects(root_path)"),n.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_project ON server_sessions(project_id)"),n.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_content ON server_sessions(content_session_id)"),n.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_memory ON server_sessions(memory_session_id)"),n.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_status ON server_sessions(status)"),n.run("CREATE INDEX IF NOT EXISTS idx_agent_events_project_time ON agent_events(project_id, occurred_at_epoch DESC)"),n.run("CREATE INDEX IF NOT EXISTS idx_agent_events_session_time ON agent_events(server_session_id, occurred_at_epoch DESC)"),n.run("CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type)"),n.run("CREATE INDEX IF NOT EXISTS idx_memory_items_project_time ON memory_items(project_id, created_at_epoch DESC)"),n.run("CREATE INDEX IF NOT EXISTS idx_memory_items_session_time ON memory_items(server_session_id, created_at_epoch DESC)"),n.run("CREATE INDEX IF NOT EXISTS idx_memory_items_legacy_observation ON memory_items(legacy_observation_id)"),n.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_memory_items_legacy_observation
    ON memory_items(legacy_observation_id)
    WHERE legacy_observation_id IS NOT NULL
  `),n.run("CREATE INDEX IF NOT EXISTS idx_memory_items_kind_type ON memory_items(kind, type)"),n.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_items_fts USING fts5(
      memory_item_id UNINDEXED,
      project_id UNINDEXED,
      title,
      subtitle,
      text,
      narrative,
      facts,
      concepts,
      tokenize='porter unicode61'
    )
  `);let e=n.prepare("SELECT COUNT(*) AS count FROM memory_items").get(),s=n.prepare("SELECT COUNT(*) AS count FROM memory_items_fts").get();e.count!==s.count&&n.transaction(()=>{n.run("DELETE FROM memory_items_fts"),n.run(`
        INSERT INTO memory_items_fts (
          memory_item_id, project_id, title, subtitle, text, narrative, facts, concepts
        )
        SELECT id, project_id, title, subtitle, text, narrative, facts, concepts
        FROM memory_items
      `)})(),n.run("CREATE INDEX IF NOT EXISTS idx_memory_sources_item ON memory_sources(memory_item_id)"),n.run("CREATE INDEX IF NOT EXISTS idx_memory_sources_legacy ON memory_sources(legacy_table, legacy_id)"),n.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_memory_sources_legacy_source
    ON memory_sources(source_type, legacy_table, legacy_id)
    WHERE legacy_table IS NOT NULL AND legacy_id IS NOT NULL
  `),n.run("CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)"),n.run("CREATE INDEX IF NOT EXISTS idx_api_keys_team ON api_keys(team_id)"),n.run("CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id)"),n.run("CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix)"),n.run("CREATE INDEX IF NOT EXISTS idx_audit_log_team_time ON audit_log(team_id, created_at_epoch DESC)"),n.run("CREATE INDEX IF NOT EXISTS idx_audit_log_project_time ON audit_log(project_id, created_at_epoch DESC)"),n.run("CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_type, actor_id)"),n.run(`
    CREATE TRIGGER IF NOT EXISTS trg_server_sessions_project_update
    BEFORE UPDATE OF project_id ON server_sessions
    WHEN EXISTS (
      SELECT 1 FROM agent_events
      WHERE server_session_id = OLD.id AND project_id <> NEW.project_id
    )
    OR EXISTS (
      SELECT 1 FROM memory_items
      WHERE server_session_id = OLD.id AND project_id <> NEW.project_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'server_sessions project_id cannot change while children belong to the previous project');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_agent_events_session_project_insert
    BEFORE INSERT ON agent_events
    WHEN NEW.server_session_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM server_sessions
        WHERE id = NEW.server_session_id AND project_id = NEW.project_id
      )
    BEGIN
      SELECT RAISE(ABORT, 'agent_events server_session_id must belong to project_id');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_agent_events_session_project_update
    BEFORE UPDATE OF project_id, server_session_id ON agent_events
    WHEN NEW.server_session_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM server_sessions
        WHERE id = NEW.server_session_id AND project_id = NEW.project_id
      )
    BEGIN
      SELECT RAISE(ABORT, 'agent_events server_session_id must belong to project_id');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_memory_items_session_project_insert
    BEFORE INSERT ON memory_items
    WHEN NEW.server_session_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM server_sessions
        WHERE id = NEW.server_session_id AND project_id = NEW.project_id
      )
    BEGIN
      SELECT RAISE(ABORT, 'memory_items server_session_id must belong to project_id');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_memory_items_session_project_update
    BEFORE UPDATE OF project_id, server_session_id ON memory_items
    WHEN NEW.server_session_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM server_sessions
        WHERE id = NEW.server_session_id AND project_id = NEW.project_id
      )
    BEGIN
      SELECT RAISE(ABORT, 'memory_items server_session_id must belong to project_id');
    END;
  `),n.run(`
    CREATE TRIGGER IF NOT EXISTS trg_memory_items_fts_insert
    AFTER INSERT ON memory_items
    BEGIN
      INSERT INTO memory_items_fts (
        memory_item_id, project_id, title, subtitle, text, narrative, facts, concepts
      )
      VALUES (
        new.id, new.project_id, new.title, new.subtitle, new.text, new.narrative, new.facts, new.concepts
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_memory_items_fts_update
    AFTER UPDATE ON memory_items
    BEGIN
      DELETE FROM memory_items_fts WHERE memory_item_id = old.id;
      INSERT INTO memory_items_fts (
        memory_item_id, project_id, title, subtitle, text, narrative, facts, concepts
      )
      VALUES (
        new.id, new.project_id, new.title, new.subtitle, new.text, new.narrative, new.facts, new.concepts
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_memory_items_fts_delete
    AFTER DELETE ON memory_items
    BEGIN
      DELETE FROM memory_items_fts WHERE memory_item_id = old.id;
    END;
  `),ze.add(n)}var z=class{constructor(e){this.db=e}db;runAllMigrations(){this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn(),this.createObservationFeedbackTable(),this.addSessionPlatformSourceColumn(),this.ensureMergedIntoProjectColumns(),this.addObservationSubagentColumns(),this.rebuildPendingMessagesForSelfHealingClaim(),this.addObservationsUniqueContentHashIndex(),this.addObservationsMetadataColumn(),this.dropDeadPendingMessagesColumns(),this.dropWorkerPidColumn(),this.createServerOwnedTables(),this.rebuildPendingMessagesForFinalQueueSchema(),this.addObservationReconciliationSchema(),this.addObservationStatusAuditTable(),this.addObservationReconcileCostsTable()}initializeSchema(){this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id INTEGER PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      )
    `),this.db.run(`
      CREATE TABLE IF NOT EXISTS sdk_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT UNIQUE NOT NULL,
        memory_session_id TEXT UNIQUE,
        project TEXT NOT NULL,
        platform_source TEXT NOT NULL DEFAULT 'claude',
        user_prompt TEXT,
        started_at TEXT NOT NULL,
        started_at_epoch INTEGER NOT NULL,
        completed_at TEXT,
        completed_at_epoch INTEGER,
        status TEXT CHECK(status IN ('active', 'completed', 'failed')) NOT NULL DEFAULT 'active'
      );

      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
      CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
      CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS session_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT UNIQUE NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString())}ensureWorkerPortColumn(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(t=>t.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),E.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(a=>a.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),E.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),E.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),E.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(t=>t.unique===1&&t.origin!=="pk")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}E.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, created_at, created_at_epoch
      FROM session_summaries
    `),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),E.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(r=>r.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}E.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),E.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let t=this.db.query("PRAGMA table_info(observations)").all().find(r=>r.name==="text");if(!t||t.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}E.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             created_at, created_at_epoch
      FROM observations
    `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),E.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}E.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
      CREATE TABLE user_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        prompt_number INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(content_session_id) REFERENCES sdk_sessions(content_session_id) ON DELETE CASCADE
      );

      CREATE INDEX idx_user_prompts_claude_session ON user_prompts(content_session_id);
      CREATE INDEX idx_user_prompts_created ON user_prompts(created_at_epoch DESC);
      CREATE INDEX idx_user_prompts_prompt_number ON user_prompts(prompt_number);
      CREATE INDEX idx_user_prompts_lookup ON user_prompts(content_session_id, prompt_number);
    `);try{this.createUserPromptsFTS()}catch(t){E.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},t instanceof Error?t:new Error(String(t)))}this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),E.debug("DB","Successfully created user_prompts table")}createUserPromptsFTS(){this.db.run(`
      CREATE VIRTUAL TABLE user_prompts_fts USING fts5(
        prompt_text,
        content='user_prompts',
        content_rowid='id'
      );
    `),this.db.run(`
      CREATE TRIGGER user_prompts_ai AFTER INSERT ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;

      CREATE TRIGGER user_prompts_ad AFTER DELETE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
      END;

      CREATE TRIGGER user_prompts_au AFTER UPDATE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;
    `)}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),E.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),E.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}E.debug("DB","Creating pending_messages table"),this.db.run(`
      CREATE TABLE pending_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id INTEGER NOT NULL,
        content_session_id TEXT NOT NULL,
        message_type TEXT NOT NULL CHECK(message_type IN ('observation', 'summarize')),
        tool_name TEXT,
        tool_input TEXT,
        tool_response TEXT,
        cwd TEXT,
        last_user_message TEXT,
        last_assistant_message TEXT,
        prompt_number INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing')),
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),E.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;E.debug("DB","Checking session ID columns for semantic clarity rename");let s=0,t=(r,o,i)=>{let a=this.db.query(`PRAGMA table_info(${r})`).all(),_=a.some(u=>u.name===o);return a.some(u=>u.name===i)?!1:_?(this.db.run(`ALTER TABLE ${r} RENAME COLUMN ${o} TO ${i}`),E.debug("DB",`Renamed ${r}.${o} to ${i}`),!0):(E.warn("DB",`Column ${o} not found in ${r}, skipping rename`),!1)};t("sdk_sessions","claude_session_id","content_session_id")&&s++,t("sdk_sessions","sdk_session_id","memory_session_id")&&s++,t("pending_messages","claude_session_id","content_session_id")&&s++,t("observations","sdk_session_id","memory_session_id")&&s++,t("session_summaries","sdk_session_id","memory_session_id")&&s++,t("user_prompts","claude_session_id","content_session_id")&&s++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),s>0?E.debug("DB",`Successfully renamed ${s} session ID columns`):E.debug("DB","No session ID column renames needed (already up to date)")}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),E.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(!this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21)){E.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.recreateObservationsWithUpdateCascade(),this.recreateSessionSummariesWithUpdateCascade(),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),E.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(s){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),s instanceof Error?s:new Error(`Migration 21 failed: ${String(s)}`)}}}recreateObservationsWithUpdateCascade(){this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new");let s=this.db.query("PRAGMA table_info(observations)").all().some(i=>i.name==="content_hash"),t=s?`,
        content_hash TEXT`:"",r=s?", content_hash":"";this.db.run(`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        discovery_tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL${t},
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `),this.db.run(`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             discovery_tokens, created_at, created_at_epoch${r}
      FROM observations
    `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run(`
        CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
          INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
          VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
        END;

        CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
          INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
          VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
        END;

        CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
          INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
          VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
          INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
          VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
        END;
      `)}recreateSessionSummariesWithUpdateCascade(){this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        discovery_tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `),this.db.run(`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, discovery_tokens, created_at, created_at_epoch
      FROM session_summaries
    `),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ai"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ad"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_au"),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'").all().length>0&&this.db.run(`
        CREATE TRIGGER IF NOT EXISTS session_summaries_ai AFTER INSERT ON session_summaries BEGIN
          INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
          VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
        END;

        CREATE TRIGGER IF NOT EXISTS session_summaries_ad AFTER DELETE ON session_summaries BEGIN
          INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
          VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
        END;

        CREATE TRIGGER IF NOT EXISTS session_summaries_au AFTER UPDATE ON session_summaries BEGIN
          INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
          VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
          INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
          VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
        END;
      `)}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),E.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(r=>r.name==="custom_title")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),E.debug("DB","Added custom_title column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString())}createObservationFeedbackTable(){this.db.query("SELECT 1 FROM schema_versions WHERE version = 24").get()||(this.db.run(`
      CREATE TABLE IF NOT EXISTS observation_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL,
        signal_type TEXT NOT NULL,
        session_db_id INTEGER,
        created_at_epoch INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_feedback_observation ON observation_feedback(observation_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_feedback_signal ON observation_feedback(signal_type)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString()),E.debug("DB","Created observation_feedback table for usage tracking"))}addSessionPlatformSourceColumn(){let s=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(i=>i.name==="platform_source"),r=this.db.query("PRAGMA index_list(sdk_sessions)").all().some(i=>i.name==="idx_sdk_sessions_platform_source");this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(25)&&s&&r||(s||(this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${T}'`),E.debug("DB","Added platform_source column to sdk_sessions table")),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${T}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),r||this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(25,new Date().toISOString()))}ensureMergedIntoProjectColumns(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE observations ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_merged_into ON observations(merged_into_project)"),this.db.query("PRAGMA table_info(session_summaries)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE session_summaries ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_summaries_merged_into ON session_summaries(merged_into_project)")}addObservationSubagentColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(27),s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(i=>i.name==="agent_type"),r=s.some(i=>i.name==="agent_id");t||(this.db.run("ALTER TABLE observations ADD COLUMN agent_type TEXT"),E.debug("DB","Added agent_type column to observations table")),r||(this.db.run("ALTER TABLE observations ADD COLUMN agent_id TEXT"),E.debug("DB","Added agent_id column to observations table")),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_type ON observations(agent_type)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_id ON observations(agent_id)");let o=this.db.query("PRAGMA table_info(pending_messages)").all();if(o.length>0){let i=o.some(_=>_.name==="agent_type"),a=o.some(_=>_.name==="agent_id");i||(this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_type TEXT"),E.debug("DB","Added agent_type column to pending_messages table")),a||(this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_id TEXT"),E.debug("DB","Added agent_id column to pending_messages table"))}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString())}rebuildPendingMessagesForSelfHealingClaim(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(28))return;if(!(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0)){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString());return}E.debug("DB","Rebuilding pending_messages for self-healing claim (migration 28)"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{let t=this.db.query("PRAGMA table_info(pending_messages)").all(),r=new Set(t.map(i=>i.name)),o=i=>r.has(i);this.db.run("DROP TABLE IF EXISTS pending_messages_new"),this.db.run(`
        CREATE TABLE pending_messages_new (
          id                       INTEGER PRIMARY KEY AUTOINCREMENT,
          session_db_id            INTEGER NOT NULL,
          content_session_id       TEXT    NOT NULL,
          tool_use_id              TEXT,
          message_type             TEXT    NOT NULL CHECK(message_type IN ('observation', 'summarize')),
          tool_name                TEXT,
          tool_input               TEXT,
          tool_response            TEXT,
          cwd                      TEXT,
          last_user_message        TEXT,
          last_assistant_message   TEXT,
          prompt_number            INTEGER,
          status                   TEXT    NOT NULL DEFAULT 'pending'
                                           CHECK(status IN ('pending', 'processing')),
          created_at_epoch         INTEGER NOT NULL,
          agent_type               TEXT,
          agent_id                 TEXT,
          FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
        )
      `),this.db.run(`
        INSERT INTO pending_messages_new (
          id, session_db_id, content_session_id, tool_use_id, message_type,
          tool_name, tool_input, tool_response, cwd, last_user_message,
          last_assistant_message, prompt_number, status, created_at_epoch,
          agent_type, agent_id
        )
        SELECT
          id,
          session_db_id,
          content_session_id,
          ${o("tool_use_id")?"tool_use_id":"NULL"},
          message_type,
          ${o("tool_name")?"tool_name":"NULL"},
          ${o("tool_input")?"tool_input":"NULL"},
          ${o("tool_response")?"tool_response":"NULL"},
          ${o("cwd")?"cwd":"NULL"},
          ${o("last_user_message")?"last_user_message":"NULL"},
          ${o("last_assistant_message")?"last_assistant_message":"NULL"},
          ${o("prompt_number")?"prompt_number":"NULL"},
          CASE WHEN status = 'processing' THEN 'processing' ELSE 'pending' END,
          created_at_epoch,
          ${o("agent_type")?"agent_type":"NULL"},
          ${o("agent_id")?"agent_id":"NULL"}
        FROM pending_messages
        WHERE status IN ('pending', 'processing')
      `),this.db.run("DROP TABLE pending_messages"),this.db.run("ALTER TABLE pending_messages_new RENAME TO pending_messages"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session        ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status         ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.run(`
        DELETE FROM pending_messages
         WHERE tool_use_id IS NOT NULL
           AND id NOT IN (
             SELECT MIN(id) FROM pending_messages
              WHERE tool_use_id IS NOT NULL
              GROUP BY content_session_id, tool_use_id
           )
      `),this.db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_session_tool
        ON pending_messages(content_session_id, tool_use_id)
        WHERE tool_use_id IS NOT NULL
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),E.debug("DB","Rebuilt pending_messages for self-healing claim")}catch(t){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),t instanceof Error?t:new Error(`Migration 28 failed: ${String(t)}`)}}addObservationsUniqueContentHashIndex(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(29))return;let s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(o=>o.name==="memory_session_id"),r=s.some(o=>o.name==="content_hash");if(!t||!r){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString());return}this.db.run("BEGIN TRANSACTION");try{this.db.run(`
        UPDATE observations
           SET content_hash = '__null_migration_' || id || '__'
         WHERE content_hash IS NULL
      `),this.db.run(`
        DELETE FROM observations
         WHERE id IN (
           SELECT id
             FROM (
               SELECT id,
                      ROW_NUMBER() OVER (
                        PARTITION BY memory_session_id, content_hash
                        ORDER BY id
                      ) AS duplicate_rank
                 FROM observations
             )
            WHERE duplicate_rank > 1
         )
      `),this.db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_observations_session_hash
        ON observations(memory_session_id, content_hash)
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString()),this.db.run("COMMIT"),E.debug("DB","Added UNIQUE(memory_session_id, content_hash) on observations")}catch(o){throw this.db.run("ROLLBACK"),o instanceof Error?o:new Error(`Migration 29 failed: ${String(o)}`)}}addObservationsMetadataColumn(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="metadata")||(this.db.run("ALTER TABLE observations ADD COLUMN metadata TEXT"),E.debug("DB","Added metadata column to observations table (#2116)")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(30,new Date().toISOString())}dropDeadPendingMessagesColumns(){let e=this.db.query("PRAGMA table_info(pending_messages)").all(),s=new Set(e.map(o=>o.name)),r=["retry_count","failed_at_epoch","completed_at_epoch","worker_pid"].filter(o=>s.has(o));if(r.length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString());return}this.db.run("BEGIN TRANSACTION");try{this.db.run("DELETE FROM pending_messages WHERE status NOT IN ('pending', 'processing')"),r.includes("worker_pid")&&this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid");for(let o of r)this.db.run(`ALTER TABLE pending_messages DROP COLUMN ${o}`),E.debug("DB",`Dropped dead column ${o} from pending_messages`);this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString()),this.db.run("COMMIT"),E.debug("DB","Successfully dropped dead columns from pending_messages")}catch(o){throw this.db.run("ROLLBACK"),E.error("DB",`Migration 31 failed: ${String(o)}`,{},o instanceof Error?o:new Error(String(o))),o}}dropWorkerPidColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(32))return;if(this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="worker_pid"))try{this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid"),this.db.run("ALTER TABLE pending_messages DROP COLUMN worker_pid"),E.debug("DB","Dropped worker_pid column and its index from pending_messages")}catch(r){E.warn("DB","Failed to drop worker_pid column from pending_messages",{},r instanceof Error?r:new Error(String(r)))}this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(32,new Date().toISOString())}createServerOwnedTables(){es(this.db),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(Ze,new Date().toISOString())}rebuildPendingMessagesForFinalQueueSchema(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(34))return;let s=this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='pending_messages'").get();if(!s){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString());return}let t=s.sql.includes("'processed'")||s.sql.includes("'failed'"),r=this.db.query("PRAGMA table_info(pending_messages)").all(),o=new Set(r.map(_=>_.name)),i=["retry_count","failed_at_epoch","completed_at_epoch","worker_pid"].some(_=>o.has(_));if(!t&&!i){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString());return}let a=_=>o.has(_);this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.db.run("DROP TABLE IF EXISTS pending_messages_final"),this.db.run(`
        CREATE TABLE pending_messages_final (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_db_id INTEGER NOT NULL,
          content_session_id TEXT NOT NULL,
          tool_use_id TEXT,
          message_type TEXT NOT NULL CHECK(message_type IN ('observation', 'summarize')),
          tool_name TEXT,
          tool_input TEXT,
          tool_response TEXT,
          cwd TEXT,
          last_user_message TEXT,
          last_assistant_message TEXT,
          prompt_number INTEGER,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing')),
          created_at_epoch INTEGER NOT NULL,
          agent_type TEXT,
          agent_id TEXT,
          FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
        )
      `),this.db.run(`
        INSERT INTO pending_messages_final (
          id, session_db_id, content_session_id, tool_use_id, message_type,
          tool_name, tool_input, tool_response, cwd, last_user_message,
          last_assistant_message, prompt_number, status, created_at_epoch,
          agent_type, agent_id
        )
        SELECT
          id,
          session_db_id,
          content_session_id,
          ${a("tool_use_id")?"tool_use_id":"NULL"},
          message_type,
          ${a("tool_name")?"tool_name":"NULL"},
          ${a("tool_input")?"tool_input":"NULL"},
          ${a("tool_response")?"tool_response":"NULL"},
          ${a("cwd")?"cwd":"NULL"},
          ${a("last_user_message")?"last_user_message":"NULL"},
          ${a("last_assistant_message")?"last_assistant_message":"NULL"},
          ${a("prompt_number")?"prompt_number":"NULL"},
          CASE WHEN status = 'processing' THEN 'processing' ELSE 'pending' END,
          created_at_epoch,
          ${a("agent_type")?"agent_type":"NULL"},
          ${a("agent_id")?"agent_id":"NULL"}
        FROM pending_messages
        WHERE status IN ('pending', 'processing')
      `),this.db.run("DROP TABLE pending_messages"),this.db.run("ALTER TABLE pending_messages_final RENAME TO pending_messages"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_session_tool
        ON pending_messages(content_session_id, tool_use_id)
        WHERE tool_use_id IS NOT NULL
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON")}catch(_){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),_ instanceof Error?_:new Error(`Migration 34 failed: ${String(_)}`)}}addObservationReconciliationSchema(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(35))return;let s=this.db.query("PRAGMA table_info(observations)").all(),t=new Set(s.map(o=>o.name)),r=[{name:"status",ddl:"ALTER TABLE observations ADD COLUMN status TEXT DEFAULT 'active'"},{name:"status_confidence",ddl:"ALTER TABLE observations ADD COLUMN status_confidence REAL DEFAULT 1.0"},{name:"status_reason",ddl:"ALTER TABLE observations ADD COLUMN status_reason TEXT"},{name:"status_updated_at_epoch",ddl:"ALTER TABLE observations ADD COLUMN status_updated_at_epoch INTEGER"},{name:"superseded_by_observation_id",ddl:"ALTER TABLE observations ADD COLUMN superseded_by_observation_id INTEGER"},{name:"reconciled_at_epoch",ddl:"ALTER TABLE observations ADD COLUMN reconciled_at_epoch INTEGER"}];for(let o of r)t.has(o.name)||(this.db.run(o.ddl),E.debug("DB",`Added ${o.name} column to observations table (migration 35)`));this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_status ON observations(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_project_status ON observations(project, status, created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_superseded_by ON observations(superseded_by_observation_id)"),this.db.run(`
      CREATE TABLE IF NOT EXISTS observation_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_observation_id INTEGER NOT NULL,
        target_observation_id INTEGER NOT NULL,
        relation TEXT NOT NULL,
        confidence REAL NOT NULL,
        evidence TEXT NOT NULL,
        reason TEXT NOT NULL,
        action_applied TEXT,
        model TEXT,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        updated_at TEXT,
        updated_at_epoch INTEGER,
        FOREIGN KEY(source_observation_id) REFERENCES observations(id) ON DELETE CASCADE,
        FOREIGN KEY(target_observation_id) REFERENCES observations(id) ON DELETE CASCADE,
        UNIQUE(source_observation_id, target_observation_id, relation)
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_relations_source ON observation_relations(source_observation_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_relations_target ON observation_relations(target_observation_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_relations_relation ON observation_relations(relation)"),this.db.run(`
      CREATE TABLE IF NOT EXISTS observation_evidence (
        observation_id INTEGER PRIMARY KEY,
        pending_message_id INTEGER,
        content_session_id TEXT,
        prompt_number INTEGER,
        project TEXT NOT NULL,
        platform_source TEXT,
        user_prompt TEXT,
        assistant_message TEXT,
        tool_trace_json TEXT,
        files_read_json TEXT,
        files_modified_json TEXT,
        truncated INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(observation_id) REFERENCES observations(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_evidence_project ON observation_evidence(project)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_evidence_created ON observation_evidence(created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_evidence_pending ON observation_evidence(pending_message_id)"),this.db.run(`
      CREATE TABLE IF NOT EXISTS observation_reconcile_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL UNIQUE,
        project TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at_epoch INTEGER NOT NULL,
        updated_at_epoch INTEGER NOT NULL,
        locked_at_epoch INTEGER,
        completed_at_epoch INTEGER,
        FOREIGN KEY(observation_id) REFERENCES observations(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_jobs_status ON observation_reconcile_jobs(status, created_at_epoch)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_jobs_project_status ON observation_reconcile_jobs(project, status, created_at_epoch)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(35,new Date().toISOString()),E.debug("DB","Observation reconciliation schema initialized (migration 35)")}addObservationStatusAuditTable(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(36)||(this.db.run(`
      CREATE TABLE IF NOT EXISTS observation_status_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        actor TEXT NOT NULL,
        source_observation_id INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(observation_id) REFERENCES observations(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_status_audit_observation ON observation_status_audit(observation_id, created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_status_audit_actor ON observation_status_audit(actor)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(36,new Date().toISOString()),E.debug("DB","Observation status audit table initialized (migration 36)"))}addObservationReconcileCostsTable(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(37)||(this.db.run(`
      CREATE TABLE IF NOT EXISTS observation_reconcile_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        observation_id INTEGER,
        project TEXT NOT NULL,
        role TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        usd_cost REAL NOT NULL DEFAULT 0.0,
        latency_ms INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_job ON observation_reconcile_costs(job_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_created ON observation_reconcile_costs(created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_project_created ON observation_reconcile_costs(project, created_at_epoch DESC)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(37,new Date().toISOString()),E.debug("DB","Observation reconcile costs table initialized (migration 37)"))}};var Z=class{db;constructor(e=ve,s={}){e instanceof Se.Database?this.db=e:(e!==":memory:"&&Me(b),this.db=new Se.Database(e)),Qe(this.db),this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn(),this.addSessionPlatformSourceColumn(),this.addObservationModelColumns(),this.ensureMergedIntoProjectColumns(),this.addObservationSubagentColumns(),this.addObservationsUniqueContentHashIndex(),this.addObservationsMetadataColumn(),this.dropDeadPendingMessagesColumns(),this.ensurePendingMessagesToolUseIdColumn(),this.dropWorkerPidColumn(),this.ensureSDKSessionsPlatformContentIdentity(),this.ensureUserPromptsSessionDbId(),this.ensurePendingMessagesSessionToolUniqueIndex(),this.ensureSyncedAtColumns(s.cloudSyncStatePath??F.cloudSyncState()),this.requeuePromptCloudSyncAfterMapperFix(),new z(this.db).runAllMigrations()}getIndexColumns(e){return this.db.query(`PRAGMA index_info(${JSON.stringify(e)})`).all().map(s=>s.name)}hasUniqueIndexOnColumns(e,s){return this.db.query(`PRAGMA index_list(${e})`).all().some(r=>{if(r.unique!==1)return!1;let o=this.getIndexColumns(r.name);return o.length===s.length&&o.every((i,a)=>i===s[a])})}resolvePromptSessionDbId(e,s,t){if(s!==void 0)return s;let r=t?L(t):void 0;return r?this.db.prepare(`
        SELECT id
        FROM sdk_sessions
        WHERE COALESCE(NULLIF(platform_source, ''), ?) = ?
          AND content_session_id = ?
        LIMIT 1
      `).get(T,r,e)?.id??null:this.db.prepare(`
      SELECT id
      FROM sdk_sessions
      WHERE content_session_id = ?
      ORDER BY CASE COALESCE(NULLIF(platform_source, ''), '${T}')
        WHEN '${T}' THEN 0
        ELSE 1
      END, id
      LIMIT 1
    `).get(e)?.id??null}dropWorkerPidColumn(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(32),t=this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="worker_pid");if(!(e&&!t)){if(t)try{this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid"),this.db.run("ALTER TABLE pending_messages DROP COLUMN worker_pid"),E.debug("DB","Dropped worker_pid column and its index from pending_messages")}catch(r){E.warn("DB","Failed to drop worker_pid column from pending_messages",{},r instanceof Error?r:new Error(String(r)));return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(32,new Date().toISOString())}}ensureSDKSessionsPlatformContentIdentity(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(33),s=this.hasUniqueIndexOnColumns("sdk_sessions",["content_session_id"]),t=this.hasUniqueIndexOnColumns("sdk_sessions",["platform_source","content_session_id"]),o=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(i=>i.name==="platform_source");if(!(e&&!s&&t&&o)){if(o||this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${T}'`),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${T}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),s){this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.rebuildSdkSessionsWithCompositeIdentity(e),this.db.run("COMMIT")}catch(i){this.db.run("ROLLBACK");let a=i instanceof Error?i:new Error(String(i));throw E.error("DB","Failed to rebuild sdk_sessions with composite identity, rolled back",{},a),i}finally{this.db.run("PRAGMA foreign_keys = ON")}return}this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ux_sdk_sessions_platform_content ON sdk_sessions(platform_source, content_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(33,new Date().toISOString())}}rebuildSdkSessionsWithCompositeIdentity(e){this.db.run("DROP TABLE IF EXISTS sdk_sessions_new"),this.db.run(`
      CREATE TABLE sdk_sessions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        memory_session_id TEXT UNIQUE,
        project TEXT NOT NULL,
        platform_source TEXT NOT NULL DEFAULT '${T}',
        user_prompt TEXT,
        started_at TEXT NOT NULL,
        started_at_epoch INTEGER NOT NULL,
        completed_at TEXT,
        completed_at_epoch INTEGER,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'failed')),
        worker_port INTEGER,
        prompt_counter INTEGER DEFAULT 0,
        custom_title TEXT
      )
    `),this.db.run(`
      INSERT INTO sdk_sessions_new (
        id, content_session_id, memory_session_id, project, platform_source,
        user_prompt, started_at, started_at_epoch, completed_at, completed_at_epoch,
        status, worker_port, prompt_counter, custom_title
      )
      SELECT
        id, content_session_id, memory_session_id, project,
        COALESCE(NULLIF(platform_source, ''), '${T}'),
        user_prompt, started_at, started_at_epoch, completed_at, completed_at_epoch,
        status, worker_port, prompt_counter, custom_title
      FROM sdk_sessions
    `),this.db.run("DROP TABLE sdk_sessions"),this.db.run("ALTER TABLE sdk_sessions_new RENAME TO sdk_sessions"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ux_sdk_sessions_platform_content ON sdk_sessions(platform_source, content_session_id)"),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(33,new Date().toISOString())}ensureUserPromptsSessionDbId(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(34);if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='user_prompts'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString());return}let r=this.db.query("PRAGMA table_info(user_prompts)").all().some(d=>d.name==="session_db_id"),i=this.db.query("PRAGMA foreign_key_list(user_prompts)").all().some(d=>d.table==="sdk_sessions"&&d.from==="content_session_id");if(e&&r&&!i)return;let a=this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_prompts_fts'").all().length>0,_=r?`COALESCE(up.session_db_id, (
          SELECT s.id FROM sdk_sessions s
          WHERE s.content_session_id = up.content_session_id
          ORDER BY CASE COALESCE(NULLIF(s.platform_source, ''), '${T}')
            WHEN '${T}' THEN 0
            ELSE 1
          END, s.id
          LIMIT 1
        ))`:`(
          SELECT s.id FROM sdk_sessions s
          WHERE s.content_session_id = up.content_session_id
          ORDER BY CASE COALESCE(NULLIF(s.platform_source, ''), '${T}')
            WHEN '${T}' THEN 0
            ELSE 1
          END, s.id
          LIMIT 1
        )`;this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.rebuildUserPromptsWithSessionDbId(e,_,a),this.db.run("COMMIT")}catch(d){this.db.run("ROLLBACK");let u=d instanceof Error?d:new Error(String(d));throw E.error("DB","Failed to rebuild user_prompts with session_db_id, rolled back",{},u),d}finally{this.db.run("PRAGMA foreign_keys = ON")}}rebuildUserPromptsWithSessionDbId(e,s,t){this.db.run("DROP TRIGGER IF EXISTS user_prompts_ai"),this.db.run("DROP TRIGGER IF EXISTS user_prompts_ad"),this.db.run("DROP TRIGGER IF EXISTS user_prompts_au"),this.db.run("DROP TABLE IF EXISTS user_prompts_new"),this.db.run(`
      CREATE TABLE user_prompts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id INTEGER,
        content_session_id TEXT NOT NULL,
        prompt_number INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO user_prompts_new (
        id, session_db_id, content_session_id, prompt_number,
        prompt_text, created_at, created_at_epoch
      )
      SELECT
        up.id,
        ${s},
        up.content_session_id,
        up.prompt_number,
        up.prompt_text,
        up.created_at,
        up.created_at_epoch
      FROM user_prompts up
    `),this.db.run("DROP TABLE user_prompts"),this.db.run("ALTER TABLE user_prompts_new RENAME TO user_prompts"),this.db.run("CREATE INDEX IF NOT EXISTS idx_user_prompts_session ON user_prompts(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_user_prompts_claude_session ON user_prompts(content_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_user_prompts_created ON user_prompts(created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_user_prompts_prompt_number ON user_prompts(prompt_number)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_user_prompts_lookup ON user_prompts(session_db_id, prompt_number)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_user_prompts_content_lookup ON user_prompts(content_session_id, prompt_number)"),t&&(this.db.run(`
        CREATE TRIGGER user_prompts_ai AFTER INSERT ON user_prompts BEGIN
          INSERT INTO user_prompts_fts(rowid, prompt_text)
          VALUES (new.id, new.prompt_text);
        END;

        CREATE TRIGGER user_prompts_ad AFTER DELETE ON user_prompts BEGIN
          INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
          VALUES('delete', old.id, old.prompt_text);
        END;

        CREATE TRIGGER user_prompts_au AFTER UPDATE ON user_prompts BEGIN
          INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
          VALUES('delete', old.id, old.prompt_text);
          INSERT INTO user_prompts_fts(rowid, prompt_text)
          VALUES (new.id, new.prompt_text);
        END;
      `),this.db.run("INSERT INTO user_prompts_fts(user_prompts_fts) VALUES('rebuild')")),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString())}ensurePendingMessagesSessionToolUniqueIndex(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(35);if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(35,new Date().toISOString());return}let t=this.hasUniqueIndexOnColumns("pending_messages",["session_db_id","tool_use_id"]);if(!(e&&t)){this.db.run("BEGIN TRANSACTION");try{this.recreatePendingSessionToolUniqueIndex(e),this.db.run("COMMIT")}catch(r){this.db.run("ROLLBACK");let o=r instanceof Error?r:new Error(String(r));throw E.error("DB","Failed to recreate ux_pending_session_tool index, rolled back",{},o),r}}}recreatePendingSessionToolUniqueIndex(e){this.db.run("DROP INDEX IF EXISTS ux_pending_session_tool"),this.db.run(`
      DELETE FROM pending_messages
       WHERE id IN (
         SELECT id
           FROM (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY session_db_id, tool_use_id
                      ORDER BY CASE status
                        WHEN 'processing' THEN 0
                        WHEN 'pending' THEN 1
                        ELSE 2
                      END, id
                    ) AS duplicate_rank
               FROM pending_messages
              WHERE tool_use_id IS NOT NULL
           )
          WHERE duplicate_rank > 1
         )
    `),this.db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_session_tool
      ON pending_messages(session_db_id, tool_use_id)
      WHERE tool_use_id IS NOT NULL
    `),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(35,new Date().toISOString())}ensureSyncedAtColumns(e){let s=!1;for(let t of["observations","session_summaries","user_prompts"])this.db.query(`PRAGMA table_info(${t})`).all().some(i=>i.name==="synced_at")||(this.db.run(`ALTER TABLE ${t} ADD COLUMN synced_at INTEGER`),E.debug("DB",`Added synced_at column to ${t} table`),s=!0),this.db.run(`CREATE INDEX IF NOT EXISTS idx_${t}_unsynced ON ${t}(id) WHERE synced_at IS NULL`);s&&this.stampRowsSyncedByLegacyClient(e),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(39,new Date().toISOString())}requeuePromptCloudSyncAfterMapperFix(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(40))return;let s=this.db.prepare(`
      UPDATE user_prompts SET synced_at = NULL WHERE synced_at IS NOT NULL
    `).run();E.info("DB","Requeued prompt cloud sync after mapper fix (v40)",{requeued:s.changes}),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(40,new Date().toISOString())}stampRowsSyncedByLegacyClient(e){if(!(0,ee.existsSync)(e))return;let s;try{s=JSON.parse((0,ee.readFileSync)(e,"utf-8"))}catch(o){E.warn("DB","Failed to read legacy cloud-sync state, skipping synced_at adoption",{statePath:e},o instanceof Error?o:new Error(String(o)));return}if(s===null||typeof s!="object"){E.warn("DB","Legacy cloud-sync state is not an object, skipping synced_at adoption",{statePath:e});return}let t=Date.now(),r=[["observations",s.lastId],["session_summaries",s.lastSummaryId],["user_prompts",s.lastPromptId]];for(let[o,i]of r)typeof i=="number"&&i>0&&(this.db.prepare(`UPDATE ${o} SET synced_at = ? WHERE id <= ? AND synced_at IS NULL`).run(t,i),E.debug("DB",`Stamped synced_at on ${o} rows already uploaded by the legacy cloud-sync client`,{lastSyncedId:i}))}dropDeadPendingMessagesColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(31),s=this.db.query("PRAGMA table_info(pending_messages)").all(),t=new Set(s.map(i=>i.name)),o=["retry_count","failed_at_epoch","completed_at_epoch"].filter(i=>t.has(i));if(!(e&&o.length===0)){if(o.length>0){this.db.run("BEGIN TRANSACTION");try{this.db.run("DELETE FROM pending_messages WHERE status NOT IN ('pending', 'processing')");for(let i of o)this.db.run(`ALTER TABLE pending_messages DROP COLUMN ${i}`),E.debug("DB",`Dropped dead column ${i} from pending_messages`);e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString()),this.db.run("COMMIT")}catch(i){this.db.run("ROLLBACK"),E.warn("DB","Failed to drop dead columns from pending_messages",{},i instanceof Error?i:new Error(String(i)));return}return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString())}}initializeSchema(){this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id INTEGER PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      )
    `),this.db.run(`
      CREATE TABLE IF NOT EXISTS sdk_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        memory_session_id TEXT UNIQUE,
        project TEXT NOT NULL,
        platform_source TEXT NOT NULL DEFAULT 'claude',
        user_prompt TEXT,
        started_at TEXT NOT NULL,
        started_at_epoch INTEGER NOT NULL,
        completed_at TEXT,
        completed_at_epoch INTEGER,
        status TEXT CHECK(status IN ('active', 'completed', 'failed')) NOT NULL DEFAULT 'active'
      );

      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
      CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
      CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS session_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT UNIQUE NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString())}ensureWorkerPortColumn(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(t=>t.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),E.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(a=>a.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),E.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),E.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),E.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(t=>t.unique===1&&t.origin!=="pk")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}E.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, created_at, created_at_epoch
      FROM session_summaries
    `),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),E.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(r=>r.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}E.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),E.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let t=this.db.query("PRAGMA table_info(observations)").all().find(r=>r.name==="text");if(!t||t.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}E.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             created_at, created_at_epoch
      FROM observations
    `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),E.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}E.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
      CREATE TABLE user_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id INTEGER,
        content_session_id TEXT NOT NULL,
        prompt_number INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_user_prompts_session ON user_prompts(session_db_id);
      CREATE INDEX idx_user_prompts_claude_session ON user_prompts(content_session_id);
      CREATE INDEX idx_user_prompts_created ON user_prompts(created_at_epoch DESC);
      CREATE INDEX idx_user_prompts_prompt_number ON user_prompts(prompt_number);
      CREATE INDEX idx_user_prompts_lookup ON user_prompts(session_db_id, prompt_number);
      CREATE INDEX idx_user_prompts_content_lookup ON user_prompts(content_session_id, prompt_number);
    `);let t=`
      CREATE VIRTUAL TABLE user_prompts_fts USING fts5(
        prompt_text,
        content='user_prompts',
        content_rowid='id'
      );
    `,r=`
      CREATE TRIGGER user_prompts_ai AFTER INSERT ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;

      CREATE TRIGGER user_prompts_ad AFTER DELETE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
      END;

      CREATE TRIGGER user_prompts_au AFTER UPDATE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;
    `;try{this.db.run(t),this.db.run(r)}catch(o){o instanceof Error?E.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},o):E.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},new Error(String(o))),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),E.debug("DB","Created user_prompts table (without FTS5)");return}this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),E.debug("DB","Successfully created user_prompts table")}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),E.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),E.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}E.debug("DB","Creating pending_messages table"),this.db.run(`
      CREATE TABLE pending_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id INTEGER NOT NULL,
        content_session_id TEXT NOT NULL,
        message_type TEXT NOT NULL CHECK(message_type IN ('observation', 'summarize')),
        tool_name TEXT,
        tool_input TEXT,
        tool_response TEXT,
        cwd TEXT,
        last_user_message TEXT,
        last_assistant_message TEXT,
        prompt_number INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing')),
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),E.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;E.debug("DB","Checking session ID columns for semantic clarity rename");let s=0,t=(r,o,i)=>{let a=this.db.query(`PRAGMA table_info(${r})`).all(),_=a.some(u=>u.name===o);return a.some(u=>u.name===i)?!1:_?(this.db.run(`ALTER TABLE ${r} RENAME COLUMN ${o} TO ${i}`),E.debug("DB",`Renamed ${r}.${o} to ${i}`),!0):(E.warn("DB",`Column ${o} not found in ${r}, skipping rename`),!1)};t("sdk_sessions","claude_session_id","content_session_id")&&s++,t("sdk_sessions","sdk_session_id","memory_session_id")&&s++,t("pending_messages","claude_session_id","content_session_id")&&s++,t("observations","sdk_session_id","memory_session_id")&&s++,t("session_summaries","sdk_session_id","memory_session_id")&&s++,t("user_prompts","claude_session_id","content_session_id")&&s++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),s>0?E.debug("DB",`Successfully renamed ${s} session ID columns`):E.debug("DB","No session ID column renames needed (already up to date)")}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),E.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21))return;E.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new");let s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(N=>N.name==="metadata"),r=s.some(N=>N.name==="content_hash"),o=t?`,
        metadata TEXT`:"",i=t?", metadata":"",a=r?`,
        content_hash TEXT`:"",_=r?", content_hash":"",d=`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        discovery_tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL${o}${a},
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `,u=`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             discovery_tokens, created_at, created_at_epoch${i}${_}
      FROM observations
    `,p=`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `,l=`
      CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
        INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
      END;

      CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
      END;

      CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
        INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
      END;
    `;this.db.run("DROP TRIGGER IF EXISTS session_summaries_ai"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ad"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_au"),this.db.run("DROP TABLE IF EXISTS session_summaries_new");let I=`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        discovery_tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `,g=`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, discovery_tokens, created_at, created_at_epoch
      FROM session_summaries
    `,A=`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `,f=`
      CREATE TRIGGER IF NOT EXISTS session_summaries_ai AFTER INSERT ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
      END;

      CREATE TRIGGER IF NOT EXISTS session_summaries_ad AFTER DELETE ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
      END;

      CREATE TRIGGER IF NOT EXISTS session_summaries_au AFTER UPDATE ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
        INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
      END;
    `;try{this.recreateObservationsWithCascade(d,u,p,l),this.recreateSessionSummariesWithCascade(I,g,A,f),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),E.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(N){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),N instanceof Error?N:new Error(String(N))}}recreateObservationsWithCascade(e,s,t,r){this.db.run(e),this.db.run(s),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(t),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run(r)}recreateSessionSummariesWithCascade(e,s,t,r){this.db.run(e),this.db.run(s),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(t),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'").all().length>0&&this.db.run(r)}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),E.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23),t=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(r=>r.name==="custom_title");e&&t||(t||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),E.debug("DB","Added custom_title column to sdk_sessions table")),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString()))}addSessionPlatformSourceColumn(){let s=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(i=>i.name==="platform_source"),r=this.db.query("PRAGMA index_list(sdk_sessions)").all().some(i=>i.name==="idx_sdk_sessions_platform_source");this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(24)&&s&&r||(s||(this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${T}'`),E.debug("DB","Added platform_source column to sdk_sessions table")),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${T}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),r||this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString()))}addObservationModelColumns(){let e=this.db.query("PRAGMA table_info(observations)").all(),s=e.some(r=>r.name==="generated_by_model"),t=e.some(r=>r.name==="relevance_count");s&&t||(s||this.db.run("ALTER TABLE observations ADD COLUMN generated_by_model TEXT"),t||this.db.run("ALTER TABLE observations ADD COLUMN relevance_count INTEGER DEFAULT 0"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(26,new Date().toISOString()))}ensureMergedIntoProjectColumns(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE observations ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_merged_into ON observations(merged_into_project)"),this.db.query("PRAGMA table_info(session_summaries)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE session_summaries ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_summaries_merged_into ON session_summaries(merged_into_project)")}addObservationSubagentColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(27),s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(i=>i.name==="agent_type"),r=s.some(i=>i.name==="agent_id");t||this.db.run("ALTER TABLE observations ADD COLUMN agent_type TEXT"),r||this.db.run("ALTER TABLE observations ADD COLUMN agent_id TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_type ON observations(agent_type)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_id ON observations(agent_id)");let o=this.db.query("PRAGMA table_info(pending_messages)").all();if(o.length>0){let i=o.some(_=>_.name==="agent_type"),a=o.some(_=>_.name==="agent_id");i||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_type TEXT"),a||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_id TEXT")}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString())}ensurePendingMessagesToolUseIdColumn(){if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString());return}this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="tool_use_id")||this.db.run("ALTER TABLE pending_messages ADD COLUMN tool_use_id TEXT"),this.db.run("BEGIN TRANSACTION");try{this.dedupePendingMessagesByToolUseId(),this.db.run("COMMIT")}catch(r){this.db.run("ROLLBACK");let o=r instanceof Error?r:new Error(String(r));throw E.error("DB","Failed to de-dupe pending_messages by tool_use_id, rolled back",{},o),r}}dedupePendingMessagesByToolUseId(){this.db.run(`
      DELETE FROM pending_messages
       WHERE id IN (
         SELECT id
           FROM (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY session_db_id, tool_use_id
                      ORDER BY CASE status
                        WHEN 'processing' THEN 0
                        WHEN 'pending' THEN 1
                        ELSE 2
                      END, id
                    ) AS duplicate_rank
               FROM pending_messages
              WHERE tool_use_id IS NOT NULL
           )
          WHERE duplicate_rank > 1
         )
    `),this.db.run(`
      -- tool_use_id is optional for summaries and legacy rows; enforce de-dupe
      -- only for rows that came from a concrete tool-use event.
      CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_session_tool
      ON pending_messages(session_db_id, tool_use_id)
      WHERE tool_use_id IS NOT NULL
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString())}addObservationsUniqueContentHashIndex(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(29))return;let s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(o=>o.name==="memory_session_id"),r=s.some(o=>o.name==="content_hash");if(!t||!r){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString());return}this.db.run("BEGIN TRANSACTION");try{this.dedupeObservationsByContentHash(),this.db.run("COMMIT")}catch(o){this.db.run("ROLLBACK");let i=o instanceof Error?o:new Error(String(o));throw E.error("DB","Failed to de-dupe observations by content_hash, rolled back",{},i),o}}dedupeObservationsByContentHash(){this.db.run(`
      UPDATE observations
         SET content_hash = '__null_migration_' || id || '__'
       WHERE content_hash IS NULL
    `),this.db.run(`
      DELETE FROM observations
       WHERE id IN (
         SELECT id
           FROM (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY memory_session_id, content_hash
                      ORDER BY id
                    ) AS duplicate_rank
               FROM observations
           )
          WHERE duplicate_rank > 1
       )
    `),this.db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_observations_session_hash
      ON observations(memory_session_id, content_hash)
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString())}addObservationsMetadataColumn(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="metadata")||(this.db.run("ALTER TABLE observations ADD COLUMN metadata TEXT"),E.debug("DB","Added metadata column to observations table (#2116)")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(30,new Date().toISOString())}updateMemorySessionId(e,s){this.db.prepare(`
      UPDATE sdk_sessions
      SET memory_session_id = ?
      WHERE id = ?
    `).run(s,e),s&&this.requeuePromptSync(e)}requeuePromptSync(e){this.db.prepare(`
      UPDATE user_prompts SET synced_at = NULL
      WHERE session_db_id = ? AND synced_at IS NOT NULL
    `).run(e)}markSessionCompleted(e){let s=Date.now(),t=new Date(s).toISOString();this.db.prepare(`
      UPDATE sdk_sessions
      SET status = 'completed', completed_at = ?, completed_at_epoch = ?
      WHERE id = ?
    `).run(t,s,e)}ensureMemorySessionIdRegistered(e,s,t){let r=this.db.prepare(`
      SELECT id, memory_session_id, worker_port FROM sdk_sessions WHERE id = ?
    `).get(e);if(!r)throw new Error(`Session ${e} not found in sdk_sessions`);r.memory_session_id!==s&&(this.db.prepare(`
        UPDATE sdk_sessions SET memory_session_id = ? WHERE id = ?
      `).run(s,e),this.requeuePromptSync(e),E.info("DB","Registered memory_session_id before storage (FK fix)",{sessionDbId:e,oldId:r.memory_session_id,newId:s})),typeof t=="number"&&r.worker_port!==t&&this.db.prepare(`
        UPDATE sdk_sessions SET worker_port = ? WHERE id = ?
      `).run(t,e)}getAllProjects(e){let s=e?L(e):void 0,t=`
      SELECT DISTINCT project
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
    `,r=[de];return s&&(t+=" AND COALESCE(platform_source, ?) = ?",r.push(T,s)),t+=" ORDER BY project ASC",this.db.prepare(t).all(...r).map(i=>i.project)}getProjectCatalog(){let e=this.db.prepare(`
      SELECT
        COALESCE(platform_source, '${T}') as platform_source,
        project,
        MAX(started_at_epoch) as latest_epoch
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
      GROUP BY COALESCE(platform_source, '${T}'), project
      ORDER BY latest_epoch DESC
    `).all(de),s=[],t=new Set,r={};for(let i of e){let a=L(i.platform_source);r[a]||(r[a]=[]),r[a].includes(i.project)||r[a].push(i.project),t.has(i.project)||(t.add(i.project),s.push(i.project))}let o=je(Object.keys(r));return{projects:s,sources:o,projectsBySource:Object.fromEntries(o.map(i=>[i,r[i]||[]]))}}getLatestUserPrompt(e,s){let t=this.resolvePromptSessionDbId(e,s),r=t!==null?"up.session_db_id = ?":"up.content_session_id = ?",o=t!==null?t:e;return this.db.prepare(`
      SELECT
        up.*,
        s.memory_session_id,
        s.project,
        COALESCE(s.platform_source, '${T}') as platform_source
      FROM user_prompts up
      JOIN sdk_sessions s ON up.session_db_id = s.id
      WHERE ${r}
      ORDER BY up.created_at_epoch DESC
      LIMIT 1
    `).get(o)}findRecentDuplicateUserPrompt(e,s,t,r){return We(this.db,e,Q(s),t,this.resolvePromptSessionDbId(e,r)??void 0)}getRecentSessionsWithStatus(e,s=3,t){let r=[e],o="";return t&&(o=`AND COALESCE(NULLIF(s.platform_source, ''), '${T}') = ?`,r.push(L(t))),r.push(s),this.db.prepare(`
      SELECT * FROM (
        SELECT
          s.memory_session_id,
          s.status,
          s.started_at,
          s.started_at_epoch,
          s.user_prompt,
          CASE WHEN sum.memory_session_id IS NOT NULL THEN 1 ELSE 0 END as has_summary
        FROM sdk_sessions s
        LEFT JOIN session_summaries sum ON s.memory_session_id = sum.memory_session_id
        WHERE s.project = ? AND s.memory_session_id IS NOT NULL
        ${o}
        GROUP BY s.memory_session_id
        ORDER BY s.started_at_epoch DESC
        LIMIT ?
      )
      ORDER BY started_at_epoch ASC
    `).all(...r)}getObservationsForSession(e,s){let t=[e],r="";return s&&(r=`
        AND EXISTS (
          SELECT 1
          FROM sdk_sessions s
          WHERE s.memory_session_id = observations.memory_session_id
            AND COALESCE(NULLIF(s.platform_source, ''), '${T}') = ?
        )
      `,t.push(L(s))),this.db.prepare(`
      SELECT title, subtitle, type, prompt_number
      FROM observations
      WHERE memory_session_id = ?
      ${r}
      ORDER BY created_at_epoch ASC
    `).all(...t)}getObservationById(e,s){return s?this.db.prepare(`
      SELECT o.*
      FROM observations o
      LEFT JOIN sdk_sessions s ON s.memory_session_id = o.memory_session_id
      WHERE o.id = ?
        AND COALESCE(NULLIF(s.platform_source, ''), '${T}') = ?
    `).get(e,L(s))||null:this.db.prepare(`
        SELECT *
        FROM observations
        WHERE id = ?
      `).get(e)||null}getObservationsByIds(e,s={}){if(e.length===0)return[];let{orderBy:t="date_desc",limit:r,project:o,platformSource:i,type:a,concepts:_,files:d}=s,u=t==="relevance",p=u?"":`ORDER BY o.created_at_epoch ${t==="date_asc"?"ASC":"DESC"}`,l=r&&!u?`LIMIT ${r}`:"",I=e.map(()=>"?").join(","),g=[...e],A=[];if(o&&(A.push("o.project = ?"),g.push(o)),i&&(A.push(`COALESCE(NULLIF(s.platform_source, ''), '${T}') = ?`),g.push(L(i))),a)if(Array.isArray(a)){let c=a.map(()=>"?").join(",");A.push(`o.type IN (${c})`),g.push(...a)}else A.push("o.type = ?"),g.push(a);if(_){let c=Array.isArray(_)?_:[_],h=c.map(()=>"EXISTS (SELECT 1 FROM json_each(o.concepts) WHERE value = ?)");g.push(...c),A.push(`(${h.join(" OR ")})`)}if(d){let c=Array.isArray(d)?d:[d],h=c.map(()=>"(EXISTS (SELECT 1 FROM json_each(o.files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(o.files_modified) WHERE value LIKE ?))");c.forEach(Ce=>{g.push(`%${Ce}%`,`%${Ce}%`)}),A.push(`(${h.join(" OR ")})`)}let f=He(void 0);if(f.filterApplied){let c=$e(f.statuses,{columnExpr:"COALESCE(o.status, 'active')"});A.push(c.sql),g.push(...c.params)}let N=A.length>0?`WHERE o.id IN (${I}) AND ${A.join(" AND ")}`:`WHERE o.id IN (${I})`,v=this.db.prepare(`
      SELECT o.*
      FROM observations o
      LEFT JOIN sdk_sessions s ON s.memory_session_id = o.memory_session_id
      ${N}
      ${p}
      ${l}
    `).all(...g);if(!u)return v;let S=new Map(v.map(c=>[c.id,c])),y=e.map(c=>S.get(c)).filter(c=>!!c);return r?y.slice(0,r):y}getSummaryForSession(e,s){let t=[e],r="";return s&&(r=`
        AND EXISTS (
          SELECT 1
          FROM sdk_sessions sdk
          WHERE sdk.memory_session_id = session_summaries.memory_session_id
            AND COALESCE(NULLIF(sdk.platform_source, ''), '${T}') = ?
        )
      `,t.push(L(s))),this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at,
        created_at_epoch
      FROM session_summaries
      WHERE memory_session_id = ?
      ${r}
      ORDER BY created_at_epoch DESC
      LIMIT 1
    `).get(...t)||null}getSessionById(e){return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project,
             COALESCE(platform_source, '${T}') as platform_source,
             user_prompt, custom_title, status
      FROM sdk_sessions
      WHERE id = ?
      LIMIT 1
    `).get(e)||null}getSdkSessionsBySessionIds(e){if(e.length===0)return[];let s=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project,
             COALESCE(platform_source, '${T}') as platform_source,
             user_prompt, custom_title,
             started_at, started_at_epoch, completed_at, completed_at_epoch, status
      FROM sdk_sessions
      WHERE memory_session_id IN (${s})
      ORDER BY started_at_epoch DESC
    `).all(...e)}getPromptNumberFromUserPrompts(e,s){let t=this.resolvePromptSessionDbId(e,s);return t!==null?this.db.prepare(`
        SELECT COUNT(*) as count FROM user_prompts WHERE session_db_id = ?
      `).get(t).count:this.db.prepare(`
      SELECT COUNT(*) as count FROM user_prompts WHERE content_session_id = ?
    `).get(e).count}createSDKSession(e,s,t,r,o){let i=new Date,a=i.getTime(),_=o?L(o):T,d=Q(t),u=this.db.prepare(`
      SELECT id, platform_source
      FROM sdk_sessions
      WHERE COALESCE(NULLIF(platform_source, ''), ?) = ?
        AND content_session_id = ?
    `).get(T,_,e);if(u)return s&&this.db.prepare(`
          UPDATE sdk_sessions SET project = ?
          WHERE id = ? AND (project IS NULL OR project = '')
        `).run(s,u.id),r&&this.db.prepare(`
          UPDATE sdk_sessions SET custom_title = ?
          WHERE id = ? AND custom_title IS NULL
        `).run(r,u.id),u.id;let p=this.db.prepare(`
      INSERT INTO sdk_sessions
      (content_session_id, memory_session_id, project, platform_source, user_prompt, custom_title, started_at, started_at_epoch, status)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'active')
    `).run(e,s,_,d,r||null,i.toISOString(),a);return Number(p.lastInsertRowid)}saveUserPrompt(e,s,t,r){let o=new Date,i=o.getTime(),a=Q(t),_=this.resolvePromptSessionDbId(e,r);return this.db.prepare(`
      INSERT INTO user_prompts
      (session_db_id, content_session_id, prompt_number, prompt_text, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(_,e,s,a,o.toISOString(),i).lastInsertRowid}getUserPrompt(e,s,t){let r=this.resolvePromptSessionDbId(e,t);return r!==null?this.db.prepare(`
        SELECT prompt_text
        FROM user_prompts
        WHERE session_db_id = ? AND prompt_number = ?
        LIMIT 1
      `).get(r,s)?.prompt_text??null:this.db.prepare(`
      SELECT prompt_text
      FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
      LIMIT 1
    `).get(e,s)?.prompt_text??null}storeObservation(e,s,t,r,o=0,i,a){let _=this.storeObservations(e,s,[t],null,r,o,i,a);return{id:_.observationIds[0],createdAtEpoch:_.createdAtEpoch}}storeSummary(e,s,t,r,o=0,i){let a=i??Date.now(),_=new Date(a).toISOString(),u=this.db.prepare(`
      INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed,
       next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,s,t.request,t.investigated,t.learned,t.completed,t.next_steps,t.notes,r||null,o,_,a);return{id:Number(u.lastInsertRowid),createdAtEpoch:a}}storeObservations(e,s,t,r,o,i=0,a,_){let d=a??Date.now(),u=new Date(d).toISOString();return this.db.transaction(()=>{let l=[],I=[],g=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, agent_type, agent_id, content_hash, created_at, created_at_epoch,
         generated_by_model, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(memory_session_id, content_hash) DO NOTHING
        RETURNING id
      `),A=this.db.prepare("SELECT id FROM observations WHERE memory_session_id = ? AND content_hash = ?");for(let N of t){let C=Pe(e,N.title,N.narrative),v=g.get(e,s,N.type,N.title,N.subtitle,JSON.stringify(N.facts),N.narrative,JSON.stringify(N.concepts),JSON.stringify(N.files_read),JSON.stringify(N.files_modified),o||null,i,N.agent_type??null,N.agent_id??null,C,u,d,_||null,N.metadata??null);if(v){l.push(v.id),I.push(v.id);continue}let S=A.get(e,C);if(!S)throw new Error(`storeObservations: ON CONFLICT without existing row for content_hash=${C}`);l.push(S.id)}let f=null;if(r){let C=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,s,r.request,r.investigated,r.learned,r.completed,r.next_steps,r.notes,o||null,i,u,d);f=Number(C.lastInsertRowid)}return{observationIds:l,insertedIds:I,summaryId:f,createdAtEpoch:d}})()}getSessionSummariesByIds(e,s={}){if(e.length===0)return[];let{orderBy:t="date_desc",limit:r,project:o,platformSource:i}=s,a=t==="relevance",_=a?"":`ORDER BY ss.created_at_epoch ${t==="date_asc"?"ASC":"DESC"}`,d=r&&!a?`LIMIT ${r}`:"",u=e.map(()=>"?").join(","),p=[...e],l=[];o&&(l.push("ss.project = ?"),p.push(o)),i&&(l.push(`COALESCE(NULLIF(s.platform_source, ''), '${T}') = ?`),p.push(L(i)));let I=l.length>0?`AND ${l.join(" AND ")}`:"",A=this.db.prepare(`
      SELECT ss.*
      FROM session_summaries ss
      LEFT JOIN sdk_sessions s ON s.memory_session_id = ss.memory_session_id
      WHERE ss.id IN (${u}) ${I}
      ${_}
      ${d}
    `).all(...p);if(!a)return A;let f=new Map(A.map(C=>[C.id,C])),N=e.map(C=>f.get(C)).filter(C=>!!C);return r?N.slice(0,r):N}getUserPromptsByIds(e,s={}){if(e.length===0)return[];let{orderBy:t="date_desc",limit:r,project:o,platformSource:i}=s,a=t==="relevance",_=a?"":`ORDER BY up.created_at_epoch ${t==="date_asc"?"ASC":"DESC"}`,d=r?`LIMIT ${r}`:"",u=e.map(()=>"?").join(","),p=[...e],l=[];o&&(l.push("s.project = ?"),p.push(o)),i&&(l.push(`COALESCE(NULLIF(s.platform_source, ''), '${T}') = ?`),p.push(L(i)));let I=l.length>0?`AND ${l.join(" AND ")}`:"",A=this.db.prepare(`
      SELECT
        up.*,
        s.project,
        s.memory_session_id,
        COALESCE(NULLIF(s.platform_source, ''), '${T}') as platform_source
      FROM user_prompts up
      JOIN sdk_sessions s ON up.session_db_id = s.id
      WHERE up.id IN (${u}) ${I}
      ${_}
      ${d}
    `).all(...p);if(!a)return A;let f=new Map(A.map(N=>[N.id,N]));return e.map(N=>f.get(N)).filter(N=>!!N)}getTimelineAroundTimestamp(e,s=10,t=10,r,o){return this.getTimelineAroundObservation(null,e,s,t,r,o)}getTimelineAroundObservation(e,s,t=10,r=10,o,i){let a=i?L(i):void 0,_=(S,y)=>{let c=[],h=[];return o&&(c.push(`${S}.project = ?`),h.push(o)),a&&(c.push(`COALESCE(NULLIF(${y}.platform_source, ''), '${T}') = ?`),h.push(a)),{clause:c.length>0?`AND ${c.join(" AND ")}`:"",params:h}},d=_("o","src"),u=_("ss","src"),p=_("s","s"),l,I;if(e!==null){let S=`
        SELECT o.id, o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.id <= ? ${d.clause}
        ORDER BY o.id DESC
        LIMIT ?
      `,y=`
        SELECT o.id, o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.id >= ? ${d.clause}
        ORDER BY o.id ASC
        LIMIT ?
      `;try{let c=this.db.prepare(S).all(e,...d.params,t+1),h=this.db.prepare(y).all(e,...d.params,r+1);if(c.length===0&&h.length===0)return{observations:[],sessions:[],prompts:[]};l=c.length>0?c[c.length-1].created_at_epoch:s,I=h.length>0?h[h.length-1].created_at_epoch:s}catch(c){return c instanceof Error?E.error("DB","Error getting boundary observations",{project:o},c):E.error("DB","Error getting boundary observations with non-Error",{},new Error(String(c))),{observations:[],sessions:[],prompts:[]}}}else{let S=`
        SELECT o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.created_at_epoch <= ? ${d.clause}
        ORDER BY o.created_at_epoch DESC
        LIMIT ?
      `,y=`
        SELECT o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.created_at_epoch >= ? ${d.clause}
        ORDER BY o.created_at_epoch ASC
        LIMIT ?
      `;try{let c=this.db.prepare(S).all(s,...d.params,t),h=this.db.prepare(y).all(s,...d.params,r+1);if(c.length===0&&h.length===0)return{observations:[],sessions:[],prompts:[]};l=c.length>0?c[c.length-1].created_at_epoch:s,I=h.length>0?h[h.length-1].created_at_epoch:s}catch(c){return c instanceof Error?E.error("DB","Error getting boundary timestamps",{project:o},c):E.error("DB","Error getting boundary timestamps with non-Error",{},new Error(String(c))),{observations:[],sessions:[],prompts:[]}}}let g=`
      SELECT o.*
      FROM observations o
      LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
      WHERE o.created_at_epoch >= ? AND o.created_at_epoch <= ? ${d.clause}
      ORDER BY o.created_at_epoch ASC
    `,A=`
      SELECT ss.*
      FROM session_summaries ss
      LEFT JOIN sdk_sessions src ON src.memory_session_id = ss.memory_session_id
      WHERE ss.created_at_epoch >= ? AND ss.created_at_epoch <= ? ${u.clause}
      ORDER BY ss.created_at_epoch ASC
    `,f=`
      SELECT up.*, s.project, s.memory_session_id, COALESCE(NULLIF(s.platform_source, ''), '${T}') as platform_source
      FROM user_prompts up
      JOIN sdk_sessions s ON up.session_db_id = s.id
      WHERE up.created_at_epoch >= ? AND up.created_at_epoch <= ? ${p.clause}
      ORDER BY up.created_at_epoch ASC
    `,N=this.db.prepare(g).all(l,I,...d.params),C=this.db.prepare(A).all(l,I,...u.params),v=this.db.prepare(f).all(l,I,...p.params);return{observations:N,sessions:C.map(S=>({id:S.id,memory_session_id:S.memory_session_id,project:S.project,request:S.request,completed:S.completed,next_steps:S.next_steps,created_at:S.created_at,created_at_epoch:S.created_at_epoch})),prompts:v.map(S=>({id:S.id,content_session_id:S.content_session_id,prompt_number:S.prompt_number,prompt_text:S.prompt_text,project:S.project,platform_source:S.platform_source,created_at:S.created_at,created_at_epoch:S.created_at_epoch}))}}getOrCreateManualSession(e){let s=`manual-${e}`,t=`manual-content-${e}`;if(this.db.prepare("SELECT memory_session_id FROM sdk_sessions WHERE memory_session_id = ?").get(s))return s;let o=new Date;return this.db.prepare(`
      INSERT INTO sdk_sessions (memory_session_id, content_session_id, project, platform_source, started_at, started_at_epoch, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(s,t,e,T,o.toISOString(),o.getTime()),E.info("SESSION","Created manual session",{memorySessionId:s,project:e}),s}close(){this.db.close()}importSdkSession(e){let s=L(e.platform_source),t=this.db.prepare(`SELECT id FROM sdk_sessions
       WHERE platform_source = ? AND content_session_id = ?`).get(s,e.content_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO sdk_sessions (
        content_session_id, memory_session_id, project, platform_source, user_prompt,
        started_at, started_at_epoch, completed_at, completed_at_epoch, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.memory_session_id,e.project,s,e.user_prompt,e.started_at,e.started_at_epoch,e.completed_at,e.completed_at_epoch,e.status).lastInsertRowid}}importSessionSummary(e){let s=this.db.prepare("SELECT id FROM session_summaries WHERE memory_session_id = ?").get(e.memory_session_id);return s?{imported:!1,id:s.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO session_summaries (
        memory_session_id, project, request, investigated, learned,
        completed, next_steps, files_read, files_edited, notes,
        prompt_number, discovery_tokens, created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.request,e.investigated,e.learned,e.completed,e.next_steps,e.files_read,e.files_edited,e.notes,e.prompt_number,e.discovery_tokens||0,e.created_at,e.created_at_epoch).lastInsertRowid}}importObservation(e){let s=this.db.prepare(`
      SELECT id FROM observations
      WHERE memory_session_id = ? AND title = ? AND created_at_epoch = ?
    `).get(e.memory_session_id,e.title,e.created_at_epoch);return s?{imported:!1,id:s.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO observations (
        memory_session_id, project, text, type, title, subtitle,
        facts, narrative, concepts, files_read, files_modified,
        prompt_number, discovery_tokens, agent_type, agent_id,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.text,e.type,e.title,e.subtitle,e.facts,e.narrative,e.concepts,e.files_read,e.files_modified,e.prompt_number,e.discovery_tokens||0,e.agent_type??null,e.agent_id??null,e.created_at,e.created_at_epoch).lastInsertRowid}}rebuildObservationsFTSIndex(){this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run("INSERT INTO observations_fts(observations_fts) VALUES('rebuild')")}importUserPrompt(e){let s=null,t=e.platform_source?L(e.platform_source):void 0;if(typeof e.session_db_id=="number"){let a=this.db.prepare(`
        SELECT id, content_session_id, COALESCE(NULLIF(platform_source, ''), '${T}') as platform_source
        FROM sdk_sessions
        WHERE id = ?
        LIMIT 1
      `).get(e.session_db_id);a&&a.content_session_id===e.content_session_id&&(!t||L(a.platform_source)===t)&&(s=a.id)}s===null&&(s=this.resolvePromptSessionDbId(e.content_session_id,void 0,t));let r=this.db.prepare(`
      SELECT id FROM user_prompts
      WHERE ${s!==null?"session_db_id = ?":"content_session_id = ?"} AND prompt_number = ?
    `).get(s??e.content_session_id,e.prompt_number);return r?{imported:!1,id:r.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO user_prompts (
        session_db_id, content_session_id, prompt_number, prompt_text,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(s,e.content_session_id,e.prompt_number,e.prompt_text,e.created_at,e.created_at_epoch).lastInsertRowid}}};var $=require("fs"),se=require("path");var D=class n{static instance=null;activeMode=null;modesDir;constructor(){let e=Ue(),s=[...process.env.CLAUDE_MEM_MODES_DIR?[process.env.CLAUDE_MEM_MODES_DIR]:[],(0,se.join)(e,"modes"),(0,se.join)(e,"..","plugin","modes")],t=s.find(r=>(0,$.existsSync)(r));this.modesDir=t||s[0]}static getInstance(){return n.instance||(n.instance=new n),n.instance}parseInheritance(e){let s=e.split("--");if(s.length===1)return{hasParent:!1,parentId:"",overrideId:""};if(s.length>2)throw new Error(`Invalid mode inheritance: ${e}. Only one level of inheritance supported (parent--override)`);return{hasParent:!0,parentId:s[0],overrideId:e}}isPlainObject(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}deepMerge(e,s){let t={...e};for(let r in s){let o=s[r],i=e[r];this.isPlainObject(o)&&this.isPlainObject(i)?t[r]=this.deepMerge(i,o):t[r]=o}return t}loadModeFile(e){let s=(0,se.join)(this.modesDir,`${e}.json`);if(!(0,$.existsSync)(s))throw new Error(`Mode file not found: ${s}`);let t=(0,$.readFileSync)(s,"utf-8");return JSON.parse(t)}loadMode(e){let s=this.parseInheritance(e);if(!s.hasParent)try{let _=this.loadModeFile(e);return this.activeMode=_,E.debug("SYSTEM",`Loaded mode: ${_.name} (${e})`,void 0,{types:_.observation_types.map(d=>d.id),concepts:_.observation_concepts.map(d=>d.id)}),_}catch(_){if(_ instanceof Error?E.warn("WORKER",`Mode file not found: ${e}, falling back to 'code'`,{message:_.message}):E.warn("WORKER",`Mode file not found: ${e}, falling back to 'code'`,{error:String(_)}),e==="code")throw new Error("Critical: code.json mode file missing");return this.loadMode("code")}let{parentId:t,overrideId:r}=s,o;try{o=this.loadMode(t)}catch(_){_ instanceof Error?E.warn("WORKER",`Parent mode '${t}' not found for ${e}, falling back to 'code'`,{message:_.message}):E.warn("WORKER",`Parent mode '${t}' not found for ${e}, falling back to 'code'`,{error:String(_)}),o=this.loadMode("code")}let i;try{i=this.loadModeFile(r),E.debug("SYSTEM",`Loaded override file: ${r} for parent ${t}`)}catch(_){return _ instanceof Error?E.warn("WORKER",`Override file '${r}' not found, using parent mode '${t}' only`,{message:_.message}):E.warn("WORKER",`Override file '${r}' not found, using parent mode '${t}' only`,{error:String(_)}),this.activeMode=o,o}if(!i)return E.warn("SYSTEM",`Invalid override file: ${r}, using parent mode '${t}' only`),this.activeMode=o,o;let a=this.deepMerge(o,i);return this.activeMode=a,E.debug("SYSTEM",`Loaded mode with inheritance: ${a.name} (${e} = ${t} + ${r})`,void 0,{parent:t,override:r,types:a.observation_types.map(_=>_.id),concepts:a.observation_concepts.map(_=>_.id)}),a}getActiveMode(){if(!this.activeMode)throw new Error("No mode loaded. Call loadMode() first.");return this.activeMode}getObservationTypes(){return this.getActiveMode().observation_types}getTypeIcon(e){return this.getObservationTypes().find(t=>t.id===e)?.emoji||"\u{1F4DD}"}getWorkEmoji(e){return this.getObservationTypes().find(t=>t.id===e)?.work_emoji||"\u{1F4DD}"}};function ss(){let n=F.settings(),e=k.loadFromFile(n),s=D.getInstance().getActiveMode(),t=new Set(s.observation_types.map(o=>o.id)),r=new Set(s.observation_concepts.map(o=>o.id));return{totalObservationCount:parseInt(e.CLAUDE_MEM_CONTEXT_OBSERVATIONS,10),fullObservationCount:parseInt(e.CLAUDE_MEM_CONTEXT_FULL_COUNT,10),sessionCount:parseInt(e.CLAUDE_MEM_CONTEXT_SESSION_COUNT,10),showReadTokens:e.CLAUDE_MEM_CONTEXT_SHOW_READ_TOKENS==="true",showWorkTokens:e.CLAUDE_MEM_CONTEXT_SHOW_WORK_TOKENS==="true",showSavingsAmount:e.CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT==="true",showSavingsPercent:e.CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_PERCENT==="true",observationTypes:t,observationConcepts:r,fullObservationField:e.CLAUDE_MEM_CONTEXT_FULL_FIELD,showLastSummary:e.CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY==="true",showLastMessage:e.CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE==="true"}}var m={reset:"\x1B[0m",bright:"\x1B[1m",dim:"\x1B[2m",cyan:"\x1B[36m",green:"\x1B[32m",yellow:"\x1B[33m",blue:"\x1B[34m",magenta:"\x1B[35m",gray:"\x1B[90m",red:"\x1B[31m"},ts=4,ns=1;function rs(n){let e=(n.title?.length||0)+(n.subtitle?.length||0)+(n.narrative?.length||0)+JSON.stringify(n.facts||[]).length;return Math.ceil(e/ts)}function Re(n){let e=n.length,s=n.reduce((i,a)=>i+rs(a),0),t=n.reduce((i,a)=>i+(a.discovery_tokens||0),0),r=t-s,o=t>0?Math.round(r/t*100):0;return{totalObservations:e,totalReadTokens:s,totalDiscoveryTokens:t,savings:r,savingsPercent:o}}function Lt(n){return D.getInstance().getWorkEmoji(n)}function j(n,e){let s=rs(n),t=n.discovery_tokens||0,r=Lt(n.type),o=t>0?`${r} ${t.toLocaleString()}`:"-";return{readTokens:s,discoveryTokens:t,discoveryDisplay:o,workEmoji:r}}function te(n){return n.showReadTokens||n.showWorkTokens||n.showSavingsAmount||n.showSavingsPercent}var os=Y(require("path"),1),ne=require("fs");function is(n,e,s,t){let r=Array.from(s.observationTypes),o=r.map(()=>"?").join(","),i=Array.from(s.observationConcepts),a=i.map(()=>"?").join(","),_=e.map(()=>"?").join(",");return n.db.prepare(`
    SELECT
      o.id,
      o.memory_session_id,
      COALESCE(s.platform_source, 'claude') as platform_source,
      o.type,
      o.title,
      o.subtitle,
      o.narrative,
      o.facts,
      o.concepts,
      o.files_read,
      o.files_modified,
      o.discovery_tokens,
      o.created_at,
      o.created_at_epoch,
      o.project
    FROM observations o
    LEFT JOIN sdk_sessions s ON o.memory_session_id = s.memory_session_id
    WHERE (o.project IN (${_})
           OR o.merged_into_project IN (${_}))
      AND (? IS NULL OR s.platform_source = ?)
      AND type IN (${o})
      AND EXISTS (
        SELECT 1 FROM json_each(o.concepts)
        WHERE value IN (${a})
      )
    ORDER BY o.created_at_epoch DESC
    LIMIT ?
  `).all(...e,...e,t??null,t??null,...r,...i,s.totalObservationCount)}function as(n,e,s,t){let r=e.map(()=>"?").join(",");return n.db.prepare(`
    SELECT
      ss.id,
      ss.memory_session_id,
      COALESCE(s.platform_source, 'claude') as platform_source,
      ss.request,
      ss.investigated,
      ss.learned,
      ss.completed,
      ss.next_steps,
      ss.created_at,
      ss.created_at_epoch,
      ss.project
    FROM session_summaries ss
    LEFT JOIN sdk_sessions s ON ss.memory_session_id = s.memory_session_id
    WHERE (ss.project IN (${r})
           OR ss.merged_into_project IN (${r}))
      AND (? IS NULL OR s.platform_source = ?)
    ORDER BY ss.created_at_epoch DESC
    LIMIT ?
  `).all(...e,...e,t??null,t??null,s.sessionCount+ns)}function Ct(n){return n.replace(/[/.]/g,"-")}function ht(n){if(!n.includes('"type":"assistant"'))return null;let e=JSON.parse(n);if(e.type==="assistant"&&e.message?.content&&Array.isArray(e.message.content)){let s="";for(let t of e.message.content)t.type==="text"&&(s+=t.text);if(s=s.replace(qe,"").trim(),s)return s}return null}function ft(n){for(let e=n.length-1;e>=0;e--)try{let s=ht(n[e]);if(s)return s}catch(s){s instanceof Error?E.debug("WORKER","Skipping malformed transcript line",{lineIndex:e},s):E.debug("WORKER","Skipping malformed transcript line",{lineIndex:e,error:String(s)});continue}return""}function Dt(n){try{if(!(0,ne.existsSync)(n))return{assistantMessage:""};let e=(0,ne.readFileSync)(n,"utf-8").trim();if(!e)return{assistantMessage:""};let s=e.split(`
`).filter(r=>r.trim());return{assistantMessage:ft(s)}}catch(e){return e instanceof Error?E.failure("WORKER","Failed to extract prior messages from transcript",{transcriptPath:n},e):E.warn("WORKER","Failed to extract prior messages from transcript",{transcriptPath:n,error:String(e)}),{assistantMessage:""}}}function Es(n,e,s,t){if(!e.showLastMessage||n.length===0)return{assistantMessage:""};let r=n.find(_=>_.memory_session_id!==s);if(!r)return{assistantMessage:""};let o=r.memory_session_id,i=Ct(t),a=os.default.join(_e,"projects",i,`${o}.jsonl`);return Dt(a)}function _s(n,e){let s=e[0]?.id;return n.map((t,r)=>{let o=r===0?null:e[r+1];return{...t,displayEpoch:o?o.created_at_epoch:t.created_at_epoch,displayTime:o?o.created_at:t.created_at,shouldShowLink:t.id!==s}})}function ds(n,e){let s=[...n.map(t=>({type:"observation",data:t})),...e.map(t=>({type:"summary",data:t}))];return s.sort((t,r)=>{let o=t.type==="observation"?t.data.created_at_epoch:t.data.displayEpoch,i=r.type==="observation"?r.data.created_at_epoch:r.data.displayEpoch;return o-i}),s}function us(n,e){return new Set(n.slice(0,e).map(s=>s.id))}function ms(){let n=new Date,e=n.toLocaleDateString("en-CA"),s=n.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),t=n.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${s} ${t}`}function ps(n){return[`# [${n}] recent context, ${ms()}`,""]}function Ts(){return[`Legend: \u{1F3AF}session ${D.getInstance().getActiveMode().observation_types.map(s=>`${s.emoji}${s.id}`).join(" ")}`,"Format: ID TIME TYPE TITLE","Fetch details: get_observations([IDs]) | Search: mem-search skill",""]}function cs(n,e){let s=[],t=[`${n.totalObservations} obs (${n.totalReadTokens.toLocaleString()}t read)`,`${n.totalDiscoveryTokens.toLocaleString()}t work`];return n.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)&&(e.showSavingsPercent?t.push(`${n.savingsPercent}% savings`):e.showSavingsAmount&&t.push(`${n.savings.toLocaleString()}t saved`)),s.push(`Stats: ${t.join(" | ")}`),s.push(""),s}function ls(n){return[`### ${n}`]}function Ns(n){return n.toLowerCase().replace(" am","a").replace(" pm","p")}function Is(n,e,s){let t=n.title||"Untitled",r=D.getInstance().getTypeIcon(n.type),o=e?Ns(e):'"';return`${n.id} ${o} ${r} ${t}`}function Os(n,e,s,t){let r=[],o=n.title||"Untitled",i=D.getInstance().getTypeIcon(n.type),a=e?Ns(e):'"',{readTokens:_,discoveryDisplay:d}=j(n,t);r.push(`**${n.id}** ${a} ${i} **${o}**`),s&&r.push(s);let u=[];return t.showReadTokens&&u.push(`~${_}t`),t.showWorkTokens&&u.push(d),u.length>0&&r.push(u.join(" ")),r.push(""),r}function Ss(n,e){return[`S${n.id} ${n.request||"Session started"} (${e})`]}function W(n,e){return e?[`**${n}**: ${e}`,""]:[]}function Rs(n){return n.assistantMessage?["","---","","**Previously**","",`A: ${n.assistantMessage}`,""]:[]}function gs(n,e){return["",`Access ${Math.round(n/1e3)}k tokens of past work via get_observations([IDs]) or mem-search skill.`]}function As(n){return`# [${n}] recent context, ${ms()}

No previous sessions found.`}function bs(){let n=new Date,e=n.toLocaleDateString("en-CA"),s=n.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),t=n.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${s} ${t}`}function Ls(n){return["",`${m.bright}${m.cyan}[${n}] recent context, ${bs()}${m.reset}`,`${m.gray}${"\u2500".repeat(60)}${m.reset}`,""]}function Cs(){let e=D.getInstance().getActiveMode().observation_types.map(s=>`${s.emoji} ${s.id}`).join(" | ");return[`${m.dim}Legend: session-request | ${e}${m.reset}`,""]}function hs(){return[`${m.bright}Column Key${m.reset}`,`${m.dim}  Read: Tokens to read this observation (cost to learn it now)${m.reset}`,`${m.dim}  Work: Tokens spent on work that produced this record ( research, building, deciding)${m.reset}`,""]}function fs(){return[`${m.dim}Context Index: This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.${m.reset}`,"",`${m.dim}When you need implementation details, rationale, or debugging context:${m.reset}`,`${m.dim}  - Fetch by ID: get_observations([IDs]) for observations visible in this index${m.reset}`,`${m.dim}  - Search history: Use the mem-search skill for past decisions, bugs, and deeper research${m.reset}`,`${m.dim}  - Trust this index over re-reading code for past decisions and learnings${m.reset}`,""]}function Ds(n,e){let s=[];if(s.push(`${m.bright}${m.cyan}Context Economics${m.reset}`),s.push(`${m.dim}  Loading: ${n.totalObservations} observations (${n.totalReadTokens.toLocaleString()} tokens to read)${m.reset}`),s.push(`${m.dim}  Work investment: ${n.totalDiscoveryTokens.toLocaleString()} tokens spent on research, building, and decisions${m.reset}`),n.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)){let t="  Your savings: ";e.showSavingsAmount&&e.showSavingsPercent?t+=`${n.savings.toLocaleString()} tokens (${n.savingsPercent}% reduction from reuse)`:e.showSavingsAmount?t+=`${n.savings.toLocaleString()} tokens`:t+=`${n.savingsPercent}% reduction from reuse`,s.push(`${m.green}${t}${m.reset}`)}return s.push(""),s}function vs(n){return[`${m.bright}${m.cyan}${n}${m.reset}`,""]}function Ms(n){return[`${m.dim}${n}${m.reset}`]}function Us(n,e,s,t){let r=n.title||"Untitled",o=D.getInstance().getTypeIcon(n.type),{readTokens:i,discoveryTokens:a,workEmoji:_}=j(n,t),d=s?`${m.dim}${e}${m.reset}`:" ".repeat(e.length),u=t.showReadTokens&&i>0?`${m.dim}(~${i}t)${m.reset}`:"",p=t.showWorkTokens&&a>0?`${m.dim}(${_} ${a.toLocaleString()}t)${m.reset}`:"";return`  ${m.dim}#${n.id}${m.reset}  ${d}  ${o}  ${r} ${u} ${p}`}function ys(n,e,s,t,r){let o=[],i=n.title||"Untitled",a=D.getInstance().getTypeIcon(n.type),{readTokens:_,discoveryTokens:d,workEmoji:u}=j(n,r),p=s?`${m.dim}${e}${m.reset}`:" ".repeat(e.length),l=r.showReadTokens&&_>0?`${m.dim}(~${_}t)${m.reset}`:"",I=r.showWorkTokens&&d>0?`${m.dim}(${u} ${d.toLocaleString()}t)${m.reset}`:"";return o.push(`  ${m.dim}#${n.id}${m.reset}  ${p}  ${a}  ${m.bright}${i}${m.reset}`),t&&o.push(`    ${m.dim}${t}${m.reset}`),(l||I)&&o.push(`    ${l} ${I}`),o.push(""),o}function Fs(n,e){let s=`${n.request||"Session started"} (${e})`;return[`${m.yellow}#S${n.id}${m.reset} ${s}`,""]}function V(n,e,s){return e?[`${s}${n}:${m.reset} ${e}`,""]:[]}function Xs(n){return n.assistantMessage?["","---","",`${m.bright}${m.magenta}Previously${m.reset}`,"",`${m.dim}A: ${n.assistantMessage}${m.reset}`,""]:[]}function xs(n,e){let s=Math.round(n/1e3);return["",`${m.dim}Access ${s}k tokens of past research & decisions for just ${e.toLocaleString()}t. Use the claude-mem skill to access memories by ID.${m.reset}`]}function ws(n){return`
${m.bright}${m.cyan}[${n}] recent context, ${bs()}${m.reset}
${m.gray}${"\u2500".repeat(60)}${m.reset}

${m.dim}No previous sessions found for this project yet.${m.reset}
`}function Ps(n,e,s,t){let r=[];return t?r.push(...Ls(n)):r.push(...ps(n)),t?r.push(...Cs()):r.push(...Ts()),t&&(r.push(...hs()),r.push(...fs())),te(s)&&(t?r.push(...Ds(e,s)):r.push(...cs(e,s))),r}var ge=Y(require("path"),1);function ie(n){if(!n)return[];try{let e=JSON.parse(n);return Array.isArray(e)?e:[]}catch(e){return E.debug("PARSER","Failed to parse JSON array, using empty fallback",{preview:n?.substring(0,50)},e instanceof Error?e:new Error(String(e))),[]}}function Ae(n){return new Date(n).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:!0})}function be(n){return new Date(n).toLocaleString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}function Gs(n){return new Date(n).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"})}function ks(n,e){return ge.default.isAbsolute(n)?ge.default.relative(e,n):n}function Bs(n,e,s){let t=ie(n);if(t.length>0)return ks(t[0],e);if(s){let r=ie(s);if(r.length>0)return ks(r[0],e)}return"General"}function vt(n){let e=new Map;for(let t of n){let r=t.type==="observation"?t.data.created_at:t.data.displayTime,o=Gs(r);e.has(o)||e.set(o,[]),e.get(o).push(t)}let s=Array.from(e.entries()).sort((t,r)=>{let o=new Date(t[0]).getTime(),i=new Date(r[0]).getTime();return o-i});return new Map(s)}function Hs(n,e){return e.fullObservationField==="narrative"?n.narrative:n.facts?ie(n.facts).join(`
`):null}function Mt(n,e,s,t){let r=[];r.push(...ls(n));let o="";for(let i of e)if(i.type==="summary"){let a=i.data,_=Ae(a.displayTime);r.push(...Ss(a,_))}else{let a=i.data,_=be(a.created_at),u=_!==o?_:"";if(o=_,s.has(a.id)){let l=Hs(a,t);r.push(...Os(a,u,l,t))}else r.push(Is(a,u,t))}return r}function Ut(n,e,s,t,r){let o=[];o.push(...vs(n));let i=null,a="";for(let _ of e)if(_.type==="summary"){i=null,a="";let d=_.data,u=Ae(d.displayTime);o.push(...Fs(d,u))}else{let d=_.data,u=Bs(d.files_modified,r,d.files_read),p=be(d.created_at),l=p!==a;a=p;let I=s.has(d.id);if(u!==i&&(o.push(...Ms(u)),i=u),I){let g=Hs(d,t);o.push(...ys(d,p,l,g,t))}else o.push(Us(d,p,l,t))}return o.push(""),o}function yt(n,e,s,t,r,o){return o?Ut(n,e,s,t,r):Mt(n,e,s,t)}function $s(n,e,s,t,r){let o=[],i=vt(n);for(let[a,_]of i)o.push(...yt(a,_,e,s,t,r));return o}function js(n,e,s){return!(!n.showLastSummary||!e||!!!(e.investigated||e.learned||e.completed||e.next_steps)||s&&e.created_at_epoch<=s.created_at_epoch)}function Ws(n,e){let s=[];return e?(s.push(...V("Investigated",n.investigated,m.blue)),s.push(...V("Learned",n.learned,m.yellow)),s.push(...V("Completed",n.completed,m.green)),s.push(...V("Next Steps",n.next_steps,m.magenta))):(s.push(...W("Investigated",n.investigated)),s.push(...W("Learned",n.learned)),s.push(...W("Completed",n.completed)),s.push(...W("Next Steps",n.next_steps))),s}function Vs(n,e){return e?Xs(n):Rs(n)}function Ks(n,e,s){return!te(e)||n.totalDiscoveryTokens<=0||n.savings<=0?[]:s?xs(n.totalDiscoveryTokens,n.totalReadTokens):gs(n.totalDiscoveryTokens,n.totalReadTokens)}var Ft=Ys.default.join((0,qs.homedir)(),".claude","plugins","marketplaces","thedotmack","plugin",".install-version");function Xt(){try{return new Z}catch(n){if(n instanceof Error&&n.code==="ERR_DLOPEN_FAILED"){try{(0,Js.unlinkSync)(Ft)}catch(e){e instanceof Error?E.debug("WORKER","Marker file cleanup failed (may not exist)",{},e):E.debug("WORKER","Marker file cleanup failed (may not exist)",{error:String(e)})}return E.error("WORKER","Native module rebuild needed - restart Claude Code to auto-fix"),null}throw n}}function xt(n,e){return e?ws(n):As(n)}function wt(n,e,s,t,r,o,i){let a=[],_=Re(e);a.push(...Ps(n,_,t,i));let d=s.slice(0,t.sessionCount),u=_s(d,s),p=ds(e,u),l=us(e,t.fullObservationCount);a.push(...$s(p,l,t,r,i));let I=s[0],g=e[0];js(t,I,g)&&a.push(...Ws(I,i));let A=Es(e,t,o,r);return a.push(...Vs(A,i)),a.push(...Ks(_,t,i)),a.join(`
`).trimEnd()}var Pt=new Set(["bugfix","discovery","decision","refactor"]);function kt(n,e,s){let t=Re(n),r={bugfix:0,discovery:0,decision:0,refactor:0,other:0},o=new Set,i=Number.POSITIVE_INFINITY;for(let _ of n){let d=Pt.has(_.type)?_.type:"other";r[d]++,_.memory_session_id&&o.add(_.memory_session_id),_.created_at_epoch&&_.created_at_epoch<i&&(i=_.created_at_epoch)}let a=Number.isFinite(i)?Math.max(0,Math.floor((Date.now()-i)/864e5)):0;return{observation_count:n.length,session_count:o.size,timeline_depth_days:a,has_session_summary:e.length>0,obs_type_bugfix:r.bugfix,obs_type_discovery:r.discovery,obs_type_decision:r.decision,obs_type_refactor:r.refactor,obs_type_other:r.other,tokens_injected:t.totalReadTokens,tokens_saved_vs_naive:t.savings,search_strategy:s?"full":"timeline"}}async function Le(n,e=!1){let s=ss(),t=n?.cwd??process.cwd(),r=Te(t),o=n?.projects?.length?n.projects:r.allProjects,i=o[o.length-1]??r.primary;n?.full&&(s.totalObservationCount=999999,s.sessionCount=999999);let a=Xt();if(!a)return{text:"",stats:null};try{let _=n?.platformSource?L(n.platformSource):void 0,d=o.length>1?o:[i],u=is(a,d,s,_),p=as(a,d,s,_);return u.length===0&&p.length===0?{text:xt(i,e),stats:null}:{text:wt(i,u,p,s,t,n?.session_id,e),stats:kt(u,p,!!n?.full)}}finally{a.close()}}async function Qs(n,e=!1){return(await Le(n,e)).text}0&&(module.exports={generateContext,generateContextWithStats});
