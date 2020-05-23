// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
var firebase = require("firebase/app");

// Add the Firebase products that you want to use
require("firebase/auth");
require("firebase/firestore");

var firebaseConfig = {
    apiKey: "AIzaSyAUrKqaja0rA7uR-4IdvKrpjCA7iCv9SIk",
    authDomain: "virtualmcslap.firebaseapp.com",
    databaseURL: "https://virtualmcslap.firebaseio.com",
    projectId: "virtualmcslap",
    storageBucket: "virtualmcslap.appspot.com",
    messagingSenderId: "426731679921",
    appId: "1:426731679921:web:3ae841ca8b8fadb4a57290",
    measurementId: "G-946WF37NFD"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);


// Run by "node index.js"

const Discord = require('discord.js');
const client = new Discord.Client();



client.on("guildCreate", (guild) => {
    console.log("Joined a new guild.")
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
  }
);



client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'test') {
    
  }
});

client.login("NzEzNTc3ODEzMTU5OTY4ODAw.XsiJLg.FIR6eETw2bMcOcvGm0stomqxeLE");

