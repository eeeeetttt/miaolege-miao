"use strict";(()=>{var a={};a.id=7175,a.ids=[7175],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},3498:a=>{a.exports=require("mysql2/promise")},10788:a=>{a.exports=import("drizzle-orm/mysql-core")},10846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},21820:a=>{a.exports=require("os")},29021:a=>{a.exports=require("fs")},29294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{a.exports=require("path")},44870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:a=>{a.exports=require("crypto")},63033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78766:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{POST:()=>h});var e=c(22600),f=c(70248),g=a([f]);async function h(a){try{let{password:b}=await a.json();if(b!==process.env.ADMIN_PASSWORD&&"admin123"!==b)return e.NextResponse.json({error:"密码错误"},{status:403});let c=await f.pool.getConnection();try{return await c.execute("SET FOREIGN_KEY_CHECKS = 0"),await c.execute("DROP TABLE IF EXISTS software_purchases"),await c.execute("DROP TABLE IF EXISTS follow_purchases"),await c.execute("DROP TABLE IF EXISTS verification_tokens"),await c.execute("DROP TABLE IF EXISTS sessions"),await c.execute("DROP TABLE IF EXISTS accounts"),await c.execute("DROP TABLE IF EXISTS signals"),await c.execute("DROP TABLE IF EXISTS planet_earnings"),await c.execute("DROP TABLE IF EXISTS planet_applications"),await c.execute("DROP TABLE IF EXISTS planet_members"),await c.execute("DROP TABLE IF EXISTS planets"),await c.execute("DROP TABLE IF EXISTS users"),await c.execute("SET FOREIGN_KEY_CHECKS = 1"),await c.execute(`
        CREATE TABLE IF NOT EXISTS users (
          user_id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255),
          name VARCHAR(255),
          coin_balance INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS planets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          rules TEXT,
          creator_id VARCHAR(255) NOT NULL,
          coins INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ticket_price INT DEFAULT 0,
          invite_code VARCHAR(50),
          max_publishers INT DEFAULT 3,
          status ENUM('active','closed') DEFAULT 'active',
          duration_days INT DEFAULT 365,
          owner_as_publisher BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS planet_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          role ENUM('owner','publisher','follower') NOT NULL,
          join_method ENUM('purchase','invite') DEFAULT 'purchase',
          ticket_paid INT DEFAULT 0,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expiry_date TIMESTAMP NULL,
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          UNIQUE KEY uk_planet_user (planet_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS planet_applications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          status ENUM('pending','approved','rejected') DEFAULT 'pending',
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          handled_at TIMESTAMP NULL,
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          UNIQUE KEY uk_planet_user_app (planet_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS planet_earnings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          amount INT NOT NULL,
          type ENUM('ticket') DEFAULT 'ticket',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS signals (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sender_account VARCHAR(255) NOT NULL,
          signal_type VARCHAR(50) NOT NULL,
          ticket BIGINT,
          symbol VARCHAR(50),
          order_type VARCHAR(10),
          volume DECIMAL(10,2),
          price DECIMAL(10,4),
          sl DECIMAL(10,4),
          tp DECIMAL(10,4),
          comment TEXT,
          user_id VARCHAR(255),
          deal_profit DECIMAL(10,2),
          planet_id INT DEFAULT NULL,
          INDEX idx_sender_account (sender_account),
          INDEX idx_planet (planet_id),
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          providerAccountId VARCHAR(255) NOT NULL,
          refresh_token TEXT,
          access_token TEXT,
          expires_at BIGINT,
          token_type VARCHAR(255),
          scope VARCHAR(255),
          id_token TEXT,
          session_state VARCHAR(255),
          INDEX(provider, providerAccountId),
          FOREIGN KEY (userId) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId VARCHAR(255) NOT NULL,
          expires TIMESTAMP NOT NULL,
          sessionToken VARCHAR(255) NOT NULL UNIQUE,
          FOREIGN KEY (userId) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS verification_tokens (
          identifier VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS mt_accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          account_number VARCHAR(50) NOT NULL,
          broker VARCHAR(255),
          platform ENUM('MT4', 'MT5') NOT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          verified_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_user_mt_account (user_id),
          UNIQUE KEY uk_mt_account_number (account_number, platform),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS follow_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          signal_id BIGINT NOT NULL,
          status ENUM('active', 'paused', 'closed') DEFAULT 'active',
          copy_volume DECIMAL(10,2),
          copy_ratio DECIMAL(5,2) DEFAULT 1.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          paused_at TIMESTAMP NULL,
          closed_at TIMESTAMP NULL,
          INDEX idx_planet_user_follow (planet_id, user_id),
          INDEX idx_signal_follow (signal_id),
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),await c.execute(`
        CREATE TABLE IF NOT EXISTS coin_recharges (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          amount INT NOT NULL,
          payment_method VARCHAR(50),
          transaction_id VARCHAR(255),
          status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
          admin_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP NULL,
          INDEX idx_user_recharge (user_id),
          INDEX idx_recharge_status (status),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),e.NextResponse.json({success:!0,message:"数据库初始化成功"})}finally{c.release()}}catch(a){return console.error("Database initialization error:",a),e.NextResponse.json({error:"数据库初始化失败",details:String(a)},{status:500})}}f=(g.then?(await g)():g)[0],d()}catch(a){d(a)}})},80546:a=>{a.exports=import("drizzle-orm/mysql2")},86439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")},92250:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{handler:()=>y,patchFetch:()=>x,routeModule:()=>z,serverHooks:()=>C,workAsyncStorage:()=>A,workUnitAsyncStorage:()=>B});var e=c(68617),f=c(59126),g=c(47213),h=c(6717),i=c(32711),j=c(46971),k=c(261),l=c(1997),m=c(41443),n=c(16357),o=c(19654),p=c(62728),q=c(14642),r=c(63888),s=c(52457),t=c(86439),u=c(51719),v=c(78766),w=a([v]);v=(w.then?(await w)():w)[0];let z=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/admin/init-db/route",pathname:"/api/admin/init-db",filename:"route",bundlePath:"app/api/admin/init-db/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/workspace/projects/src/app/api/admin/init-db/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:A,workUnitAsyncStorage:B,serverHooks:C}=z;function x(){return(0,g.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:B})}async function y(a,b,c){z.isDev&&(0,h.addRequestMeta)(a,"devRequestTimingInternalsEnd",process.hrtime.bigint());let d="/api/admin/init-db/route";"/index"===d&&(d="/");let e=await z.prepare(a,b,{srcPage:d,multiZoneDraftMode:!1});if(!e)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:g,params:v,nextConfig:w,parsedUrl:x,isDraftMode:y,prerenderManifest:A,routerServerContext:B,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,resolvedPathname:E,clientReferenceManifest:F,serverActionsManifest:G}=e,H=(0,k.normalizeAppPath)(d),I=!!(A.dynamicRoutes[H]||A.routes[E]),J=async()=>((null==B?void 0:B.render404)?await B.render404(a,b,x,!1):b.end("This page could not be found"),null);if(I&&!y){let a=!!A.routes[E],b=A.dynamicRoutes[H];if(b&&!1===b.fallback&&!a){if(w.experimental.adapterPath)return await J();throw new t.NoFallbackError}}let K=null;!I||z.isDev||y||(K=E,K="/index"===K?"/":K);let L=!0===z.isDev||!I,M=I&&!L;G&&F&&(0,j.setManifestsSingleton)({page:d,clientReferenceManifest:F,serverActionsManifest:G});let N=a.method||"GET",O=(0,i.getTracer)(),P=O.getActiveScopeSpan(),Q={params:v,prerenderManifest:A,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:L,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:w.cacheLife,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d,e)=>z.onRequestError(a,b,d,e,B)},sharedContext:{buildId:g}},R=new l.NodeNextRequest(a),S=new l.NodeNextResponse(b),T=m.NextRequestAdapter.fromNodeNextRequest(R,(0,m.signalFromNodeResponse)(b));try{let e=async a=>z.handle(T,Q).finally(()=>{if(!a)return;a.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let c=O.getRootSpanAttributes();if(!c)return;if(c.get("next.span_type")!==n.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${c.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=c.get("next.route");if(e){let b=`${N} ${e}`;a.setAttributes({"next.route":e,"http.route":e,"next.span_name":b}),a.updateName(b)}else a.updateName(`${N} ${d}`)}),g=!!(0,h.getRequestMeta)(a,"minimalMode"),j=async h=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!g&&C&&D&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let d=await e(h);a.fetchMetrics=Q.renderOpts.fetchMetrics;let i=Q.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=Q.renderOpts.collectedTags;if(!I)return await (0,p.I)(R,S,d,Q.renderOpts.pendingWaitUntil),null;{let a=await d.blob(),b=(0,q.toNodeOutgoingHttpHeaders)(d.headers);j&&(b[s.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==Q.renderOpts.collectedRevalidate&&!(Q.renderOpts.collectedRevalidate>=s.INFINITE_CACHE)&&Q.renderOpts.collectedRevalidate,e=void 0===Q.renderOpts.collectedExpire||Q.renderOpts.collectedExpire>=s.INFINITE_CACHE?void 0:Q.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:d.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:e}}}}catch(b){throw(null==f?void 0:f.isStale)&&await z.onRequestError(a,b,{routerKind:"App Router",routePath:d,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:C})},!1,B),b}},l=await z.handleResponse({req:a,nextConfig:w,cacheKey:K,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,responseGenerator:k,waitUntil:c.waitUntil,isMinimalMode:g});if(!I)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});g||b.setHeader("x-nextjs-cache",C?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,q.fromNodeOutgoingHttpHeaders)(l.value.headers);return g&&I||m.delete(s.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,r.getCacheControlHeader)(l.cacheControl)),await (0,p.I)(R,S,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};P?await j(P):await O.withPropagatedContext(a.headers,()=>O.trace(n.BaseServerSpan.handleRequest,{spanName:`${N} ${d}`,kind:i.SpanKind.SERVER,attributes:{"http.method":N,"http.target":a.url}},j))}catch(b){if(b instanceof t.NoFallbackError||await z.onRequestError(a,b,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:C})},!1,B),I)throw b;return await (0,p.I)(R,S,new Response(null,{status:500})),null}}d()}catch(a){d(a)}})}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[8495,9673,1870],()=>b(b.s=92250));module.exports=c})();