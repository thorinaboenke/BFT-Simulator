'use strict';
// this script run simulation through different lambda settings
const cliProgress = require('cli-progress');
const math = require('mathjs');
const fs = require("fs");
const Simulator = require("../simulator");
const config = require("../config");

const info = `protocols-${config.nodeNum}-${config.byzantineNodeNum}-${config.networkDelay.mean}-${config.networkDelay.std}`;

// configuration
// set node_count from start ~ end (included), each time increased by delta
const node_count_start = 4;
const node_count_end = 129;

const protocols = [ "pbft","algorand", "hotstuff-NS"]

// log result
const log = true;
const clearLog = false;
const logPath = "./experiments-log";
const filename = `${logPath}/${info}-node_count-${node_count_start}-${node_count_end}-${config.lambda}-${config.networkDelay.mean}-${config.networkDelay.std}.csv`;

const multibar = new cliProgress.MultiBar({
    format: ' {bar} | {payload} | {value}/{total} | Percentage: {percentage} %| ETA: {eta}',
    hideCursor: true,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    clearOnComplete: true,
    stopOnComplete: true
});

// clear log
if (clearLog && fs.existsSync(logPath))
    fs.rmSync(logPath, { recursive: true, force: true });

if (log) {
    if (!fs.existsSync(logPath)) fs.mkdirSync(logPath);
    fs.writeFileSync(filename, "ms-Protocol,Number of Nodes,Time usage mean (ms),Time usage std (ms),Time usage median (ms),Message count mean,Message count std\n");
}
for (let protocol of protocols) {
    config.protocol = protocol;
    for (let node_count = node_count_start; node_count <= node_count_end; node_count *= 2) {
        config.nodeNum = node_count;
        const s = new Simulator(config);
        const progressBar = multibar.create(config.repeatTime, 0, { payload: `${info}-${config.nodeNum}` });
        s.onDecision = () => {
            progressBar.increment();
            progressBar.render();
        }
        s.startSimulation();
        const latencyData = s.simulationResults.map(x => { return x.latency });
        const msgCountData = s.simulationResults.map(x => { return x.totalMsgCount });

        if (log) {
            fs.appendFileSync(filename, `${config.protocol},${node_count},${Math.round(math.mean(latencyData))},${(math.std(latencyData)).toFixed(2)},${Math.round(math.median(latencyData))},`);
            fs.appendFileSync(filename, `${math.mean(msgCountData)},${math.std(msgCountData).toFixed(2)}\n`);
            console.log("");
        }
        else {
            console.log(`\nTime usage (ms): (mean, std) = (${Math.round(math.mean(latencyData))}, ${Math.round(math.std(latencyData)/1000)}), median = ${Math.round(math.median(latencyData)/1000)}`);
            console.log(`Message count:   (mean, std) = (${Math.round(math.mean(msgCountData))}, ${math.std(msgCountData).toFixed(2)})`);
        }
    }
}
