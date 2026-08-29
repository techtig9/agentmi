import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(p:string)=>readFileSync(p,"utf8");
test("phase 7 deployment runtime contracts",()=>{
  const action=read("lib/actions/deployments.ts");
  const route=read("app/api/v1/deployments/[id]/run/route.ts");
  const record=read("lib/observability/record-run.ts");
  const page=read("app/(dashboard)/dashboard/deployments/page.tsx");
  assert.match(action,/agent_deployments/); assert.match(action,/environment/); assert.match(action,/version/); assert.match(action,/endpoint_url/);
  assert.match(route,/authenticateApiRequest/); assert.match(route,/deployment\.id/); assert.match(route,/deployment\.status/); assert.match(route,/runAgentChat/); assert.match(route,/deploymentId/);
  assert.match(record,/deployment_id/); assert.match(page,/DeploymentForm/);
});
