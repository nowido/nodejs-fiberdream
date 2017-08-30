// run this script with <unique token> to start Master for <unique token> processing

//--------------------------------------------------

const token = process.argv[2] ? process.argv[2] : 'PI';

//--------------------------------------------------
/*
const redisHost = '127.0.0.1';
const redisPort = '6379';
*/
//*
const redisHost = 'redis-11923.c8.us-east-1-2.ec2.cloud.redislabs.com';
const redisPort = '11923';
//*/
const redisConfig = {host: redisHost, port: redisPort};

const jobQueueKey = 'job#' + token;
const resultsQueueKey = 'results#' + token;

const workItemsCount = 4;

//--------------------------------------------------

const redisClient = require('redis').createClient(redisConfig);

redisClient.on('error', console.log);

//--------------------------------------------------

console.log(`Master for ${workItemsCount} \'${token}\' items processing`);

pushWorkItems(workItemsCount);

var startTime = Date.now();

var results = [];

gatherResults((result) => 
{    
    results.push(result);

    console.log(`result #${result.id}: ${result.value.estimation}`);

    if(results.length === workItemsCount)
    {
        var runTime = Math.round((Date.now() - startTime) / 10) / 100;

        console.log(`All ${workItemsCount} items done`);

        showStats(results, runTime);
        
        return false;
    }            

    return true;
});

//--------------------------------------------------

function pushWorkItems(workItemsCount)
{
    for(var i = 0; i < workItemsCount; ++i)
    {
        redisClient.lpush(jobQueueKey, JSON.stringify({id: i}));
    }
}

//--------------------------------------------------

function gatherResults(onResultItem)
{        
    function getResult(err, res)
    {        
        if(onResultItem(JSON.parse(res[1])))
        {
            redisClient.brpop(resultsQueueKey, 0, getResult);   
        }
        else
        {
            redisClient.quit();
            process.exit(0);                            
        }
    }    

    redisClient.brpop(resultsQueueKey, 0, getResult);
}

//--------------------------------------------------

function showStats(results, runTime)
{    
    var pointsCount = 0;
    var average = 0;

    var itemsCount = results.length;

    for(var i = 0; i < itemsCount; ++i)
    {
        var item = results[i];

        pointsCount += item.value.count;
        average += item.value.estimation;
    }
        
    average /= itemsCount;

    var gigaPoints = Math.round(pointsCount / runTime / 1e6) / 1e3;
        
    console.log(`Monte-Carlo Pi = ${average} (run time: ${runTime} s, ${gigaPoints} Gpts/s)`);
}

//--------------------------------------------------



