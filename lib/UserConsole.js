const EventEmitter = require('events').EventEmitter
const colors = require('colors')
const readline = require('readline')
const util = require('util')

class UserConsole extends EventEmitter{
  constructor(opts){
    super()
    colors.enabled = true
    opts = opts || {}
    this.config = opts.config
    this.client = opts.client
  }

  saveHistory(){
    this.config.common.storage.db.users.update({ _id: this.uid },{ $set: { consoleHistory: this.rl.history }})
  }

  shell(stream){
    this.stream = stream
    this.stdin = stream.stdin
    this.stdout = stream.stdout
    this.stderr = stream.stderr
    this.rl = readline.createInterface({
      input: this.stdin,
      output: this.stdout,
      prompt: '> ',
      terminal: true,
      historySize: 50
    })
    this.rl.history = this.client._user.consoleHistory || []
    let uid = this.uid = this.client._user._id || this.client._user.id
    this.rl.on('close',()=>{
      stream.exit(0)
      stream.end()
    })
    this.rl.on('line', (line) => {
      line = line.trim()
      if (line == 'exit') {
        this.saveHistory()
        this.emit('close')
        stream.exit(0)
        stream.end()
        return
      }

      // api.console(line)
      this.log('<<',uid,line)
      this.config.common.storage.db['users.console'].insert({
        user: uid,
        expression: line
      });
    })
    this.on(`user:${uid}/console`,(data)=>this.handleConsole(data))
    this.log('Console ready')
  }

  handleConsole(data){
    if(typeof data == 'string'){
      data = JSON.parse(data)
    }
    if (data.messages) data.messages.log.forEach(l => this.log(l))
    if (data.messages) data.messages.results.forEach(l => this.log('>', l.gray))
    if (data.error) this.log(data.error.red)
  }

  fu(type, args) {
    // this.rl.output.write(""+this.rl.line.length)
    // this.rl.output.write("-"+this.pty.cols)
    let t = Math.ceil((this.rl.line.length + 3) / this.pty.cols) //this.stdout.columns)
    let text = util.format.apply(console, args).replace(/\n/g,"\r\n")
    // this.rl.output.write('\n\x1B[' + t + 'A\x1B[0J')
    // readline.clearLine(this.rl.output,0)
    // readline.moveCursor(this.rl.output,-(this.rl.line.length + 3),0)
    this.rl.output.write('\x1B[' + (this.rl.line.length + 3) + 'D\x1B[0J')
    this.rl.output.write(text + '\n')
    this.rl.output.write(new Array(t).join('\n\x1B[E'))
    this.rl._refreshLine()
  }

  log() {
    this.fu('log', arguments)
  }
  warn() {
    this.fu('warn', arguments)
  }
  info() {
    this.fu('info', arguments)
  }
  error() {
    this.fu('error', arguments)
  }

}
module.exports = UserConsole