import { recordAnonymous } from './anonymous-analytics';
import handler from 'vinext/server/fetch-handler';
export default { async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
 const response=await handler.fetch(request,env,ctx);
 ctx.waitUntil(recordAnonymous(request,response,env.DB));
 return response;
}};
