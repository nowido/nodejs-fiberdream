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

  var startTime = Date.now();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} exited.`);    
  });     

  var answersCount = 0;
  var answers = {};

  cluster.on('message', (worker, message, handle) => {

    var id = worker.process.pid;

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

      var runTime = Math.round((Date.now() - startTime) / 10) / 100;

      var gigaPoints = Math.round(N * numCPUs / runTime / 1e6) / 1e3;

      console.log(`Monte-Carlo Pi = ${average} (run time: ${runTime} s, ${gigaPoints} Gpts/s)`);
    }
  });
}
else // if(cluster.isWorker)
{
  console.log(`Slave ${pid} running.`);
  
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

  process.send(piEstimation);
  process.exit();
}
