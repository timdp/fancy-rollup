#!/usr/bin/env node

const cluster = require('cluster')

const mod = cluster.isMaster ? 'master' : 'worker'
require(`./lib/${mod}`)()
