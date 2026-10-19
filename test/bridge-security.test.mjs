import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { startBridge, sharedBridge, captureSchema } from '../src/bridge.mjs';
import { BRIDGE_PROTOCOL, MAX_CAPTURE_BYTES, bridgeRequest, open, seal } from '../extension/bridge-protocol.mjs';

const capture = () => ({ url:'https://example.com/private-terms', title:'Private capture fixture', text:'PRIVATE_BROWSER_CAPTURE_SENT_ONLY_TO_PAIRED_SERVICE', links:[], captured_at:new Date().toISOString(), truncated:false, selection:false });
const close = server => new Promise(resolve => server.close(resolve));

test('a prebound unrelated listener sees no token or plaintext from MCP sharing or extension transport', async t => {
  const token = randomBytes(32).toString('hex'), observed=[];
  const rogue=http.createServer(async(req,res)=>{
    const chunks=[]; for await(const chunk of req) chunks.push(chunk);
    observed.push({headers:req.headers,body:Buffer.concat(chunks).toString('utf8')});
    const value=req.url==='/challenge'?{protocol:BRIDGE_PROTOCOL,challenge:'f'.repeat(64)}:{protocol:BRIDGE_PROTOCOL,capture:{...capture(),received_at:new Date().toISOString()}};
    res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(value));
  });
  await new Promise(resolve=>rogue.listen(0,'127.0.0.1',resolve)); t.after(()=>close(rogue));
  const port=rogue.address().port, peer=sharedBridge({token,port}); t.after(()=>peer.close());
  await assert.rejects(peer.latest(), /Capture failed/);
  await assert.rejects(bridgeRequest({token,endpoint:`http://127.0.0.1:${port}`},'capture',capture()), /Capture failed/);
  assert.equal(observed.filter(item=>item.body).length,2);
  const wire=JSON.stringify(observed);
  assert(!wire.includes(token));
  assert(!wire.includes(capture().text));
  assert(!wire.includes(capture().url));
  assert(observed.every(item=>!item.headers.authorization));
});

test('challenge replay, wrong keys, modified requests and reflected responses fail closed', async t => {
  const token=randomBytes(32).toString('hex'), bridge=await startBridge({token,port:0}); t.after(()=>close(bridge.server));
  const endpoint=`http://127.0.0.1:${bridge.server.address().port}`;
  const challenge=async()=> (await(await fetch(endpoint+'/challenge')).json()).challenge;
  const send=envelope=>fetch(endpoint+'/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope)});
  const nonce=await challenge(), envelope=await seal(token,'request',nonce,{operation:'capture',capture:capture()});
  const response=await send(envelope); assert.equal(response.status,200);
  const encrypted=await response.json();
  assert.equal((await open(token,'response',nonce,encrypted)).result.captured,true);
  assert.equal((await send(envelope)).status,401,'a consumed server challenge cannot be replayed');
  await assert.rejects(open(token,'response',nonce,envelope),/Capture failed/,'request ciphertext cannot be reflected as a response');
  const wrong=await seal('0'.repeat(64),'request',await challenge(),{operation:'capture',capture:capture()});
  assert.equal((await send(wrong)).status,401);
  const tampered=await seal(token,'request',await challenge(),{operation:'capture',capture:capture()});
  tampered.ciphertext=(tampered.ciphertext[0]==='A'?'B':'A')+tampered.ciphertext.slice(1);
  assert.equal((await send(tampered)).status,401);
  const legitimate=await bridgeRequest({token,endpoint},'latest'); assert.equal(legitimate.capture.text,capture().text);
  await assert.rejects(bridgeRequest({token,endpoint},'latest',undefined,{fetchImpl:async(url,options)=>url.endsWith('/bridge')?new Response(JSON.stringify(encrypted),{status:200}):fetch(url,options)}), /Capture failed/, 'an earlier encrypted response cannot be replayed into another challenge');
});

test('a listener substituted after a genuine challenge still receives only authenticated ciphertext', async t => {
  const token=randomBytes(32).toString('hex'), bridge=await startBridge({token,port:0}); t.after(()=>close(bridge.server));
  const endpoint=`http://127.0.0.1:${bridge.server.address().port}`;
  let intercepted;
  await assert.rejects(bridgeRequest({token,endpoint},'capture',capture(),{fetchImpl:async(url,options)=>{
    if(url.endsWith('/challenge'))return fetch(url,options);
    intercepted=JSON.parse(options.body);
    assert(!options.body.includes(token)); assert(!options.body.includes(capture().text));
    return new Response(JSON.stringify({captured:true}),{status:200});
  }}),/Capture failed/);
  const response=await fetch(endpoint+'/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(intercepted)});
  assert.equal(response.status,200,'a transparent relay can deliver the already-authorized capture');
  await assert.rejects(open('0'.repeat(64),'response',intercepted.challenge,await response.json()),/Capture failed/,'the intercepting listener cannot decrypt the service response');
  assert.equal((await fetch(endpoint+'/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(intercepted)})).status,401);
  assert.equal(bridge.latest().text,capture().text);
});

test('the largest accepted capture remains readable and oversized captures preserve the prior snapshot', async t => {
  const token=randomBytes(32).toString('hex'), bridge=await startBridge({token,port:0}); t.after(()=>close(bridge.server));
  const port=bridge.server.address().port, endpoint=`http://127.0.0.1:${port}`, peer=sharedBridge({token,port}); t.after(()=>peer.close());
  const sized=maximum=>{
    const value={...capture(),text:'',links:Array.from({length:40},()=>({label:'\u0001'.repeat(200),url:'\u0001'.repeat(2000)+'https://example.com'}))};
    const remaining=maximum-Buffer.byteLength(JSON.stringify(value));
    value.text='\u0001'.repeat(Math.floor(remaining/6))+'x'.repeat(remaining%6);
    assert.equal(Buffer.byteLength(JSON.stringify(value)),maximum);
    return captureSchema.parse(value);
  };
  const maximum=sized(MAX_CAPTURE_BYTES);
  assert.equal((await bridgeRequest({token,endpoint},'capture',maximum)).captured,true);
  assert.equal((await peer.latest()).text,maximum.text);
  const excessive=sized(MAX_CAPTURE_BYTES+1);
  await assert.rejects(bridgeRequest({token,endpoint},'capture',excessive),/exceeds/);
  const nonce=(await(await fetch(endpoint+'/challenge')).json()).challenge;
  const envelope=await seal(token,'request',nonce,{operation:'capture',capture:excessive});
  assert.equal((await fetch(endpoint+'/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope)})).status,413);
  assert.equal((await peer.latest()).text,maximum.text);
});
