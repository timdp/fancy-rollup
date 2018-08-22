import cluster from 'cluster'
import runMaster from './master'
import runWorker from './worker'

const main = cluster.isMaster ? runMaster : runWorker
main()
