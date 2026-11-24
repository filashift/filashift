import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const handlers={},stored=new Map();
let requests=0;
const cache={match:async r=>stored.get(r.url),put:async(r,v)=>stored.set(r.url,v)};
vm.runInNewContext(readFileSync("client/public/sw.js","utf8"),{
  URL, location:new URL("https://filashift.com/"), self:{addEventListener:(n,f)=>handlers[n]=f},
  caches:{open:async()=>cache},fetch:async()=>{requests++;return new Response("fixture")}
});
async function get(path){
  let reply;
  handlers.fetch({request:new Request("https://filashift.com"+path),respondWith:r=>reply=r});
  assert(await reply);
}
await get("/assets/index-test.js");await get("/assets/index-test.js");
assert.equal(requests,1,"cached versioned asset must not start a network fetch");
await get("/profiles/index.json");await get("/profiles/index.json");
assert.equal(requests,3,"profile updates still revalidate");
console.log("Immutable cache hits make zero further fetches; profiles revalidate.");
