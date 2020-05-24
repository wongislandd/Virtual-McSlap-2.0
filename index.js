// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
const admin = require('firebase-admin');
const serviceAccount = require('./ServiceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore()
// Run by "node index.js"

// Require custom classes
const Team = require('./classes/Team')
const DiscordChannel = require('./classes/DiscordChannel')
const Scrim = require('./classes/Scrim')

// Require Discord
const Discord = require('discord.js');
const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
const PREFIX = "!"

// For usage in moment.js
const moment = require('moment-timezone')
const TIMEZONES = {
  EASTERN : "America/New_York",
  PACIFIC : "America/Los_Angeles",
  MOUNTAIN : "America/Boise",
  CENTRAL : "America/Thunder_Bay",
}
const YEAR = new Date().getFullYear()
const MONTHS = {
  January : "01",
  February : "02",
  March : "03",
  April : "04",
  May : "05",
  June : "06",
  July : "07",
  August : "08",
  September : "09",
  October : "10",
  November : "11",
  December : "12",
}




// COLLEGIATE SCHEDULING CHANNEL GUILD AND ID
const collegiateServerID = "713578165511127132"
const collegiateSchedulingChannelID = "713866406705233952"
const BOTID = "713577813159968800"


const CONFIRMEMOJI = "👍"
const CANCELEMOJI = "👎"
const INTERESTEMOJI = "🤘🏼";


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
    schedulerRoleID : -1,
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



function botDescription(){
  var basicCommands = {
    // Basic commands
    "!info" : "Returns a list of supported commands.",
  }
  var configCommands = {
    // Config commands
    "!registerTeam" : "Registers your teams discord within the bot's database. This is required. The correct format is !registerTeam \"<team>\" <opgg link>",
    "!setTimeZone" : "Sets the desired time zone. The correct format is !setTimeZone <EST/EDT/PST/PDT/MST/MDT/CST/CDT>"
}
  strToReturn = "__**Basic commands**__ \n";
  Object.entries(basicCommands).forEach(([key, value]) => {
      strToReturn += "**"+key+"**" + " - " + value + "\n";
   });
  strToReturn += "\n__**Setting commands (requires the Scheduler role)**__ \n";
  Object.entries(configCommands).forEach(([key, value]) => {
      strToReturn += "**"+key+"**" + " - " + value + "\n";
  });
  return strToReturn;
}



client.on('message', async msg => {
  if (!msg.content.startsWith(PREFIX)){
    return;
  }
  let args = msg.content.substring(PREFIX.length).split(" ");
  switch(args[0]){
    case 'info':
        msg.channel.send(botDescription())
        break;
    case 'serverSettings':
        if(checkForDefaultFields(msg) == -1){
          console.log("An uninitialized user attempted to use a command!");
          return;
        }
        db.collection('servers').doc(msg.guild.id).get()
        .then(doc => { 
            var str = "__Here are the details I have on record for your server: __"
            let data = doc.data()
            str += `\n**Server Name:** ${data.name}`
            str += `\n**Preferred Time Zone:** ${data.timeZone}`
            str += `\n**Player Role:** ${msg.guild.roles.cache.get(data.playerRoleID)}`
            str += `\n**Scheduler Role:** ${msg.guild.roles.cache.get(data.schedulerRoleID)}`
            str += `\n**Scheduling Channel:** ${msg.guild.channels.cache.get(data.schedulingChannelID)}`
            str += `\n**Team Name:** ${data.team.name}`
            str += `\n**Team Schedulers:** ${data.team.schedulers}`
            str += `\n**OPGG:** ${data.team.OPGG}`
            str += ""
            msg.channel.send(str);
        }).catch(err => {
          console.log("Error getting document", err);
          somethingWrong = 1;
        })
        break;
    case 'test' :
        if(checkForDefaultFields(msg) == -1){
          console.log("An uninitialized user attempted to use a command!");
          return;
        }
        findAssociatedTeam(msg.author.tag)
        break;
    case 'registerTeam':
        var validInput = /registerTeam[\s]+"[\S\s]+"[\s]+(https:\/\/na.op.gg\/[\S]+)/
        // If it does not match the valid input, reject.
        if(!msg.content.match(validInput)){
            msg.reply("The input was invalid. The correct format is !registerTeam \"<team>\" <opgg link> \n**ex. !registerTeam \"Team Chris\" https://na.op.gg/multi/query=wisperance%2Cbasu%2Csssssss**");
            return
        }
        var teamName = (msg.content.match(/"(.*)"/)[0]).replace("\"","").replace("\"","")
        var OPGG = msg.content.substring(msg.content.indexOf("https://na.op.gg/"))
        attemptToSetRoles(msg);
        db.collection('servers').doc(msg.guild.id).update({
          team : {
            discordChannelID : msg.guild.id, 
            schedulers: [msg.author.tag], 
            name: teamName, 
            OPGG: OPGG, 
            schedule : [],
          },
          schedulingChannelID : msg.channel.id,
        })
        console.log(teamName + " successfully attatched to " + msg.guild.name + " within the database.")
        msg.channel.send("```" + teamName + " successfully attatched to " + msg.guild.name + " within the database. Use !serverSettings to check what I know.```")
        break;
    case 'setTimeZone':
      var validInput = /setTimeZone[\s]+(Eastern|Pacific|Mountain|Central)/
      if(!msg.content.match(validInput)){
        msg.reply("The input was invalid. The correct format is !setTimeZone <Eastern/Pacific/Mountain/Central> \n**ex. !setTimeZone Eastern**");
        return
      }
      timeZone = args[1].toUpperCase()
      DiscordChannel.changeTimezone(msg.guild.id, timeZone, db)
      msg.channel.send("```" + msg.guild.name + " time zone has been set to " + timeZone + " within the database.```")
      break;
    case 'post':
      var validInput = /post[\s]+(January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{1,2}\s+[\d]{1,2}[:][\d]{2}[\s]+(AM|PM|am|pm)/
      if(!msg.content.match(validInput)){
        msg.reply("The input was invalid. The correct format is !post <Month> <Day> <Time> <AM/PM>\n**ex. !post May 20 5:00 PM**");
        return
      }
      var month = args[1];
      var day = args[2];
      var time = args[3];
      var AMPM = args[4];
      if (day.length == 1){
        day = "0" + day
      }
      // If PM was specified, add 12 to the total time.
      if(AMPM == "PM"){
        var timeSplit = time.split(":")
        var hour = timeSplit[0]
        hour = parseInt(hour)+12
        time = hour + ":" + timeSplit[1]
      }
      db.collection('servers').doc(msg.guild.id).get()
      .then(doc=> {
        let data = doc.data()
        var timeZone = data.timeZone;
        switch(timeZone){
          case 'EASTERN':
            var requestedTime = moment.tz(`${YEAR}-${MONTHS[month]}-${day} ${time}`, TIMEZONES["EASTERN"])           
            break;
          case 'PACIFIC':
            var requestedTime = moment.tz(`${YEAR}-${MONTHS[month]}-${day} ${time}`, TIMEZONES["PACIFIC"])
            break;
          case 'MOUNTAIN':
            var requestedTime = moment.tz(`${YEAR}-${MONTHS[month]}-${day} ${time}`, TIMEZONES["MOUNTAIN"])
            break;
          default:
            var requestedTime = moment.tz(`${YEAR}-${MONTHS[month]}-${day} ${time}`, TIMEZONES["CENTRAL"])
            break;
        }
        if (!requestedTime.isValid()){
          msg.reply("You gave me an invalid time. >:(")
          return;
        }
        // This is the value I want to store within Firestore
        var timeValue = requestedTime.valueOf();
        // Push a new scrim into the local array, then update in the database.
        var formattedListing = Scrim.formatIntoPendingString(requestedTime, TIMEZONES[data.timeZone], data.team.name, data.team.schedulers, data.team.OPGG)
        getPostingConfirmation(msg,  formattedListing, data, timeValue);
      })
        break
      case 'schedule':
        db.collection('servers').doc(msg.guild.id).get()
        .then(doc=> {
          let data = doc.data();
          Team.printSchedule(data, msg, data.schedulingChannelID)
        }
        )
        break;
      case 'clear':
        wipeTeamsSchedule(msg);
        break;
      case 'makeMeAScheduler':
        var member = msg.guild.members.fetch(msg.author.id);
        if ((await member).roles.cache.some(role => role.name === 'Scheduler')) {
          addAScheduler(msg)
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
      case 'removeAScheduler':
        var validInput = /removeAScheduler[\s].+#[\d]{4}/
        if(!msg.content.match(validInput)){
          msg.reply("The input was invalid. The correct format is !removeAScheduler <tag> **ex. !removeAScheduler chriss#8261**");
          return;
        }
        var member = msg.guild.members.fetch(msg.author.id);
        if ((await member).roles.cache.some(role => role.name === 'Scheduler')) {
          removeAScheduler(msg)
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
    }
  });




  client.on('messageReactionAdd', async (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
      // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
      try {
        await reaction.fetch();
      } catch (error) {
        console.log('Something went wrong when fetching the message: ', error);
        // Return as `reaction.message.author` may be undefined/null
        return;
      }
    }
    if (user.id != BOTID && reaction.message.author.id == BOTID && reaction.message.content.includes("New Scrim Listing")){
      if (reaction.emoji.name == INTERESTEMOJI){
        console.log(`${user.tag} reacted to a listing.`)
        findAssociatedTeam(user.tag);
      }
    }

  });








function findAssociatedTeam(schedulerTag){
  console.log(`Looking for teams associated with ${schedulerTag}`)
  db.collection('servers').where("team.schedulers", "in", [schedulerTag])
  .get()
  .then(function(querySnapshot) {
    querySnapshot.forEach(function(doc){
      console.log(doc.id, " => ", doc.data());
    });
  })
  .catch(error =>
    console.log(error))
  
}
  
function wipeTeamsSchedule(msg){
    db.collection('servers').doc(msg.guild.id).get()
      .then(doc=> {
        let data = doc.data()
        var team = data.team
        team.schedule = []
        db.collection('servers').doc(msg.guild.id)
        .update({
          team : team
        })
    }).catch(error =>
      console.log(error)
    )
  }


function addScrimToSchedule(msg, data, timeValue){
    data.team.schedule.push({
      time : timeValue,
      homeTeam : data.team.name,
      awayTeam : "",
      pending : true,
    })
    db.collection('servers').doc(msg.guild.id).update({
      team : data.team
    }).catch(error =>
      console.log(error)
    )
    console.log(`Added a new scrim to ${data.name}'s schedule`)
}

function getPostingConfirmation(msg, formattedListing, data, timeValue){
  const filter = (reaction, user) => {
    return [CONFIRMEMOJI, CANCELEMOJI].includes(reaction.emoji.name) && user.id === msg.author.id;
  };
  msg.channel.send("__Does this look good?__ \n"+ formattedListing)
        .then(async sentMsg=>{
            await sentMsg.react(CONFIRMEMOJI)
            await sentMsg.react(CANCELEMOJI)
            sentMsg.awaitReactions(filter, {max: 1, time: 60000, errors: ['time']})
            .then(collected => {
              const reaction = collected.first();
              if (reaction.emoji.name === CONFIRMEMOJI) {
                addScrimToSchedule(msg, data, timeValue)
                msg.reply('``` Listing posted to the Collegiate scheduling channel. ```');
                client.guilds.cache.get(collegiateServerID).channels.cache
                .get(collegiateSchedulingChannelID)
                .send("__New Scrim Listing__ \n" + formattedListing)
                .then(async sentMsg=>{
                  await sentMsg.react(INTERESTEMOJI);
                })
              } else {
                msg.reply('```Canceled this listing```.');
              }
            }).catch(collected => {
              console.log(collected)
            });
        })
}

// Makes the one who called this function a scheduler. They should have the scheduler tag first.
function addAScheduler(msg){
  db.collection('servers').doc(msg.guild.id).get()
      .then(doc=> {
        let data = doc.data()
        var team = data.team
        // Only add if they are already on
        if (team.schedulers.indexOf(msg.author.tag) === -1){
          team.schedulers.push(msg.author.tag)
          db.collection('servers').doc(msg.guild.id)
          .update({
            team : team
          })
          msg.reply("```" + msg.author.tag + " added as a scheduler for " + team.name + "```")
        }else{
          msg.reply("That scheduler already exists!")
        }
    }).catch(error =>
      console.log(error)
   )
}

function removeAScheduler(msg){
  db.collection('servers').doc(msg.guild.id).get()
  .then(doc=> {
    let data = doc.data()
    var team = data.team
    var schedulerToRemove = msg.content.replace("!removeAScheduler ", "");
    console.log(`Scheduler to remove is ${schedulerToRemove}`)
    // Remove if it exists
    if (team.schedulers.indexOf(schedulerToRemove) != -1){
      team.schedulers.splice(team.schedulers.indexOf(schedulerToRemove));
      db.collection('servers').doc(msg.guild.id)
      .update({
        team : team
      })
      msg.reply("```" + msg.author.tag + " removed as a scheduler from " + team.name + "```")
    }else{
      msg.reply("I couldn't find that scheduler in your list.")
    }

  }).catch(error =>
    console.log(error)
  )
}

function attemptToSetRoles(msg){
  var schedulerRole = msg.guild.roles.cache.find(role => role.name === "Scheduler")
  var playerRole = msg.guild.roles.cache.find(role => role.name === "Player")
  if (schedulerRole == null){
    msg.reply("I tried to setup the Scheduler role as your primary scheduling role but I couldn't find it. \n Please create a role named Scheduler for me to use.")
  }else{
    db.collection('servers').doc(msg.guild.id).update({
      schedulerRoleID : schedulerRole.id
    })
  }
  if (playerRole == null){
    msg.reply("I tried to setup the Player role as your primary player role but I couldn't find it. \n Please create a role named Player for me to use.")
  }else{
    db.collection('servers').doc(msg.guild.id).update({
      playerRoleID : playerRole.id
    })
  }
}
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
    if (data.schedulerRoleID == -1){
      str += "\n- Scheduler role. "
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
}

// Gets the current details of the server

client.login("NzEzNTc3ODEzMTU5OTY4ODAw.XsiJLg.FIR6eETw2bMcOcvGm0stomqxeLE");

