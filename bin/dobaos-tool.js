#!/usr/bin/env node

const program = require("commander");
const redis = require("redis");

program.option("-r --redis <path>", `path to redis server.`)
       .option("-p --prefix <prefix>", `dobaos prefix. default: dobaos`)
       .parse(process.argv);

let params = {};
if (program["redis"]) {
  params.redis = program["redis"];
}
if (program["prefix"]) {
  params.prefix = program["prefix"];
}

require("../index.js")(params);
