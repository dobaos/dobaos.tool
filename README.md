# dobaos.tool - REPL cli for dobaos

## Introduction

This is CLI tool to work with KNX Datapoint objects via BAOS(Bus Access Object Server) protocol via dobaos sdk.

## Installation

First of all, be sure to have [dobaos](https://github.com/dobaos/dobaos) running, then install this app via node package manager:

```
sudo npm i -g dobaos.tool@latest
```

## Usage:

```
$ dobaos-tool
hello, friend
connected to ipc, still not subscribed to channels
ready to send requests
dobaos> help
:: To work with datapoints
::  set ( 1: true | [2: "hello", 3: 42] )
::> get ( 1 2 3 | [1, 2, 3] )
::  read ( 1 2 3 | [1, 2, 3] )
::> description ( * | 1 2 3 | [1, 2, 3] )

:: Helpful in bus monitoring:
::> watch ( 1: red | [1: red, 2: green, 3: underline, 4: hide, 5: hidden] )
::  unwatch ( 1 2 3 | [1, 2, 3] )

:: BAOS services:
::> progmode ( ? | true/false/1/0 )

:: General:
::> reset
::  help
dobaos> get 1
23:00:04:266,    id: 1, value: 23, raw: [12,126]
dobaos> get 1 101 102
23:00:20:747,    id: 1, value: 23, raw: [12,126]
23:00:20:755,    id: 101, value: false, raw: [0]
23:00:20:762,    id: 102, value: true, raw: [1]
dobaos> 
dobaos> set 101: false
[ '23:00:40:110,    id: 101, value: false, raw: [0]' ]
```

This app uses ebnf parser to process commands, so it is possible to use lists, arrays in command parameters.

