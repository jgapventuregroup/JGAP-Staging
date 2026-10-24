// Opt-in CLI wrapper; normal bearer sessions are supplied privately through the environment.
import {pathToFileURL} from 'node:url';
import {readConfiguration,runLivePassportIsolation} from '../passport-live-isolation-core.mjs';
export {readConfiguration,assertDenied,runLivePassportIsolation} from '../passport-live-isolation-core.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const result=await runLivePassportIsolation(readConfiguration(process.env));console.log(JSON.stringify({result:'PASS',...result}));}
  catch{console.error('FAIL: Staging isolation gate did not complete. Review private configuration, fixture cleanup and execution evidence; original editors remain disabled.');process.exitCode=1;}
}
