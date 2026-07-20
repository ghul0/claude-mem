var __IMPORT_META_URL__ = require("node:url").pathToFileURL(__filename).href;
"use strict";var W=Object.defineProperty;var ge=Object.getOwnPropertyDescriptor;var he=Object.getOwnPropertyNames;var De=Object.prototype.hasOwnProperty;var fe=(i,e)=>{for(var s in e)W(i,s,{get:e[s],enumerable:!0})},Me=(i,e,s,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of he(e))!De.call(i,r)&&r!==s&&W(i,r,{get:()=>e[r],enumerable:!(t=ge(e,r))||t.enumerable});return i};var ve=i=>Me(W({},"__esModule",{value:!0}),i);var Qe={};fe(Qe,{SessionStore:()=>te});module.exports=ve(Qe);var se=require("bun:sqlite"),H=require("fs");var I=require("path"),V=require("os"),X=require("fs"),oe=require("url");var c=require("fs"),ne=require("crypto"),f=require("path");var Ue=null;function ye(i){return(Ue??process.stderr.write.bind(process.stderr))(i)}function U(i){ye(i)}var Xe=process.platform==="win32";function Fe(i){return i.replace(/^\uFEFF/,"")}function y(i){return JSON.parse(Fe(i))}function Ge(i){(0,c.existsSync)(i)||(0,c.mkdirSync)(i,{recursive:!0})}function j(i,e){let s=i;try{if((0,c.lstatSync)(i).isSymbolicLink())try{s=(0,c.realpathSync)(i)}catch(d){let T=d instanceof Error?d:new Error(String(d));U(`claude-mem: realpathSync failed for ${i}, resolving symlink manually: ${T.message}
`);let O=(0,c.readlinkSync)(i);s=(0,f.resolve)((0,f.dirname)(i),O)}}catch(d){let T=d.code;if(T!=="ENOENT"&&T!=="ENOTDIR")throw d}Ge((0,f.dirname)(s));let t=(0,f.dirname)(s),r=(0,f.basename)(s),n=(0,f.join)(t,`.${r}.${process.pid}.${(0,ne.randomBytes)(6).toString("hex")}.tmp`),o=Buffer.from(JSON.stringify(e,null,2)+`
`,"utf-8"),E;try{E=(0,c.statSync)(s).mode&511}catch{}let _;try{_=E!==void 0?(0,c.openSync)(n,"w",E):(0,c.openSync)(n,"w");let d=0;for(;d<o.length;){let T=(0,c.writeSync)(_,o,d,o.length-d);if(T===0)throw new Error(`writeSync stalled at ${d}/${o.length} bytes`);d+=T}if((0,c.fsyncSync)(_),(0,c.closeSync)(_),_=void 0,(0,c.renameSync)(n,s),!Xe){let T;try{T=(0,c.openSync)(t,"r"),(0,c.fsyncSync)(T)}catch(O){let l=O instanceof Error?O:new Error(String(O));U(`claude-mem: directory fsync failed for ${t}: ${l.message}
`)}finally{if(T!==void 0)try{(0,c.closeSync)(T)}catch{}}}}catch(d){if(_!==void 0)try{(0,c.closeSync)(_)}catch{}try{(0,c.unlinkSync)(n)}catch{}throw d}}function Pe(){return typeof __dirname<"u"?__dirname:(0,I.dirname)((0,oe.fileURLToPath)(__IMPORT_META_URL__))}var rs=Pe();function xe(){if(process.env.CLAUDE_MEM_DATA_DIR)return process.env.CLAUDE_MEM_DATA_DIR;let i=(0,I.join)((0,V.homedir)(),".claude-mem"),e=(0,I.join)(i,"settings.json");try{if((0,X.existsSync)(e)){let s=y((0,X.readFileSync)(e,"utf-8")),t=s.env??s;if(t.CLAUDE_MEM_DATA_DIR)return t.CLAUDE_MEM_DATA_DIR}}catch{}return i}var A=xe(),Be=process.env.CLAUDE_CONFIG_DIR||(0,I.join)((0,V.homedir)(),".claude"),ns=(0,I.join)(Be,"plugins","marketplaces","thedotmack"),we=(0,I.join)(A,"logs"),os=(0,I.join)(A,"settings.json"),ie=(0,I.join)(A,"claude-mem.db"),ke=(0,I.join)(A,"observer-sessions"),$=(0,I.basename)(ke);function ae(i){(0,X.mkdirSync)(i,{recursive:!0})}var G={dataDir:()=>A,workerPid:()=>(0,I.join)(A,"worker.pid"),serverPid:()=>(0,I.join)(A,".server-beta.pid"),serverPort:()=>(0,I.join)(A,".server-beta.port"),serverRuntime:()=>(0,I.join)(A,".server-beta.runtime.json"),settings:()=>(0,I.join)(A,"settings.json"),database:()=>(0,I.join)(A,"claude-mem.db"),chroma:()=>(0,I.join)(A,"chroma"),combinedCerts:()=>(0,I.join)(A,"combined_certs.pem"),transcriptsConfig:()=>(0,I.join)(A,"transcript-watch.json"),transcriptsState:()=>(0,I.join)(A,"transcript-watch-state.json"),cloudSyncState:()=>(0,I.join)(A,"cloud-sync-state.json"),corpora:()=>(0,I.join)(A,"corpora"),supervisorRegistry:()=>(0,I.join)(A,"supervisor.json"),envFile:()=>(0,I.join)(A,".env"),logsDir:()=>we};var M=require("fs"),Ee=require("path");var K=(n=>(n[n.DEBUG=0]="DEBUG",n[n.INFO=1]="INFO",n[n.WARN=2]="WARN",n[n.ERROR=3]="ERROR",n[n.SILENT=4]="SILENT",n))(K||{}),Y=null,q=class{level=null;useColor;logFilePath=null;logFileInitialized=!1;constructor(){this.useColor=process.stdout.isTTY??!1}ensureLogFileInitialized(){if(!this.logFileInitialized){this.logFileInitialized=!0;try{let e=G.logsDir();(0,M.existsSync)(e)||(0,M.mkdirSync)(e,{recursive:!0});let s=new Date().toISOString().split("T")[0];this.logFilePath=(0,Ee.join)(e,`claude-mem-${s}.log`)}catch(e){console.error("[LOGGER] Failed to initialize log file:",e instanceof Error?e.message:String(e)),this.logFilePath=null}}}getLevel(){if(this.level===null)try{let e=G.settings();if((0,M.existsSync)(e)){let s=(0,M.readFileSync)(e,"utf-8"),r=(y(s).CLAUDE_MEM_LOG_LEVEL||"INFO").toUpperCase();this.level=K[r]??1}else this.level=1}catch(e){console.error("[LOGGER] Failed to load log level from settings:",e instanceof Error?e.message:String(e)),this.level=1}return this.level}formatData(e){if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return e.toString();if(typeof e=="object"){if(e instanceof Error)return this.getLevel()===0?`${e.message}
${e.stack}`:e.message;if(Array.isArray(e))return`[${e.length} items]`;let s=Object.keys(e);return s.length===0?"{}":s.length<=3?JSON.stringify(e):`{${s.length} keys: ${s.slice(0,3).join(", ")}...}`}return String(e)}formatTool(e,s){if(!s)return e;let t=s;if(typeof s=="string")try{t=JSON.parse(s)}catch{t=s}if(e==="Bash"&&t.command)return`${e}(${t.command})`;if(t.file_path)return`${e}(${t.file_path})`;if(t.notebook_path)return`${e}(${t.notebook_path})`;if(e==="Glob"&&t.pattern)return`${e}(${t.pattern})`;if(e==="Grep"&&t.pattern)return`${e}(${t.pattern})`;if(t.url)return`${e}(${t.url})`;if(t.query)return`${e}(${t.query})`;if(e==="Task"){if(t.subagent_type)return`${e}(${t.subagent_type})`;if(t.description)return`${e}(${t.description})`}return e==="Skill"&&t.skill?`${e}(${t.skill})`:e==="LSP"&&t.operation?`${e}(${t.operation})`:e}formatTimestamp(e){let s=e.getFullYear(),t=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0"),n=String(e.getHours()).padStart(2,"0"),o=String(e.getMinutes()).padStart(2,"0"),E=String(e.getSeconds()).padStart(2,"0"),_=String(e.getMilliseconds()).padStart(3,"0");return`${s}-${t}-${r} ${n}:${o}:${E}.${_}`}log(e,s,t,r,n){if(e<this.getLevel())return;this.ensureLogFileInitialized();let o=this.formatTimestamp(new Date),E=K[e].padEnd(5),_=s.padEnd(6),d="";r?.correlationId?d=`[${r.correlationId}] `:r?.sessionId&&(d=`[session-${r.sessionId}] `);let T="";if(n!=null)if(n instanceof Error)T=this.getLevel()===0?`
${n.message}
${n.stack}`:` ${n.message}`;else if(this.getLevel()===0&&typeof n=="object")try{T=`
`+JSON.stringify(n,null,2)}catch{T=" "+this.formatData(n)}else T=" "+this.formatData(n);let O="";if(r){let{sessionId:R,memorySessionId:L,correlationId:S,...g}=r;Object.keys(g).length>0&&(O=` {${Object.entries(g).map(([b,D])=>`${b}=${D}`).join(", ")}}`)}let l=`[${o}] [${E}] [${_}] ${d}${t}${O}${T}`;if(this.logFilePath)try{(0,M.appendFileSync)(this.logFilePath,l+`
`,"utf8")}catch(R){let L=R instanceof Error?R:new Error(String(R));U(`[LOGGER] Failed to write to log file: ${L.message}
${L.stack??""}
`)}else U(l+`
`)}debug(e,s,t,r){this.log(0,e,s,t,r)}info(e,s,t,r){this.log(1,e,s,t,r)}warn(e,s,t,r){this.log(2,e,s,t,r)}setErrorSink(e){Y=e}error(e,s,t,r){this.log(3,e,s,t,r),this.routeErrorToSink(s,t,r)}routeErrorToSink(e,s,t){try{if(!Y||!(t instanceof Error))return;Y(t)}catch{}}dataIn(e,s,t,r){this.info(e,`\u2192 ${s}`,t,r)}dataOut(e,s,t,r){this.info(e,`\u2190 ${s}`,t,r)}success(e,s,t,r){this.info(e,`\u2713 ${s}`,t,r)}failure(e,s,t,r){this.error(e,`\u2717 ${s}`,t,r)}},a=new q;var _e=require("crypto");function de(i,e,s){return(0,_e.createHash)("sha256").update([i||"",e||"",s||""].join("\0")).digest("hex").slice(0,16)}var Q=["active","weak","stale","superseded","deprecated"];var Te=["active","weak","stale"];var B=require("fs"),z=require("path"),P=require("os");var J={HEALTH_CHECK:3e3,API_REQUEST:3e4,HOOK_READINESS_WAIT:1e4,POST_SPAWN_WAIT:15e3,READINESS_WAIT:3e4,PORT_IN_USE_WAIT:3e3,POWERSHELL_COMMAND:1e4,WINDOWS_MULTIPLIER:1.5};function pe(i){return process.platform==="win32"?Math.round(i*J.WINDOWS_MULTIPLIER):i}var x=class{static DEFAULTS={CLAUDE_MEM_MODEL:"openai-codex/gpt-5.4-mini",CLAUDE_MEM_CONTEXT_OBSERVATIONS:"50",CLAUDE_MEM_WORKER_PORT:String(37700+(process.getuid?.()??77)%100),CLAUDE_MEM_WORKER_HOST:"127.0.0.1",CLAUDE_MEM_API_TIMEOUT_MS:String(pe(J.API_REQUEST)),CLAUDE_MEM_SKIP_TOOLS:"ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion",CLAUDE_MEM_PROVIDER:"pi",CLAUDE_MEM_CLAUDE_AUTH_METHOD:"subscription",CLAUDE_MEM_PI_MODEL:"openai-codex/gpt-5.4-mini",CLAUDE_MEM_PI_THINKING:"off",CLAUDE_MEM_PI_TIMEOUT_MS:"120000",CLAUDE_MEM_PI_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_PI_MAX_TOKENS:"100000",CLAUDE_MEM_GEMINI_API_KEY:"",CLAUDE_MEM_GEMINI_MODEL:"gemini-2.5-flash-lite",CLAUDE_MEM_GEMINI_RATE_LIMITING_ENABLED:"true",CLAUDE_MEM_GEMINI_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_GEMINI_MAX_TOKENS:"100000",CLAUDE_MEM_OPENROUTER_API_KEY:"",CLAUDE_MEM_OPENROUTER_MODEL:"xiaomi/mimo-v2-flash:free",CLAUDE_MEM_OPENROUTER_BASE_URL:"",CLAUDE_MEM_OPENROUTER_SITE_URL:"",CLAUDE_MEM_OPENROUTER_APP_NAME:"claude-mem",CLAUDE_MEM_DATA_DIR:(0,z.join)((0,P.homedir)(),".claude-mem"),CLAUDE_MEM_LOG_LEVEL:"INFO",CLAUDE_MEM_PYTHON_VERSION:"3.13",CLAUDE_CODE_PATH:"",CLAUDE_MEM_MODE:"code",CLAUDE_MEM_CONTEXT_SHOW_READ_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_WORK_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_PERCENT:"true",CLAUDE_MEM_CONTEXT_FULL_COUNT:"0",CLAUDE_MEM_CONTEXT_FULL_FIELD:"narrative",CLAUDE_MEM_CONTEXT_SESSION_COUNT:"10",CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY:"true",CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE:"false",CLAUDE_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT:"true",CLAUDE_MEM_WELCOME_HINT_ENABLED:"true",CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED:"false",CLAUDE_MEM_FOLDER_USE_LOCAL_MD:"false",CLAUDE_MEM_TRANSCRIPTS_ENABLED:"true",CLAUDE_MEM_TRANSCRIPTS_CONFIG_PATH:(0,z.join)((0,P.homedir)(),".claude-mem","transcript-watch.json"),CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION:"false",CLAUDE_MEM_MAX_CONCURRENT_AGENTS:"2",CLAUDE_MEM_HOOK_FAIL_LOUD_THRESHOLD:"3",CLAUDE_MEM_EXCLUDED_PROJECTS:"",CLAUDE_MEM_FOLDER_MD_EXCLUDE:"[]",CLAUDE_MEM_FOLDER_MD_SKELETON_DENYLIST:"[]",CLAUDE_MEM_SEMANTIC_INJECT:"false",CLAUDE_MEM_SEMANTIC_INJECT_LIMIT:"5",CLAUDE_MEM_TIER_ROUTING_ENABLED:"true",CLAUDE_MEM_TIER_SIMPLE_MODEL:"haiku",CLAUDE_MEM_TIER_SUMMARY_MODEL:"",CLAUDE_MEM_TIER_FAST_MODEL:"haiku",CLAUDE_MEM_TIER_SMART_MODEL:"sonnet",CLAUDE_MEM_CHROMA_ENABLED:"true",CLAUDE_MEM_CHROMA_MODE:"local",CLAUDE_MEM_CHROMA_HOST:"127.0.0.1",CLAUDE_MEM_CHROMA_PORT:"8000",CLAUDE_MEM_CHROMA_SSL:"false",CLAUDE_MEM_CHROMA_API_KEY:"",CLAUDE_MEM_CHROMA_TENANT:"default_tenant",CLAUDE_MEM_CHROMA_DATABASE:"default_database",CLAUDE_MEM_CHROMA_PREWARM_TIMEOUT_MS:"120000",CLAUDE_MEM_CLOUD_SYNC_TOKEN:"",CLAUDE_MEM_CLOUD_SYNC_USER_ID:"",CLAUDE_MEM_CLOUD_SYNC_URL:"https://cmem.ai/api/pro/sync",CLAUDE_MEM_CLOUD_SYNC_DEVICE_ID:"",CLAUDE_MEM_CLOUD_SYNC_DEVICE_NAME:(0,P.hostname)(),CLAUDE_MEM_TELEGRAM_ENABLED:"true",CLAUDE_MEM_TELEGRAM_BOT_TOKEN:"",CLAUDE_MEM_TELEGRAM_CHAT_ID:"",CLAUDE_MEM_TELEGRAM_TRIGGER_TYPES:"security_alert",CLAUDE_MEM_TELEGRAM_TRIGGER_CONCEPTS:"",CLAUDE_MEM_QUEUE_ENGINE:"sqlite",CLAUDE_MEM_REDIS_URL:"",CLAUDE_MEM_REDIS_HOST:"127.0.0.1",CLAUDE_MEM_REDIS_PORT:"6379",CLAUDE_MEM_REDIS_MODE:"external",CLAUDE_MEM_QUEUE_REDIS_PREFIX:`claude_mem_${process.env.CLAUDE_MEM_WORKER_PORT??String(37700+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_AUTH_MODE:"api-key",CLAUDE_MEM_RUNTIME:"worker",CLAUDE_MEM_SERVER_URL:`http://127.0.0.1:${process.env.CLAUDE_MEM_SERVER_PORT??String(37877+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_SERVER_API_KEY:"",CLAUDE_MEM_SERVER_PROJECT_ID:"",CLAUDE_MEM_SERVER_BETA_URL:`http://127.0.0.1:${process.env.CLAUDE_MEM_SERVER_PORT??String(37877+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_SERVER_BETA_API_KEY:"",CLAUDE_MEM_SERVER_BETA_PROJECT_ID:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_PROJECT_OBS:"5000",CLAUDE_MEM_OBSERVATION_RECONCILIATION_VECTOR_TOP_K:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_RECENT_LIMIT:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_TOP:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_CANDIDATE_CHUNK_SIZE:"200",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_CANDIDATES:"40",CLAUDE_MEM_OBSERVATION_RECONCILIATION_FULL_SCAN_LLM:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_APPLY_CONFIDENCE:"0.90",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_WEAK_CONFIDENCE:"0.65",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_TERMINAL_EVIDENCE_CHARS:"40",CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_SELECTOR_MODEL:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_CLASSIFIER_MODEL:"",CLAUDE_MEM_OBSERVATION_RECONCILIATION_DAILY_BUDGET_USD:"0",CLAUDE_MEM_OBSERVATION_RECONCILIATION_KILL_SWITCH:"false",CLAUDE_MEM_OBSERVATION_RECONCILIATION_CONCURRENCY:"1",CLAUDE_MEM_FALLBACK_CHAIN:"antigravity-tm,antigravity-ghul,codex-spark,codex-mini,minimax-m3",CLAUDE_MEM_GEMINI_CLI_MODEL:"gemini-2.5-flash-lite",CLAUDE_MEM_GEMINI_CLI_MIN_SPACING_MS:"6100",CLAUDE_MEM_ANTIGRAVITY_CLI_MIN_SPACING_MS:"2000",CLAUDE_MEM_PROVIDER_COOLDOWN_MS:"3600000",CLAUDE_MEM_COOLDOWN_QUOTA_EXHAUSTED_MS:"3600000",CLAUDE_MEM_COOLDOWN_RATE_LIMIT_MS:"60000",CLAUDE_MEM_COOLDOWN_TRANSIENT_MS:"90000",CLAUDE_MEM_COOLDOWN_UNRECOVERABLE_MS:"3600000",CLAUDE_MEM_COOLDOWN_AUTH_INVALID_MS:"86400000",CLAUDE_MEM_VALIDATION_RETRIES:"2"};static getAllDefaults(){return{...this.DEFAULTS}}static get(e){return process.env[e]??this.DEFAULTS[e]}static getInt(e){let s=this.get(e);return parseInt(s,10)}static getBool(e){return String(this.get(e)).toLowerCase()==="true"}static applyEnvOverrides(e){let s={...e};for(let t of Object.keys(this.DEFAULTS))process.env[t]!==void 0&&(s[t]=process.env[t]);return s}static applyToProcessEnv(e){for(let s of Object.keys(this.DEFAULTS))process.env[s]===void 0&&e[s]!==void 0&&(process.env[s]=String(e[s]))}static loadFromFile(e,s=!0){try{if(!(0,B.existsSync)(e)){let E=this.getAllDefaults();try{j(e,E),console.warn("[SETTINGS] Created settings file with defaults:",e)}catch(_){console.warn("[SETTINGS] Failed to create settings file, using in-memory defaults:",e,_ instanceof Error?_.message:String(_))}return s?this.applyEnvOverrides(E):E}let t=(0,B.readFileSync)(e,"utf-8"),r=y(t),n=r;if(r.env&&typeof r.env=="object"){n=r.env;try{j(e,n),console.warn("[SETTINGS] Migrated settings file from nested to flat schema:",e)}catch(E){console.warn("[SETTINGS] Failed to auto-migrate settings file:",e,E instanceof Error?E.message:String(E))}}let o={...this.DEFAULTS};for(let E of Object.keys(this.DEFAULTS))n[E]!==void 0&&(o[E]=n[E]);return s?this.applyEnvOverrides(o):o}catch(t){console.warn("[SETTINGS] Failed to load settings, using defaults:",e,t instanceof Error?t.message:String(t));let r=this.getAllDefaults();return s?this.applyEnvOverrides(r):r}}};function me(){return x.getBool("CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED")}var He=new Set(Q),Z=class extends Error{constructor(s,t){super(s);this.invalid=t;this.name="StatusFilterError"}invalid};function ue(i,e={}){if(!(e.featureEnabled??me()))return{statuses:[...Q],filterApplied:!1};if(i==null||i==="")return{statuses:[...Te],filterApplied:!0};let t=i.split(",").map(n=>n.trim()).filter(Boolean),r=t.filter(n=>!He.has(n));if(r.length>0)throw new Z(`Unknown status values: ${r.join(",")}`,r);return{statuses:t,filterApplied:!0}}function ce(i,e={}){let s=e.columnExpr??"COALESCE(status, 'active')";if(i.length===0)return{sql:"1=0",params:[]};let t=i.map(()=>"?").join(",");return{sql:`${s} IN (${t})`,params:[...i]}}var p="claude";function We(i){return i.trim().toLowerCase().replace(/\s+/g,"-")}function h(i){if(!i)return p;let e=We(i);return e?e==="transcript"||e.includes("codex")?"codex":e.includes("cursor")?"cursor":e.includes("claude")?"claude":e:p}function le(i){let e=["claude","codex","cursor"];return[...i].sort((s,t)=>{let r=e.indexOf(s),n=e.indexOf(t);return r!==-1||n!==-1?r===-1?1:n===-1?-1:r-n:s.localeCompare(t)})}function Ne(i,e,s,t,r){let n=Date.now()-t,o=r!==void 0?"up.session_db_id = ?":"up.content_session_id = ?",E=r??e;return i.prepare(`
    SELECT
      up.*,
      s.memory_session_id,
      s.project,
      COALESCE(s.platform_source, '${p}') as platform_source
    FROM user_prompts up
    JOIN sdk_sessions s ON up.session_db_id = s.id
    WHERE ${o}
      AND up.prompt_text = ?
      AND up.created_at_epoch >= ?
    ORDER BY up.created_at_epoch DESC
    LIMIT 1
  `).get(E,s,n)??void 0}var Re=["private","claude-mem-context","system_instruction","system-instruction","persisted-output","system-reminder"],Ie=new RegExp(`<(${Re.join("|")})\\b[^>]*>[\\s\\S]*?</\\1>`,"g");var Oe=100;function je(i){let e=Object.fromEntries(Re.map(r=>[r,0]));Ie.lastIndex=0;let s=0,t=i.replace(Ie,(r,n)=>(e[n]=(e[n]??0)+1,s+=1,""));return s>Oe&&a.warn("SYSTEM","tag count exceeds limit",void 0,{tagCount:s,maxAllowed:Oe,contentLength:i.length}),{stripped:t.trim(),counts:e}}function Se(i){return je(i).stripped}var Ve=["task-notification"],Fs=new RegExp(`^\\s*<(${Ve.join("|")})\\b[^>]*>(?:(?!<\\1\\b|</\\1\\b)[\\s\\S])*</\\1>\\s*$`),Gs=256*1024;var ee=4e3;function w(i){let e=i.trim(),t=Se(i).trim()||e;return t.length<=ee?t:(a.debug("DB","Truncated stored prompt text to the configured cap",{originalLength:t.length,storedLength:ee}),`${t.slice(0,ee-1)}\u2026`)}var $e=require("bun:sqlite");var Ye=5e3,Ke=4194304;function qe(i){return i.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    LIMIT 1
  `).get()!=null}function F(i,e,s){try{i.run(e)}catch(t){let r=t instanceof Error?t:new Error(String(t));throw a.warn("DB",`Failed to apply SQLite pragma ${s}`,{sql:e},r),t}}function Ae(i,e={}){let{enableWal:s=!0,enableIncrementalAutoVacuum:t=!0}=e;F(i,`PRAGMA busy_timeout = ${Ye}`,"busy_timeout"),F(i,"PRAGMA foreign_keys = ON","foreign_keys"),F(i,"PRAGMA synchronous = NORMAL","synchronous"),F(i,`PRAGMA journal_size_limit = ${Ke}`,"journal_size_limit"),t&&!qe(i)&&F(i,"PRAGMA auto_vacuum = INCREMENTAL","auto_vacuum"),s&&F(i,"PRAGMA journal_mode = WAL","journal_mode")}var be=33;var Le=new WeakSet;function Ce(i){if(Le.has(i))return;i.run(`
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
  `),i.run("CREATE INDEX IF NOT EXISTS idx_projects_root_path ON projects(root_path)"),i.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_project ON server_sessions(project_id)"),i.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_content ON server_sessions(content_session_id)"),i.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_memory ON server_sessions(memory_session_id)"),i.run("CREATE INDEX IF NOT EXISTS idx_server_sessions_status ON server_sessions(status)"),i.run("CREATE INDEX IF NOT EXISTS idx_agent_events_project_time ON agent_events(project_id, occurred_at_epoch DESC)"),i.run("CREATE INDEX IF NOT EXISTS idx_agent_events_session_time ON agent_events(server_session_id, occurred_at_epoch DESC)"),i.run("CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type)"),i.run("CREATE INDEX IF NOT EXISTS idx_memory_items_project_time ON memory_items(project_id, created_at_epoch DESC)"),i.run("CREATE INDEX IF NOT EXISTS idx_memory_items_session_time ON memory_items(server_session_id, created_at_epoch DESC)"),i.run("CREATE INDEX IF NOT EXISTS idx_memory_items_legacy_observation ON memory_items(legacy_observation_id)"),i.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_memory_items_legacy_observation
    ON memory_items(legacy_observation_id)
    WHERE legacy_observation_id IS NOT NULL
  `),i.run("CREATE INDEX IF NOT EXISTS idx_memory_items_kind_type ON memory_items(kind, type)"),i.run(`
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
  `);let e=i.prepare("SELECT COUNT(*) AS count FROM memory_items").get(),s=i.prepare("SELECT COUNT(*) AS count FROM memory_items_fts").get();e.count!==s.count&&i.transaction(()=>{i.run("DELETE FROM memory_items_fts"),i.run(`
        INSERT INTO memory_items_fts (
          memory_item_id, project_id, title, subtitle, text, narrative, facts, concepts
        )
        SELECT id, project_id, title, subtitle, text, narrative, facts, concepts
        FROM memory_items
      `)})(),i.run("CREATE INDEX IF NOT EXISTS idx_memory_sources_item ON memory_sources(memory_item_id)"),i.run("CREATE INDEX IF NOT EXISTS idx_memory_sources_legacy ON memory_sources(legacy_table, legacy_id)"),i.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_memory_sources_legacy_source
    ON memory_sources(source_type, legacy_table, legacy_id)
    WHERE legacy_table IS NOT NULL AND legacy_id IS NOT NULL
  `),i.run("CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)"),i.run("CREATE INDEX IF NOT EXISTS idx_api_keys_team ON api_keys(team_id)"),i.run("CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id)"),i.run("CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix)"),i.run("CREATE INDEX IF NOT EXISTS idx_audit_log_team_time ON audit_log(team_id, created_at_epoch DESC)"),i.run("CREATE INDEX IF NOT EXISTS idx_audit_log_project_time ON audit_log(project_id, created_at_epoch DESC)"),i.run("CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_type, actor_id)"),i.run(`
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
  `),i.run(`
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
  `),Le.add(i)}var k=class{constructor(e){this.db=e}db;runAllMigrations(){this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn(),this.createObservationFeedbackTable(),this.addSessionPlatformSourceColumn(),this.ensureMergedIntoProjectColumns(),this.addObservationSubagentColumns(),this.rebuildPendingMessagesForSelfHealingClaim(),this.addObservationsUniqueContentHashIndex(),this.addObservationsMetadataColumn(),this.dropDeadPendingMessagesColumns(),this.dropWorkerPidColumn(),this.createServerOwnedTables(),this.rebuildPendingMessagesForFinalQueueSchema(),this.addObservationReconciliationSchema(),this.addObservationStatusAuditTable(),this.addObservationReconcileCostsTable()}initializeSchema(){this.db.run(`
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
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString())}ensureWorkerPortColumn(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(t=>t.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),a.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(E=>E.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),a.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(E=>E.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),a.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(E=>E.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),a.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(t=>t.unique===1&&t.origin!=="pk")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}a.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
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
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),a.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(r=>r.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}a.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),a.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let t=this.db.query("PRAGMA table_info(observations)").all().find(r=>r.name==="text");if(!t||t.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}a.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
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
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),a.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}a.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
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
    `);try{this.createUserPromptsFTS()}catch(t){a.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},t instanceof Error?t:new Error(String(t)))}this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),a.debug("DB","Successfully created user_prompts table")}createUserPromptsFTS(){this.db.run(`
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
    `)}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(o=>o.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),a.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(o=>o.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),a.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}a.debug("DB","Creating pending_messages table"),this.db.run(`
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
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),a.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;a.debug("DB","Checking session ID columns for semantic clarity rename");let s=0,t=(r,n,o)=>{let E=this.db.query(`PRAGMA table_info(${r})`).all(),_=E.some(T=>T.name===n);return E.some(T=>T.name===o)?!1:_?(this.db.run(`ALTER TABLE ${r} RENAME COLUMN ${n} TO ${o}`),a.debug("DB",`Renamed ${r}.${n} to ${o}`),!0):(a.warn("DB",`Column ${n} not found in ${r}, skipping rename`),!1)};t("sdk_sessions","claude_session_id","content_session_id")&&s++,t("sdk_sessions","sdk_session_id","memory_session_id")&&s++,t("pending_messages","claude_session_id","content_session_id")&&s++,t("observations","sdk_session_id","memory_session_id")&&s++,t("session_summaries","sdk_session_id","memory_session_id")&&s++,t("user_prompts","claude_session_id","content_session_id")&&s++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),s>0?a.debug("DB",`Successfully renamed ${s} session ID columns`):a.debug("DB","No session ID column renames needed (already up to date)")}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),a.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(!this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21)){a.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.recreateObservationsWithUpdateCascade(),this.recreateSessionSummariesWithUpdateCascade(),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),a.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(s){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),s instanceof Error?s:new Error(`Migration 21 failed: ${String(s)}`)}}}recreateObservationsWithUpdateCascade(){this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new");let s=this.db.query("PRAGMA table_info(observations)").all().some(o=>o.name==="content_hash"),t=s?`,
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
      `)}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),a.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(r=>r.name==="custom_title")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),a.debug("DB","Added custom_title column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString())}createObservationFeedbackTable(){this.db.query("SELECT 1 FROM schema_versions WHERE version = 24").get()||(this.db.run(`
      CREATE TABLE IF NOT EXISTS observation_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL,
        signal_type TEXT NOT NULL,
        session_db_id INTEGER,
        created_at_epoch INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_feedback_observation ON observation_feedback(observation_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_feedback_signal ON observation_feedback(signal_type)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString()),a.debug("DB","Created observation_feedback table for usage tracking"))}addSessionPlatformSourceColumn(){let s=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(o=>o.name==="platform_source"),r=this.db.query("PRAGMA index_list(sdk_sessions)").all().some(o=>o.name==="idx_sdk_sessions_platform_source");this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(25)&&s&&r||(s||(this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${p}'`),a.debug("DB","Added platform_source column to sdk_sessions table")),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${p}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),r||this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(25,new Date().toISOString()))}ensureMergedIntoProjectColumns(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE observations ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_merged_into ON observations(merged_into_project)"),this.db.query("PRAGMA table_info(session_summaries)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE session_summaries ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_summaries_merged_into ON session_summaries(merged_into_project)")}addObservationSubagentColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(27),s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(o=>o.name==="agent_type"),r=s.some(o=>o.name==="agent_id");t||(this.db.run("ALTER TABLE observations ADD COLUMN agent_type TEXT"),a.debug("DB","Added agent_type column to observations table")),r||(this.db.run("ALTER TABLE observations ADD COLUMN agent_id TEXT"),a.debug("DB","Added agent_id column to observations table")),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_type ON observations(agent_type)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_id ON observations(agent_id)");let n=this.db.query("PRAGMA table_info(pending_messages)").all();if(n.length>0){let o=n.some(_=>_.name==="agent_type"),E=n.some(_=>_.name==="agent_id");o||(this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_type TEXT"),a.debug("DB","Added agent_type column to pending_messages table")),E||(this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_id TEXT"),a.debug("DB","Added agent_id column to pending_messages table"))}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString())}rebuildPendingMessagesForSelfHealingClaim(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(28))return;if(!(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0)){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString());return}a.debug("DB","Rebuilding pending_messages for self-healing claim (migration 28)"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{let t=this.db.query("PRAGMA table_info(pending_messages)").all(),r=new Set(t.map(o=>o.name)),n=o=>r.has(o);this.db.run("DROP TABLE IF EXISTS pending_messages_new"),this.db.run(`
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
          ${n("tool_use_id")?"tool_use_id":"NULL"},
          message_type,
          ${n("tool_name")?"tool_name":"NULL"},
          ${n("tool_input")?"tool_input":"NULL"},
          ${n("tool_response")?"tool_response":"NULL"},
          ${n("cwd")?"cwd":"NULL"},
          ${n("last_user_message")?"last_user_message":"NULL"},
          ${n("last_assistant_message")?"last_assistant_message":"NULL"},
          ${n("prompt_number")?"prompt_number":"NULL"},
          CASE WHEN status = 'processing' THEN 'processing' ELSE 'pending' END,
          created_at_epoch,
          ${n("agent_type")?"agent_type":"NULL"},
          ${n("agent_id")?"agent_id":"NULL"}
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
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),a.debug("DB","Rebuilt pending_messages for self-healing claim")}catch(t){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),t instanceof Error?t:new Error(`Migration 28 failed: ${String(t)}`)}}addObservationsUniqueContentHashIndex(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(29))return;let s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(n=>n.name==="memory_session_id"),r=s.some(n=>n.name==="content_hash");if(!t||!r){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString());return}this.db.run("BEGIN TRANSACTION");try{this.db.run(`
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
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString()),this.db.run("COMMIT"),a.debug("DB","Added UNIQUE(memory_session_id, content_hash) on observations")}catch(n){throw this.db.run("ROLLBACK"),n instanceof Error?n:new Error(`Migration 29 failed: ${String(n)}`)}}addObservationsMetadataColumn(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="metadata")||(this.db.run("ALTER TABLE observations ADD COLUMN metadata TEXT"),a.debug("DB","Added metadata column to observations table (#2116)")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(30,new Date().toISOString())}dropDeadPendingMessagesColumns(){let e=this.db.query("PRAGMA table_info(pending_messages)").all(),s=new Set(e.map(n=>n.name)),r=["retry_count","failed_at_epoch","completed_at_epoch","worker_pid"].filter(n=>s.has(n));if(r.length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString());return}this.db.run("BEGIN TRANSACTION");try{this.db.run("DELETE FROM pending_messages WHERE status NOT IN ('pending', 'processing')"),r.includes("worker_pid")&&this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid");for(let n of r)this.db.run(`ALTER TABLE pending_messages DROP COLUMN ${n}`),a.debug("DB",`Dropped dead column ${n} from pending_messages`);this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString()),this.db.run("COMMIT"),a.debug("DB","Successfully dropped dead columns from pending_messages")}catch(n){throw this.db.run("ROLLBACK"),a.error("DB",`Migration 31 failed: ${String(n)}`,{},n instanceof Error?n:new Error(String(n))),n}}dropWorkerPidColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(32))return;if(this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="worker_pid"))try{this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid"),this.db.run("ALTER TABLE pending_messages DROP COLUMN worker_pid"),a.debug("DB","Dropped worker_pid column and its index from pending_messages")}catch(r){a.warn("DB","Failed to drop worker_pid column from pending_messages",{},r instanceof Error?r:new Error(String(r)))}this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(32,new Date().toISOString())}createServerOwnedTables(){Ce(this.db),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(be,new Date().toISOString())}rebuildPendingMessagesForFinalQueueSchema(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(34))return;let s=this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='pending_messages'").get();if(!s){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString());return}let t=s.sql.includes("'processed'")||s.sql.includes("'failed'"),r=this.db.query("PRAGMA table_info(pending_messages)").all(),n=new Set(r.map(_=>_.name)),o=["retry_count","failed_at_epoch","completed_at_epoch","worker_pid"].some(_=>n.has(_));if(!t&&!o){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString());return}let E=_=>n.has(_);this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.db.run("DROP TABLE IF EXISTS pending_messages_final"),this.db.run(`
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
          ${E("tool_use_id")?"tool_use_id":"NULL"},
          message_type,
          ${E("tool_name")?"tool_name":"NULL"},
          ${E("tool_input")?"tool_input":"NULL"},
          ${E("tool_response")?"tool_response":"NULL"},
          ${E("cwd")?"cwd":"NULL"},
          ${E("last_user_message")?"last_user_message":"NULL"},
          ${E("last_assistant_message")?"last_assistant_message":"NULL"},
          ${E("prompt_number")?"prompt_number":"NULL"},
          CASE WHEN status = 'processing' THEN 'processing' ELSE 'pending' END,
          created_at_epoch,
          ${E("agent_type")?"agent_type":"NULL"},
          ${E("agent_id")?"agent_id":"NULL"}
        FROM pending_messages
        WHERE status IN ('pending', 'processing')
      `),this.db.run("DROP TABLE pending_messages"),this.db.run("ALTER TABLE pending_messages_final RENAME TO pending_messages"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_session_tool
        ON pending_messages(content_session_id, tool_use_id)
        WHERE tool_use_id IS NOT NULL
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON")}catch(_){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),_ instanceof Error?_:new Error(`Migration 34 failed: ${String(_)}`)}}addObservationReconciliationSchema(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(35))return;let s=this.db.query("PRAGMA table_info(observations)").all(),t=new Set(s.map(n=>n.name)),r=[{name:"status",ddl:"ALTER TABLE observations ADD COLUMN status TEXT DEFAULT 'active'"},{name:"status_confidence",ddl:"ALTER TABLE observations ADD COLUMN status_confidence REAL DEFAULT 1.0"},{name:"status_reason",ddl:"ALTER TABLE observations ADD COLUMN status_reason TEXT"},{name:"status_updated_at_epoch",ddl:"ALTER TABLE observations ADD COLUMN status_updated_at_epoch INTEGER"},{name:"superseded_by_observation_id",ddl:"ALTER TABLE observations ADD COLUMN superseded_by_observation_id INTEGER"},{name:"reconciled_at_epoch",ddl:"ALTER TABLE observations ADD COLUMN reconciled_at_epoch INTEGER"}];for(let n of r)t.has(n.name)||(this.db.run(n.ddl),a.debug("DB",`Added ${n.name} column to observations table (migration 35)`));this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_status ON observations(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_project_status ON observations(project, status, created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_superseded_by ON observations(superseded_by_observation_id)"),this.db.run(`
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
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_jobs_status ON observation_reconcile_jobs(status, created_at_epoch)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_jobs_project_status ON observation_reconcile_jobs(project, status, created_at_epoch)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(35,new Date().toISOString()),a.debug("DB","Observation reconciliation schema initialized (migration 35)")}addObservationStatusAuditTable(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(36)||(this.db.run(`
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
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_status_audit_observation ON observation_status_audit(observation_id, created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_status_audit_actor ON observation_status_audit(actor)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(36,new Date().toISOString()),a.debug("DB","Observation status audit table initialized (migration 36)"))}addObservationReconcileCostsTable(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(37)||(this.db.run(`
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
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_job ON observation_reconcile_costs(job_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_created ON observation_reconcile_costs(created_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_project_created ON observation_reconcile_costs(project, created_at_epoch DESC)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(37,new Date().toISOString()),a.debug("DB","Observation reconcile costs table initialized (migration 37)"))}};var te=class{db;constructor(e=ie,s={}){e instanceof se.Database?this.db=e:(e!==":memory:"&&ae(A),this.db=new se.Database(e)),Ae(this.db),this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn(),this.addSessionPlatformSourceColumn(),this.addObservationModelColumns(),this.ensureMergedIntoProjectColumns(),this.addObservationSubagentColumns(),this.addObservationsUniqueContentHashIndex(),this.addObservationsMetadataColumn(),this.dropDeadPendingMessagesColumns(),this.ensurePendingMessagesToolUseIdColumn(),this.dropWorkerPidColumn(),this.ensureSDKSessionsPlatformContentIdentity(),this.ensureUserPromptsSessionDbId(),this.ensurePendingMessagesSessionToolUniqueIndex(),this.ensureSyncedAtColumns(s.cloudSyncStatePath??G.cloudSyncState()),this.requeuePromptCloudSyncAfterMapperFix(),new k(this.db).runAllMigrations()}getIndexColumns(e){return this.db.query(`PRAGMA index_info(${JSON.stringify(e)})`).all().map(s=>s.name)}hasUniqueIndexOnColumns(e,s){return this.db.query(`PRAGMA index_list(${e})`).all().some(r=>{if(r.unique!==1)return!1;let n=this.getIndexColumns(r.name);return n.length===s.length&&n.every((o,E)=>o===s[E])})}resolvePromptSessionDbId(e,s,t){if(s!==void 0)return s;let r=t?h(t):void 0;return r?this.db.prepare(`
        SELECT id
        FROM sdk_sessions
        WHERE COALESCE(NULLIF(platform_source, ''), ?) = ?
          AND content_session_id = ?
        LIMIT 1
      `).get(p,r,e)?.id??null:this.db.prepare(`
      SELECT id
      FROM sdk_sessions
      WHERE content_session_id = ?
      ORDER BY CASE COALESCE(NULLIF(platform_source, ''), '${p}')
        WHEN '${p}' THEN 0
        ELSE 1
      END, id
      LIMIT 1
    `).get(e)?.id??null}dropWorkerPidColumn(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(32),t=this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="worker_pid");if(!(e&&!t)){if(t)try{this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid"),this.db.run("ALTER TABLE pending_messages DROP COLUMN worker_pid"),a.debug("DB","Dropped worker_pid column and its index from pending_messages")}catch(r){a.warn("DB","Failed to drop worker_pid column from pending_messages",{},r instanceof Error?r:new Error(String(r)));return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(32,new Date().toISOString())}}ensureSDKSessionsPlatformContentIdentity(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(33),s=this.hasUniqueIndexOnColumns("sdk_sessions",["content_session_id"]),t=this.hasUniqueIndexOnColumns("sdk_sessions",["platform_source","content_session_id"]),n=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(o=>o.name==="platform_source");if(!(e&&!s&&t&&n)){if(n||this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${p}'`),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${p}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),s){this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.rebuildSdkSessionsWithCompositeIdentity(e),this.db.run("COMMIT")}catch(o){this.db.run("ROLLBACK");let E=o instanceof Error?o:new Error(String(o));throw a.error("DB","Failed to rebuild sdk_sessions with composite identity, rolled back",{},E),o}finally{this.db.run("PRAGMA foreign_keys = ON")}return}this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ux_sdk_sessions_platform_content ON sdk_sessions(platform_source, content_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(33,new Date().toISOString())}}rebuildSdkSessionsWithCompositeIdentity(e){this.db.run("DROP TABLE IF EXISTS sdk_sessions_new"),this.db.run(`
      CREATE TABLE sdk_sessions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        memory_session_id TEXT UNIQUE,
        project TEXT NOT NULL,
        platform_source TEXT NOT NULL DEFAULT '${p}',
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
        COALESCE(NULLIF(platform_source, ''), '${p}'),
        user_prompt, started_at, started_at_epoch, completed_at, completed_at_epoch,
        status, worker_port, prompt_counter, custom_title
      FROM sdk_sessions
    `),this.db.run("DROP TABLE sdk_sessions"),this.db.run("ALTER TABLE sdk_sessions_new RENAME TO sdk_sessions"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ux_sdk_sessions_platform_content ON sdk_sessions(platform_source, content_session_id)"),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(33,new Date().toISOString())}ensureUserPromptsSessionDbId(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(34);if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='user_prompts'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString());return}let r=this.db.query("PRAGMA table_info(user_prompts)").all().some(d=>d.name==="session_db_id"),o=this.db.query("PRAGMA foreign_key_list(user_prompts)").all().some(d=>d.table==="sdk_sessions"&&d.from==="content_session_id");if(e&&r&&!o)return;let E=this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_prompts_fts'").all().length>0,_=r?`COALESCE(up.session_db_id, (
          SELECT s.id FROM sdk_sessions s
          WHERE s.content_session_id = up.content_session_id
          ORDER BY CASE COALESCE(NULLIF(s.platform_source, ''), '${p}')
            WHEN '${p}' THEN 0
            ELSE 1
          END, s.id
          LIMIT 1
        ))`:`(
          SELECT s.id FROM sdk_sessions s
          WHERE s.content_session_id = up.content_session_id
          ORDER BY CASE COALESCE(NULLIF(s.platform_source, ''), '${p}')
            WHEN '${p}' THEN 0
            ELSE 1
          END, s.id
          LIMIT 1
        )`;this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.rebuildUserPromptsWithSessionDbId(e,_,E),this.db.run("COMMIT")}catch(d){this.db.run("ROLLBACK");let T=d instanceof Error?d:new Error(String(d));throw a.error("DB","Failed to rebuild user_prompts with session_db_id, rolled back",{},T),d}finally{this.db.run("PRAGMA foreign_keys = ON")}}rebuildUserPromptsWithSessionDbId(e,s,t){this.db.run("DROP TRIGGER IF EXISTS user_prompts_ai"),this.db.run("DROP TRIGGER IF EXISTS user_prompts_ad"),this.db.run("DROP TRIGGER IF EXISTS user_prompts_au"),this.db.run("DROP TABLE IF EXISTS user_prompts_new"),this.db.run(`
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
      `),this.db.run("INSERT INTO user_prompts_fts(user_prompts_fts) VALUES('rebuild')")),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(34,new Date().toISOString())}ensurePendingMessagesSessionToolUniqueIndex(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(35);if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(35,new Date().toISOString());return}let t=this.hasUniqueIndexOnColumns("pending_messages",["session_db_id","tool_use_id"]);if(!(e&&t)){this.db.run("BEGIN TRANSACTION");try{this.recreatePendingSessionToolUniqueIndex(e),this.db.run("COMMIT")}catch(r){this.db.run("ROLLBACK");let n=r instanceof Error?r:new Error(String(r));throw a.error("DB","Failed to recreate ux_pending_session_tool index, rolled back",{},n),r}}}recreatePendingSessionToolUniqueIndex(e){this.db.run("DROP INDEX IF EXISTS ux_pending_session_tool"),this.db.run(`
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
    `),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(35,new Date().toISOString())}ensureSyncedAtColumns(e){let s=!1;for(let t of["observations","session_summaries","user_prompts"])this.db.query(`PRAGMA table_info(${t})`).all().some(o=>o.name==="synced_at")||(this.db.run(`ALTER TABLE ${t} ADD COLUMN synced_at INTEGER`),a.debug("DB",`Added synced_at column to ${t} table`),s=!0),this.db.run(`CREATE INDEX IF NOT EXISTS idx_${t}_unsynced ON ${t}(id) WHERE synced_at IS NULL`);s&&this.stampRowsSyncedByLegacyClient(e),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(39,new Date().toISOString())}requeuePromptCloudSyncAfterMapperFix(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(40))return;let s=this.db.prepare(`
      UPDATE user_prompts SET synced_at = NULL WHERE synced_at IS NOT NULL
    `).run();a.info("DB","Requeued prompt cloud sync after mapper fix (v40)",{requeued:s.changes}),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(40,new Date().toISOString())}stampRowsSyncedByLegacyClient(e){if(!(0,H.existsSync)(e))return;let s;try{s=JSON.parse((0,H.readFileSync)(e,"utf-8"))}catch(n){a.warn("DB","Failed to read legacy cloud-sync state, skipping synced_at adoption",{statePath:e},n instanceof Error?n:new Error(String(n)));return}if(s===null||typeof s!="object"){a.warn("DB","Legacy cloud-sync state is not an object, skipping synced_at adoption",{statePath:e});return}let t=Date.now(),r=[["observations",s.lastId],["session_summaries",s.lastSummaryId],["user_prompts",s.lastPromptId]];for(let[n,o]of r)typeof o=="number"&&o>0&&(this.db.prepare(`UPDATE ${n} SET synced_at = ? WHERE id <= ? AND synced_at IS NULL`).run(t,o),a.debug("DB",`Stamped synced_at on ${n} rows already uploaded by the legacy cloud-sync client`,{lastSyncedId:o}))}dropDeadPendingMessagesColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(31),s=this.db.query("PRAGMA table_info(pending_messages)").all(),t=new Set(s.map(o=>o.name)),n=["retry_count","failed_at_epoch","completed_at_epoch"].filter(o=>t.has(o));if(!(e&&n.length===0)){if(n.length>0){this.db.run("BEGIN TRANSACTION");try{this.db.run("DELETE FROM pending_messages WHERE status NOT IN ('pending', 'processing')");for(let o of n)this.db.run(`ALTER TABLE pending_messages DROP COLUMN ${o}`),a.debug("DB",`Dropped dead column ${o} from pending_messages`);e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString()),this.db.run("COMMIT")}catch(o){this.db.run("ROLLBACK"),a.warn("DB","Failed to drop dead columns from pending_messages",{},o instanceof Error?o:new Error(String(o)));return}return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString())}}initializeSchema(){this.db.run(`
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
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString())}ensureWorkerPortColumn(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(t=>t.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),a.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(E=>E.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),a.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(E=>E.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),a.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(E=>E.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),a.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(t=>t.unique===1&&t.origin!=="pk")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}a.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
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
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),a.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(r=>r.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}a.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),a.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let t=this.db.query("PRAGMA table_info(observations)").all().find(r=>r.name==="text");if(!t||t.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}a.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
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
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),a.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}a.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
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
    `;try{this.db.run(t),this.db.run(r)}catch(n){n instanceof Error?a.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},n):a.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},new Error(String(n))),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),a.debug("DB","Created user_prompts table (without FTS5)");return}this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),a.debug("DB","Successfully created user_prompts table")}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(o=>o.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),a.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(o=>o.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),a.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}a.debug("DB","Creating pending_messages table"),this.db.run(`
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
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),a.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;a.debug("DB","Checking session ID columns for semantic clarity rename");let s=0,t=(r,n,o)=>{let E=this.db.query(`PRAGMA table_info(${r})`).all(),_=E.some(T=>T.name===n);return E.some(T=>T.name===o)?!1:_?(this.db.run(`ALTER TABLE ${r} RENAME COLUMN ${n} TO ${o}`),a.debug("DB",`Renamed ${r}.${n} to ${o}`),!0):(a.warn("DB",`Column ${n} not found in ${r}, skipping rename`),!1)};t("sdk_sessions","claude_session_id","content_session_id")&&s++,t("sdk_sessions","sdk_session_id","memory_session_id")&&s++,t("pending_messages","claude_session_id","content_session_id")&&s++,t("observations","sdk_session_id","memory_session_id")&&s++,t("session_summaries","sdk_session_id","memory_session_id")&&s++,t("user_prompts","claude_session_id","content_session_id")&&s++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),s>0?a.debug("DB",`Successfully renamed ${s} session ID columns`):a.debug("DB","No session ID column renames needed (already up to date)")}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),a.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21))return;a.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new");let s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(u=>u.name==="metadata"),r=s.some(u=>u.name==="content_hash"),n=t?`,
        metadata TEXT`:"",o=t?", metadata":"",E=r?`,
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
        created_at_epoch INTEGER NOT NULL${n}${E},
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `,T=`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             discovery_tokens, created_at, created_at_epoch${o}${_}
      FROM observations
    `,O=`
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
    `;this.db.run("DROP TRIGGER IF EXISTS session_summaries_ai"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ad"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_au"),this.db.run("DROP TABLE IF EXISTS session_summaries_new");let R=`
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
    `,L=`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, discovery_tokens, created_at, created_at_epoch
      FROM session_summaries
    `,S=`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `,g=`
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
    `;try{this.recreateObservationsWithCascade(d,T,O,l),this.recreateSessionSummariesWithCascade(R,L,S,g),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),a.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(u){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),u instanceof Error?u:new Error(String(u))}}recreateObservationsWithCascade(e,s,t,r){this.db.run(e),this.db.run(s),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(t),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run(r)}recreateSessionSummariesWithCascade(e,s,t,r){this.db.run(e),this.db.run(s),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(t),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'").all().length>0&&this.db.run(r)}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),a.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23),t=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(r=>r.name==="custom_title");e&&t||(t||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),a.debug("DB","Added custom_title column to sdk_sessions table")),e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString()))}addSessionPlatformSourceColumn(){let s=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(o=>o.name==="platform_source"),r=this.db.query("PRAGMA index_list(sdk_sessions)").all().some(o=>o.name==="idx_sdk_sessions_platform_source");this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(24)&&s&&r||(s||(this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${p}'`),a.debug("DB","Added platform_source column to sdk_sessions table")),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${p}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),r||this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString()))}addObservationModelColumns(){let e=this.db.query("PRAGMA table_info(observations)").all(),s=e.some(r=>r.name==="generated_by_model"),t=e.some(r=>r.name==="relevance_count");s&&t||(s||this.db.run("ALTER TABLE observations ADD COLUMN generated_by_model TEXT"),t||this.db.run("ALTER TABLE observations ADD COLUMN relevance_count INTEGER DEFAULT 0"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(26,new Date().toISOString()))}ensureMergedIntoProjectColumns(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE observations ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_merged_into ON observations(merged_into_project)"),this.db.query("PRAGMA table_info(session_summaries)").all().some(t=>t.name==="merged_into_project")||this.db.run("ALTER TABLE session_summaries ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_summaries_merged_into ON session_summaries(merged_into_project)")}addObservationSubagentColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(27),s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(o=>o.name==="agent_type"),r=s.some(o=>o.name==="agent_id");t||this.db.run("ALTER TABLE observations ADD COLUMN agent_type TEXT"),r||this.db.run("ALTER TABLE observations ADD COLUMN agent_id TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_type ON observations(agent_type)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_id ON observations(agent_id)");let n=this.db.query("PRAGMA table_info(pending_messages)").all();if(n.length>0){let o=n.some(_=>_.name==="agent_type"),E=n.some(_=>_.name==="agent_id");o||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_type TEXT"),E||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_id TEXT")}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString())}ensurePendingMessagesToolUseIdColumn(){if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString());return}this.db.query("PRAGMA table_info(pending_messages)").all().some(r=>r.name==="tool_use_id")||this.db.run("ALTER TABLE pending_messages ADD COLUMN tool_use_id TEXT"),this.db.run("BEGIN TRANSACTION");try{this.dedupePendingMessagesByToolUseId(),this.db.run("COMMIT")}catch(r){this.db.run("ROLLBACK");let n=r instanceof Error?r:new Error(String(r));throw a.error("DB","Failed to de-dupe pending_messages by tool_use_id, rolled back",{},n),r}}dedupePendingMessagesByToolUseId(){this.db.run(`
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
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString())}addObservationsUniqueContentHashIndex(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(29))return;let s=this.db.query("PRAGMA table_info(observations)").all(),t=s.some(n=>n.name==="memory_session_id"),r=s.some(n=>n.name==="content_hash");if(!t||!r){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString());return}this.db.run("BEGIN TRANSACTION");try{this.dedupeObservationsByContentHash(),this.db.run("COMMIT")}catch(n){this.db.run("ROLLBACK");let o=n instanceof Error?n:new Error(String(n));throw a.error("DB","Failed to de-dupe observations by content_hash, rolled back",{},o),n}}dedupeObservationsByContentHash(){this.db.run(`
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
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString())}addObservationsMetadataColumn(){this.db.query("PRAGMA table_info(observations)").all().some(t=>t.name==="metadata")||(this.db.run("ALTER TABLE observations ADD COLUMN metadata TEXT"),a.debug("DB","Added metadata column to observations table (#2116)")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(30,new Date().toISOString())}updateMemorySessionId(e,s){this.db.prepare(`
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
      `).run(s,e),this.requeuePromptSync(e),a.info("DB","Registered memory_session_id before storage (FK fix)",{sessionDbId:e,oldId:r.memory_session_id,newId:s})),typeof t=="number"&&r.worker_port!==t&&this.db.prepare(`
        UPDATE sdk_sessions SET worker_port = ? WHERE id = ?
      `).run(t,e)}getAllProjects(e){let s=e?h(e):void 0,t=`
      SELECT DISTINCT project
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
    `,r=[$];return s&&(t+=" AND COALESCE(platform_source, ?) = ?",r.push(p,s)),t+=" ORDER BY project ASC",this.db.prepare(t).all(...r).map(o=>o.project)}getProjectCatalog(){let e=this.db.prepare(`
      SELECT
        COALESCE(platform_source, '${p}') as platform_source,
        project,
        MAX(started_at_epoch) as latest_epoch
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
      GROUP BY COALESCE(platform_source, '${p}'), project
      ORDER BY latest_epoch DESC
    `).all($),s=[],t=new Set,r={};for(let o of e){let E=h(o.platform_source);r[E]||(r[E]=[]),r[E].includes(o.project)||r[E].push(o.project),t.has(o.project)||(t.add(o.project),s.push(o.project))}let n=le(Object.keys(r));return{projects:s,sources:n,projectsBySource:Object.fromEntries(n.map(o=>[o,r[o]||[]]))}}getLatestUserPrompt(e,s){let t=this.resolvePromptSessionDbId(e,s),r=t!==null?"up.session_db_id = ?":"up.content_session_id = ?",n=t!==null?t:e;return this.db.prepare(`
      SELECT
        up.*,
        s.memory_session_id,
        s.project,
        COALESCE(s.platform_source, '${p}') as platform_source
      FROM user_prompts up
      JOIN sdk_sessions s ON up.session_db_id = s.id
      WHERE ${r}
      ORDER BY up.created_at_epoch DESC
      LIMIT 1
    `).get(n)}findRecentDuplicateUserPrompt(e,s,t,r){return Ne(this.db,e,w(s),t,this.resolvePromptSessionDbId(e,r)??void 0)}getRecentSessionsWithStatus(e,s=3,t){let r=[e],n="";return t&&(n=`AND COALESCE(NULLIF(s.platform_source, ''), '${p}') = ?`,r.push(h(t))),r.push(s),this.db.prepare(`
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
        ${n}
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
            AND COALESCE(NULLIF(s.platform_source, ''), '${p}') = ?
        )
      `,t.push(h(s))),this.db.prepare(`
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
        AND COALESCE(NULLIF(s.platform_source, ''), '${p}') = ?
    `).get(e,h(s))||null:this.db.prepare(`
        SELECT *
        FROM observations
        WHERE id = ?
      `).get(e)||null}getObservationsByIds(e,s={}){if(e.length===0)return[];let{orderBy:t="date_desc",limit:r,project:n,platformSource:o,type:E,concepts:_,files:d}=s,T=t==="relevance",O=T?"":`ORDER BY o.created_at_epoch ${t==="date_asc"?"ASC":"DESC"}`,l=r&&!T?`LIMIT ${r}`:"",R=e.map(()=>"?").join(","),L=[...e],S=[];if(n&&(S.push("o.project = ?"),L.push(n)),o&&(S.push(`COALESCE(NULLIF(s.platform_source, ''), '${p}') = ?`),L.push(h(o))),E)if(Array.isArray(E)){let m=E.map(()=>"?").join(",");S.push(`o.type IN (${m})`),L.push(...E)}else S.push("o.type = ?"),L.push(E);if(_){let m=Array.isArray(_)?_:[_],C=m.map(()=>"EXISTS (SELECT 1 FROM json_each(o.concepts) WHERE value = ?)");L.push(...m),S.push(`(${C.join(" OR ")})`)}if(d){let m=Array.isArray(d)?d:[d],C=m.map(()=>"(EXISTS (SELECT 1 FROM json_each(o.files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(o.files_modified) WHERE value LIKE ?))");m.forEach(re=>{L.push(`%${re}%`,`%${re}%`)}),S.push(`(${C.join(" OR ")})`)}let g=ue(void 0);if(g.filterApplied){let m=ce(g.statuses,{columnExpr:"COALESCE(o.status, 'active')"});S.push(m.sql),L.push(...m.params)}let u=S.length>0?`WHERE o.id IN (${R}) AND ${S.join(" AND ")}`:`WHERE o.id IN (${R})`,D=this.db.prepare(`
      SELECT o.*
      FROM observations o
      LEFT JOIN sdk_sessions s ON s.memory_session_id = o.memory_session_id
      ${u}
      ${O}
      ${l}
    `).all(...L);if(!T)return D;let N=new Map(D.map(m=>[m.id,m])),v=e.map(m=>N.get(m)).filter(m=>!!m);return r?v.slice(0,r):v}getSummaryForSession(e,s){let t=[e],r="";return s&&(r=`
        AND EXISTS (
          SELECT 1
          FROM sdk_sessions sdk
          WHERE sdk.memory_session_id = session_summaries.memory_session_id
            AND COALESCE(NULLIF(sdk.platform_source, ''), '${p}') = ?
        )
      `,t.push(h(s))),this.db.prepare(`
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
             COALESCE(platform_source, '${p}') as platform_source,
             user_prompt, custom_title, status
      FROM sdk_sessions
      WHERE id = ?
      LIMIT 1
    `).get(e)||null}getSdkSessionsBySessionIds(e){if(e.length===0)return[];let s=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project,
             COALESCE(platform_source, '${p}') as platform_source,
             user_prompt, custom_title,
             started_at, started_at_epoch, completed_at, completed_at_epoch, status
      FROM sdk_sessions
      WHERE memory_session_id IN (${s})
      ORDER BY started_at_epoch DESC
    `).all(...e)}getPromptNumberFromUserPrompts(e,s){let t=this.resolvePromptSessionDbId(e,s);return t!==null?this.db.prepare(`
        SELECT COUNT(*) as count FROM user_prompts WHERE session_db_id = ?
      `).get(t).count:this.db.prepare(`
      SELECT COUNT(*) as count FROM user_prompts WHERE content_session_id = ?
    `).get(e).count}createSDKSession(e,s,t,r,n){let o=new Date,E=o.getTime(),_=n?h(n):p,d=w(t),T=this.db.prepare(`
      SELECT id, platform_source
      FROM sdk_sessions
      WHERE COALESCE(NULLIF(platform_source, ''), ?) = ?
        AND content_session_id = ?
    `).get(p,_,e);if(T)return s&&this.db.prepare(`
          UPDATE sdk_sessions SET project = ?
          WHERE id = ? AND (project IS NULL OR project = '')
        `).run(s,T.id),r&&this.db.prepare(`
          UPDATE sdk_sessions SET custom_title = ?
          WHERE id = ? AND custom_title IS NULL
        `).run(r,T.id),T.id;let O=this.db.prepare(`
      INSERT INTO sdk_sessions
      (content_session_id, memory_session_id, project, platform_source, user_prompt, custom_title, started_at, started_at_epoch, status)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'active')
    `).run(e,s,_,d,r||null,o.toISOString(),E);return Number(O.lastInsertRowid)}saveUserPrompt(e,s,t,r){let n=new Date,o=n.getTime(),E=w(t),_=this.resolvePromptSessionDbId(e,r);return this.db.prepare(`
      INSERT INTO user_prompts
      (session_db_id, content_session_id, prompt_number, prompt_text, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(_,e,s,E,n.toISOString(),o).lastInsertRowid}getUserPrompt(e,s,t){let r=this.resolvePromptSessionDbId(e,t);return r!==null?this.db.prepare(`
        SELECT prompt_text
        FROM user_prompts
        WHERE session_db_id = ? AND prompt_number = ?
        LIMIT 1
      `).get(r,s)?.prompt_text??null:this.db.prepare(`
      SELECT prompt_text
      FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
      LIMIT 1
    `).get(e,s)?.prompt_text??null}storeObservation(e,s,t,r,n=0,o,E){let _=this.storeObservations(e,s,[t],null,r,n,o,E);return{id:_.observationIds[0],createdAtEpoch:_.createdAtEpoch}}storeSummary(e,s,t,r,n=0,o){let E=o??Date.now(),_=new Date(E).toISOString(),T=this.db.prepare(`
      INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed,
       next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,s,t.request,t.investigated,t.learned,t.completed,t.next_steps,t.notes,r||null,n,_,E);return{id:Number(T.lastInsertRowid),createdAtEpoch:E}}storeObservations(e,s,t,r,n,o=0,E,_){let d=E??Date.now(),T=new Date(d).toISOString();return this.db.transaction(()=>{let l=[],R=[],L=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, agent_type, agent_id, content_hash, created_at, created_at_epoch,
         generated_by_model, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(memory_session_id, content_hash) DO NOTHING
        RETURNING id
      `),S=this.db.prepare("SELECT id FROM observations WHERE memory_session_id = ? AND content_hash = ?");for(let u of t){let b=de(e,u.title,u.narrative),D=L.get(e,s,u.type,u.title,u.subtitle,JSON.stringify(u.facts),u.narrative,JSON.stringify(u.concepts),JSON.stringify(u.files_read),JSON.stringify(u.files_modified),n||null,o,u.agent_type??null,u.agent_id??null,b,T,d,_||null,u.metadata??null);if(D){l.push(D.id),R.push(D.id);continue}let N=S.get(e,b);if(!N)throw new Error(`storeObservations: ON CONFLICT without existing row for content_hash=${b}`);l.push(N.id)}let g=null;if(r){let b=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,s,r.request,r.investigated,r.learned,r.completed,r.next_steps,r.notes,n||null,o,T,d);g=Number(b.lastInsertRowid)}return{observationIds:l,insertedIds:R,summaryId:g,createdAtEpoch:d}})()}getSessionSummariesByIds(e,s={}){if(e.length===0)return[];let{orderBy:t="date_desc",limit:r,project:n,platformSource:o}=s,E=t==="relevance",_=E?"":`ORDER BY ss.created_at_epoch ${t==="date_asc"?"ASC":"DESC"}`,d=r&&!E?`LIMIT ${r}`:"",T=e.map(()=>"?").join(","),O=[...e],l=[];n&&(l.push("ss.project = ?"),O.push(n)),o&&(l.push(`COALESCE(NULLIF(s.platform_source, ''), '${p}') = ?`),O.push(h(o)));let R=l.length>0?`AND ${l.join(" AND ")}`:"",S=this.db.prepare(`
      SELECT ss.*
      FROM session_summaries ss
      LEFT JOIN sdk_sessions s ON s.memory_session_id = ss.memory_session_id
      WHERE ss.id IN (${T}) ${R}
      ${_}
      ${d}
    `).all(...O);if(!E)return S;let g=new Map(S.map(b=>[b.id,b])),u=e.map(b=>g.get(b)).filter(b=>!!b);return r?u.slice(0,r):u}getUserPromptsByIds(e,s={}){if(e.length===0)return[];let{orderBy:t="date_desc",limit:r,project:n,platformSource:o}=s,E=t==="relevance",_=E?"":`ORDER BY up.created_at_epoch ${t==="date_asc"?"ASC":"DESC"}`,d=r?`LIMIT ${r}`:"",T=e.map(()=>"?").join(","),O=[...e],l=[];n&&(l.push("s.project = ?"),O.push(n)),o&&(l.push(`COALESCE(NULLIF(s.platform_source, ''), '${p}') = ?`),O.push(h(o)));let R=l.length>0?`AND ${l.join(" AND ")}`:"",S=this.db.prepare(`
      SELECT
        up.*,
        s.project,
        s.memory_session_id,
        COALESCE(NULLIF(s.platform_source, ''), '${p}') as platform_source
      FROM user_prompts up
      JOIN sdk_sessions s ON up.session_db_id = s.id
      WHERE up.id IN (${T}) ${R}
      ${_}
      ${d}
    `).all(...O);if(!E)return S;let g=new Map(S.map(u=>[u.id,u]));return e.map(u=>g.get(u)).filter(u=>!!u)}getTimelineAroundTimestamp(e,s=10,t=10,r,n){return this.getTimelineAroundObservation(null,e,s,t,r,n)}getTimelineAroundObservation(e,s,t=10,r=10,n,o){let E=o?h(o):void 0,_=(N,v)=>{let m=[],C=[];return n&&(m.push(`${N}.project = ?`),C.push(n)),E&&(m.push(`COALESCE(NULLIF(${v}.platform_source, ''), '${p}') = ?`),C.push(E)),{clause:m.length>0?`AND ${m.join(" AND ")}`:"",params:C}},d=_("o","src"),T=_("ss","src"),O=_("s","s"),l,R;if(e!==null){let N=`
        SELECT o.id, o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.id <= ? ${d.clause}
        ORDER BY o.id DESC
        LIMIT ?
      `,v=`
        SELECT o.id, o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.id >= ? ${d.clause}
        ORDER BY o.id ASC
        LIMIT ?
      `;try{let m=this.db.prepare(N).all(e,...d.params,t+1),C=this.db.prepare(v).all(e,...d.params,r+1);if(m.length===0&&C.length===0)return{observations:[],sessions:[],prompts:[]};l=m.length>0?m[m.length-1].created_at_epoch:s,R=C.length>0?C[C.length-1].created_at_epoch:s}catch(m){return m instanceof Error?a.error("DB","Error getting boundary observations",{project:n},m):a.error("DB","Error getting boundary observations with non-Error",{},new Error(String(m))),{observations:[],sessions:[],prompts:[]}}}else{let N=`
        SELECT o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.created_at_epoch <= ? ${d.clause}
        ORDER BY o.created_at_epoch DESC
        LIMIT ?
      `,v=`
        SELECT o.created_at_epoch
        FROM observations o
        LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
        WHERE o.created_at_epoch >= ? ${d.clause}
        ORDER BY o.created_at_epoch ASC
        LIMIT ?
      `;try{let m=this.db.prepare(N).all(s,...d.params,t),C=this.db.prepare(v).all(s,...d.params,r+1);if(m.length===0&&C.length===0)return{observations:[],sessions:[],prompts:[]};l=m.length>0?m[m.length-1].created_at_epoch:s,R=C.length>0?C[C.length-1].created_at_epoch:s}catch(m){return m instanceof Error?a.error("DB","Error getting boundary timestamps",{project:n},m):a.error("DB","Error getting boundary timestamps with non-Error",{},new Error(String(m))),{observations:[],sessions:[],prompts:[]}}}let L=`
      SELECT o.*
      FROM observations o
      LEFT JOIN sdk_sessions src ON src.memory_session_id = o.memory_session_id
      WHERE o.created_at_epoch >= ? AND o.created_at_epoch <= ? ${d.clause}
      ORDER BY o.created_at_epoch ASC
    `,S=`
      SELECT ss.*
      FROM session_summaries ss
      LEFT JOIN sdk_sessions src ON src.memory_session_id = ss.memory_session_id
      WHERE ss.created_at_epoch >= ? AND ss.created_at_epoch <= ? ${T.clause}
      ORDER BY ss.created_at_epoch ASC
    `,g=`
      SELECT up.*, s.project, s.memory_session_id, COALESCE(NULLIF(s.platform_source, ''), '${p}') as platform_source
      FROM user_prompts up
      JOIN sdk_sessions s ON up.session_db_id = s.id
      WHERE up.created_at_epoch >= ? AND up.created_at_epoch <= ? ${O.clause}
      ORDER BY up.created_at_epoch ASC
    `,u=this.db.prepare(L).all(l,R,...d.params),b=this.db.prepare(S).all(l,R,...T.params),D=this.db.prepare(g).all(l,R,...O.params);return{observations:u,sessions:b.map(N=>({id:N.id,memory_session_id:N.memory_session_id,project:N.project,request:N.request,completed:N.completed,next_steps:N.next_steps,created_at:N.created_at,created_at_epoch:N.created_at_epoch})),prompts:D.map(N=>({id:N.id,content_session_id:N.content_session_id,prompt_number:N.prompt_number,prompt_text:N.prompt_text,project:N.project,platform_source:N.platform_source,created_at:N.created_at,created_at_epoch:N.created_at_epoch}))}}getOrCreateManualSession(e){let s=`manual-${e}`,t=`manual-content-${e}`;if(this.db.prepare("SELECT memory_session_id FROM sdk_sessions WHERE memory_session_id = ?").get(s))return s;let n=new Date;return this.db.prepare(`
      INSERT INTO sdk_sessions (memory_session_id, content_session_id, project, platform_source, started_at, started_at_epoch, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(s,t,e,p,n.toISOString(),n.getTime()),a.info("SESSION","Created manual session",{memorySessionId:s,project:e}),s}close(){this.db.close()}importSdkSession(e){let s=h(e.platform_source),t=this.db.prepare(`SELECT id FROM sdk_sessions
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
    `).run(e.memory_session_id,e.project,e.text,e.type,e.title,e.subtitle,e.facts,e.narrative,e.concepts,e.files_read,e.files_modified,e.prompt_number,e.discovery_tokens||0,e.agent_type??null,e.agent_id??null,e.created_at,e.created_at_epoch).lastInsertRowid}}rebuildObservationsFTSIndex(){this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run("INSERT INTO observations_fts(observations_fts) VALUES('rebuild')")}importUserPrompt(e){let s=null,t=e.platform_source?h(e.platform_source):void 0;if(typeof e.session_db_id=="number"){let E=this.db.prepare(`
        SELECT id, content_session_id, COALESCE(NULLIF(platform_source, ''), '${p}') as platform_source
        FROM sdk_sessions
        WHERE id = ?
        LIMIT 1
      `).get(e.session_db_id);E&&E.content_session_id===e.content_session_id&&(!t||h(E.platform_source)===t)&&(s=E.id)}s===null&&(s=this.resolvePromptSessionDbId(e.content_session_id,void 0,t));let r=this.db.prepare(`
      SELECT id FROM user_prompts
      WHERE ${s!==null?"session_db_id = ?":"content_session_id = ?"} AND prompt_number = ?
    `).get(s??e.content_session_id,e.prompt_number);return r?{imported:!1,id:r.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO user_prompts (
        session_db_id, content_session_id, prompt_number, prompt_text,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(s,e.content_session_id,e.prompt_number,e.prompt_text,e.created_at,e.created_at_epoch).lastInsertRowid}}};0&&(module.exports={SessionStore});
