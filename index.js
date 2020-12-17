const path = require("path");

const readline = require("readline");

const colors = require("colors/safe");
const Dobaos = require("dobaos.js");

const parseCmd = require("./parseCmd");
const configFile = require("./config");
const config = configFile.get();

const App = params => {
  let _params = {};
  Object.assign(_params, params);

  let dobaos = Dobaos(_params);

  /// init repl
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "dobaos> ",
    completer: completer
  });

  const console_out = msg => {
    if (msg) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(msg);
      setTimeout(_ => {
        rl.prompt(true);
      }, 100);
    }
  };

  dobaos.on("ready", _ => {
    console_out("ready to send requests");
    rl.prompt();
  });

  dobaos.on("error", e => {
    console_out(`Error with dobaos module: ${e.message}`);
  });

  dobaos.init();

  let commandlist = [];
  commandlist.push("set", "put", "raw", "get", "stored", "read", "description");
  commandlist.push("name", "unname", "watch", "unwatch", "regex");
  commandlist.push("serveritems", "progmode");
  commandlist.push("version", "reset", "help");
  function completer(line) {
    const hits = commandlist.filter(c => c.startsWith(line));

    // show all completions if none found
    return [hits.length ? hits : commandlist, line];
  }

  console.log("hello, friend");
  console.log(`connecting to ${_params.redis}`);

  const formatDate = date => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    let milliseconds = date.getMilliseconds();
    milliseconds = parseInt(milliseconds, 10) < 10 ? "0" + milliseconds : milliseconds;
    milliseconds = parseInt(milliseconds, 10) < 100 ? "0" + milliseconds : milliseconds;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    seconds = seconds < 10 ? "0" + seconds : seconds;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
  };

  const formatDatapointValue = d => {
    let id = d.id;
    if (typeof d.name !== "undefined") {
      id += "-" + d.name;
    }
    const strValue = `${formatDate(new Date())},    id: ${d.id}, value: ${d.value}, raw: [${d.raw}]`;

    // now color it
    const datapointColor = config.watch[data.id.toString()] || "default";
    if (typeof colors[datapointColor] === "function") {
      return colors[datapointColor](strValue);
    }

    return strValue;
  };

  // only difference is that this function hides datapoints
  const formatCastedDatapointValue = data => {
    const datapointColor = config.watch[data.id.toString()];
    // hidden datapoint support
    if (datapointColor === "hide" || datapointColor === "hidden") {
      return null;
    }

    // show as usual
    return formatDatapointValue(data);
  };

  const formatDatapointDescription = t => {
    let res = `#${t.id}: `;
    if (typeof t.name !== "undefined") {
      res += "-" + t.name;
    }
    res += `dpt = ${t.type}, prio: ${t.priority}, `;
    res += `flags: [`;
    res += t.communication ? "C" : "-";
    res += t.read ? "R" : "-";
    res += t.write ? "W" : "-";
    res += t.transmit ? "T" : "-";
    res += t.update ? "U" : "-";
    res += `]`;

    return res;
  };

  // register datapoint value listener
  dobaos.on("datapoint value", payload => {
    // if multiple values
    if (Array.isArray(payload)) {
      payload.map(formatCastedDatapointValue).forEach(console_out);

      return;
    }

    console_out(formatCastedDatapointValue(payload));
  });

  dobaos.on("server item", payload => {
    let { id, value, raw } = payload;
    console_out(`Server item indication: id = ${id}, value = ${value}, raw = ${raw}`);
  });

  const processParsedCmd = async payload => {
    try {
      let { command, args } = payload;
      let res;
      switch (command) {
        case "set":
          await dobaos.setValue(args);
          break;
        case "get":
          res = await dobaos.getValue(args);
          if (Array.isArray(res)) {
            res.forEach(t => {
              console_out(formatDatapointValue(t));
            });
          } else {
            console_out(formatDatapointValue(res));
          }
          break;
        case "read":
          res = await dobaos.readValue(args);
          break;
        case "description":
          if (args === "*") {
            args = null;
          }
          res = await dobaos.getDescription(args);
          res
            .sort((a, b) => a.id - b.id)
            .map(formatDatapointDescription)
            .forEach(console_out);
          break;
        case "watch":
          args.forEach(a => {
            let { id, color } = a;
            config.watch[id.toString()] = color;
            console_out(`datapoint ${id} value is now in ${color}`);
          });
          break;
        case "unwatch":
          args.forEach(id => {
            if (Object.prototype.hasOwnProperty.call(config.watch, id.toString())) {
              delete config.watch[id.toString()];
              console_out(`datapoint ${id} value is now in default color`);
            }
          });
          break;
        case "reset":
          res = await dobaos.reset();
          console_out(`reset request sent`);
          break;
        case "version":
          version = await dobaos.getVersion();
          console_out(`dobaos daemon version is ${version}`);
          break;
        case "progmode":
          if (args !== "?") {
            await dobaos.setProgrammingMode(args);
          }
          // setTimeout(async _ => {
          res = await dobaos.getProgrammingMode();
          console_out(`BAOS module in programming mode: ${res}`);
          // }, 100);
          break;
        case "help":
          console_out(`...BAOS services: `);
          console_out(`....Datapoints: `);
          console_out(`     description *`);
          console_out(`     description 1 2 3`);
          console_out(`     get 1 2 3`);
          console_out(`     read 1 2 3`);
          console_out(`     set  1: true `);
          console_out(`     name 1: lights `);
          console_out(`     get lights`);
          console_out(`     read lights`);
          console_out(`     set  lights: true`);
          console_out(`     set  [lights: true, 2: false] `);
          console_out(`     set  10: {"xxx": 42}`);
          console_out(`     put  1: true `);
          console_out(`     raw  2: 0xffddcc `);
          console_out(`     raw  3: [1] `);
          console_out(`     raw  3: "AQ==" `);
          console_out(`     raw  2: [1, 2, 3] `);
          console_out(`....Service`);
          console_out(`     serveritems`);
          console_out(`     progmode ?`);
          console_out(`     progmode 1/0`);
          console_out(`     progmode true/false`);
          console_out(`....For monitoring`);
          console_out(`     watch ( 1: red | [1: red, 2: green, 3: underline, 4: hide, 5: hidden] ) `);
          console_out(`     unwatch ( 1 2 3 | [1, 2, 3] )`);
          console_out(`     regex /*/`);
          console_out(` `);
          console_out(`...Service: `);
          console_out(`    reset `);
          console_out(`    version `);
          console_out(`    help `);
          break;
        default:
          break;
      }
    } catch (e) {
      console_out(e.message);
    }
  };

  rl.on("line", line => {
    rl.prompt(true);
    if (line.trim() === "") return;
    try {
      let parsed = parseCmd(line.trim());
      if (!parsed) { throw new Error("Command is not recognized"); }
      console_out(JSON.stringify(parsed));
      //processParsedCmd(parsed);
    } catch (e) {
      console_out(e);
    }
  }).on("close", () => {
    configFile.write(config);
    process.exit(0);
  });
};

module.exports = App;
