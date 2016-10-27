'use strict';
var http = require('http');

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `${title}`,
            content: `${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}

function startTalking(session, callback) {
    getJson(
        session, 
        function(result) {
            const sessionAttributes = session.attributes;
            const cardTitle = 'TalkHipster2Me';
            const speechOutput = result.text;
            const repromptText = 'Shall I continue?';
            const shouldEndSession = false;
            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
    );
}

function startHelp(callback) {
    const sessionAttributes = {};
    const cardTitle = 'TalkHipster2Me';
    const speechOutput = "Want to keep your hipster slang funky fresh? Ask me to talk hipster and I'll spit truth."
        + "Want to really impress? Ask me to mix in some Latin.";
    const repromptText = 'Or not, you know, whatever';
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function shutUp(session, callback) {
    const sessionAttributes = session.attributes;
    const cardTitle = 'TalkHipster2Me';
    const speechOutput = "...zumba";
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'TalkHipster2Me';
    const speechOutput = 'Yeah, whatever';
    const shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
    startTalking(session, callback);
}

function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;
    
    if (intentName === 'LatinIntent') {
        session.attributes.latin = true;
        startTalking(session, callback);
    } else if (intentName === 'HipsterIntent') {
        session.attributes.latin = false;
        startTalking(session, callback);
    } else if (intentName === 'AMAZON.YesIntent' || intentName === 'AMAZON.ResumeIntent') {
        startTalking(session, callback);
    } else if (intentName === 'AMAZON.PauseIntent') {
        shutUp(session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        startHelp(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent' || intentName === 'AMAZON.NoIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

function getJson(session, eventCallback) {
    var url = "http://hipsterjesus.com/api/?paras=1&html=false";
    if (session.attributes.latin !== true) {
        url += "&type=hipster-centric"
    }
    http.get(url, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var result = JSON.parse(body);
            eventCallback(result);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.c5c80a10-b310-4430-8d53-396d6e5b5c66') {
             callback('Invalid Application ID');
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
