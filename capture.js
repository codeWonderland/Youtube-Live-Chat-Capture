var chat_dict = {};
var ticker;

function handleClientLoad()
{
    // Loads the client library and the auth2 library together for efficiency.
    // Loading the auth2 library is optional here since `gapi.client.init` function will load
    // it if not already loaded. Loading it upfront can save one network request.
    gapi.load('client:auth2', initClient);
}

function initClient()
{
    // Initialize the client with API key and People API, and initialize OAuth with an
    // OAuth 2.0 client ID and scopes (space delimited string) to request access.
    gapi.client.init({
        apiKey: auth.apiKey,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"],
        clientId: auth.clientId,
        scope: 'https://www.googleapis.com/auth/youtube.readonly'
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
}

function updateSigninStatus(isSignedIn)
{
    // When signin status changes, this function is called.
    // If the signin status is changed to signedIn, we make an API call.
    if (isSignedIn)
    {
        getLiveBroadcasts();
    }
    else
    {
        document.getElementById('chat-client-content').innerHTML = '<button onclick="handleSignInClick()">Sign In</button>';
    }
}

function handleSignInClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignOutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}

function getLiveBroadcasts()
{
    var broadcasts, tmp = '<h1>Select from current live broadcasts</h1><select id="broadcast-select">';
    // Make an API call to the People API, and print the user's given name.
    gapi.client.request({
        "path" : "https://www.googleapis.com/youtube/v3/liveBroadcasts",
        "params" :
            {
                "part" : "snippet",
                "mine" : true
            }
    }).then(function(response){
        broadcasts = JSON.parse(response.body).items;
        broadcasts.forEach
        (
            function(broadcast)
            {
                tmp += '<option value="' + broadcast.id + '">' + broadcast.snippet.title + '</option>';
            }
        );

        tmp += '</select><button onclick="getChatIdViaBroadcastId($(\'#broadcast-select\').val())">Get Live Chat</button>';
        document.getElementById('chat-client-content').innerHTML = tmp;
    })
}

function getChatIdViaBroadcastId(id)
{
    chatId = '';
    gapi.client.request({
        "path" : "https://www.googleapis.com/youtube/v3/liveBroadcasts",
        "params" :
            {
                "part" : "snippet",
                "id" : id
            }
    }).then(function(response){
        broadcast = JSON.parse(response.body).items[0];
        console.log(broadcast)
        if (broadcast.snippet.liveChatId)
        {
            chatId = broadcast.snippet.liveChatId;
            getChatFromId(chatId);
        }
        else
        {
            alert('Video is not live, make sure video is live then try again');
        }
    })
}

function getChatFromId(id)
{
    ticker = setInterval(function(){chatTicker(id)}, 500);
}

function chatTicker(id)
{
    gapi.client.request({
        "path" : "https://www.googleapis.com/youtube/v3/liveChat/messages",
        "params" :
            {
                "part" : "snippet",
                "liveChatId" : id
            }
    }).then(function(response) {
        messages = JSON.parse(response.body).items;
        messages.forEach(function(message){
            chat_dict[message.id] = {
                "message" : message.snippet.displayMessage,
                "timestamp" : message.snippet.publishedAt
            }
        });

        displayChatDict();
    })
}

function displayChatDict()
{
    var tmp = '<button onclick="emailData()">Email Data</button>' +
        '<button onclick="stopFeed()">Stop Feed</button>' +
        '<h1>Live Feed:</h1>' +
        '<div class="feed-box">';

    jQuery.each(chat_dict, function(){
        tmp += '<p>' + this.message + '</p>';
    });

    tmp += '</div>';

    document.getElementById('chat-client-content').innerHTML = tmp;
}

function stopFeed()
{
    clearInterval(ticker);
}

function emailData()
{
    console.log(chat_dict);
}