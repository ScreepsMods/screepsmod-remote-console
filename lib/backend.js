const inspect = require('util').inspect;
const ssh2 = require('ssh2');
cosnt utils = ssh2.utils;
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const UserConsole = require('./UserConsole')

module.exports = function(config){
  process.argv.push('--color=true')
  let pubsub = config.common.storage.pubsub
  console.log(pubsub,Object.keys(pubsub))
  let consoles = []
  let pubsubInter = setInterval(()=>{
    if(pubsub.subscribe){
      console.log('pubsub')
      clearInterval(pubsubInter)
      pubsub.subscribe('*', (channel, data)=>{
        if(channel.includes('console'))
          console.log(channel,data,consoles.length)
        consoles.forEach(c=>{
          c.emit(channel,data)
        })
      })
    }
  },100)
  
  new ssh2.Server({
    hostKeys: [fs.readFileSync(`${__dirname}/keys/id_rsa`)]
  }, function(client) {
    let uconsole = new UserConsole({
      config,
      client,
    })
    consoles.push(uconsole)
    console.log('Client connected!');
    let user
    client.on('authentication', function(ctx) {
      if (ctx.method === 'password'){        
        client._user = ctx.username
        config.common.storage.db.users.findOne({ username: ctx.username })
        // config.auth.authUser(ctx.username,ctx.password)
          .then((user)=>{
            client._user = user 
            return user?ctx.accept():ctx.reject()
          })
        return false
      } else if (ctx.method === 'publickey'
             && ctx.key.algo === pubKey.fulltype
             && buffersEqual(ctx.key.data, pubKey.public)) {
      if (ctx.signature) {
        var verifier = crypto.createVerify(ctx.sigAlgo);
        verifier.update(ctx.blob);
        if (verifier.verify(pubKey.publicOrig, ctx.signature))
          ctx.accept();
        else
          ctx.reject();
      } else {
        // if no signature present, that means the client is just checking
        // the validity of the given public key
        ctx.accept();
      }
    } else
        ctx.reject();
    }).on('ready', function() {
      console.log('Client authenticated!');
      client.on('session', function(accept, reject) {
        let session = accept();
        session.once('pty',function(accept,reject,info){
          uconsole.pty = info
          accept()
        })
        session.on('window-change',function(accept,reject,info){
          uconsole.pty = info
          if(typeof accept == 'function') accept()
        })
        session.once('shell', function(accept, reject, info) {
          console.log('Client wants a shell');
          let stream = accept();
          uconsole.shell(stream)
        });
      });
    }).on('end', function() {
      console.log('Client disconnected');
      let ind = consoles.indexOf(uconsole)
      consoles.splice(ind,1)
    });
  }).listen(21030, '0.0.0.0', function() {
    console.log('Listening on port ' + this.address().port);
  });

}