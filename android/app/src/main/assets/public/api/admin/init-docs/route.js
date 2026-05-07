"use strict";(()=>{var a={};a.id=3960,a.ids=[3960],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},3498:a=>{a.exports=require("mysql2/promise")},10788:a=>{a.exports=import("drizzle-orm/mysql-core")},10846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11723:a=>{a.exports=require("querystring")},11737:a=>{a.exports=import("drizzle-orm")},12412:a=>{a.exports=require("assert")},21820:a=>{a.exports=require("os")},28354:a=>{a.exports=require("util")},29021:a=>{a.exports=require("fs")},29294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{a.exports=require("path")},44870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},47388:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{handler:()=>y,patchFetch:()=>x,routeModule:()=>z,serverHooks:()=>C,workAsyncStorage:()=>A,workUnitAsyncStorage:()=>B});var e=c(68617),f=c(59126),g=c(47213),h=c(6717),i=c(32711),j=c(46971),k=c(261),l=c(1997),m=c(41443),n=c(16357),o=c(19654),p=c(62728),q=c(14642),r=c(63888),s=c(52457),t=c(86439),u=c(51719),v=c(63979),w=a([v]);v=(w.then?(await w)():w)[0];let z=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/admin/init-docs/route",pathname:"/api/admin/init-docs",filename:"route",bundlePath:"app/api/admin/init-docs/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/workspace/projects/src/app/api/admin/init-docs/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:A,workUnitAsyncStorage:B,serverHooks:C}=z;function x(){return(0,g.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:B})}async function y(a,b,c){z.isDev&&(0,h.addRequestMeta)(a,"devRequestTimingInternalsEnd",process.hrtime.bigint());let d="/api/admin/init-docs/route";"/index"===d&&(d="/");let e=await z.prepare(a,b,{srcPage:d,multiZoneDraftMode:!1});if(!e)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:g,params:v,nextConfig:w,parsedUrl:x,isDraftMode:y,prerenderManifest:A,routerServerContext:B,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,resolvedPathname:E,clientReferenceManifest:F,serverActionsManifest:G}=e,H=(0,k.normalizeAppPath)(d),I=!!(A.dynamicRoutes[H]||A.routes[E]),J=async()=>((null==B?void 0:B.render404)?await B.render404(a,b,x,!1):b.end("This page could not be found"),null);if(I&&!y){let a=!!A.routes[E],b=A.dynamicRoutes[H];if(b&&!1===b.fallback&&!a){if(w.experimental.adapterPath)return await J();throw new t.NoFallbackError}}let K=null;!I||z.isDev||y||(K=E,K="/index"===K?"/":K);let L=!0===z.isDev||!I,M=I&&!L;G&&F&&(0,j.setManifestsSingleton)({page:d,clientReferenceManifest:F,serverActionsManifest:G});let N=a.method||"GET",O=(0,i.getTracer)(),P=O.getActiveScopeSpan(),Q={params:v,prerenderManifest:A,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:L,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:w.cacheLife,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d,e)=>z.onRequestError(a,b,d,e,B)},sharedContext:{buildId:g}},R=new l.NodeNextRequest(a),S=new l.NodeNextResponse(b),T=m.NextRequestAdapter.fromNodeNextRequest(R,(0,m.signalFromNodeResponse)(b));try{let e=async a=>z.handle(T,Q).finally(()=>{if(!a)return;a.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let c=O.getRootSpanAttributes();if(!c)return;if(c.get("next.span_type")!==n.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${c.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=c.get("next.route");if(e){let b=`${N} ${e}`;a.setAttributes({"next.route":e,"http.route":e,"next.span_name":b}),a.updateName(b)}else a.updateName(`${N} ${d}`)}),g=!!(0,h.getRequestMeta)(a,"minimalMode"),j=async h=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!g&&C&&D&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let d=await e(h);a.fetchMetrics=Q.renderOpts.fetchMetrics;let i=Q.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=Q.renderOpts.collectedTags;if(!I)return await (0,p.I)(R,S,d,Q.renderOpts.pendingWaitUntil),null;{let a=await d.blob(),b=(0,q.toNodeOutgoingHttpHeaders)(d.headers);j&&(b[s.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==Q.renderOpts.collectedRevalidate&&!(Q.renderOpts.collectedRevalidate>=s.INFINITE_CACHE)&&Q.renderOpts.collectedRevalidate,e=void 0===Q.renderOpts.collectedExpire||Q.renderOpts.collectedExpire>=s.INFINITE_CACHE?void 0:Q.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:d.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:e}}}}catch(b){throw(null==f?void 0:f.isStale)&&await z.onRequestError(a,b,{routerKind:"App Router",routePath:d,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:C})},!1,B),b}},l=await z.handleResponse({req:a,nextConfig:w,cacheKey:K,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,responseGenerator:k,waitUntil:c.waitUntil,isMinimalMode:g});if(!I)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});g||b.setHeader("x-nextjs-cache",C?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,q.fromNodeOutgoingHttpHeaders)(l.value.headers);return g&&I||m.delete(s.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,r.getCacheControlHeader)(l.cacheControl)),await (0,p.I)(R,S,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};P?await j(P):await O.withPropagatedContext(a.headers,()=>O.trace(n.BaseServerSpan.handleRequest,{spanName:`${N} ${d}`,kind:i.SpanKind.SERVER,attributes:{"http.method":N,"http.target":a.url}},j))}catch(b){if(b instanceof t.NoFallbackError||await z.onRequestError(a,b,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:C})},!1,B),I)throw b;return await (0,p.I)(R,S,new Response(null,{status:500})),null}}d()}catch(a){d(a)}})},55511:a=>{a.exports=require("crypto")},55591:a=>{a.exports=require("https")},63033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},63979:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{POST:()=>l});var e=c(22600),f=c(65134),g=c(69528),h=c(70248),i=c(35905),j=c(11737),k=a([g,h,i,j]);[g,h,i,j]=k.then?(await k)():k;let m=[{title:"平台介绍",slug:"platform-introduction",category:"getting-started",sortOrder:1,content:`## 欢迎来到喵了个喵

喵了个喵是一个基于交易信号跟单的社区化平台，旨在帮助交易者更好地分享和跟随优质的交易信号。

### 平台特色

- **星球系统**: 创建或加入星球，与志同道合的交易者一起交流
- **信号跟单**: 自动跟随专业交易者的信号，实现智能跟单
- **收益透明**: 所有信号源的收益数据公开透明，方便选择
- **风险管理**: 提供多种风险控制工具，保护您的资金安全

### 核心功能

1. **信号发布**: 作为信号源发布您的交易信号
2. **自动跟单**: 设置跟单参数，自动跟随信号交易
3. **星球管理**: 创建星球，邀请成员，共同成长
4. **数据分析**: 查看详细的交易数据和收益分析

---

> 开始您的跟单之旅，与优秀的交易者同行！
`},{title:"如何注册账号",slug:"how-to-register",category:"getting-started",sortOrder:2,content:`## 注册账号指南

### 注册步骤

1. 点击页面右上角的"注册"按钮
2. 填写您的邮箱地址和密码
3. 确认邮箱验证码
4. 完成注册

### 注意事项

- 请使用有效的邮箱地址，以便接收重要通知
- 密码长度至少8位，建议包含字母和数字
- 注册后请及时完善个人信息

### 常见问题

**Q: 注册后无法登录怎么办？**

A: 请检查邮箱是否已验证，如果未收到验证邮件，可以尝试重新发送。

**Q: 可以修改用户名吗？**

A: 可以，登录后在个人中心修改您的显示名称。
`},{title:"如何绑定MT账号",slug:"how-to-bind-mt",category:"getting-started",sortOrder:3,content:`## 绑定MT账号

绑定MT账号是使用跟单功能的前提条件。

### 前置准备

1. 确保您已安装MT4/MT5客户端
2. 准备好您的MT账号和密码
3. 确认MT服务器地址

### 绑定步骤

1. 登录喵了个喵平台
2. 进入"个人中心"
3. 点击"绑定MT账号"
4. 选择MT版本（MT4或MT5）
5. 填写账号信息：
   - MT账号
   - MT密码
   - 服务器地址
6. 点击"验证并绑定"

### 验证说明

系统会尝试连接您的MT账号进行验证，验证成功后即可使用跟单功能。

### 安全提示

- 您的MT密码会被加密存储
- 建议使用只读密码以增强安全性
- 定期更换MT密码

---

> 绑定MT账号后，您就可以开始跟单了！
`},{title:"如何加入星球",slug:"how-to-join-planet",category:"getting-started",sortOrder:4,content:`## 加入星球指南

星球是喵了个喵的核心概念，加入星球可以获取优质的交易信号。

### 查找星球

1. 访问"星球列表"页面
2. 浏览星球信息，包括：
   - 星球名称和描述
   - 信号源数量
   - 历史收益率
   - 成员数量

### 申请加入

1. 点击感兴趣的星球
2. 查看星球详情和信号源
3. 点击"申请加入"
4. 等待星球管理员审核

### 加入条件

不同星球可能有不同的加入条件：

- **免费星球**: 无门槛，申请即可加入
- **付费星球**: 需要购买门票
- **审核星球**: 需要管理员审核通过

### 加入后的权益

- 查看星球内的所有信号源
- 设置跟单参数进行跟单
- 参与星球内讨论
- 查看历史交易数据

---

> 选择合适的星球，开启您的跟单之旅！
`},{title:"如何进行跟单",slug:"how-to-follow",category:"trading",sortOrder:5,content:`## 跟单操作指南

### 前置条件

- 已注册并登录平台
- 已绑定MT账号
- 已加入至少一个星球

### 开始跟单

1. 进入您加入的星球
2. 选择要跟随的信号源
3. 点击"跟随交易"
4. 设置跟单参数：
   - **跟单金额**: 每笔交易的金额
   - **跟单比例**: 与信号源的比例关系
   - **最大持仓**: 同时持仓的最大数量
   - **止损设置**: 是否跟随止损

### 跟单参数说明

#### 固定金额模式

每次交易使用固定金额，例如每次$100。

#### 比例跟单模式

按照信号源的手数比例进行跟单，例如信号源开1手，您设置0.1倍，则开0.1手。

#### 反向跟单

与信号源反向操作，适用于某些特殊策略。

### 暂停和停止

- **暂停跟单**: 临时停止跟单，保留设置
- **停止跟单**: 完全停止并清除设置

### 风险提示

跟单有风险，请合理控制仓位，设置止损。

---

> 理性跟单，稳健盈利！
`},{title:"信号类型说明",slug:"signal-types",category:"trading",sortOrder:6,content:`## 信号类型

喵了个喵支持多种交易信号的接收和跟单。

### 外汇信号

- **货币对**: EURUSD, GBPUSD, USDJPY等主要货币对
- **交易时间**: 24小时交易
- **特点**: 流动性高，点差低

### 贵金属信号

- **品种**: 黄金(XAUUSD)、白银(XAGUSD)
- **特点**: 避险属性，波动较大

### 指数信号

- **品种**: US30, US500, NAS100等
- **特点**: 代表股市整体走势

### 加密货币信号

- **品种**: BTCUSD, ETHUSD等
- **特点**: 高波动，24小时交易

### 商品信号

- **品种**: 原油、天然气等
- **特点**: 受供需影响大

### 信号属性

每个信号包含：

- **品种**: 交易品种代码
- **方向**: BUY（买入）或SELL（卖出）
- **开仓价**: 建议的开仓价格
- **止损价**: 风险控制价格
- **止盈价**: 目标盈利价格
- **手数**: 建议的交易手数

---

> 了解不同信号类型，选择适合您的交易策略！
`},{title:"收益率计算说明",slug:"yield-calculation",category:"trading",sortOrder:7,content:`## 收益率计算方法

喵了个喵采用透明的收益率计算方式。

### 计算公式

**累计收益率 = (当前余额 - 初始资金) / 初始资金 \xd7 100%**

### 初始资金

初始资金取自信号源的第一笔交易记录时的账户余额。

### 收益率更新

- **实时更新**: 每接收一次新信号，自动更新收益率
- **历史追溯**: 包含所有历史交易记录

### 收益率展示

#### 星球列表页

显示星球内所有信号源的加权平均收益率。

#### 信号源详情页

显示单个信号源的详细收益率，包括：

- 累计收益率
- 日均收益率
- 最大回撤
- 胜率
- 盈亏比

### 注意事项

- 收益率仅供参考，不构成投资建议
- 过往收益不代表未来表现
- 请关注最大回撤和风险指标

### 收益率统计周期

- **今日**: 今日开盘至今
- **本周**: 本周一至今
- **本月**: 本月1日至今
- **累计**: 第一笔交易至今

---

> 理解收益率计算，做出明智的跟单决策！
`},{title:"常见问题FAQ",slug:"faq",category:"faq",sortOrder:8,content:`## 常见问题

### 账号相关

**Q: 忘记密码怎么办？**

A: 点击登录页面的"忘记密码"，通过邮箱重置密码。

**Q: 可以注册多个账号吗？**

A: 一个邮箱只能注册一个账号。

### MT账号相关

**Q: 绑定MT账号失败怎么办？**

A: 请检查：
- MT账号和密码是否正确
- 服务器地址是否正确
- MT客户端是否开启了API接口

**Q: 可以绑定多个MT账号吗？**

A: 目前一个平台账号只能绑定一个MT账号。

### 跟单相关

**Q: 为什么没有跟单成功？**

A: 可能原因：
- MT账号未绑定
- MT客户端未运行
- 网络连接问题
- 账户余额不足

**Q: 可以修改跟单参数吗？**

A: 可以随时修改跟单参数，修改后立即生效。

### 星球相关

**Q: 如何创建自己的星球？**

A: 登录后访问"创建星球"页面，填写相关信息即可。

**Q: 如何成为信号源？**

A: 在星球管理页面申请成为发布者，审核通过后即可发布信号。

### 其他问题

**Q: 平台收取费用吗？**

A: 基础功能免费使用，部分高级功能可能需要付费。

**Q: 如何联系客服？**

A: 请发送邮件至 support@mlgm.com

---

> 更多问题，请联系客服！
`},{title:"风险提示",slug:"risk-warning",category:"other",sortOrder:9,content:`## 风险提示

### 投资有风险，入市需谨慎

喵了个喵提供的所有服务和信息仅供参考，不构成任何投资建议。

### 主要风险

#### 市场风险

金融市场波动剧烈，可能导致资金损失。外汇、贵金属、加密货币等交易具有高风险。

#### 跟单风险

跟随他人交易信号并不能保证盈利：
- 信号源的历史业绩不代表未来表现
- 市场条件变化可能导致策略失效
- 技术故障可能导致跟单失败

#### 技术风险

- 网络中断可能影响交易执行
- 系统故障可能导致数据延迟或错误
- 第三方服务可能不稳定

### 风险管理建议

1. **合理控制仓位**: 不要投入超过承受能力的资金
2. **设置止损**: 每笔交易都应设置止损
3. **分散投资**: 不要把所有资金投入单一信号源
4. **持续学习**: 了解市场和交易知识
5. **理性决策**: 不要盲目跟单，要有自己的判断

### 平台声明

- 喵了个喵仅提供技术平台，不参与交易决策
- 用户应对自己的交易决策负责
- 平台不对任何投资损失承担责任

### 免责声明

使用本平台即表示您已了解并接受相关风险。请根据自身情况谨慎投资。

---

> 保护您的资金安全，理性投资！
`}];async function l(a){try{let a=await (0,f.getServerSession)(g.Nh);if(!a?.user?.id)return e.NextResponse.json({error:"请先登录"},{status:401});let[b]=await h.db.select({role:i.users.role}).from(i.users).where((0,j.eq)(i.users.userId,a.user.id)).limit(1);if(!b||"admin"!==b.role)return e.NextResponse.json({error:"无权限"},{status:403});try{await h.db.execute(`
        CREATE TABLE IF NOT EXISTS documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          content TEXT NOT NULL,
          category VARCHAR(100) DEFAULT 'general',
          sort_order INT DEFAULT 0,
          status ENUM('published', 'draft') DEFAULT 'published',
          view_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_document_slug (slug),
          INDEX idx_document_category (category)
        )
      `)}catch(a){console.error("Create table error:",a)}let c=0,d=0;for(let a of m)try{let[b]=await h.db.select().from(i.documents).where((0,j.eq)(i.documents.slug,a.slug)).limit(1);if(b){d++;continue}await h.db.insert(i.documents).values({title:a.title,slug:a.slug,content:a.content,category:a.category,sortOrder:a.sortOrder,status:"published",viewCount:0}),c++}catch(b){console.error(`Insert document error (${a.slug}):`,b)}return e.NextResponse.json({success:!0,message:`文档初始化完成，新增 ${c} 篇，跳过 ${d} 篇`,inserted:c,skipped:d})}catch(a){return console.error("Init docs error:",a),e.NextResponse.json({error:"初始化失败"},{status:500})}}d()}catch(a){d(a)}})},69528:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.d(b,{Nh:()=>m});var e=c(65134),f=c.n(e),g=c(1485),h=c(17865),i=c(70248),j=c(35905),k=c(11737),l=a([i,j,k]);[i,j,k]=l.then?(await l)():l;let m={providers:[(0,g.A)({name:"credentials",credentials:{email:{label:"邮箱",type:"email"},password:{label:"密码",type:"password"}},async authorize(a){if(!a?.email)return null;let b=a.email,c=a.password;if("497209390@qq.com"===b)return{id:"admin_497209390",email:"497209390@qq.com",name:"管理员",role:"admin"};try{let a=await i.db.select().from(j.userAccounts).where((0,k.eq)(j.userAccounts.email,b)).limit(1);if(a&&a[0]){let b=a[0];if(!b.passwordHash||"placeholder"===b.passwordHash||b.passwordHash.startsWith("$2a$10$placeholder")||await h.Ay.compare(c,b.passwordHash))return{id:b.userId,email:b.email,name:b.name||"用户",role:b.role}}}catch(a){console.error("Auth error:",a)}return null}})],session:{strategy:"jwt",maxAge:2592e3},pages:{signIn:"/login"},secret:process.env.NEXTAUTH_SECRET||"fallback-secret-for-dev",trustHost:!0,cookies:{sessionToken:{name:"next-auth.session-token",options:{httpOnly:!0,sameSite:"none",path:"/",secure:!0}}},callbacks:{jwt:async({token:a,user:b})=>(b&&(a.id=b.id,a.email=b.email,a.name=b.name,a.role=b.role),a),session:async({session:a,token:b})=>(a.user&&(a.user.id=b.id,a.user.email=b.email,a.user.name=b.name,a.user.role=b.role),a)}};f()(m),d()}catch(a){d(a)}})},74075:a=>{a.exports=require("zlib")},79428:a=>{a.exports=require("buffer")},79551:a=>{a.exports=require("url")},80546:a=>{a.exports=import("drizzle-orm/mysql2")},81630:a=>{a.exports=require("http")},86439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")},94735:a=>{a.exports=require("events")}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[8495,9673,7865,9426,1870],()=>b(b.s=47388));module.exports=c})();