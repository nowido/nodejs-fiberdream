const cluster = require('cluster');
const http = require('http');
const os = require('os');

const cpus = os.cpus();
const cpu = cpus[0];
const numCPUs = cpus.length;

const pid = process.pid;

if(cluster.isMaster)
{
  console.log(`Master ${pid}; ${cpu.model}, ${cpu.speed} MHz, ${numCPUs} logical CPUs`);

  for (let i = 0; i < numCPUs; ++i) 
  {
    cluster.fork();
  } 

  cluster.on('exit', (worker, code, signal) => 
  {
    console.log(`worker ${worker.process.pid} exited; starting new.`);
    cluster.fork();
  });     
}
else
{
  // slave (worker)

  const hostname = '127.0.0.1';
  const port = 3000;

  const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Hello World from ${pid}`);
  });

  server.listen(port, hostname, () => {
    console.log(`Slave ${pid}; server running at http://${hostname}:${port}/`);
  });
}
