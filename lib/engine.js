const Auth = require('./auth')

module.exports = function engine(config,auth){
  let storage = config.common.storage
  config.engine.on('playerSandbox', function(sandbox) {
    sandbox.setSSHPublicKey = function(key) {
      storage.db.users.update({ _id: sandbox.module.user },{ $set: {
        sshPublicKey: key,
      }})
      .then((res)=>sandbox.console.log('SSH Public Key Set'))
      .catch(err=>sandbox.console.error(err))
    }
  })
}