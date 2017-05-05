const cluster = require('cluster');
const os = require('os');

const cpus = os.cpus();
const cpu = cpus[0];
const numCPUs = cpus.length;

const pid = process.pid;

const N = 100000000; // 100 millions of random points

if(cluster.isMaster)
{  
  console.log(`Master ${pid} on ${cpu.model}, ${cpu.speed} MHz, ${numCPUs} logical CPUs`);

  forkWorkers(numCPUs);

  var startTime = Date.now();

  var results = [];

  cluster.on('message', (worker, message, handle) => 
  {
    var id = worker.process.pid;

    console.log(`Result from ${id} : ${message}`);  

    results.push(message);

    if(results.length === numCPUs)
    {
      var runTime = Math.round((Date.now() - startTime) / 10) / 100;

      showStats(results, runTime);
    }
  });

  cluster.on('online', (worker, code, signal) => 
  {    
    console.log(`Worker ${worker.process.pid} is running`);  
  });     
  
  cluster.on('exit', (worker, code, signal) => 
  {
    console.log(`Worker ${worker.process.pid} exited`);    
  });       
}
else // if(cluster.isWorker)
{  
  process.send(calcMonteCarloPi(N));

  process.exit();
}

//--------------------------------------------------

function forkWorkers(count)
{
  for (var i = 0; i < count; ++i) 
  {
    cluster.fork();
  } 
}

//--------------------------------------------------

function calcMonteCarloPi(pointsCount)
{
    var inCircleCount = 0;

    for (var i = 0; i < pointsCount; ++i)
    {
        var x = Math.random();
        var y = Math.random();

        if(x * x + y * y < 1)
        {
            ++inCircleCount;
        }
    }

    return 4 * inCircleCount / pointsCount;        
}

//--------------------------------------------------

function showStats(results, runTime)
{    
    var average = 0;

    var resultsCount = results.length;

    for(var i = 0; i < resultsCount; ++i)
    {
        average += results[i];
    }
        
    average /= resultsCount;

    var gigaPoints = Math.round(N * resultsCount / runTime / 1e6) / 1e3;
        
    console.log(`Monte-Carlo Pi = ${average} (run time: ${runTime} s, ${gigaPoints} Gpts/s)`);
}

//--------------------------------------------------
