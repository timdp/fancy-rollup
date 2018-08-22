import moment from 'moment'

const formatDate = date => moment(date).format('HH:mm:ss.SSS')

export default formatDate
