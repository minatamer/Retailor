import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { sourceSnapshot } from "./snapshot.mjs";
import { publicError } from "@retailor/contracts/api";

const root = fileURLToPath(new URL("../../", import.meta.url));
// Explicit local invocation only. No registry push, host ports or provider access.
export async function verifyContainers(frontendImage, backendImage) {
  for (const image of [frontendImage, backendImage])
    assert.match(
      image,
      /^(?:retailor\/rtl021-(?:frontend|backend):local|sha256:[a-f0-9]{64})$/u,
    );
  const docker = (args) =>
    execFileSync("docker", args, {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const created = [];
  const prefix = `retailor-release-${randomUUID()}`;
  const imageRecord = (image) => {
    const [record] = JSON.parse(docker(["image", "inspect", image]));
    return {
      id: record.Id,
      repoDigests: record.RepoDigests,
      os: record.Os,
      architecture: record.Architecture,
      bytes: record.Size,
      user: record.Config.User,
      command: record.Config.Cmd,
      environment: record.Config.Env,
    };
  };
  const images = {
    frontend: imageRecord(frontendImage),
    backend: imageRecord(backendImage),
  };
  for (const record of Object.values(images)) {
    assert.equal(record.os, "linux");
    assert.equal(record.architecture, "amd64");
    assert.equal(record.user, "node");
    assert.ok(
      !record.environment.some((value) =>
        /^(?:OPENAI_API_KEY|TURNSTILE_SECRET_KEY|GRANT_SIGNING_SECRET|RETAILOR_ORIGIN_SECRET)=/u.test(
          value,
        ),
      ),
    );
  }
  const run = (role, extra = []) => {
    const id = docker([
      "run",
      "--detach",
      "--name",
      `${prefix}-${role}`,
      "--label",
      "retailor.ticket=RTL-021",
      "--network",
      "none",
      "--cpus",
      "1",
      "--memory",
      role.startsWith("front") ? "512m" : "1g",
      "--memory-swap",
      role.startsWith("front") ? "512m" : "1g",
      "--pids-limit",
      "128",
      ...extra.flatMap(([key, value]) => ["--env", `${key}=${value}`]),
      role.startsWith("front") ? images.frontend.id : images.backend.id,
    ]);
    created.push(id);
    return id;
  };
  const execute = (id, code) =>
    JSON.parse(docker(["exec", id, "node", "--input-type=module", "-e", code]));
  async function ready(id, port) {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        execute(
          id,
          `const r=await fetch('http://127.0.0.1:${port}/',{signal:AbortSignal.timeout(1000)});console.log(JSON.stringify({status:r.status}));`,
        );
        return;
      } catch {
        await new Promise((done) => setTimeout(done, 250));
      }
    }
    throw new Error("Container failed to start");
  }
  const runtimeProbe = String.raw`
    import fs from 'node:fs/promises';
    const executable=await fs.readlink('/proc/1/exe');
    const tcp=await fs.readFile('/proc/net/tcp','utf8');
    const noFiles=['/app/.env.local','/app/.git','/app/src','/app/apps/frontend/src','/app/apps/frontend/.env.local','/app/apps/frontend/public/design/reference-shirt.png'];
    for(const path of noFiles){try{await fs.stat(path);throw new Error('Unexpected runtime input')}catch(error){if(error.code!=='ENOENT')throw error}}
    for(const path of ['/usr/local/bin/pnpm','/usr/local/bin/npm','/usr/local/bin/npx']){try{await fs.stat(path);throw new Error('Unexpected build tool')}catch(error){if(error.code!=='ENOENT')throw error}}
    console.log(JSON.stringify({uid:process.getuid(),node:process.version,pid1Node:executable.endsWith('/node'),bindAll:tcp.includes('00000000:'+Number(process.env.PORT).toString(16).toUpperCase().padStart(4,'0'))}));
  `;
  const requestProbe = (paths, port) => `
    const rows=[];for(const path of ${JSON.stringify(paths)}){const r=await fetch('http://127.0.0.1:${port}'+path,{signal:AbortSignal.timeout(12000),redirect:'error'});const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>2097152)throw new Error('Oversized probe');rows.push({path,status:r.status,bytes:bytes.length,contentType:r.headers.get('content-type'),csp:r.headers.get('content-security-policy'),body:path.startsWith('/v1/')?JSON.parse(new TextDecoder().decode(bytes)):null})};console.log(JSON.stringify(rows));`;
  let result;
  let failure;
  const cleanupFailures = [];
  try {
    const backend = run("backend", [
      ["PORT", "8080"],
      ["FRONTEND_ORIGIN", "https://retailor.invalid"],
    ]);
    await ready(backend, 8080);
    const backendRuntime = execute(backend, runtimeProbe);
    assert.equal(backendRuntime.uid, 1000);
    assert.equal(backendRuntime.pid1Node, true);
    assert.equal(backendRuntime.bindAll, true);
    const backendHttp = execute(
      backend,
      requestProbe(["/v1/health", "/v1/ready", "/v1/config"], 8080),
    );
    assert.equal(backendHttp[0].status, 200);
    assert.equal(backendHttp[1].status, 503);
    assert.equal(backendHttp[2].body.paidEnabled, false);
    assert.equal(backendHttp[2].body.mode, "live");
    for (const capability of ["vision", "tailor", "logos"])
      assert.equal(backendHttp[2].body[capability].available, false);
    const sharp = execute(
      backend,
      `import sharp from 'sharp';import {parseEnvironment} from './dist/config/environment.js';let fakeRejected=false,originRejected=false;try{parseEnvironment({...process.env,FAKE_MODE:'true'})}catch{fakeRejected=true}try{parseEnvironment({...process.env,FRONTEND_ORIGIN:'http://localhost:8080'})}catch{originRejected=true}const png=await sharp({create:{width:10,height:10,channels:3,background:'#334455'}}).png().toBuffer();console.log(JSON.stringify({vips:sharp.versions.vips,bytes:png.length,fakeRejected,originRejected}));`,
    );
    assert.equal(sharp.fakeRejected, true);
    assert.equal(sharp.originRejected, true);
    assert.ok(sharp.bytes > 0);
    const backendPost = execute(
      backend,
      `const rows=[];for(const [path,origin,body]of [['/v1/assistant/creator','https://foreign.invalid','{}'],['/v1/assistant/creator','https://retailor.invalid','{}'],['/v1/admission','https://retailor.invalid','x'.repeat(65537)]]){const r=await fetch('http://127.0.0.1:8080'+path,{method:'POST',headers:{origin,'content-type':'application/json'},body,signal:AbortSignal.timeout(6000)});rows.push({path,status:r.status,code:(await r.json()).error.code})}console.log(JSON.stringify(rows));`,
    );
    assert.equal(backendPost[0].status, 403);
    assert.equal(backendPost[1].status, 503);
    assert.equal(backendPost[2].status, 413);
    const startupRejections = [];
    for (const [name, overrides] of [
      [
        "backend-fake",
        [
          ["FRONTEND_ORIGIN", "https://retailor.invalid"],
          ["FAKE_MODE", "true"],
        ],
      ],
      ["backend-origin", [["FRONTEND_ORIGIN", "http://localhost:8080"]]],
    ]) {
      const id = run(name, overrides);
      const exitCode = Number(docker(["wait", id]));
      const [inspection] = JSON.parse(docker(["inspect", id]));
      assert.equal(exitCode, 1);
      assert.equal(inspection.State.Running, false);
      assert.equal(inspection.State.OOMKilled, false);
      startupRejections.push({
        name,
        exitCode,
        running: false,
        oomKilled: false,
      });
    }
    const frontend = run("frontend", [
      ["PORT", "8080"],
      ["FRONTEND_ORIGIN", "https://retailor.invalid"],
      ["BACKEND_ORIGIN", "https://backend.invalid"],
      ["BACKEND_AUDIENCE", "https://backend.invalid"],
    ]);
    await ready(frontend, 8080);
    const frontendRuntime = execute(frontend, runtimeProbe);
    assert.equal(frontendRuntime.uid, 1000);
    assert.equal(frontendRuntime.pid1Node, true);
    assert.equal(frontendRuntime.bindAll, true);
    const frontendHttp = execute(
      frontend,
      requestProbe(
        [
          "/",
          "/demo",
          "/design",
          "/api/retailor/v1/config",
          "/api/retailor/v1/not-an-operation",
          "/api/retailor/v1/config?url=https://example.invalid",
        ],
        8080,
      ),
    );
    assert.equal(frontendHttp[0].status, 200);
    assert.equal(frontendHttp[1].status, 200);
    assert.equal(frontendHttp[2].status, 404);
    assert.equal(frontendHttp[3].status, 503);
    assert.equal(frontendHttp[4].status, 404);
    assert.equal(frontendHttp[5].status, 503);
    assert.ok(
      frontendHttp[0].csp && !frontendHttp[0].csp.includes("unsafe-eval"),
    );
    const assetRecord = execute(
      frontend,
      String.raw`
      import fs from 'node:fs/promises';import crypto from 'node:crypto';
      const base='/app/apps/frontend/public';const manifest=JSON.parse(await fs.readFile(base+'/sample/forme/manifest.json','utf8'));const photos=[];
      for(const asset of manifest.assets){const bytes=await fs.readFile(base+'/sample/forme/'+asset.id+'.webp');const hash=crypto.createHash('sha256').update(bytes).digest('hex');if(hash!==asset.image.hash||bytes.length!==asset.image.bytes)throw new Error('Photo mismatch');const r=await fetch('http://127.0.0.1:8080/sample/forme/'+asset.id+'.webp');if(r.status!==200||crypto.createHash('sha256').update(new Uint8Array(await r.arrayBuffer())).digest('hex')!==hash)throw new Error('Photo delivery mismatch');photos.push({id:asset.id,bytes:bytes.length,sha256:hash})}
      const fonts=[];for(const name of(await fs.readdir(base+'/fonts')).sort()){const bytes=await fs.readFile(base+'/fonts/'+name);const r=await fetch('http://127.0.0.1:8080/fonts/'+name);if(r.status!==200||crypto.createHash('sha256').update(new Uint8Array(await r.arrayBuffer())).digest('hex')!==crypto.createHash('sha256').update(bytes).digest('hex'))throw new Error('Font delivery mismatch');fonts.push({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')})}
      const html=await(await fetch('http://127.0.0.1:8080/')).text();const chunk=html.match(/src="([^"]+\.js[^\"]*)"/);if(!chunk)throw new Error('No static script');const staticResponse=await fetch('http://127.0.0.1:8080'+chunk[1].replaceAll('&amp;','&'));if(staticResponse.status!==200)throw new Error('Static delivery failed');console.log(JSON.stringify({photos,fonts,staticStatus:staticResponse.status}));
    `,
    );
    assert.equal(assetRecord.photos.length, 19);
    assert.equal(
      assetRecord.fonts.filter(({ name }) => name.endsWith(".woff2")).length,
      5,
    );
    assert.equal(
      assetRecord.fonts.filter(({ name }) => name.endsWith("-OFL.txt")).length,
      4,
    );
    const guarded = run("frontend-guarded", [
      ["PORT", "8080"],
      ["FRONTEND_ORIGIN", "https://retailor.invalid"],
      // Test-only local peer verifies full streaming without IAM or provider calls.
      ["APP_ENV", "test"],
      ["BACKEND_ORIGIN", "http://127.0.0.1:8081"],
      ["BACKEND_AUDIENCE", ""],
      ["RETAILOR_ORIGIN_GUARD", "cloudflare"],
      ["RETAILOR_ORIGIN_SECRET", randomBytes(32).toString("hex")],
    ]);
    await ready(guarded, 8080);
    const originGuard = execute(
      guarded,
      String.raw`
      import http from 'node:http';
      const peerFailure=${JSON.stringify(publicError("UNAVAILABLE", "req_probe"))};
      const origin='http://127.0.0.1:8080', seal=process.env.RETAILOR_ORIGIN_SECRET;
      const headers={'x-retailor-origin':seal};
      const home=await fetch(origin+'/',{headers});const html=await home.text();
      const chunk=html.match(/src="([^"]+\.js[^\"]*)"/);if(!chunk)throw new Error('No guarded static script');
      const paths=['/','/demo','/demo?_rsc=probe','/sample/forme/F01.webp','/fonts/inter-latin-wght-normal.woff2',chunk[1].replaceAll('&amp;','&'),'/api/retailor/v1/config','/api/retailor/v1/not-an-operation'];
      const rows=[];for(const path of paths){const rejected=await fetch(origin+path);const body=await rejected.text();if(body.includes(seal))throw new Error('Origin seal reflected');const accepted=await fetch(origin+path,{headers});await accepted.arrayBuffer();rows.push({path,rejected:rejected.status,accepted:accepted.status})}
      const wrong=await fetch(origin+'/',{headers:{'x-retailor-origin':'0'.repeat(64)}});
      let received=0,sealForwarded=false;
      const peer=http.createServer(async(req,res)=>{sealForwarded=req.headers['x-retailor-origin']!==undefined;for await(const chunk of req)received+=chunk.length;res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify(peerFailure))});
      await new Promise(resolve=>peer.listen(8081,'127.0.0.1',resolve));
      let uploadStatus,uploadCode;
      try{const upload=await fetch(origin+'/api/retailor/v1/catalogue/interpret',{method:'POST',headers:{...headers,origin:'https://retailor.invalid','content-type':'multipart/form-data; boundary=x'},body:'x'.repeat(10*1024*1024+1),signal:AbortSignal.timeout(12000)});uploadStatus=upload.status;uploadCode=(await upload.json()).error.code}
      finally{await new Promise((resolve,reject)=>peer.close(error=>error?reject(error):resolve()))}
      console.log(JSON.stringify({rows,wrong:wrong.status,largeUploadStatus:uploadStatus,largeUploadCode:uploadCode,largeUploadBytes:received,sealForwarded,sealReflected:false,paidRequests:0,environment:'test-only-local-peer'}));
    `,
    );
    for (const row of originGuard.rows) {
      assert.equal(row.rejected, 403);
      assert.equal(
        row.accepted,
        row.path.includes("not-an-operation")
          ? 404
          : row.path.startsWith("/api/")
            ? 503
            : 200,
      );
    }
    assert.equal(originGuard.wrong, 403);
    assert.equal(originGuard.largeUploadStatus, 503);
    assert.equal(originGuard.largeUploadCode, "UNAVAILABLE");
    assert.equal(originGuard.largeUploadBytes, 10 * 1024 * 1024 + 1);
    assert.equal(originGuard.sealForwarded, false);
    const misconfigured = run("frontend-guard-missing", [
      ["PORT", "8080"],
      ["RETAILOR_ORIGIN_GUARD", "cloudflare"],
    ]);
    await ready(misconfigured, 8080);
    const missingGuard = execute(
      misconfigured,
      requestProbe(["/", "/api/retailor/v1/config"], 8080),
    );
    assert.equal(missingGuard[0].status, 503);
    assert.equal(missingGuard[1].status, 503);
    const memory = Object.fromEntries(
      [
        ["backend", backend],
        ["frontend", frontend],
      ].map(([role, id]) => [
        role,
        JSON.parse(
          docker(["stats", "--no-stream", "--format", "{{json .}}", id]),
        ),
      ]),
    );
    const shutdown = {};
    for (const [role, id] of [
      ["frontend", frontend],
      ["backend", backend],
    ]) {
      const start = Date.now();
      docker(["stop", "--time", "6", id]);
      const [inspection] = JSON.parse(docker(["inspect", id]));
      shutdown[role] = {
        milliseconds: Date.now() - start,
        exitCode: inspection.State.ExitCode,
        oomKilled: inspection.State.OOMKilled,
        running: inspection.State.Running,
      };
      // Installed Next 16.4 completes cleanup then exits 143 for SIGTERM.
      assert.equal(inspection.State.ExitCode, role === "frontend" ? 143 : 0);
      assert.equal(inspection.State.OOMKilled, false);
      assert.equal(inspection.State.Running, false);
    }
    result = {
      schemaVersion: 1,
      observedAt: new Date().toISOString(),
      source: await sourceSnapshot(),
      images,
      network: "none",
      publishedPorts: [],
      paidRequests: 0,
      backend: {
        runtime: backendRuntime,
        http: backendHttp,
        post: backendPost,
        sharp,
        startupRejections,
      },
      frontend: {
        runtime: frontendRuntime,
        http: frontendHttp,
        assets: assetRecord,
        originGuard,
        missingGuard,
      },
      memory,
      shutdown,
      limitations: [
        "No Cloud Run IAM, metadata identity, paid AI, TLS/DNS, browser rendering or concurrent workload is proven by these isolated local containers.",
        "Local image IDs/digests are not registry publication evidence. Memory is a point-in-time unpaid observation, not a peak or paid-load guarantee.",
      ],
    };
  } catch (error) {
    failure = error;
  } finally {
    // Only IDs returned by this invocation are ever stopped/removed.
    for (const id of created) {
      try {
        docker(["rm", "--force", id]);
      } catch {
        cleanupFailures.push(
          new Error(`Owned container cleanup failed: ${id}`),
        );
      }
    }
  }
  if (failure || cleanupFailures.length)
    throw new AggregateError(
      [...(failure ? [failure] : []), ...cleanupFailures],
      "Container verification failed",
    );
  return result;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 4)
    throw new Error(
      "Usage: node scripts/release/containers.mjs retailor/rtl021-frontend:local retailor/rtl021-backend:local",
    );
  process.stdout.write(
    `${JSON.stringify(await verifyContainers(process.argv[2], process.argv[3]), null, 2)}\n`,
  );
}
