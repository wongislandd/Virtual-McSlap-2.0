// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
const admin = require('firebase-admin');
const serviceAccount = require('./ServiceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore()

// Run by "node index.js"


require('dotenv').config()

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
const COLLEGIATE_SERVER_ID = "713578165511127132"
const COLLEGIATE_SCHEDULING_CHANNELID = "713866406705233952"
const BOTID = "713577813159968800"

const ACCEPT_EMOJI = "🟢"
const DECLINE_EMOJI = "🔴"
const CONFIRM_EMOJI = "👍"
const CANCEL_EMOJI = "👎"
const INTEREST_EMOJI = "🤘🏼";

const CHRIS = 110128099361849344

// Process for when the bot joins a new server
client.on("guildCreate", (guild) => {
  console.log(`Adding ${guild.id} (${guild.name}) to the database.`)
  var guildData = {
    name : guild.name,
    timeZone : "",
    associatedSchedulers : [],
    teams : []
  }
  // Creates the McSlap administrator role upon entry. This will be needed to register team.
  if(guild.roles.cache.find(role => role.name === `McSlap Administrator`) == null){ // sets the scheduler role to the custom created one by ID
    guild.roles.create({
    data:{
        name: `McSlap Administrator`,
        color: 'GOLD',
    }
    })
    .then(role => {
      console.log(`Created new role with name ${role.name} and color ${role.color}`)
    })
    .catch(console.error);
  }
  db.collection('servers').doc(guild.id).set(guildData)
}
);

// Process for when the bot leaves a server
client.on("guildDelete", (guild) => {
  console.log(`Removing ${guild.id} (${guild.name}) from the database.`)
  db.collection('servers').doc(guild.id).delete()
})


// Main function for waiting for messages.
client.on('message', async msg => {
  if (msg.channel.type == "dm"){ // for pms, maybe reply but make sure it's not responding to itself.
    return(console.log("A message was sent through a DM and has been ignored."));
  }
  // Ignore messages that do not start with the specified prefix.
  if (!msg.content.startsWith(PREFIX)){
    return;
  }
  let args = msg.content.substring(PREFIX.length).split(" ");
  switch(args[0]){
    case 'info':
        msg.channel.send(botDescription())
        break;
    case 'roles':
        msg.channel.send(rolesDescription())
        break;
    case 'serverSettings':
        if(checkForDefaultFields(msg) == -1){
          console.log("An uninitialized user attempted to use a command!");
          return;
        }
        showServerSettings(msg)
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
        registerTeam(msg);
        break;
    case 'setTimezone':
      var validInput = /setTimezone[\s]+(Eastern|Pacific|Mountain|Central)/
      if(!msg.content.match(validInput)){
        msg.reply("The input was invalid. The correct format is !setTimeZone <Eastern/Pacific/Mountain/Central> \n**ex. !setTimeZone Eastern**");
        return
      }
      timeZone = args[1].toUpperCase()
      DiscordChannel.changeTimezone(msg.guild.id, timeZone, db)
      msg.channel.send("```" + msg.guild.name + " time zone has been set to " + timeZone + " within the database.```")
      break;
    case 'setAverageRank':
      var validInput = /setAverageRank[\s].+/
      if(!msg.content.match(validInput)){
        msg.reply("The input was invalid. The correct format is !setAverageRank Masters");
        return
      }
      // From the first space onwards
      var rank = msg.content.substring(msg.content.indexOf(" ")+1)
      Team.changeAverageRank(msg.guild.id, rank, db)
      msg.channel.send("```" + `Set average rank to ${rank}` + "```")
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
      if(checkForDefaultFields(msg) == -1){
        console.log("An uninitialized user attempted to use a command!");
        return;
      }
      post(msg, args);
      break
    case 'schedule':
        if(checkForDefaultFields(msg) == -1){
          console.log("An uninitialized user attempted to use a command!");
          return;
        }
        printSchedule(msg);
        break;
    case 'cancel':
        var validInput = /cancel[\s]+[\d]+/
        if(!msg.content.match(validInput)){
            msg.reply("The input was invalid. The correct format is !post <Month> <Day> <Time> <AM/PM>\n**ex. !post May 20 5:00 PM**");
            return
        }
        if (await isAScheduler(msg)) {
          var indexToRemove = msg.content.split(" ")[1]
          cancelScrimByIndex(msg, indexToRemove)
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
        if(Math.random()*10 + 1 > 9){
          msg.channel.send("PAKRAT SHOULD PLAY RANKED.")
        }else{
          msg.channel.send("PAKRAT SHOULD STOP PLAYING RANKED.")
        }
        break;
    case 'test':
        if(msg.author.id == CHRIS){
          msg.channel.send("!post July 4 4:40 PM")
        }
    case 'echo':
        if(msg.author.id == CHRIS){
          msg.delete();
          var contentToSend = msg.content.replace("!echo ", "")
          msg.channel.send(contentToSend)
        }
        break;
    case 'clear':
        if(msg.author.id == CHRIS){
          wipeTeamsSchedule(msg)
        }
        break;
    case 'checkNow':
        if(msg.author.id == CHRIS){
          checkNow();
        }
        break;
      }
  });








// PRIMARY FUNCTIONS FOR WHEN CERTAIN COMMANDS ARE CALLED. USED TO CONDENSE.

// A mapping of the bots commands, called by the !info command
function botDescription(){
  var basicCommands = {
    // Basic commands
    "!info" : "Returns a list of supported commands.",
    "!serverSettings" : "Displays the current server settings.",
    "!schedule" : "Displays the team's schedule.",
    "!roles" : "Shows information about roles that the bot uses."
  }
  var configCommands = {
    // Config commands
    "!registerTeam" : "Registers your teams discord within the bot's database. The correct format is !registerTeam \"<team>\" <opgg link> \n" +
                      "This will fulfill most of the setup (aside from Timezone) for your server. The channel this message was sent in will become the scheduling channel. "+
                      "The bot will look for the Player and Scheduler role and the team will be set with a blank schedule.",
    "!post" : "Prepare to post a new scrim listing. The correct format is !post <Month> <Day> <Time> <AM/PM>",
    "!cancel" : "Removes a **pending** scrim from your teams schedule by index. The correct format is !cancel <index>",
    "!setTimezone" : "Sets the desired time zone. The correct format is !setTimeZone <Eastern/Pacific/Central/Mountain>",
    "!changeOPGG" : "Changes the team's OPGG link. The correct format is !changeOPGG <opgg>",
    "!changeName" : "Changes the team's name. The correct format is !changeName <name>",
    "!makeMeAScheduler" : "Adds the sender of the message as a scheduler for the team. Requires Scheduler role.",
    "!removeScheduler" : "Removes a scheduler from the team. Requires scheduler role. The correct format is !removeScheduler <tag>",
    //"!setAverageRank" : "Sets the listed average rank of your team. The correct format is !setAverageRank <rank>"
}
// My note
  strToReturn = "*Note from the creator: \nThis bot was created by Chris (chriss#8261). Virtual McSlap 2.0 is named after my team's manager McSlap. This bot is meant to ease the role of a team's manager by automating "+
                "a lot of the process involved in scheduling scrims. Of course, in any extreneous circumstance / cancelations I would recommend contacting a scheduler directly. I left their "+
                "information readily available. If you have any ideas on improvements or find any bugs, please contact me.*\n"
  strToReturn += "__**Basic commands (anyone can use these)**__ \n";
  Object.entries(basicCommands).forEach(([key, value]) => {
    strToReturn += "**"+key+"**" + "```" + value + "```";
   });
  strToReturn += "\n__**Setting commands (requires the Scheduler role)**__ \n";
  Object.entries(configCommands).forEach(([key, value]) => {
      strToReturn += "**"+key+"**" + "```" + value + "```\n";
  });
  return strToReturn;
}

// A mapping of roles and descriptions, called by the !role command
function rolesDescription(){
  var roles =  {
    // Description of roles
    "Scheduler" : "A scheduler must have the @Scheduler role in the Discord and then register themselves to the bot with !makeMeAScheduler. A registered scheduler becomes the representative" +
                 " for your server's discord. There can be multiple schedulers per server. \n"  +
                 "Schedulers can post, inquire, and accept or deny scrim requests.",
    "Player" : "Users with the @Player role are tagged when a scrim is coming up soon."
 }
 strToReturn = "\n__**Role Descriptions**__ \n";
 Object.entries(roles).forEach(([key, value]) => {
     strToReturn += "**"+key+"**" + "```" + value + "```\n";
 });
 return strToReturn;
}


// Queries firestore and returns various information about the server's settings.
function showServerSettings(msg){
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
      str += `\n**Average Rank:** ${data.team.avgRank}`
      str += `\n**OPGG:** ${data.team.OPGG}`
      str += ""
      msg.channel.send(str);
  }).catch(error => console.log(error))
}

// Registers a team in the firestore
  async function registerTeam(msg){
    var teamName = (msg.content.match(/"(.*)"/)[0]).replace("\"","").replace("\"","")
    var OPGG = msg.content.substring(msg.content.indexOf("https://na.op.gg/"))
    var roleIDs = await createRolesForNewTeam(msg.guild.id, teamName)
    if (roleIDs == -1){
      msg.reply("You already have the roles created. Please remove them and try again.")
      return;
    }
    team = {
        schedulers: [msg.author.tag],
        schedulerRoleID : roleIDs[0],
        playerRoleID : roleIDs[1],
        schedulingChannelID : msg.channel.id,
        name: teamName, 
        discordChannelID : msg.guild.id,
        avgRank : "",
        OPGG: OPGG, 
        schedule : [],
    }
    addTeamToServer(msg.guild.id, team)
    addAnAssociatedScheduler(msg.guild.id, msg.author.tag)
    .then(msg.channel.send("```" + teamName + " successfully attatched to " + msg.guild.name + " within the database. Use !serverSettings to check what I know.```")).catch(error=>console.log(error))
    console.log(teamName + " successfully attatched to " + msg.guild.name + " within the database.")
  }

  async function addAnAssociatedScheduler(serverid, schedulertag){
    db.collection('servers').doc(serverid).update({
      associatedSchedulers : fireStore.FieldValue.arrayUnion([schedulertag])
    }).catch(error => console.log(error))
  }

async function addTeamToServer(serverid, team){
  db.collection('servers').doc(serverid).get()
  .then(doc=> {
    let data = doc.data()
    var teams = data.teams
    teams.push(team)
    db.collection('servers').doc(serverid)
    .update({
      teams : teams
    })
  })
}

// Roles created first index is Scheduler role id, Second index is Player role id
async function createRolesForNewTeam(serverid, teamName){
  console.log("Create roles called.")
  var guild = client.guilds.cache.get(serverid)
  var rolesCreated = []
  return new Promise(async function(resolve, reject) {
  if(guild.roles.cache.find(role => role.name === `${teamName} Scheduler`) == null && guild.roles.cache.find(role => role.name === `${teamName} Player`) == null){ // sets the scheduler role to the custom created one by ID
      var schedulerRoleID = await guild.roles.create({
        data:{
            name: `${teamName} Scheduler`,
            color: 'BLUE',
        }})
      var playerRoleID = await guild.roles.create({
        data:{
          name: `${teamName} Player`,
          color: 'RED',
      }})
      rolesCreated.push(schedulerRoleID.id)
      rolesCreated.push(playerRoleID.id)
      resolve(rolesCreated)
  }
  else{
    resolve(-1)
  }
})}
// Takes user input, formats into a scrim, gets confirmation before sending to collegiate channel.
function post(msg, args){
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
        var formattedListing = Scrim.formatIntoConfirmationString(requestedTime, TIMEZONES[data.timeZone], data.team.name, data.team.schedulers, data.team.OPGG, data.team.avgRank)
        getPostingConfirmation(msg, formattedListing, data, timeValue);
      })
}


function printSchedule(msg, teamName){
  db.collection('servers').doc(msg.guild.id).get()
        .then(doc=> {
          let data = doc.data();
          let teams = data.teams;
          var specifiedTeam = teams.find(team => team.name == teamName);
          if (specifiedTeam.schedule.length == 0){
            msg.reply("You currently have no scrims scheduled.")
            return;
          }
          Team.printSchedule(msg, specifiedTeam)
        })
}





// Helper functions


// Process for when a reaction is added
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
      if (reaction.emoji.name == INTEREST_EMOJI){
        console.log(`${user.tag} reacted to a listing.`)
        var awayServerID = await findAssociatedServer(user.tag)
        if (awayServerID == "NOT FOUND"){
          user.send("I see you reacted to a scrim listing but I couldn't find you registered under a team in my database! Please make sure you're registered.")
          return;
        }else{
          console.log(`${user.tag} belongs to ${client.guilds.cache.get(awayServerID).name}`)
          var awayTeam = await makeUserSpecifyTeam(reaction, user)
          var awayTeamName = awayTeam.name
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
          // Find the team name of the associated scrim
          indexOfStart = content.indexOf("**Team**: ")
          var parsedName = content.substring(indexOfStart + 10, content.indexOf("**Schedulers**"));
          console.log(`Parsed name: ${parsedName} \nParsed Scheduler Tag: ${firstListedSchedulerTag} \nParsed Time : ${timeOfScrim}`)
          var homeServerID = await findAssociatedServer(firstListedSchedulerTag)
          if (homeServerID == "NOT FOUND"){
            return;
          }
          // Don't let users react to their own posts.
          if (awayServerID == homeServerID){
             user.send("You reacted to your own server's listing. I ignored you sorry uwu")
             return;
          }
          console.log(`${firstListedSchedulerTag} belongs to ${client.guilds.cache.get(homeServerID).name}`)

          // Sends an Unknown Member error, not sure why. All behavior is as expected.
          showInterest(reaction, awayServerID, awayTeamName, homeServerID, parsedName, timeOfScrim).catch(error => error)
        }
      }
    }
  });


// If a user belongs to multiple teams, prompt them to specify which one they want to continue with.
async function makeUserSpecifyTeam(reaction, user){
  return new Promise(function(resolve, reject) {
    var associatedServer = await findAssociatedServer(user.tag)
    db.collection('servers').doc(associatedServer).get()
    .then(doc => {
      let data = doc.data()
      var teams = data.teams
      var associatedTeams = teams.filter(team => team.schedulers.includes(user.tag))
      // If they only belong to one team
      if(associatedTeams.length == 1){
        resolve(associatedTeams[0])
      }
      if (associatedTeams.length > 9){
        user.send("You are associated with too many teams. I cannot handle.")
      }
      reaction.message.channel.send(
        `${user.tag}, I see you are associated will multiple teams. Which would you like this inquiry to be for?` + displayTeamsArrayAsOptions(associatedTeams)
      ).then(async sentMsg=>{
        var filter = (reaction, user2) => {
          return ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"].includes(reaction.emoji.name) && user2.id != BOTID && user2.id == user.id;
        };
        var numbers = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"]
        for (var i=0;i<associatedTeams.length;i++){
          await sentMsg.react(numbers[i])
        }
        sentMsg.awaitReactions(filter, {max: 1, time: 60000, errors: ['time']})
        .then(collected => {
          const reaction = collected.first();
          var decision = -1;
        switch(reaction.emoji.name){
          case "1️⃣":
            decision = 1;
            break
          case "2️⃣":
            decision = 2;
            break
          case "3️⃣":
            decision = 3;
            break
          case "4️⃣":
            decision = 4;
            break;
          case "5️⃣":
            decision = 5;
            break;
          case "6️⃣":
            decision = 6;
            break;
          case "7️⃣":
            decision = 7;
            break;
          case "8️⃣":
            decision = 8;
            break;
          case "9️⃣":
            decision = 9;
            break;
          case "🔟":
            decision = 10;
            break
        }
        resolve(associatedTeams[decision-1])
        }).catch(error => {
          console.log(error)
          resolve(-1)});
  })
})})
}

function displayTeamsArrayAsOptions(arr){
  var str = ""
  for (var i=0;i<arr.length;i++){
    str += `\n${i+1} ${arr[i].name}`
  }
  return str;
}

// When a reactor shows interest in a scrim listing
async function showInterest(reactionA, awayServerID, awayTeamName, homeServerID, homeTeamName, timeOfScrim){
  var awayTeamData = await getTeamData(getServerData(awayServerID), awayTeamName);
  var homeTeamData = await getTeamData(getServerData(homeServerID), homeTeamName);
  var awaySchedulingChannelID = awayTeamData.schedulingChannelID;
  var homeSchedulingChannelID = homeTeamData.schedulingChannelID;
  var awayServerChannel = client.guilds.cache.get(awayServerID).channels.cache.get(awaySchedulingChannelID)
  var homeServerChannel = client.guilds.cache.get(homeServerID).channels.cache.get(homeSchedulingChannelID)
  homeServerChannel.send(
    "__**Scrim inquiry regarding the listing for " + timeOfScrim + ". React " + ACCEPT_EMOJI + " to accept or " + DECLINE_EMOJI + " to decline.**__\n" + 
    Team.teamAsString(awayTeamData.name, awayTeamData.team.avgRank, awayTeamData.team.schedulers, awayTeamData.team.OPGG)).then(async sentMsg=>{
      var filter = (reaction, user) => {
        return [ACCEPT_EMOJI, DECLINE_EMOJI].includes(reaction.emoji.name) && user.id != BOTID && isAScheduler2(awayServerID, user.id) ;
      };
      await sentMsg.react(ACCEPT_EMOJI)
      await sentMsg.react(DECLINE_EMOJI)
      sentMsg.awaitReactions(filter, {max: 1, time: 60000, errors: ['time']})
      .then(collected => {
        const reaction = collected.first();
        if (reaction.emoji.name === ACCEPT_EMOJI) {
          // Accept offer, change pending status, add the away team, add to away team's schedule
          var indexOfScrim = findScrimIndexByTimeStr(homeTeamData.schedule, timeOfScrim);
          console.log(indexOfScrim);
          if (indexOfScrim == -1){
            homeServerChannel.send("Something went wrong. Please contact chriss#8261.")
            awayServerChannel.send("Something went wrong. Please contact chriss#8261.")
            return;
          }
          var scrim = homeTeamData.schedule[indexOfScrim]
          // Confirms the scrim into both team's schedule
          confirmScrim(homeTeamData, homeServerID, awayTeamData, awayServerID, scrim);
          reaction.message.delete();
          homeServerChannel.send("```" + `Accepted offer from ${awayTeamData.name} for ${timeOfScrim}`+"```")
          awayServerChannel.send("```" + `${homeTeamData.name} accepted your offer for ${timeOfScrim}`+"```")
          // Reaction A is the original scrim listing in the collegiate server.
          console.log("Deleting the original message.")
          reactionA.message.delete()
        } else {
          reaction.message.delete();
          homeServerChannel.send("```" + `Declined offer from ${awayTeamData.name} for ${timeOfScrim}`+"```")
          // Decline offer, notify away team.
          awayServerChannel.send("```" + `${homeTeamData.name} declined your offer for ${timeOfScrim}`+"```")
        }
      }).catch(error => {console.log(error)});
  })
}

// Finds a servers scheduling channel, given their serverid (document in the Firestore)
async function findSchedulingChannel(serverid, teamName){
  console.log(`Looking for scheduling channel associated with ${teamName} in ${serverid}`)
  return new Promise(function(resolve, reject) {
    db.collection('servers').doc(serverid)
  .get()
  .then(doc => {
      let teams = doc.data().teams
      var specifiedTeam = teams.find(team => team.name == teamName);
      resolve(specifiedTeam.schedulingChannelID)
  }).then(() =>
      resolve("NOT FOUND, SHOULD NEVER HAPPEN.")
  )});
}

// Given the serverid of a team's discord, return their data.
async function getServerData(serverid){
  return new Promise(function(resolve, reject) {
    db.collection('servers').doc(serverid)
  .get()
  .then(doc => {
      resolve(doc.data())
  }).then(() =>
      resolve("NOT FOUND, SHOULD NEVER HAPPEN.")
  )});
}


function getTeamData(serverData, teamName){
  var teams = serverData.teams;
  var specifiedTeam = teams.find(team => team.name == teamName);
  return specifiedTeam;
}

// Finds a scrim by time
function findScrimIndexByTimeStr(schedule, time){
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
// Returns the index in the sorted position
function findScrimIndexByTimeNum(schedule, time){
  console.log(`Looking for a scrim for ${time}`)
  for (var i=0;i<schedule.length;i++){
    if (schedule[i].time == time){
      console.log("Scrim index returning " + i)
      return i;
    }
  }
  return -1;
}
// Given the tag of a user, search for if they are listed as a scheduler in any channel.
// Currently if a user is in multiple channels, it will return the first one.
async function findAssociatedServer(schedulerTag){
    console.log(`Looking for teams associated with ${schedulerTag}`)
    return new Promise(function(resolve, reject) {
      db.collection('servers').where("teams.associatedSchedulers", "array-contains", schedulerTag)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(function(doc){
        resolve(doc.id)
      });
    }).then(() =>
        resolve("NOT FOUND")
    )});
}

// Checks if a user is a scheduler given a serverid and userid
async function isAScheduler(serverid, userid, teamName){
  var member = client.guilds.cache.get(serverid).members.fetch(userid);
  if ((await member).roles.cache.some(role => role.name === `${teamName} Scheduler` || role.name === 'McSlap Administrator')) {
    return 1;
  }else{
    return 0;
  }
}

// Removes a scrim by index
async function cancelScrimByIndex(msg, teamName, index){
  db.collection('servers').doc(msg.guild.id).get()
  .then(doc=> {
    let data = doc.data()
    var teams = data.teams;
    var specifiedTeam = teams.find(team => team.name == teamName);
    specifiedTeam.schedule.sort(Team.scrimComparator);
    if (index >= specifiedTeam.schedule.length){
      msg.reply("Out of bounds index given.")
    }
    if (specifiedTeam.schedule[index].pending == false){
      msg.reply("This scrim is already confirmed. You must contact the opposing team if you wish to cancel.")
      return;
    }
    var scrim = specifiedTeam.schedule.splice(index, 1)[0]
    db.collection('servers').doc(msg.guild.id)
    .update({
      teams : teams
    }).catch(error => console.log(error))
    client.guilds.cache.get(COLLEGIATE_SERVER_ID).channels.cache.get(COLLEGIATE_SCHEDULING_CHANNELID).messages.fetch(scrim.msgID).then(message => message.delete())
    msg.reply("```" + ` Pending scrim cancelled. `+"```")
}).catch(error =>
  console.log(error)
)
}

// Clears the entire teams schedule
async function wipeTeamsSchedule(msg, teamName){
    db.collection('servers').doc(msg.guild.id).get()
      .then(doc=> {
        let data = doc.data()
        var teams = data.teams;
        var specifiedTeam = teams.find(team => team.name == teamName);
        specifiedTeam.schedule = []
        db.collection('servers').doc(msg.guild.id)
        .update({
          teams : teams
        })
        msg.reply("``` Schedule wiped. ```")
    }).catch(error =>console.log(error))
}

async function removeConfirmedScrim(scrim){
  // Find the scrim in both team's schedules and remove it.
  var firstListedHomeScheduler = scrim.homeTeamSchedulers[0]
  var firstListedAwayScheduler = scrim.awayTeamSchedulers[0]
  var homeTeamServerID = await findAssociatedServer(firstListedHomeScheduler)
  var awayTeamServerID = await findAssociatedServer(firstListedAwayScheduler)
  // Remove and update from home
  db.collection('servers').doc(homeTeamServerID).get()
  .then(doc => {
    let data = doc.data()
    var teams = data.teams;
    var specifiedTeam = teams.find(team => team.name == scrim.homeTeam);
    let schedule = specifiedTeam.schedule.sort(Team.scrimComparator)
    var index = findScrimIndexByTimeNum(schedule, scrim.time)
    schedule.splice(index, 1)
    db.collection('servers').doc(homeTeamServerID)
    .update({
      teams : data.teams
    })
  }).catch(error => console.log(error))
  // Remove and update from away
  db.collection('servers').doc(awayTeamServerID).get()
  .then(doc => {
    let data = doc.data()
    var teams = data.teams;
    var specifiedTeam = teams.find(team => team.name == scrim.awayTeam);
    let schedule = specifiedTeam.schedule.sort(Team.scrimComparator)
    var index = findScrimIndexByTimeNum(schedule, scrim.time)
    schedule.splice(index, 1)
    db.collection('servers').doc(awayTeamServerID)
    .update({
      teams : data.teams
    })
  }).catch(error => console.log(error))
}


// Once a scrim is accepted and confirmed, this function is called to add it to the other team's schedule.
async function confirmScrim(homeTeamData, homeserverid, awayTeamData, awayserverid, scrim){
  console.log(`Confirming scrim between ${homeTeamData.name} and ${awayTeamData.name}`)
  scrim.awayTeam = awayTeamData.name
  scrim.awayTeamOPGG = awayTeamData.OPGG
  scrim.awayTeamSchedulers = awayTeamData.schedulers
  scrim.awayTeamAvgRank = awayTeamData.avgRank
  scrim.pending = false
  db.collection('servers').doc(awayserverid).get()
  .then(doc=> {
    let data = doc.data()
    var teams = data.teams
    var specifiedTeam = teams.find(team => team.name == teamName);
    specifiedTeam.schedule.push(scrim)
    db.collection('servers').doc(awayserverid)
    .update({
      teams : teams
    })
  })
  .catch(error =>
    console.log(error)
  )
  db.collection('servers').doc(homeserverid).get()
  .then(doc=> {
    let data = doc.data()
    var team = data.team
    team.schedule.push(scrim)
    db.collection('servers').doc(homeserverid)
    .update({
      teams : teams
    })
  }).catch(error =>
    console.log(error)
  )
}

// This function is called when a scrim is initially made. It fills in as much information as it can, the rest
// comes once the scrim is confirmed.
function addNewScrimToSchedule(msg, data, timeValue, sentMsgID){
    var specifiedTeam = data.teams.find(team => team.name == teamName);
    specifiedTeam.schedule.push({
      time : timeValue,
      homeTeam : data.team.name,
      homeTeamOPGG : data.team.OPGG,
      homeTeamAvgRank: data.team.avgRank,
      homeTeamSchedulers : data.team.schedulers,
      awayTeam : "",
      awayTeamOPGG : "",
      awayTeamSchedulers : "",
      awayTeamAvgRank : "",
      msgID : sentMsgID,
      pending : true,
    })
    db.collection('servers').doc(msg.guild.id).update({
      teams : data.teams
    }).catch(error =>
      console.log(error)
    )
}


// Waits for confirmation for a scrim posting before sending it.
function getPostingConfirmation(msg, formattedListing, data, timeValue){
  var filter = (reaction, user) => {
    return [CONFIRM_EMOJI, CANCEL_EMOJI].includes(reaction.emoji.name) && user.id != BOTID && (user.id === msg.author.id || CHRIS);
  };
  msg.channel.send("__Does this look good?__ \n"+ formattedListing)
        .then(async sentMsg=>{
            await sentMsg.react(CONFIRM_EMOJI)
            await sentMsg.react(CANCEL_EMOJI)
            sentMsg.awaitReactions(filter, {max: 1, time: 60000, errors: ['time']})
            .then(collected => {
              const reaction = collected.first();
              if (reaction.emoji.name === CONFIRM_EMOJI) {
                msg.reply('``` Listing posted to the Collegiate scheduling channel. ```');
                client.guilds.cache.get(COLLEGIATE_SERVER_ID).channels.cache
                .get(COLLEGIATE_SCHEDULING_CHANNELID)
                .send(`__New Scrim Listing. React ${INTEREST_EMOJI} to send a request.__ \n` + formattedListing)
                .then(async sentMsg=>{
                  await sentMsg.react(INTEREST_EMOJI);
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
function addAScheduler(msg, serverid, teamName, schedulertag){
  db.collection('servers').doc(serverid).get()
      .then(doc=> {
        let data = doc.data()
        var teams = data.teams
        var specifiedTeam = teams.find(team => team.name == teamName);
        if (specifiedTeam == undefined){
          msg.reply("I couldn't find a team by that name.")
          return;
        }
        if (team.schedulers.indexOf(schedulertag) === -1){
          specifiedTeam.schedulers.push(schedulertag);
          db.collection('servers').doc(serverid)
          .update({
            associatedSchedulers : fireStore.arrayUnion([schedulertag]),
            teams : teams
          })
        }else{
          msg.reply("That scheduler already exists!")
          return;
        }
      }
      ).catch(error => console.log(error))
}

// Removes a scheduler from the servers listing given their tag. The user calling this role must have the scheduler tag.
function removeAScheduler(msg, serverid, teamName, schedulertag){
  db.collection('servers').doc(serverid).get()
  .then(doc=> {
    let data = doc.data()
    var teams = data.teams
    var specifiedTeam = teams.find(team => team.name == teamName);
    if (specifiedTeam == undefined){
      msg.reply("I couldn't find a team by that name.")
      return;
    }
    if (team.schedulers.indexOf(schedulertag) === -1){
      specifiedTeam.schedulers.splice(team.schedulers.indexOf(schedulertag),1);
      db.collection('servers').doc(serverid)
      .update({
        teams : teams
      })
    }else{
      msg.reply("That scheduler already exists!")
      return;
    }
  }).catch(error => console.log(error))
}


// Checks if anything is uninitialized within the database. Returns -1 if so, and 0 if everything is all good.
function checkForDefaultFields(msg){
  var somethingWrong = 0;
  db.collection('servers').doc(msg.guild.id).get()
  .then(doc => { 
    var str = "The following fields have been found to be uninitialized. You must intitialize them before continuing:"
    let data = doc.data()
    if (data.teams.length == 0){
      str += "\n- There are no registered teams."
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

// Process for when the bot turns on.
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('use !info to see my commands');
});

// Check interval is in minutes
const CHECK_INTERVAL = 15



// For testing
async function checkNow(){
  console.log("Running routine check for upcoming scrims.")
  var snapshot = await db.collection('servers').get()
  var docs = snapshot.docs;
  var currentTime = new Date().valueOf()
  // Need to track what scrims have been removed since it's a snapshot and won't be as recent as can be.
  // When a scrim is removed, it's actually in there twice so ignore it the second time around.
  // Uniquely identify them by msgID, should have started this practice earlier, could go back.
  var scrimsRemovedThusFar = []
  docs.map(async doc => {
    let data = doc.data();
    var schedule = data.team.schedule;
    // Skip over unregistered teams
    if (schedule == undefined){
      return;
    }
    // The Discord server ID is stored in doc.id
    var schedulingChannel = client.guilds.cache.get(doc.id).channels.cache.get(data.schedulingChannelID)
    var playerRole = `<@&${data.playerRoleID}>`
    for (var i=0;i<schedule.length;i++){
      var scrim = schedule[i]
      if (scrim.pending == true || scrimsRemovedThusFar.includes(scrim.msgID)){
        continue;
      }
      var timeUntilScrim = scrim.time - currentTime
      var timeOfScrim = moment.tz(scrim.time, TIMEZONES[data.timeZone])
      if (timeUntilScrim <= 0){
        schedulingChannel.send(`${playerRole} \n` + Scrim.formatIntoConfirmedString(data.team.name, timeOfScrim, TIMEZONES[data.timeZone], scrim.homeTeam, scrim.homeTeamSchedulers, scrim.homeTeamOPGG, scrim.homeTeamAvgRank, scrim.awayTeam, scrim.awayTeamSchedulers, scrim.awayTeamOPGG, scrim.awayTeamAvgRank)+ 
          "\n*The scrim is happening! Get in the lobby!*")
        // Remove the scrim from both teams schedules
        await removeConfirmedScrim(scrim).catch(error=>console.log(error))
        console.log(`Pushing ${scrim.msgID} to array`)
        scrimsRemovedThusFar.push(scrim.msgID)
      }
      else if (timeUntilScrim< 1800000 && timeUntilScrim > 900000){ // 15-30 min
        schedulingChannel.send(`${playerRole} \n` + Scrim.formatIntoConfirmedString(data.team.name, timeOfScrim, TIMEZONES[data.timeZone], scrim.homeTeam, scrim.homeTeamSchedulers, scrim.homeTeamOPGG, scrim.homeTeamAvgRank, scrim.awayTeam, scrim.awayTeamSchedulers, scrim.awayTeamOPGG, scrim.awayTeamAvgRank)+ 
          "\n*The scrim is happening in the next 30 minutes. Get ready!*")
      }
      else if(timeUntilScrim < 360000 && timeUntilScrim > 2700000){ // 45-60 min
        schedulingChannel.send(`${playerRole} \n` + Scrim.formatIntoConfirmedString(data.team.name, timeOfScrim, TIMEZONES[data.timeZone], scrim.homeTeam, scrim.homeTeamSchedulers, scrim.homeTeamOPGG, scrim.homeTeamAvgRank, scrim.awayTeam, scrim.awayTeamSchedulers, scrim.awayTeamOPGG, scrim.awayTeamAvgRank)+ 
          "\n*The scrim is happening within an hour.*")
      }
    }
  })
}



// Checks for upcoming scrims
client.on('ready', async function(){
  setInterval(async function (){
    console.log("Running routine check for upcoming scrims.")
    var snapshot = await db.collection('servers').get()
    var docs = snapshot.docs;
    var currentTime = new Date().valueOf()
    // Need to track what scrims have been removed since it's a snapshot and won't be as recent as can be.
    // When a scrim is removed, it's actually in there twice so ignore it the second time around.
    // Uniquely identify them by msgID, should have started this practice earlier, could go back.
    var scrimsRemovedThusFar = []
    docs.map(async doc => {
      let data = doc.data();
      var schedule = data.team.schedule;
      // Skip over unregistered teams
      if (schedule == undefined){
        return;
      }
      // The Discord server ID is stored in doc.id
      var schedulingChannel = client.guilds.cache.get(doc.id).channels.cache.get(data.schedulingChannelID)
      var playerRole = `<@&${data.playerRoleID}>`
      for (var i=0;i<schedule.length;i++){
        var scrim = schedule[i]
        if (scrim.pending == true || scrimsRemovedThusFar.includes(scrim.msgID)){
          continue;
        }
        var timeUntilScrim = scrim.time - currentTime
        var timeOfScrim = moment.tz(scrim.time, TIMEZONES[data.timeZone])
        if (timeUntilScrim <= 0){
          schedulingChannel.send(`${playerRole} \n` + Scrim.formatIntoConfirmedString(data.team.name, timeOfScrim, TIMEZONES[data.timeZone], scrim.homeTeam, scrim.homeTeamSchedulers, scrim.homeTeamOPGG, scrim.homeTeamAvgRank, scrim.awayTeam, scrim.awayTeamSchedulers, scrim.awayTeamOPGG, scrim.awayTeamAvgRank)+ 
            "\n*The scrim is happening! Get in the lobby!*")
          // Remove the scrim from both teams schedules
          await removeConfirmedScrim(scrim).catch(error=>console.log(error))
          console.log(`Pushing ${scrim.msgID} to array`)
          scrimsRemovedThusFar.push(scrim.msgID)
        }
        else if (timeUntilScrim< 1800000 && timeUntilScrim > 900000){ // 15-30 min
          schedulingChannel.send(`${playerRole} \n` + Scrim.formatIntoConfirmedString(data.team.name, timeOfScrim, TIMEZONES[data.timeZone], scrim.homeTeam, scrim.homeTeamSchedulers, scrim.homeTeamOPGG, scrim.homeTeamAvgRank, scrim.awayTeam, scrim.awayTeamSchedulers, scrim.awayTeamOPGG, scrim.awayTeamAvgRank)+ 
            "\n*The scrim is happening in the next 30 minutes. Get ready!*")
        }
        else if(timeUntilScrim < 360000 && timeUntilScrim > 2700000){ // 45 - 60 min
          schedulingChannel.send(`${playerRole} \n` + Scrim.formatIntoConfirmedString(data.team.name, timeOfScrim, TIMEZONES[data.timeZone], scrim.homeTeam, scrim.homeTeamSchedulers, scrim.homeTeamOPGG, scrim.homeTeamAvgRank, scrim.awayTeam, scrim.awayTeamSchedulers, scrim.awayTeamOPGG, scrim.awayTeamAvgRank)+ 
            "\n*The scrim is happening within an hour.*")
        }
      }
    })
  }
  , CHECK_INTERVAL * 60000)//900000); // <--- Interval of the check, currently 15 minutes.
});

client.login(process.env.BOT_TOKEN);

