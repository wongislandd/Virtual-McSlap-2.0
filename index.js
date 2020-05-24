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

const ACCEPTEMOJI = "🟢"
const DECLINEEMOJI = "🔴"
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
    "!serverSettings" : "Displays the current server settings.",
    "!schedule" : "Displays the team's schedule."
  }
  var configCommands = {
    // Config commands
    "!registerTeam" : "Registers your teams discord within the bot's database. The correct format is !registerTeam \"<team>\" <opgg link> \n" +
                      "This will fulfill most of the setup (aside from Timezone) for your server. The channel this message was sent in will become the scheduling channel, \n"+
                      "The bot will look for the Player and Scheduler role and the team will be set with a blank schedule.",
    "!post" : "Prepare to post a new scrim listing. The correct format is !post <Month> <Day> <Time> <AM/PM>",
    "!remove" : "Removes a **pending** scrim from your teams schedule by index. The correct format is !remove <index>",
    "!setTimeZone" : "Sets the desired time zone. The correct format is !setTimeZone <Eastern/Pacific/Central/Mountain>",
    "!changeOPGG" : "Changes the team's OPGG link. The correct format is !changeOPGG <opgg>",
    "!changeName" : "Changes the team's name. The correct format is !changeName <name>",
    "!makeMeAScheduler" : "Adds the sender of the message as a scheduler for the team. Requires Scheduler role.",
    "!removeScheduler" : "Removes a scheduler from the team. Requires scheduler role. The correct format is !removeScheduler <tag>"
}
  strToReturn = "__**Basic commands**__ \n";
  Object.entries(basicCommands).forEach(([key, value]) => {
    strToReturn += "**"+key+"**" + "```" + value + "```";
   });
  strToReturn += "\n__**Setting commands (requires the Scheduler role)**__ \n";
  Object.entries(configCommands).forEach(([key, value]) => {
      strToReturn += "**"+key+"**" + "```" + value + "```\n";
  });
  return strToReturn;
}



client.on('message', async msg => {
  if (msg.channel.type == "dm"){ // for pms, maybe reply but make sure it's not responding to itself.
    return(console.log("A message was sent through a DM and has been ignored."));
  }
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
    case 'ping' :
        msg.reply("Pong!")
        break;
    case 'registerTeam':
        var validInput = /registerTeam[\s]+"[\S\s]+"[\s]+(https:\/\/na.op.gg\/[\S]+)/
        // If it does not match the valid input, reject.
        if(!msg.content.match(validInput)){
            msg.reply("The input was invalid. The correct format is !registerTeam \"<team>\" <opgg link> \n**ex. !registerTeam \"Team Chris\" https://na.op.gg/multi/query=wisperance%2Cbasu%2Csssssss**");
            return
        }
        if (!await isAScheduler(msg)){
          msg.reply("Only schedulers can use this command!")
          return;
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
      if (!await isAScheduler(msg)){
        msg.reply("Only schedulers can use this command!")
        return;
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
        var formattedListing = Scrim.formatIntoConfirmationString(requestedTime, TIMEZONES[data.timeZone], data.team.name, data.team.schedulers, data.team.OPGG)
        getPostingConfirmation(msg, formattedListing, data, timeValue);
      })
        break
      case 'schedule':
        db.collection('servers').doc(msg.guild.id).get()
        .then(doc=> {
          let data = doc.data();
          if (data.team.schedule.length == 0){
            msg.reply("You currently have no scrims scheduled.")
            return;
          }
          Team.printSchedule(data, msg, data.schedulingChannelID)
        }
        )
        break;
      case 'remove':
        var validInput = /remove[\s]+[\d]+/
        if(!msg.content.match(validInput)){
            msg.reply("The input was invalid. The correct format is !post <Month> <Day> <Time> <AM/PM>\n**ex. !post May 20 5:00 PM**");
            return
        }
        if (await isAScheduler(msg)) {
          var indexToRemove = msg.content.split(" ")[1]
          removeScrimByIndex(msg, indexToRemove)
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
      case 'clear':
        if (await isAScheduler(msg)) {
          wipeTeamsSchedule(msg)
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
      case 'makeMeAScheduler':
        if (await isAScheduler(msg)) {
          addAScheduler(msg)
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
      case 'removeScheduler':
        var validInput = /removeScheduler[\s].+#[\d]{4}/
        if(!msg.content.match(validInput)){
          msg.reply("The input was invalid. The correct format is !removeAScheduler <tag> **ex. !removeScheduler chriss#8261**");
          return;
        }
        if (await isAScheduler(msg)) {
          removeAScheduler(msg)
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
      case 'changeOPGG':
        var validInput = /changeOPGG[\s]+(https:\/\/na.op.gg\/[\S]+)/
        if(!msg.content.match(validInput)){
          msg.reply("The input was invalid. The correct format is !changeOPGG **ex. !changeOPGG https://na.op.gg/multi/query=wisperance%2Cbasu%2Csssssss**");
          return;
        }
        if(await isAScheduler(msg)){
          var newOPGG = msg.content.split(" ")[1]
          Team.changeOPGG(msg.guild.id, newOPGG, db)
          msg.reply("```OPGG changed to " + newOPGG  + ".```")
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
      case 'changeName':
        var validInput = /changeName[\s].+/
        if(!msg.content.match(validInput)){
          msg.reply("The input was invalid. The correct format is !changeOPGG **ex. !changeName Stony Brook Esports**");
          return;
        }
        if(await isAScheduler(msg)){
          var newName = msg.content.replace("!changeName ", "");
          Team.changeName(msg.guild.id, newName, db)
          msg.reply("```Name changed to " + newName  + ".```")
        }else{
          msg.reply("Only Scheduler's can call this command!");
        }
        break;
      case 'ranked?':
        if(Math.random()*5 + 1 > 4){
          msg.channel.send("PAKRAT SHOULD PLAY RANKED.")
        }else{
          msg.channel.send("PAKRAT SHOULD STOP PLAYING RANKED.")
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
        var awayServerID = await findAssociatedTeam(user.tag)
        if (awayServerID == "NOT FOUND"){
          user.send("I see you reacted to a scrim listing but I couldn't find you registered under a team in my database! Please make sure you're registered.")
          return;
        }else{
          console.log(`${user.tag} belongs to ${client.guilds.cache.get(awayServerID).name}`)
          var content = reaction.message.content
          // Find the scrim time, this will be used to uniquely identify the scrim
          var indexOfStart = content.indexOf(",", content.indexOf("**Time**: "))
          var timeOfScrim = content.substring(indexOfStart+2)
          // Similarly, Find the first listed manager by the format of the listing and parse from there.
          // This will need to be changed if the format of the posting is changed. Or I come up
          // with a more clever idea. Should also just make it go through all the managers if one isn't found.
          // This is a secondary concern.
          indexOfStart = content.indexOf("**Schedulers**: ")
          var firstListedSchedulerTag = content.substring(indexOfStart + 16, content.indexOf("#")+5)
          var homeServerID = await findAssociatedTeam(firstListedSchedulerTag)
          if (homeServerID == "NOT FOUND"){
            return;
          }
          // Don't let users react to their own posts.
          if (awayServerID == homeServerID){
             user.send("You reacted to your own server's listing. I ignored you sorry uwu")
             return;
          }
          console.log(`${firstListedSchedulerTag} belongs to ${client.guilds.cache.get(homeServerID).name}`)
          showInterest(reaction, awayServerID, homeServerID, timeOfScrim)
        }
      }
    }

  });



async function showInterest(reactionA, awayServerID, homeServerID, timeOfScrim){
  var awaySchedulingChannelID = await findSchedulingChannel(awayServerID);
  var homeSchedulingChannelID = await findSchedulingChannel(homeServerID);
  var awayTeamData = await getTeamData(awayServerID);
  var homeTeamData = await getTeamData(homeServerID);
  var awayServerChannel = client.guilds.cache.get(awayServerID).channels.cache.get(awaySchedulingChannelID)
  var homeServerChannel = client.guilds.cache.get(homeServerID).channels.cache.get(homeSchedulingChannelID)
  homeServerChannel.send(
    "__**Scrim inquiry regarding the listing for " + timeOfScrim + ". React " + ACCEPTEMOJI + " to accept or " + DECLINEEMOJI + " to decline.**__\n" + 
    Team.teamAsString(awayTeamData.name, awayTeamData.team.schedulers, awayTeamData.team.OPGG)).then(async sentMsg=>{
      var filter = (reaction, user) => {
        return [ACCEPTEMOJI, DECLINEEMOJI].includes(reaction.emoji.name) && user.id != BOTID && isAScheduler2(awayServerID, user.id) ;
      };
      await sentMsg.react(ACCEPTEMOJI)
      await sentMsg.react(DECLINEEMOJI)
      sentMsg.awaitReactions(filter, {max: 1, time: 60000, errors: ['time']})
      .then(collected => {
        const reaction = collected.first();
        if (reaction.emoji.name === ACCEPTEMOJI) {
          // Accept offer, change pending status, add the away team, add to away team's schedule
          console.log("YEEEEEEEEEEEEEEET")
          var indexOfScrim = findScrimIndexByTime(homeTeamData.team.schedule, timeOfScrim);
          if (indexOfScrim == -1){
            return;
          }
          console.log("REEEEEEEEEEEEEEEEEEEEEEE")
          var scrim = homeTeamData.team.schedule[indexOfScrim]
          scrim.awayTeam = awayTeamData.team.name
          scrim.awayTeamOPGG = awayTeamData.team.OPGG
          scrim.awayTeamSchedulers = awayTeamData.team.schedulers
          scrim.pending = false
          addAcceptedScrimToSchedule(awayServerID, scrim);
          reaction.message.delete();
          homeServerChannel.send("```" + `Accepted offer from ${awayTeamData.team.name} for ${timeOfScrim}`+"```")
          awayServerChannel.send("```" + `${homeTeamData.team.name} accepted your offer for ${timeOfScrim}`+"```")
          // Reaction A is the original scrim listing in the collegiate server.
          console.log("Deleting the original message.")
          reactionA.message.delete();
        } else {
          reaction.message.delete();
          homeServerChannel.send("```" + `Declined offer from ${awayTeamData.team.name} for ${timeOfScrim}`+"```")
          // Decline offer, notify away team.
          awayServerChannel.send("```" + `${homeTeamData.name} declined your offer for ${timeOfScrim}`+"```")
        }
      }).catch(collected => {
        console.log(collected)
      });
  })
}

async function findSchedulingChannel(serverid){
  console.log(`Looking for scheduling channel associated with ${serverid}`)
  return new Promise(function(resolve, reject) {
    db.collection('servers').doc(serverid)
  .get()
  .then(doc => {
      resolve(doc.data().schedulingChannelID)
  }).then(() =>
      resolve("NOT FOUND, SHOULD NEVER HAPPEN.")
  )});
}

// Given the serverid of a team's discord, return their data.
async function getTeamData(serverid){
  return new Promise(function(resolve, reject) {
    db.collection('servers').doc(serverid)
  .get()
  .then(doc => {
      resolve(doc.data())
  }).then(() =>
      resolve("NOT FOUND, SHOULD NEVER HAPPEN.")
  )});
}

function findScrimIndexByTime(schedule, time){
  console.log(`Looking for a scrim for ${time}`)
  // Convert time to moment.js value
  time = time.replace(/st|nd|th/, "")
  var date = new Date(time);
  var dateValue = date.valueOf()
  for (var i=0;i<schedule.length;i++){
    if (schedule[i].time == dateValue){
      return i;
    }
  }
  return -1;
}

async function findAssociatedTeam(schedulerTag){
    console.log(`Looking for teams associated with ${schedulerTag}`)
    return new Promise(function(resolve, reject) {
      db.collection('servers').where("team.schedulers", "array-contains", schedulerTag)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(function(doc){
        resolve(doc.id)
      });
    }).then(() =>
        resolve("NOT FOUND")
    )});
}

// Returns 1 if the author of the message is a scheduler, 0 if not.
async function isAScheduler(msg){
  var member = msg.guild.members.fetch(msg.author.id);
  console.log(`Checking if ${msg.author.tag} is a scheduler.`)
  if ((await member).roles.cache.some(role => role.name === 'Scheduler')) {
    console.log("Scheduler found!")
    return 1;
  }else{
    console.log("Not found to be a Scheduler!")
    return 0;
  }
}
async function isAScheduler2(serverid, userid){
  var member = client.guilds.cache.get(serverid).members.fetch(userid);
  if ((await member).roles.cache.some(role => role.name === 'Scheduler')) {
    console.log("Scheduler found!")
    return 1;
  }else{
    console.log("Not found to be a Scheduler!")
    return 0;
  }
}

function removeScrimByIndex(msg, index){
  db.collection('servers').doc(msg.guild.id).get()
  .then(doc=> {
    let data = doc.data()
    var team = data.team
    team.schedule.sort(Team.scrimComparator);
    if (index >= team.schedule.length){
      msg.reply("Out of bounds index given.")
    }
    if (team.schedule[index].pending == false){
      msg.reply("This scrim is already confirmed. You must contact the opposing team if you wish to cancel.")
      return;
    }
    var scrim = team.schedule.splice(index, 1)[0]
    db.collection('servers').doc(msg.guild.id)
    .update({
      team : team
    }).catch(error => console.log(error))
    client.guilds.cache.get(collegiateServerID).channels.cache.get(collegiateSchedulingChannelID).messages.fetch(scrim.msgID).then(message => message.delete())
    msg.reply("```" + ` Pending scrim cancelled. `+"```")
}).catch(error =>
  console.log(error)
)
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
        msg.reply("``` Schedule wiped. ```")
    }).catch(error =>
      console.log(error)
    )
  }

function addAcceptedScrimToSchedule(serverid, scrim){
  console.log("ADD ACCEPTED CALLED.")
  db.collection('servers').doc(serverid).get()
  .then(doc=> {
    let data = doc.data()
    var team = data.team
    team.schedule.push(scrim)
    db.collection('servers').doc(serverid)
    .update({
      team : team
    })
}).catch(error =>
  console.log(error)
)
}

function addNewScrimToSchedule(msg, data, timeValue, sentMsgID){
    data.team.schedule.push({
      time : timeValue,
      homeTeam : data.team.name,
      homeTeamOPGG : data.team.OPGG,
      homeTeamSchedulers : data.team.schedulers,
      awayTeam : "",
      awayTeamOPGG : "",
      awayTeamSchedulers : "",
      msgID : sentMsgID,
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
  var filter = (reaction, user) => {
    return [CONFIRMEMOJI, CANCELEMOJI].includes(reaction.emoji.name) && user.id != BOTID && user.id === msg.author.id;
  };
  msg.channel.send("__Does this look good?__ \n"+ formattedListing)
        .then(async sentMsg=>{
            await sentMsg.react(CONFIRMEMOJI)
            await sentMsg.react(CANCELEMOJI)
            sentMsg.awaitReactions(filter, {max: 1, time: 60000, errors: ['time']})
            .then(collected => {
              const reaction = collected.first();
              if (reaction.emoji.name === CONFIRMEMOJI) {
                msg.reply('``` Listing posted to the Collegiate scheduling channel. ```');
                client.guilds.cache.get(collegiateServerID).channels.cache
                .get(collegiateSchedulingChannelID)
                .send(`__New Scrim Listing. React ${INTERESTEMOJI} to send a request.__ \n` + formattedListing)
                .then(async sentMsg=>{
                  await sentMsg.react(INTERESTEMOJI);
                  reaction.message.delete();
                  addNewScrimToSchedule(msg, data, timeValue, sentMsg.id)
                })
              } else {
                reaction.message.delete();
                msg.reply('```Canceled this listing```');
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
      msg.reply("```" + schedulerToRemove + " removed as a scheduler from " + team.name + "```")
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

