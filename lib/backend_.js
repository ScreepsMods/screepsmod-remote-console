const inspect = require('util').inspect;
const ssh2 = require('ssh2');
const cp = require('child_process')
const fs = require('fs')
const path = require('path')

module.exports = function(config){
  new ssh2.Server({
    hostKeys: [fs.readFileSync('/home/adam/.ssh/id_rsa')]
  }, function(client) {
    console.log('Client connected!');
    let user,pass
    client.on('authentication', function(ctx) {
      if (ctx.method === 'password'){        
        client._user = ctx.username
        client._pass = ctx.password
        config.auth.authUser(ctx.username,ctx.password)
          .then((user)=>user?ctx.accept():ctx.reject())
        return false
      } else
        ctx.reject();
    }).on('ready', function() {
      console.log('Client authenticated!');
      client.on('session', function(accept, reject) {
        let session = accept();
        session.once('pty',function(accept,reject,info){
          accept()
        })
        session.once('shell', function(accept, reject, info) {
          console.log('Client wants a shell');
          let stream = accept();
          console.log('2',client._user,client._pass)
          let child = cp.spawn(path.join(__dirname,'..','screeps_console','bin','screepsconsole.sh'),{
            env: {
              SCREEPS_USERNAME: client._user,
              SCREEPS_PASSWORD: client._pass
            },
            stdio: ['pipe','pipe','pipe']
          })
          child.stdout.pipe(stream.stdout)
          child.stderr.pipe(stream.stderr)
          stream.stdin.pipe(child.stdin)
        });
      });
    }).on('end', function() {
      console.log('Client disconnected');
    });
  }).listen(21030, '127.0.0.1', function() {
    console.log('Listening on port ' + this.address().port);
  });

}