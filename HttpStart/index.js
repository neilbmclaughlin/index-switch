const df = require('durable-functions');

module.exports = async function httpStart(context, req) {
  const client = df.getClient(context);
  const instanceId = req.params.instanceId;
  const functionName = req.params.functionName;

  // Can not use getStatus as it throws an exception if instanceId does not exist.
  // This is a bug in azure-durable-functions:
  //   https://github.com/Azure/azure-functions-durable-js/issues/40
  const instances = await client.getStatusAll();

  const runningInstanceExists = instances.some(
    i => i.instanceId === instanceId && i.runtimeStatus === 'Running'
  );

  // console.log(instances.map( (i)=> { return i.instanceId }));
  // console.log([instanceId, isInstanceRunning]);

  if (runningInstanceExists) {
    return {
      body: `An instance with ID '${instanceId}' is already running.`,
      status: 409,
    };
  }
  context.log(`Starting orchestration with ID = '${instanceId}'.`);
  await client.startNew(functionName, instanceId, req.body);
  return client.createCheckStatusResponse(req, instanceId);
};
