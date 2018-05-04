require('dotenv').config({path: 'example/.env'})
var express = require('express')
var builder = require('botbuilder')
var linebot = require('../dist/index')

// Setup Express Server
var server = express()
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('Line Connector is listening to port %s', process.env.port || process.env.PORT || 3978)
})

var connector = new linebot.Connector({
  hasPushApi: false,
  autoGetUserProfile: true,
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESSTOKEN
})

server.post('/api/messages', connector.listen())

// Make sure you add code to validate these fields
const luisAppId = process.env.LUIS_APP_ID
const luisAPIKey = process.env.LUIS_API_KEY
const luisAPIHostName = process.env.LUIS_HOST || 'westus.api.cognitive.microsoft.com'

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey

var bot = new builder.UniversalBot(connector)
// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl)
bot.recognizer(recognizer)

bot.dialog('BusinessOverviewDialog',
  [(session, args, next) => {
    session.send('You reached the Identification.Face . You said \'%s\'.', session.message.text)
    // builder.Prompts.confirm(session, 'Are you sure you wish to cancel your order?')
    builder.Prompts.choice(session, 'Which color?', ['red', 'green', 'blue'])
    // builder.Prompts.text(session, '請讓我看看')
    // builder.Prompts.attachment(session,
    //   new builder.HeroCard(session)
    //     .title('BotFramework Hero Card')
    //     .subtitle('Your bots — wherever your users are talking')
    //     .text('Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.')
    //     // .images([
    //     //   builder.CardImage.create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg')
    //     // ])
    //     // .buttons([
    //     //   builder.CardAction.openUrl(session, 'https://docs.microsoft.com/bot-framework', 'Get Started')
    //     // ])
    // )
  },
  (session, postback) => {
    console.log('response:::::::', postback.response)
    session.send('Your postback response is \'%s\'', postback.response)
    session.endDialog()
  }]
).triggerAction({
  matches: 'Identification.Face'
})

bot.dialog('/', (session, args) => {
  setTimeout(() => {
    session.send('Hello0' + session.message.text)
    session.send(new builder.Message(session).attachments([
      new builder.HeroCard(session)
        .title('Classic Gray T-Shirt')
        .subtitle('100% Soft and Luxurious Cotton')
        .text('Price is $25 and carried in sizes (S, M, L, and XL)')
        .images([builder.CardImage.create(session, 'https://i.imgur.com/Y2N9ON2.png')])
        .buttons([
          new builder.CardAction().type('datatimepicker').title('time'),
          builder.CardAction.imBack(session, 'buy classic gray t-shirt', 'Buy'),
          builder.CardAction.postBack(session, 'action=buy&itemid=111', 'send data')
        ])
    ]))
    session.endDialog()
  }, 2000)
})

bot.on('event:follow', (message) => {
  console.log('-----------', message)
  var reply = new builder.Message()
    .address(message.address)
    .text('Conversation Update - FOLLOW')
  bot.send(reply)
})

bot.on('event:join', (message) => {
  console.log('event:join')
  console.log('event:join')
  console.log('event:join')
  console.log('-----------', message)
  console.log('event:join')
  console.log('event:join')
  console.log('event:join')
})

bot.on('event:leave', (message) => {
  console.log('event:leave')
  console.log('event:leave')
  console.log('event:leave')
  console.log('-----------', message)
  console.log('event:leave')
  console.log('event:leave')
  console.log('event:leave')
})
