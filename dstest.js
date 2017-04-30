// run this script with -m <unique token> to start Master node with <unique token>

const os = require('os');
const redis = require('redis');

//--------------------------------------------------

const redisHost = '127.0.0.1';
const redisPort = '6379';
const redisConfig = {host: redisHost, port: redisPort};

//const redisHost = 'redis-12559.c10.us-east-1-2.ec2.cloud.redislabs.com';
//const redisPort = '12559';
//const redisToken = '123456';
//const redisConfig = {host: redisHost, port: redisPort, password: redisToken};

const redisClient = redis.createClient(redisConfig);

redisClient.on('error', console.log);

//--------------------------------------------------

const jobQueueKey = 'job';
const resultsQueueKey = 'results';

//--------------------------------------------------

if(process.argv[2] === '-m')
{
    // run as Master

    const masterToken = process.argv[3] ? process.argv[3] : 0;

    // push job

    const workItemsCount = 4;

    for(var i = 0; i < workItemsCount; ++i)
    {
        var item = {id: masterToken, item: i};

        redisClient.lpush(jobQueueKey, JSON.stringify(item));
    }

    var startTime = Date.now();

    // wait results

    var resultsCount = 0;

    var pointsCount = 0;
    var average = 0;

    function continuePopResuts(err, res)
    {
        var result = JSON.parse(res[1]);

        if(result.id === masterToken)
        {
            var piEstimation = result.value.estimation;

            pointsCount += result.value.count;
            average += piEstimation;

            console.log(`result: ${piEstimation}`);

            ++resultsCount;

            if(resultsCount === workItemsCount)
            {
                var runTime = Math.round((Date.now() - startTime) / 10) / 100;

                console.log(`All ${workItemsCount} items tagged with \'${masterToken}\' done`);
                
                average /= resultsCount;

                var gigaPoints = Math.round(pointsCount / runTime / 1e6) / 1e3;
                
                console.log(`Monte-Carlo Pi = ${average} (run time: ${runTime} s, ${gigaPoints} Gpts/s)`);

                redisClient.quit();
                process.exit(0);                
            }            
        }
        
        redisClient.brpop(resultsQueueKey, 0, continuePopResuts);   
    }

    redisClient.brpop(resultsQueueKey, 0, continuePopResuts);
}
else
{
    // run as Slave

    function doWork(job)
    {
        const N = 100000000; // 100 millions of random points

        var count = 0;

        for (var i = 0; i < N; ++i)
        {
            var x = Math.random();
            var y = Math.random();

            if(x * x + y * y < 1)
            {
                ++count;
            }
        }

        var piEstimation = 4 * count / N;
        
        return {id: job.id, value: {count: N, estimation: piEstimation}};
    }

    function continuePopJob(err, res)
    {
        var job = JSON.parse(res[1]);
        var result = doWork(job);

        console.log(`job: ${job.item}, result: ${result.value.estimation}`);
        
        redisClient.lpush(resultsQueueKey, JSON.stringify(result));

        redisClient.brpop(jobQueueKey, 0, continuePopJob);   
    }

    redisClient.brpop(jobQueueKey, 0, continuePopJob);
}

//--------------------------------------------------

