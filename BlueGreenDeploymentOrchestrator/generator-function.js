const moment = require('moment');

module.exports = function* orchestratorFunctionGenerator(context) {
  const input = context.df.getInput();
  context.log({ input });

  const apimApiName = input.apimApiName;

  context.log('Starting Orchestration using Chaining and Monitor patterns');

  const indexNames = yield context.df.callActivity('GetIndexNames', apimApiName);

  // Because of the naming convention which applies the same name to the indexer and data source
  // as for the index we can do this
  const indexerName = indexNames.idle;
  const startingIndexerStatus = yield context.df.callActivity('GetIndexerLastRunStatus', indexerName);
  if (startingIndexerStatus === 'inProgress') {
    throw Error(`indexer ${indexerName} is currently running`);
  }

  const indexDefinition = yield context.df.callActivity('GetIndexDefinition', indexNames.active);
  context.log({ indexDefinition });

  yield context.df.callActivity(
    'ReIndex',
    {
      indexDefinition,
      indexName: indexNames.idle,
    }
  );

  while (true) {
    // Put wait at beginning of loop rather than end so that reindexing is
    // underway before first checking status
    const nextCheck = moment
      .utc(context.df.currentUtcDateTime)
      .add('1', 'minute');
    yield context.df.createTimer(nextCheck.toDate());
    const indexerStatus = yield context.df.callActivity('GetIndexerLastRunStatus', indexerName);
    context.log({ indexerStatus });
    if (indexerStatus === 'success') {
      yield context.df.callActivity('SwitchAliasedIndex', { apimApiName, idleIndexName: indexNames.idle });
      return 'done';
    }
    if (indexerStatus !== 'inProgress') {
      throw Error(`reindexing of ${indexerName} failed with status ${indexerStatus}`);
    }
  }
};
