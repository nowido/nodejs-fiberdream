const cluster = require('cluster');
const http = require('http');
const os = require('os');

const cpus = os.cpus();
const cpu = cpus[0];
const numCPUs = cpus.length;

const pid = process.pid;

const N = 100000000; // 100 millions of random points

if(cluster.isMaster)
{
  console.log(`Master ${pid} on ${cpu.model}, ${cpu.speed} MHz, ${numCPUs} logical CPUs`);

  for (var i = 0; i < numCPUs; ++i) 
  {
    cluster.fork();
  } 

  const startTime = Date.now();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} exited.`);    
  });     

  var answersCount = 0;
  var answers = {};

  cluster.on('message', (worker, message, handle) => {

    const id = worker.process.pid;

    console.log(`${id} : ${message}`);  

    answers[id] = message;
    answersCount++;
    
    if(answersCount === numCPUs)
    {
      var average = 0;

      for(key in answers)
      {
        average += answers[key];
      }

      average /= numCPUs;

      const runTime = Math.round((Date.now() - startTime) / 10) / 100;

      const gigaPoints = Math.round(N * numCPUs / runTime / 1e6) / 1e3;

      console.log(`Monte-Carlo Pi = ${average} (run time: ${runTime} s, ${gigaPoints} Gpts/s)`);
    } // end if(answersCount === numCPUs)
  }); // end cluster.on('message')
}
else // if(cluster.isWorker)
{
  console.log(`Slave ${pid} running.`);
  
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

  process.send(calcMonteCarloPi(N));
  process.exit();
}
