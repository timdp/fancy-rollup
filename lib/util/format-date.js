const moment = require('moment')

const formatDate = date => moment(date).format('HH:mm:ss.SSS')

module.exports = formatDate
