// SPDX-License-Identifier: Apache-2.0
// Each check owns independent fixtures/processes. Failures never abandon a peer.
export async function joinedChecks(checks){
 const records=checks.map(check=>({name:check.name,result:'not-run'}));
 const outcomes=await Promise.allSettled(checks.map(async(check,index)=>{
  const record=records[index];record.started=new Date().toISOString();
  try{await check.run();record.result='pass';}
  catch(error){record.result='fail';record.failure=String(error.message??error);throw error;}
  finally{record.terminalFinished=new Date().toISOString();}
 }));
 return {result:outcomes.every(result=>result.status==='fulfilled')?'pass':'fail',checks:records};
}
