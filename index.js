// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
const admin = require('firebase-admin');
const serviceAccount = require('./ServiceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore()
// Run by "node index.js"


// Require Discord
const Discord = require('discord.js');
const client = new Discord.Client();
const PREFIX = "!"


const Team = require('./classes/Team')


client.on("guildCreate", (guild) => {
  console.log(`Adding ${guild.id} (${guild.name}) to the database.`)
    if(guild.roles.cache.find(role => role.name === "Scheduler") == null){ // sets the scheduler role to the custom created one by ID
        guild.roles.create({
        data:{
            name: 'Scheduler',
            color: 'BLUE',
        }
        })
        .then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
        .catch(console.error);
    }
    if(guild.roles.cache.find(role => role.name === "Player") == null){
        guild.roles.create({
        data:{
            name: 'Player',
            color: 'RED'
        }
        }).then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
        .catch(console.error);
    }
  var guildData = {
    name : guild.name,
    schedulingChannelID : -1,
    timeZone : "",
    managerRoleID : -1,
    team : {}
  }
  db.collection('servers').doc(guild.id).set(guildData)
  }
);

client.on("guildDelete", (guild) => {
  console.log(`Removing ${guild.id} (${guild.name}) from the database.`)
  db.collection('servers').doc(guild.id).delete()
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});




client.on('message', msg => {
  if (!msg.content.startsWith(PREFIX)){
    return;
  }
  let args = msg.content.substring(PREFIX.length).split(" ");
  switch(args[0]){
    case 'test' :
      if(checkForDefaultFields(msg) == -1){
        console.log("An uninitialized user attempted to use a command!");
        return;
      }
      break;
    case 'registerTeam':
      const validInput = /registerTeam[\s]+"[\S\s]+"[\s]+(https:\/\/na.op.gg\/[\S]+)/
      // If it does not match the valid input, reject.
      if(!msg.content.match(validInput)){
          msg.reply("The input was invalid. The correct format is !registerTeam \"<team>\" <opgg link> \n**ex. !registerTeam \"Team Chris\" https://na.op.gg/multi/query=wisperance%2Cbasu%2Csssssss**");
      }else{
        var teamName = (msg.content.match(/"(.*)"/)[0]).replace("\"","").replace("\"","")
        var OPGG = msg.content.substring(msg.content.indexOf("https://na.op.gg/"))
        console.log(OPGG)
        db.collection('servers').doc(msg.guild.id).withConverter(teamConverter).update({team : {
          discordChannelID : msg.guild.id, 
          manager: msg.author.tag, 
          name: teamName, 
          OPGG: OPGG, 
          schedule : [],
        }})
      }
      break;
    }
  });

// Checks if anything is uninitialized within the database. Returns -1 if so, and 0 if everything is all good.
function checkForDefaultFields(msg){
  var somethingWrong = 0;
  db.collection('servers').doc(msg.guild.id).get()
  .then(doc => { 
    var str = "The following fields have been found to be uninitialized. You must intitialize them before continuing:"
    let data = doc.data()
    if (data.schedulingChannelID == -1){
      str += "\n- Scheduling channel. "
      somethingWrong++
    }
    // Discord channel id is defined in a working team.
    if (data.team.discordChannelID == undefined){
      str += "\n- Team object. This should never happen."
      somethingWrong++
    }
    if (data.managerRoleID == -1){
      str += "\n- Manager role. "
      somethingWrong++
    }
    if (data.timeZone == ''){
      str += "\n- Time zone."
      somethingWrong++
    }
    if(somethingWrong != 0)
      msg.reply(str)
  })
  .catch(err => {
    console.log("Error getting document", err);
    somethingWrong = 1;
    process.exit();
  })
  if(somethingWrong != 0){
    return -1;
  }else{
    return 0;
  }
}

client.login("NzEzNTc3ODEzMTU5OTY4ODAw.XsiJLg.FIR6eETw2bMcOcvGm0stomqxeLE");

