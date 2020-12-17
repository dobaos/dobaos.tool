const fs = require("fs");
const { Grammars } = require("ebnf");

// init parser
const grammar = fs.readFileSync(`${__dirname}/grammar`, "utf8");
const parser = new Grammars.W3C.Parser(grammar);

const processIdListArgs = list => {
  let r = list.map(a => {
    let c = a.children[0];
    if (c.type === "UInt") {
      return parseInt(c.text, 10);
    } else {
      return c.text;
    }
  });
  return r;
};

const processIdListCmd = (cmdType, cmdArgs) => {
  let res = {
    command: cmdType,
    args: []
  };
  res.args = processIdListArgs(cmdArgs.children);

  return res;
};


// ----- set, put ----- //
const processValueObject = valueObj => {
  let res = null;
  if (valueObj.type === "Number") {
    res = JSON.parse(valueObj.text);
  }
  if (valueObj.type === "Bool") {
    res = JSON.parse(valueObj.text);
  }
  if (valueObj.type === "Null") {
    res = null;
  }
  if (valueObj.type === "String") {
    res = JSON.parse(valueObj.text.trim());
  }
  if (valueObj.type === "Identifier") {
    res = valueObj.text.trim();
  }
  if (valueObj.type === "Object") {
    res = {};
    valueObj.children.forEach(member => {
      let id = member.children.find(t => {
        return t.type == "Identifier" || t.type == "String"
      });
      let value = member.children.find(t => {
        return t.type == "Value";
      });
      if (id && value) {
        id = processValueObject(id);
        if (value.children.length !== 1) return;
        value = processValueObject(value.children[0]);
        res[id] = value;
      }
    });
  }

  return res;
};
const processDatapointValue = cmdArgs => {
  const findID = t => t.type === "DatapointId";
  const idItem = cmdArgs.find(findID).children[0];
  let id;
  if (idItem.type == "UInt") {
    id = parseInt(idItem.text, 10);
  } else if (idItem.type == "Asterisk") {
    throw new Error("wrong datapoint id(asterisk) for set command");
  } else if (idItem.type == "Identifier") {
    id = idItem.text;
  } else {
    id = JSON.parse(idItem.text);
  }
  const findValue = t => t.type === "Value";
  const valueObj = cmdArgs.find(findValue).children[0];
  const value = processValueObject(valueObj);

  return { id: id, value: value };
};
const processDatapointValueArray = cmdArgs => {
  return cmdArgs.map(t => {
    return processDatapointValue(t.children);
  });
};
const processSetCmd = (cmd, cmdArgs) => {
  let res = {
    command: cmd,
    args: []
  };
  switch (cmdArgs.type) {
    case "DatapointValue":
      res.args.push(processDatapointValue(cmdArgs.children));
      break;
    case "DatapointValueArray":
      res.args = processDatapointValueArray(cmdArgs.children);
      break;
    default:
      break;
  }

  return res;
};


// ----- raw ----- //
const processRawValueObject = valueObj => {
  let res = null;
  if (valueObj.type === "String") {
    res = JSON.parse(valueObj.text.trim());
  }
  if (valueObj.type === "UIntArray") {
    res = JSON.parse(valueObj.text.trim());
    res = Buffer.from(res);
    res = res.toString("base64");
  }
  if (valueObj.type === "HexValue") {
    res = valueObj.text.trim().replace("0x", "");
    res = Buffer.from(res, "hex");
    res = res.toString("base64");
  }

  return res;
};
const processRawValue = cmdArgs => {
  const findID = t => t.type === "DatapointId";
  const idItem = cmdArgs.find(findID).children[0];
  let id;
  if (idItem.type == "UInt") {
    id = parseInt(idItem.text, 10);
  } else if (idItem.type == "Asterisk") {
    throw new Error("wrong datapoint id(asterisk) for set command");
  } else if (idItem.type == "Identifier") {
    id = idItem.text;
  } else {
    id = JSON.parse(idItem.text);
  }
  const findValue = t => t.type === "RawValue";
  const valueObj = cmdArgs.find(findValue).children[0];
  const value = processRawValueObject(valueObj);

  return { id: id, value: value };
};
const processRawValueArray = cmdArgs => {
  return cmdArgs.map(t => {
    return processRawValue(t.children);
  });
};
const processRawCmd = (cmd, cmdArgs) => {
  let res = {
    command: cmd,
    args: []
  };
  switch (cmdArgs.type) {
    case "DatapointValueRaw":
      res.args.push(processRawValue(cmdArgs.children));
      break;
    case "DatapointValueRawArray":
      res.args = processRawValueArray(cmdArgs.children);
      break;
    default:
      break;
  }

  return res;
};

// ----- description ----- //
const processDescriptionCmd = cmdArgs => {
  let res = {
    command: "description",
    args: null
  };
  if (cmdArgs.type === "Asterisk") {
    res.args = "*";
  }
  if (cmdArgs.type === "DatapointIdList" ||
    cmdArgs.type === "DatapointIdArray") {
    res.args = processIdListArgs(cmdArgs.children);
  }

  return res;
};

// ----- progmode ----- //
const processProgMode = cmdArgs => {
  let res = {
    command: "progmode",
    args: null
  };
  if (cmdArgs.type === "Number") {
    res.args = Boolean(parseInt(cmdArgs.text, 10));
  } else if (cmdArgs.type === "Bool") {
    res.args = JSON.parse(cmdArgs.text);
  }
  if (cmdArgs.type === "Question") {
    res.args = "?";
  }

  return res;
};

// ----- watch ----- //
const processWatchArg = cmdArg => {
  const findID = t => t.type === "DatapointId";
  const idItem = cmdArg.children
                          .find(findID).children[0];
  let id;
  if (idItem.type == "UInt") {
    id = parseInt(idItem.text, 10);
  } else if (idItem.type == "Asterisk") {
    throw new Error("wrong datapoint id(asterisk) for watch command");
  } else if (idItem.type == "Identifier") {
    id = idItem.text;
  } else {
    id = JSON.parse(idItem.text);
  }
  const findColor = t => {
    return t.type === "Identifier" || t.type === "String";
  };
  const colorItem = cmdArg.children.find(findColor);
  let color = colorItem.text;
  if (colorItem.type === "String") {
    color = JSON.parse(color);
  }

  return { id: id, color: color };
};
const processWatchCmd = cmdArgs => {
  let res = {
    command: "watch",
    args: []
  };

  if (cmdArgs.type === "WatchCmdArg") {
    res.args.push(processWatchArg(cmdArgs));
  }
  if (cmdArgs.type === "WatchCmdArgArray") {
    res.args = cmdArgs.children.map(processWatchArg);
  }

  return res;
};
// ----- name ----- //
const processSetNameArg = cmdArg => {
  const findId = t => t.type === "UInt";
  const id = parseInt(cmdArg.children.find(findId).text, 10);
  const findQuestion = t => t.type === "Question";
  if (cmdArg.children.find(findQuestion)) {
    return { id: id, question: true };
  }
  const findName = t => {
    return t.type === "Identifier" || t.type === "String";
  };
  const nameItem = cmdArg.children.find(findName);
  let name = nameItem.text;
  if (nameItem.type === "String") {
    name = JSON.parse(name);
  }

  return { id: id, question: false, name: name };
};
const processSetNameCmd = cmdArgs => {
  let res = {
    command: "name",
    args: []
  };

  if (cmdArgs.type === "DatapointNameArg") {
    res.args.push(processSetNameArg(cmdArgs));
  }
  if (cmdArgs.type === "DatapointNameArgArray") {
    res.args = cmdArgs.children.map(processSetNameArg);
  }

  return res;
};

const processRegexCmd = (cmdType, cmdArgs) => {
  let res = {
    command: cmdType,
    args: []
  };
  if (!Array.isArray(cmdArgs.children)) return;

  cmdArgs.children.forEach(r => {
    if (r.type === "Regex") res.args.push(r.text.slice(1, -1));
  });

  return res;
};

const processCmd = cmd => {
  let cmdType = cmd.type;
  let cmdArgs;
  switch (cmdType) {
    case "description":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processDescriptionCmd(cmdArgs);
    case "get":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processIdListCmd(cmdType, cmdArgs);
    case "stored":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processIdListCmd(cmdType, cmdArgs);
    case "read":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processIdListCmd(cmdType, cmdArgs);
    case "set":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processSetCmd(cmdType, cmdArgs);
    case "put":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processSetCmd(cmdType, cmdArgs);
    case "raw":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processRawCmd(cmdType, cmdArgs);
    case "serveritems":
      return { command: cmdType };
    case "name":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processSetNameCmd(cmdArgs);
    case "watch":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processWatchCmd(cmdArgs);
    case "unname":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processIdListCmd(cmdType, cmdArgs);
    case "unwatch":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processIdListCmd(cmdType, cmdArgs);
    case "regex":
      cmdArgs = cmd;
      return processRegexCmd(cmdType, cmdArgs);
    case "progmode":
      if (cmd.children.length !== 1) return;
      cmdArgs = cmd.children[0];
      return processProgMode(cmdArgs);
    case "reset":
    case "version":
    case "help":
      return { command: cmdType };
    default:
      break;
  }
};

let parseCmd = line => {
  let res = parser.getAST(line.trim());
  if (!res) return;
  if (!res) {
    return;
  }
  if (res.type === "command") {
    if (res.children.length !== 1) return;
    let child = res.children[0];
    if (child.type !== "baos_cmd" &&
      child.type !== "service_cmd" &&
      child.type !== "monitor_cmd") return;
    if (child.children.length !== 1) return;
    let cmdObject = child.children[0];

    return processCmd(cmdObject);
  }
};

module.exports = parseCmd;
