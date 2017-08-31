// run this script with <unique token> to start node for <unique token> processing

//--------------------------------------------------

const token = process.argv[2] ? process.argv[2] : 'PI';

//--------------------------------------------------

const cluster = require('cluster');

const cpus = require('os').cpus();
const cpu = cpus[0];
const numCPUs = cpus.length;

const pid = process.pid;

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

//--------------------------------------------------

if(cluster.isMaster) 
{
    runManager();
}
else // if(cluster.isWorker)
{
    runWorker();
}

//--------------------------------------------------

function runManager()
{
    console.log(`Active node ${pid} on ${cpu.model}, ${cpu.speed} MHz, ${numCPUs} logical CPUs for \'${token}\' processing`);

    for (var i = 0; i < numCPUs; ++i) 
    {
        cluster.fork();
    } 

    cluster.on('online', (worker) => 
    {
        console.log(`worker ${worker.process.pid} is running.`);    
    });

    cluster.on('exit', (worker) => 
    {
        console.log(`worker ${worker.process.pid} exited; forking new one.`);

        cluster.fork();    
    });   

    cluster.on('message', (worker, message) => 
    {
        if(message.error)
        {
            console.log(`worker ${worker.process.pid} error: ${message.error}`);    
        }
        else if(message.jobResult)
        {
            const result = message.jobResult;

            console.log(`job result: id=${result.id}, value=${result.value}`);
        }
    });          
}

//--------------------------------------------------

function runWorker()
{
    const redisClient = require('redis').createClient(redisConfig);
    
    redisClient.on('error', (err) => 
    {
        process.send({error: err});    
    });

    function calcMonteCarloPi(pointsCount)
    {
        var inCircleCount = 0;

        for (var i = 0; i < pointsCount; ++i)
        {
            const x = Math.random();
            const y = Math.random();

            if(x * x + y * y < 1)
            {
                ++inCircleCount;
            }
        }

        return 4 * inCircleCount / pointsCount;        
    }

    function doWork(jobItem)
    {
        const N = jobItem.count;

        return {            
            id: jobItem.id, 
            value: {count: N, estimation: calcMonteCarloPi(N)}
        };
    }

    function getJob(err, res)
    {
        const job = JSON.parse(res[1]);        

        const result = doWork(job);

        process.send
        ({
            jobResult: {id: result.id, value: result.value.estimation}
        });            
            
        redisClient.lpush(resultsQueueKey, JSON.stringify(result));        

        redisClient.brpop(jobQueueKey, 0, getJob);   
    }

    redisClient.brpop(jobQueueKey, 0, getJob);    
}

//--------------------------------------------------

